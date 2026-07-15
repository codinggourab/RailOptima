# ml_model/train_model.py

from data_generator import generate_training_scenarios
from model import RailwayOptimizer

def main():
    print("=" * 50)
    print("RAILWAY SIGNAL OPTIMIZER - TRAINING")
    print("=" * 50)
    
    # Generate training data
    print("\nStep 1: Generating training scenarios...")
    training_data = generate_training_scenarios(num_scenarios=5000)
    
    # Train the model
    print("\nStep 2: Training ML model...")
    optimizer = RailwayOptimizer()
    optimizer.train(training_data)
    
    # Save the model
    print("\nStep 3: Saving model...")
    optimizer.save('saved_model/railway_optimizer.pkl')
    
    # Quick test
    print("\nStep 4: Quick test...")
    test_signals = {
        '1-S2': {'state': 'red'},
        '2-S4': {'state': 'red'},
        '3-S2': {'state': 'red'},
        '1-S1': {'state': 'green'},
    }
    test_switches = {
        'SW-LAD-DN-1': {'state': 'straight'},
        'SW-X-1-2': {'state': 'diverging'},
    }
    test_trains = [
        {'id': '13106', 'trackId': 1, 'x': 500, 'speed': 0, 
         'direction': 'up', 'delayTicks': 200, 'type': 'EXP'},
        {'id': 'F-CEM-1', 'trackId': 2, 'x': 1500, 'speed': 0.5,
         'direction': 'down', 'delayTicks': 150, 'type': 'FREIGHT_CEMENT'},
    ]
    
    actions, delay_reduction = optimizer.predict_actions(
        test_signals, test_switches, test_trains
    )
    
    print(f"\nPredicted actions: {len(actions)}")
    for action in actions:
        print(f"  - {action['type'].upper()}: {action['id']} -> {action['value']} (confidence: {action.get('confidence', 0):.2f})")
    
    print(f"Estimated delay reduction: {delay_reduction:.1f} minutes")
    print("\nTraining complete!")


if __name__ == '__main__':
    main()