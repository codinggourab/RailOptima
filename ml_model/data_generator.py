# ml_model/data_generator.py

import numpy as np
import pandas as pd
import random
import json

SIGNAL_STATES = ['red', 'yellow', 'double-yellow', 'green']
SWITCH_STATES = ['straight', 'diverging']
TRACK_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
DIRECTIONS = ['up', 'down']
TRAIN_TYPES = ['LOCAL', 'EXP', 'PASS', 'MEMU', 'FREIGHT_COAL', 
               'FREIGHT_OIL', 'FREIGHT_CEMENT']

def generate_signal_ids():
    """Generate all possible signal IDs matching your system"""
    signals = []
    for track_id in TRACK_IDS:
        for sig_type in ['S1', 'S2', 'S3', 'S4']:
            # Bidirectional tracks (4-9) have -U and -D suffix
            if track_id >= 4:
                signals.append(f"{track_id}-{sig_type}-U")
                signals.append(f"{track_id}-{sig_type}-D")
            else:
                signals.append(f"{track_id}-{sig_type}")
    return signals

def generate_switch_ids():
    return [
        'SW-LAD-DN-1', 'SW-LAD-DN-2', 'SW-LAD-DN-3', 'SW-LAD-DN-4',
        'SW-LAD-DN-4B', 'SW-LAD-DN-5', 'SW-4TO3-L', 'SW-5TO4-L',
        'SW-6TO5-L', 'SW-7TO6-L', 'SW-8TO7-L', 'SW-5TO4-R',
        'SW-5TO6-R', 'SW-9TO8-CO', 'SW-9TO8-L', 'SW-8TO9-CO',
        'SW-10TO9-CO', 'SW-X-1-2', 'SW-X-2-3', 'SW-X-3-4',
        'SW-X-4-7', 'SW-X-7-8', 'SW-4TO8-CO', 'SW-7TO4-CO'
    ]

ALL_SIGNAL_IDS = generate_signal_ids()
ALL_SWITCH_IDS = generate_switch_ids()

# State encoding maps
STATE_TO_INT = {'red': 0, 'yellow': 1, 'double-yellow': 2, 'green': 3}
INT_TO_STATE = {v: k for k, v in STATE_TO_INT.items()}
SWITCH_TO_INT = {'straight': 0, 'diverging': 1}
INT_TO_SWITCH = {v: k for k, v in SWITCH_TO_INT.items()}


def encode_state(signals_dict, switches_dict, trains_list):
    """
    Convert current railway state into a numerical feature vector
    
    Returns: numpy array of shape (feature_size,)
    """
    features = []
    
    # 1. Signal states (one-hot encoded)
    for sig_id in ALL_SIGNAL_IDS:
        state = signals_dict.get(sig_id, {}).get('state', 'red')
        features.append(STATE_TO_INT.get(state, 0))
    
    # 2. Switch states
    for sw_id in ALL_SWITCH_IDS:
        state = switches_dict.get(sw_id, {}).get('state', 'straight')
        features.append(SWITCH_TO_INT.get(state, 0))
    
    # 3. Train features (max 10 trains, padded)
    max_trains = 10
    train_features = []
    
    for i, train in enumerate(trains_list[:max_trains]):
        train_features.extend([
            train.get('trackId', 0) / 10.0,      # normalized track
            train.get('x', 0) / 3000.0,           # normalized position
            train.get('speed', 0) / 5.0,           # normalized speed
            1.0 if train.get('direction') == 'up' else 0.0,
            min(train.get('delayTicks', 0), 1000) / 1000.0,  # normalized delay
        ])
    
    # Pad to max_trains * 5 features
    while len(train_features) < max_trains * 5:
        train_features.append(0.0)
    
    features.extend(train_features)
    
    # 4. Count blocked signals (red signals with trains nearby)
    red_count = sum(
        1 for sig_id in ALL_SIGNAL_IDS 
        if signals_dict.get(sig_id, {}).get('state') == 'red'
    )
    features.append(red_count / len(ALL_SIGNAL_IDS))
    
    # 5. Count delayed trains
    delayed = sum(1 for t in trains_list if t.get('delayTicks', 0) > 100)
    features.append(delayed / max(len(trains_list), 1))
    
    return np.array(features, dtype=np.float32)


def calculate_reward(signals_before, signals_after, trains_before, trains_after):
    """
    Calculate reward for RL training:
    + More green signals = better throughput
    + Less red signals blocking trains = better
    + Fewer delayed trains = better
    - Never reward if trains would collide
    """
    reward = 0.0
    
    # Reward: more green signals
    greens_before = sum(1 for s in signals_before.values() if s.get('state') == 'green')
    greens_after = sum(1 for s in signals_after.values() if s.get('state') == 'green')
    reward += (greens_after - greens_before) * 2.0
    
    # Reward: fewer reds
    reds_before = sum(1 for s in signals_before.values() if s.get('state') == 'red')
    reds_after = sum(1 for s in signals_after.values() if s.get('state') == 'red')
    reward += (reds_before - reds_after) * 1.5
    
    # Reward: faster trains (higher average speed)
    avg_speed_before = np.mean([t.get('speed', 0) for t in trains_before]) if trains_before else 0
    avg_speed_after = np.mean([t.get('speed', 0) for t in trains_after]) if trains_after else 0
    reward += (avg_speed_after - avg_speed_before) * 3.0
    
    # Penalty: increased delays
    delay_before = sum(t.get('delayTicks', 0) for t in trains_before)
    delay_after = sum(t.get('delayTicks', 0) for t in trains_after)
    reward -= (delay_after - delay_before) * 0.1
    
    # Safety penalty: never allow conflicting routes
    # (simplified - real implementation checks interlocking rules)
    reward -= check_conflicts(signals_after) * 10.0
    
    return reward


def check_conflicts(signals_dict):
    """
    Check for dangerous signal configurations
    Returns: number of conflicts (0 = safe)
    """
    conflicts = 0
    
    # Rule: If UP and DOWN signals are both green on same track section,
    # that's a conflict on bidirectional tracks
    for track_id in [4, 5, 6, 7, 8, 9]:
        up_green = any(
            signals_dict.get(f"{track_id}-{s}-U", {}).get('state') == 'green'
            for s in ['S1', 'S2', 'S3', 'S4']
        )
        down_green = any(
            signals_dict.get(f"{track_id}-{s}-D", {}).get('state') == 'green'
            for s in ['S1', 'S2', 'S3', 'S4']
        )
        if up_green and down_green:
            conflicts += 1
    
    return conflicts


def generate_training_scenarios(num_scenarios=10000):
    """
    Generate synthetic training data by simulating various railway states
    and optimal actions
    """
    training_data = []
    
    for scenario_idx in range(num_scenarios):
        # Random initial state
        num_trains = random.randint(0, 8)
        signals = {}
        switches = {}
        trains = []
        
        # Random signals
        for sig_id in ALL_SIGNAL_IDS:
            signals[sig_id] = {
                'id': sig_id,
                'state': random.choice(SIGNAL_STATES)
            }
        
        # Random switches
        for sw_id in ALL_SWITCH_IDS:
            switches[sw_id] = {
                'id': sw_id,
                'state': random.choice(SWITCH_STATES)
            }
        
        # Random trains
        for i in range(num_trains):
            track_id = random.choice(TRACK_IDS)
            direction = random.choice(DIRECTIONS)
            delay_ticks = random.randint(0, 500)
            
            trains.append({
                'id': f'TRAIN-{i}',
                'trackId': track_id,
                'x': random.randint(100, 2900),
                'speed': random.uniform(0, 3.0),
                'baseSpeed': 2.0,
                'direction': direction,
                'delayTicks': delay_ticks,
                'type': random.choice(TRAIN_TYPES)
            })
        
        # Generate optimal actions using expert rules
        # (This is where domain knowledge goes)
        optimal_actions = generate_expert_actions(signals, switches, trains)
        
        # Encode state
        state_vector = encode_state(signals, switches, trains)
        
        # Calculate metrics
        total_delay = sum(t.get('delayTicks', 0) for t in trains)
        estimated_reduction = len(optimal_actions) * random.randint(2, 8)
        
        training_data.append({
            'state': state_vector.tolist(),
            'actions': optimal_actions,
            'total_delay': total_delay,
            'estimated_reduction': estimated_reduction,
            'signals': signals,
            'switches': switches,
            'trains': trains
        })
        
        if scenario_idx % 1000 == 0:
            print(f"Generated {scenario_idx}/{num_scenarios} scenarios")
    
    return training_data


def generate_expert_actions(signals, switches, trains):
    """
    Rule-based expert system that generates optimal actions
    This encodes railway domain knowledge
    """
    actions = []
    
    # Rule 1: Clear signals for trains approaching red lights
    for train in trains:
        if train.get('speed', 0) < 0.5 and train.get('delayTicks', 0) > 50:
            # Train is stopped/slow - find blocking signal
            track_id = train.get('trackId')
            direction = train.get('direction', 'up')
            train_x = train.get('x', 0)
            
            # Find nearest red signal ahead
            for sig_id, sig in signals.items():
                if (sig.get('state') == 'red' and 
                    sig_id.startswith(str(track_id))):
                    
                    # Check if signal is ahead of train
                    # For UP direction: signal.x > train.x
                    # For DOWN direction: signal.x < train.x
                    # Simplified check here
                    if not is_signal_blocked_by_safety_rules(sig_id, signals, switches):
                        actions.append({
                            'type': 'signal',
                            'id': sig_id,
                            'value': 'green',
                            'reason': f'Clear path for delayed train {train["id"]}'
                        })
                        break
    
    # Rule 2: Optimize switch positions for better routing
    for sw_id, sw in switches.items():
        # If switch is diverging but no train needs it, set to straight
        if sw.get('state') == 'diverging':
            if not is_switch_needed(sw_id, trains):
                actions.append({
                    'type': 'switch',
                    'id': sw_id,
                    'value': 'straight',
                    'reason': f'Normalize switch {sw_id} - not in active use'
                })
    
    # Rule 3: Cascade signal clearing for throughput
    # If final signal is green, clear earlier signals too
    for track_id in [1, 2, 3]:
        sig_ids = [s for s in signals.keys() if s.startswith(f"{track_id}-")]
        for sig_id in sig_ids:
            if signals[sig_id].get('state') == 'green':
                # Clear signals before this one too
                prev_signals = get_previous_signals(sig_id, signals)
                for prev_id in prev_signals:
                    if signals.get(prev_id, {}).get('state') == 'red':
                        if not is_signal_blocked_by_safety_rules(prev_id, signals, switches):
                            actions.append({
                                'type': 'signal',
                                'id': prev_id,
                                'value': 'yellow',
                                'reason': 'Cascade clearing for throughput'
                            })
    
    # Remove duplicate actions
    seen = set()
    unique_actions = []
    for action in actions:
        key = f"{action['type']}-{action['id']}"
        if key not in seen:
            seen.add(key)
            unique_actions.append(action)
    
    return unique_actions[:5]  # Limit to 5 actions max


def is_signal_blocked_by_safety_rules(sig_id, signals, switches):
    """Check if a signal CANNOT be cleared due to safety rules"""
    # Simplified - in real system, check interlocking rules
    return False


def is_switch_needed(sw_id, trains):
    """Check if any train needs this switch"""
    # Simplified check
    return random.random() > 0.7


def get_previous_signals(sig_id, signals):
    """Get signals that come before this one in the sequence"""
    parts = sig_id.split('-')
    if len(parts) < 2:
        return []
    
    track_id = parts[0]
    sig_num = parts[1]
    
    # S4 -> S3 -> S2 -> S1
    num_map = {'S4': ['S3', 'S2', 'S1'], 'S3': ['S2', 'S1'], 
               'S2': ['S1'], 'S1': []}
    
    prev_nums = num_map.get(sig_num, [])
    suffix = '-'.join(parts[2:]) if len(parts) > 2 else ''
    
    return [
        f"{track_id}-{n}-{suffix}" if suffix else f"{track_id}-{n}"
        for n in prev_nums
        if (f"{track_id}-{n}-{suffix}" if suffix else f"{track_id}-{n}") in signals
    ]


if __name__ == '__main__':
    print("Generating training data...")
    data = generate_training_scenarios(5000)
    
    # Save to file
    with open('training_data.json', 'w') as f:
        json.dump(data[:100], f, indent=2)  # Save sample
    
    print(f"Generated {len(data)} training scenarios")
    print(f"Feature vector size: {len(data[0]['state'])}")
    print(f"Sample actions: {data[0]['actions']}")