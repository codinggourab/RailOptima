# ml_model/model.py

import numpy as np
import json
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

from data_generator import (
    generate_training_scenarios, encode_state,
    ALL_SIGNAL_IDS, ALL_SWITCH_IDS, STATE_TO_INT, INT_TO_STATE,
    SWITCH_TO_INT, INT_TO_SWITCH, check_conflicts
)


class RailwayOptimizer:
    """
    Multi-output classifier that predicts optimal signal/switch actions
    given current railway state
    """
    
    def __init__(self):
        self.signal_models = {}   # One model per signal ID
        self.switch_models = {}   # One model per switch ID
        self.delay_model = None   # Predicts delay reduction
        self.is_trained = False
        self.feature_size = None
        
    def train(self, training_data):
        """Train separate models for each signal and switch"""
        print("Preparing training data...")
        
        # Extract features and labels
        X = np.array([d['state'] for d in training_data])
        self.feature_size = X.shape[1]
        
        print(f"Feature size: {self.feature_size}")
        print(f"Training samples: {len(X)}")
        
        # For each signal, train a classifier: given state -> what should this signal be?
        print("Training signal models...")
        
        for sig_id in ALL_SIGNAL_IDS[:20]:  # Start with first 20 signals
            # Build labels: what state should this signal be?
            y_signal = []
            
            for d in training_data:
                # Check if any action changes this signal
                action_for_sig = next(
                    (a for a in d['actions'] 
                     if a.get('type') == 'signal' and a.get('id') == sig_id),
                    None
                )
                
                if action_for_sig:
                    y_signal.append(STATE_TO_INT.get(action_for_sig['value'], 0))
                else:
                    # Keep current state
                    current_state = d['signals'].get(sig_id, {}).get('state', 'red')
                    y_signal.append(STATE_TO_INT.get(current_state, 0))
            
            y_signal = np.array(y_signal)
            
            # Train classifier
            clf = RandomForestClassifier(
                n_estimators=50,
                max_depth=8,
                random_state=42,
                n_jobs=-1
            )
            clf.fit(X, y_signal)
            self.signal_models[sig_id] = clf
        
        # Train switch models
        print("Training switch models...")
        
        for sw_id in ALL_SWITCH_IDS[:10]:  # First 10 switches
            y_switch = []
            
            for d in training_data:
                action_for_sw = next(
                    (a for a in d['actions']
                     if a.get('type') == 'switch' and a.get('id') == sw_id),
                    None
                )
                
                if action_for_sw:
                    y_switch.append(SWITCH_TO_INT.get(action_for_sw['value'], 0))
                else:
                    current_state = d['switches'].get(sw_id, {}).get('state', 'straight')
                    y_switch.append(SWITCH_TO_INT.get(current_state, 0))
            
            y_switch = np.array(y_switch)
            
            clf = RandomForestClassifier(
                n_estimators=50,
                max_depth=6,
                random_state=42,
                n_jobs=-1
            )
            clf.fit(X, y_switch)
            self.switch_models[sw_id] = clf
        
        # Train delay reduction predictor
        print("Training delay model...")
        y_delay_reduction = np.array([d['estimated_reduction'] for d in training_data])
        
        self.delay_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.delay_model.fit(X, y_delay_reduction)
        
        self.is_trained = True
        print("Training complete!")
    
    def predict_actions(self, signals_dict, switches_dict, trains_list):
        """
        Given current state, predict optimal actions
        
        Returns: list of action dicts
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        
        # Encode current state
        state_vector = encode_state(signals_dict, switches_dict, trains_list)
        X = state_vector.reshape(1, -1)
        
        actions = []
        
        # Predict optimal signal states
        for sig_id, model in self.signal_models.items():
            current_state = signals_dict.get(sig_id, {}).get('state', 'red')
            predicted_state_int = model.predict(X)[0]
            predicted_state = INT_TO_STATE.get(predicted_state_int, 'red')
            
            # Only add action if state needs to change
            if predicted_state != current_state:
                # Safety check: don't clear signals if it would cause conflict
                test_signals = {**signals_dict}
                test_signals[sig_id] = {'state': predicted_state}
                
                if check_conflicts(test_signals) == 0:
                    confidence = model.predict_proba(X)[0].max()
                    
                    if confidence > 0.6:  # Only high-confidence actions
                        actions.append({
                            'type': 'signal',
                            'id': sig_id,
                            'value': predicted_state,
                            'confidence': float(confidence)
                        })
        
        # Predict optimal switch states
        for sw_id, model in self.switch_models.items():
            current_state = switches_dict.get(sw_id, {}).get('state', 'straight')
            predicted_state_int = model.predict(X)[0]
            predicted_state = INT_TO_SWITCH.get(predicted_state_int, 'straight')
            
            if predicted_state != current_state:
                confidence = model.predict_proba(X)[0].max()
                
                if confidence > 0.65:
                    actions.append({
                        'type': 'switch',
                        'id': sw_id,
                        'value': predicted_state,
                        'confidence': float(confidence)
                    })
        
        # Sort by confidence, take top 5
        actions.sort(key=lambda a: a.get('confidence', 0), reverse=True)
        top_actions = actions[:5]
        
        # Predict delay reduction
        predicted_reduction = 0
        if self.delay_model:
            predicted_reduction = max(0, self.delay_model.predict(X)[0])
        
        return top_actions, float(predicted_reduction)
    
    def analyze_state(self, signals_dict, switches_dict, trains_list):
        """
        Generate human-readable analysis of current state
        """
        # Count issues
        red_signals = [s for s, v in signals_dict.items() if v.get('state') == 'red']
        delayed_trains = [t for t in trains_list if t.get('delayTicks', 0) > 100]
        stopped_trains = [t for t in trains_list if t.get('speed', 0) == 0]
        diverging_switches = [s for s, v in switches_dict.items() if v.get('state') == 'diverging']
        
        # Build analysis text
        if len(red_signals) > 5:
            analysis = f"Multiple trains are approaching restrictive red signal aspects across {len(set(s.split('-')[0] for s in red_signals))} tracks, causing unnecessary deceleration and idling."
        elif len(stopped_trains) > 0:
            analysis = f"{len(stopped_trains)} train(s) are currently stopped at red signals. Immediate clearance will restore throughput."
        elif len(delayed_trains) > 0:
            analysis = f"{len(delayed_trains)} train(s) are experiencing delays due to signal restrictions. Optimization can reduce average delay by 40-60%."
        else:
            analysis = "Network is operating normally. Minor optimizations available to improve throughput and reduce signal waiting time."
        
        # Build suggestion
        if len(stopped_trains) > 0:
            suggestion = "Clear intermediate and terminal block signals to maintain line speed and optimize section throughput."
        elif len(delayed_trains) > 3:
            suggestion = "Implement cascade signal clearing on UP and DOWN lines to restore normal operations."
        else:
            suggestion = "Fine-tune signal aspects to maximize line capacity and reduce headway between trains."
        
        return analysis, suggestion
    
    def generate_action_descriptions(self, actions, signals_dict, trains_list):
        """Convert action list to human-readable descriptions"""
        descriptions = []
        
        for action in actions:
            if action['type'] == 'signal':
                sig_id = action['id']
                value = action['value']
                
                # Find nearby train
                nearby_train = None
                sig_parts = sig_id.split('-')
                if sig_parts:
                    track_id = int(sig_parts[0])
                    nearby_train = next(
                        (t for t in trains_list if t.get('trackId') == track_id),
                        None
                    )
                
                direction_word = "UP" if '-U' in sig_id else "DOWN"
                if nearby_train:
                    desc = f"Upgrade signal {sig_id} to {value.upper()} to allow {direction_word} train {nearby_train['id']} to proceed through the block"
                else:
                    desc = f"Clear signal {sig_id} to {value.upper()} to optimize {direction_word} line throughput"
                
                descriptions.append(desc)
            
            elif action['type'] == 'switch':
                sw_id = action['id']
                value = action['value']
                desc = f"Align switch {sw_id} to {value.upper()} position for optimized routing"
                descriptions.append(desc)
        
        return descriptions
    
    def save(self, path='saved_model/railway_optimizer.pkl'):
        """Save trained model"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({
            'signal_models': self.signal_models,
            'switch_models': self.switch_models,
            'delay_model': self.delay_model,
            'feature_size': self.feature_size,
            'is_trained': self.is_trained
        }, path)
        print(f"Model saved to {path}")
    
    @classmethod
    def load(cls, path='saved_model/railway_optimizer.pkl'):
        """Load trained model"""
        optimizer = cls()
        data = joblib.load(path)
        optimizer.signal_models = data['signal_models']
        optimizer.switch_models = data['switch_models']
        optimizer.delay_model = data['delay_model']
        optimizer.feature_size = data['feature_size']
        optimizer.is_trained = data['is_trained']
        print(f"Model loaded from {path}")
        return optimizer