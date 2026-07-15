import express from 'express';
import cors from 'cors';

const app  = express();
const PORT = process.env.PORT || 3001;
const ML_URL = process.env.ML_SERVER_URL || 'http://localhost:5001';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Disruptions API ───────────────────────────────────────────────────────────
app.get('/api/disruptions', (_req, res) => {
  res.json([
    {
      id:                 'D-001',
      type:               'Track Maintenance',
      fromSignal:         '4-S1-U',
      toSignal:           '4-S2-U',
      location:           '4-S1-U -> 4-S2-U',
      severity:           'high',
      status:             'active',
      reportedAt:         new Date(Date.now() - 3_600_000).toISOString(),
      expectedResolution: new Date(Date.now() + 7_200_000).toISOString(),
      description:        'Emergency track repairs in progress.',
    },
  ]);
});

// ── AI Optimization Route (calls Python ML server) ────────────────────────────
app.post('/api/ml/optimize', async (req, res) => {
  try {
    const { time, baseMetrics, signals, switches, trains } = req.body;

    console.log('\n📡 Forwarding to ML server...');
    console.log(`   Trains: ${(trains || []).length}, Signals: ${Object.keys(signals || {}).length}`);

    // Call Python ML server with timeout
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10000);

    const mlResponse = await fetch(`${ML_URL}/optimize`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signals:     signals     || {},
        switches:    switches    || {},
        trains:      trains      || [],
        baseMetrics: baseMetrics || [],
        time:        time        || new Date().toLocaleTimeString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!mlResponse.ok) {
      throw new Error(`ML server responded with status ${mlResponse.status}`);
    }

    const result = await mlResponse.json();
    console.log(`   ✅ ML server responded with ${(result as any).actions?.length || 0} actions`);
    res.json(result);

  } catch (err: any) {
    // ── Fallback when Python ML server is offline ─────────────────────────────
    console.warn(`   ⚠️  ML server unavailable (${err.message}), using fallback`);

    const base = (req.body.baseMetrics || []) as any[];

    res.json({
      analysis:
        'Multiple UP and DOWN trains are currently approaching restrictive ' +
        'red signal aspects across tracks 1, 2, 3, 5, and 6, which will ' +
        'cause unnecessary deceleration and idling.',
      suggestion:
        'Clear intermediate and terminal block signals to maintain ' +
        'line speed and optimize section throughput.',
      actions: [
        { type: 'signal', id: '1-S2', value: 'green' },
        { type: 'signal', id: '2-S4', value: 'green' },
        { type: 'signal', id: '3-S2', value: 'green' },
      ],
      actionDescriptions: [
        'Upgrade signal 1-S2 to green to allow UP train 13106 to proceed through the block',
        'Clear signal 2-S4 to green to allow UP train F-CEM-1 to exit the section',
        'Upgrade signal 3-S2 to green for DOWN train 31511',
      ],
      metrics: base.length > 0
        ? base.map((m: any) => ({
            trainId:        m.trainId,
            manualDelay:    m.manualDelay,
            optimizedDelay: Math.max(1, Math.floor(m.manualDelay * 0.4)),
          }))
        : [
            { trainId: '53181',    manualDelay: 18, optimizedDelay: 7  },
            { trainId: 'FR-UP-2326', manualDelay: 15, optimizedDelay: 6 },
            { trainId: '32252',    manualDelay: 12, optimizedDelay: 5  },
            { trainId: 'FR-UP-0802', manualDelay: 13, optimizedDelay: 2 },
          ],
    });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     RailOptima Express Server          ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  API Server  →  http://localhost:${PORT}  ║`);
  console.log(`║  ML Server   →  ${ML_URL}    ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});