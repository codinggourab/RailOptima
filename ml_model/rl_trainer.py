# ml_model/rl_trainer.py

import gymnasium as gym
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env

class RailwayEnv(gym.Env):
    """
    Custom Gym environment for railway signal optimization
    The RL agent learns to maximize train throughput
    while maintaining safety
    """
    
    def __init__(self):
        super().__init__()
        
        from data_generator import ALL_SIGNAL_IDS, ALL_SWITCH_IDS
        
        self.n_signals = len(ALL_SIGNAL_IDS)
        self.n_switches = len(ALL_SWITCH_IDS)
        
        # Action space: for each signal (4 states) + each switch (2 states)
        # Simplified: one action = change one signal or switch
        self.action_space = gym.spaces.Discrete(
            self.n_signals * 4 + self.n_switches * 2
        )
        
        # Observation space: current state vector
        self.observation_space = gym.spaces.Box(
            low=0, high=1, 
            shape=(self.n_signals + self.n_switches + 52,),
            dtype=np.float32
        )
        
        self.reset()
    
    def reset(self, seed=None):
        from data_generator import (
            generate_training_scenarios, encode_state
        )
        
        # Random initial state
        scenarios = generate_training_scenarios(1)
        s = scenarios[0]
        
        self.current_signals = s['signals']
        self.current_switches = s['switches']  
        self.current_trains = s['trains']
        self.step_count = 0
        self.max_steps = 20
        
        obs = encode_state(
            self.current_signals, 
            self.current_switches, 
            self.current_trains
        )
        return obs, {}
    
    def step(self, action):
        from data_generator import (
            ALL_SIGNAL_IDS, ALL_SWITCH_IDS,
            STATE_TO_INT, INT_TO_STATE,
            SWITCH_TO_INT, INT_TO_SWITCH,
            encode_state, check_conflicts
        )
        
        # Decode action
        n_signal_actions = len(ALL_SIGNAL_IDS) * 4
        
        if action < n_signal_actions:
            sig_idx = action // 4
            state_idx = action % 4
            sig_id = ALL_SIGNAL_IDS[sig_idx]
            new_state = INT_TO_STATE[state_idx]
            
            old_state = self.current_signals.get(sig_id, {}).get('state', 'red')
            self.current_signals[sig_id] = {'state': new_state}
            
        else:
            sw_action = action - n_signal_actions
            sw_idx = sw_action // 2
            state_idx = sw_action % 2
            sw_id = ALL_SWITCH_IDS[sw_idx]
            new_state = INT_TO_SWITCH[state_idx]
            
            self.current_switches[sw_id] = {'state': new_state}
        
        # Calculate reward
        reward = self._calculate_reward()
        
        # Safety penalty
        conflicts = check_conflicts(self.current_signals)
        reward -= conflicts * 20.0
        
        self.step_count += 1
        done = self.step_count >= self.max_steps
        
        obs = encode_state(
            self.current_signals,
            self.current_switches,
            self.current_trains
        )
        
        return obs, reward, done, False, {}
    
    def _calculate_reward(self):
        """Calculate how good the current state is"""
        reward = 0.0
        
        # Reward: more green signals
        greens = sum(
            1 for s in self.current_signals.values() 
            if s.get('state') == 'green'
        )
        reward += greens * 0.5
        
        # Penalty: stopped trains at red
        for train in self.current_trains:
            if train.get('speed', 0) < 0.1:
                reward -= 2.0
        
        # Reward: reduced total delay
        total_delay = sum(t.get('delayTicks', 0) for t in self.current_trains)
        reward -= total_delay * 0.001
        
        return reward


def train_rl_model():
    """Train using Proximal Policy Optimization"""
    
    print("Training RL model...")
    
    env = make_vec_env(RailwayEnv, n_envs=4)
    
    model = PPO(
        "MlpPolicy",
        env,
        verbose=1,
        learning_rate=3e-4,
        n_steps=512,
        batch_size=64,
        n_epochs=10,
        tensorboard_log="./logs/"
    )
    
    model.learn(total_timesteps=100_000)
    model.save("saved_model/rl_railway_optimizer")
    
    print("RL Model saved!")
    return model


if __name__ == '__main__':
    train_rl_model()
