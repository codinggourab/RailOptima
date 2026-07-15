# ml_model/api_server.py - Complete file with disruptions added

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import traceback
import uuid
from datetime import datetime, timedelta

from model import RailwayOptimizer
from data_generator import (
    ALL_SIGNAL_IDS, ALL_SWITCH_IDS
)

app = Flask(__name__)
CORS(app)

# ── ML Model ──────────────────────────────────────────────────────────────────
MODEL_PATH = 'saved_model/railway_optimizer.pkl'
optimizer = None

def load_model():
    global optimizer
    try:
        if os.path.exists(MODEL_PATH):
            optimizer = RailwayOptimizer.load(MODEL_PATH)
            print("✅ ML Model loaded successfully")
        else:
            print("⚠️  No trained model found. Using rule-based fallback.")
            optimizer = None
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        optimizer = None

# ── Disruption Store (empty by default — no seeded data) ─────────────────────
disruption_store = []

# ══════════════════════════════════════════════════════════════════════════════
# DISRUPTIONS API
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/disruptions', methods=['GET'])
def get_disruptions():
    """Return all disruptions — active first, then newest first."""
    def sort_key(d):
        ts = d.get('reportedAt', '')
        try:
            # Parse ISO timestamp for sorting
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            epoch = dt.timestamp()
        except Exception:
            epoch = 0
        return (0 if d.get('status') == 'active' else 1, -epoch)

    sorted_list = sorted(disruption_store, key=sort_key)
    return jsonify(sorted_list), 200


@app.route('/api/disruptions', methods=['POST'])
def create_disruption():
    """Create a new disruption report."""
    data = request.get_json(silent=True)

    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # ── Validate required fields ──────────────────────────────────────────────
    type_val    = (data.get('type')        or '').strip()
    description = (data.get('description') or '').strip()
    severity    =  data.get('severity',    '')

    if not type_val:
        return jsonify({'error': 'type is required'}), 400
    if not description:
        return jsonify({'error': 'description is required'}), 400
    if severity not in ('high', 'medium', 'low'):
        return jsonify({'error': 'severity must be high, medium, or low'}), 400

    # ── Build location string from signals ────────────────────────────────────
    from_signal = (data.get('fromSignal') or '').strip() or None
    to_signal   = (data.get('toSignal')   or '').strip() or None

    if from_signal and to_signal:
        location = f"{from_signal} \u2192 {to_signal}"   # →
    elif from_signal:
        location = from_signal
    elif to_signal:
        location = to_signal
    else:
        location = 'Network-wide'

    # ── Expected resolution ───────────────────────────────────────────────────
    expected_resolution = (data.get('expectedResolution') or '').strip()
    if not expected_resolution:
        expected_resolution = (
            datetime.utcnow() + timedelta(hours=1)
        ).isoformat() + 'Z'

    # ── Notified stations ─────────────────────────────────────────────────────
    notified = data.get('notifiedStations')
    if not isinstance(notified, list):
        notified = []

    # ── Build record ──────────────────────────────────────────────────────────
    disruption = {
        'id':                 str(uuid.uuid4()),
        'type':               type_val,
        'fromSignal':         from_signal,
        'toSignal':           to_signal,
        'location':           location,
        'severity':           severity,
        'status':             'active',
        'reportedAt':         datetime.utcnow().isoformat() + 'Z',
        'expectedResolution': expected_resolution,
        'description':        description,
        'notifiedStations':   notified,
    }

    disruption_store.append(disruption)
    print(f"[disruptions] ✅ Created: {disruption['id']} — {type_val} ({severity})")
    return jsonify(disruption), 201


@app.route('/api/disruptions/<disruption_id>', methods=['PATCH'])
def update_disruption(disruption_id):
    """Partially update a disruption (e.g. mark resolved)."""
    data = request.get_json(silent=True)

    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    disruption = next(
        (d for d in disruption_store if d['id'] == disruption_id), None
    )
    if disruption is None:
        return jsonify({'error': f'Disruption {disruption_id} not found'}), 404

    # Only allow safe fields to be patched
    ALLOWED = {'status', 'expectedResolution', 'description'}
    for field in ALLOWED:
        if field in data:
            if field == 'status' and data[field] not in ('active', 'resolved'):
                return jsonify({'error': 'status must be active or resolved'}), 400
            disruption[field] = data[field]

    print(f"[disruptions] 🔄 Updated: {disruption_id} → {disruption.get('status')}")
    return jsonify(disruption), 200


@app.route('/api/disruptions/<disruption_id>', methods=['DELETE'])
def delete_disruption(disruption_id):
    """Permanently delete a disruption."""
    global disruption_store
    disruption = next(
        (d for d in disruption_store if d['id'] == disruption_id), None
    )
    if disruption is None:
        return jsonify({'error': f'Disruption {disruption_id} not found'}), 404

    disruption_store = [d for d in disruption_store if d['id'] != disruption_id]
    print(f"[disruptions] 🗑️  Deleted: {disruption_id}")
    return '', 204


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING ROUTES (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': optimizer is not None and optimizer.is_trained
    })


@app.route('/optimize', methods=['POST'])
def optimize():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        signals_dict  = data.get('signals',     {})
        switches_dict = data.get('switches',    {})
        trains_list   = data.get('trains',      [])
        base_metrics  = data.get('baseMetrics', [])
        current_time  = data.get('time',        '')

        print(f"\n📊 Optimization request received")
        print(f"   Signals: {len(signals_dict)}, Switches: {len(switches_dict)}, Trains: {len(trains_list)}")

        if optimizer and optimizer.is_trained:
            print("   Using ML model...")
            actions, delay_reduction = optimizer.predict_actions(
                signals_dict, switches_dict, trains_list
            )
            analysis, suggestion = optimizer.analyze_state(
                signals_dict, switches_dict, trains_list
            )
            action_descriptions = optimizer.generate_action_descriptions(
                actions, signals_dict, trains_list
            )
        else:
            print("   Using rule-based fallback...")
            actions, delay_reduction, analysis, suggestion, action_descriptions = \
                rule_based_optimize(signals_dict, switches_dict, trains_list)

        metrics = []
        if base_metrics:
            for m in base_metrics:
                manual_delay    = m.get('manualDelay', 10)
                reduction_factor = min(0.6, delay_reduction / max(manual_delay, 1))
                optimized_delay  = max(1, int(manual_delay * (1 - reduction_factor)))
                metrics.append({
                    'trainId':        m.get('trainId', 'Unknown'),
                    'manualDelay':    manual_delay,
                    'optimizedDelay': optimized_delay
                })
        elif trains_list:
            for train in trains_list[:6]:
                manual_delay    = int(train.get('delayTicks', 0) / 20) + 10
                optimized_delay = max(1, int(manual_delay * 0.4))
                metrics.append({
                    'trainId':        train.get('id', 'Unknown'),
                    'manualDelay':    manual_delay,
                    'optimizedDelay': optimized_delay
                })

        clean_actions = [
            {'type': a['type'], 'id': a['id'], 'value': a['value']}
            for a in actions
        ]

        response = {
            'analysis':          analysis,
            'suggestion':        suggestion,
            'actions':           clean_actions,
            'actionDescriptions': action_descriptions,
            'metrics':           metrics,
            'model_used':        'ml' if (optimizer and optimizer.is_trained) else 'rules',
            'actions_count':     len(clean_actions)
        }

        print(f"   Generated {len(clean_actions)} actions")
        return jsonify(response)

    except Exception as e:
        print(f"❌ Error in optimization: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def rule_based_optimize(signals_dict, switches_dict, trains_list):
    actions = []
    action_descriptions = []

    red_signals    = {k: v for k, v in signals_dict.items() if v.get('state') == 'red'}
    stopped_trains = [t for t in trains_list if t.get('speed', 0) < 0.1]
    delayed_trains = [t for t in trains_list if t.get('delayTicks', 0) > 100]

    for train in stopped_trains[:3]:
        track_id  = train.get('trackId', 1)
        direction = train.get('direction', 'up')
        blocking_signals = [
            sig_id for sig_id, sig in signals_dict.items()
            if sig.get('state') == 'red' and sig_id.startswith(str(track_id))
        ]
        if blocking_signals:
            target_sig = blocking_signals[0]
            actions.append({'type': 'signal', 'id': target_sig, 'value': 'green'})
            action_descriptions.append(
                f"Upgrade signal {target_sig} to GREEN to allow "
                f"{direction.upper()} train {train['id']} to proceed through the block"
            )

    tracks_with_trains = set(t.get('trackId') for t in trains_list)
    for sig_id in list(red_signals.keys())[:5]:
        sig_parts = sig_id.split('-')
        if sig_parts:
            try:
                track_id = int(sig_parts[0])
                if track_id not in tracks_with_trains and sig_id not in [a['id'] for a in actions]:
                    actions.append({'type': 'signal', 'id': sig_id, 'value': 'green'})
                    action_descriptions.append(
                        f"Clear signal {sig_id} to GREEN on empty track {track_id}"
                    )
            except (ValueError, IndexError):
                pass
        if len(actions) >= 5:
            break

    for sw_id, sw in switches_dict.items():
        if sw.get('state') == 'diverging' and len(actions) < 5:
            sw_needed = any(t.get('trackId') in [1, 2, 3] for t in trains_list)
            if not sw_needed:
                actions.append({'type': 'switch', 'id': sw_id, 'value': 'straight'})
                action_descriptions.append(
                    f"Normalize switch {sw_id} to STRAIGHT - optimizing routing"
                )

    num_tracks_affected = len(set(s.split('-')[0] for s in red_signals.keys()))

    if stopped_trains:
        analysis   = (
            f"Multiple UP and DOWN trains are currently approaching restrictive "
            f"red signal aspects across tracks "
            f"{', '.join(str(t) for t in list(tracks_with_trains)[:5])}, "
            f"which will cause unnecessary deceleration and idling."
        )
        suggestion = (
            "Clear intermediate and terminal block signals to maintain "
            "line speed and optimize section throughput."
        )
    elif delayed_trains:
        analysis   = (
            f"{len(delayed_trains)} trains are experiencing signal-related delays. "
            f"Optimizing {len(red_signals)} red aspects across the network."
        )
        suggestion = (
            "Implement progressive signal clearing to reduce cumulative delays "
            "and restore normal headway intervals."
        )
    else:
        analysis   = (
            f"Network is operating with minor inefficiencies. "
            f"{len(red_signals)} signals are at red aspect across {num_tracks_affected} tracks."
        )
        suggestion = (
            "Fine-tune signal aspects to maximize throughput "
            "and reduce train waiting time at block sections."
        )

    delay_reduction = len(actions) * 3.5
    return actions, delay_reduction, analysis, suggestion, action_descriptions


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("🚂 Railway Signal Optimizer ML API")
    print("=" * 40)
    load_model()
    print(f"Starting server on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)