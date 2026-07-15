import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Clock, MapPin, Plus, CheckCircle2, 
  RefreshCw, Loader2, XCircle, ChevronDown 
} from 'lucide-react';
import { generateInitialSignals } from '../components/TrackDiagram';

interface Disruption {
  id: string;
  type: string;
  fromSignal?: string;
  toSignal?: string;
  location: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'resolved';
  reportedAt: string;
  expectedResolution: string;
  description: string;
  notifiedStations?: string[];
}

const initialSignals = generateInitialSignals();
const signalList = Object.keys(initialSignals).sort((a, b) => {
  const aMatch = a.match(/^(\d+)-/);
  const bMatch = b.match(/^(\d+)-/);
  if (aMatch && bMatch) {
    const aTrack = parseInt(aMatch[1], 10);
    const bTrack = parseInt(bMatch[1], 10);
    if (aTrack !== bTrack) return aTrack - bTrack;
  }
  return a.localeCompare(b);
});

// ── helpers ──────────────────────────────────────────────────────────────────
const DISRUPTION_TYPES = [
  'Track Maintenance',
  'Signal Failure',
  'Power Outage',
  'Accident',
  'Weather',
] as const;

const UP_STATIONS   = ['DumDum Cant', 'Belgharia', 'Baranagar Road'];
const DOWN_STATIONS = ['Bidhannagar Road', 'Patipukur'];
const ALL_STATIONS  = [...UP_STATIONS, ...DOWN_STATIONS];

const severityMeta = {
  high:   { label: 'High (Major Delays)',    cardBg: 'bg-[var(--color-rail-danger)]/20',  cardBorder: 'border-[var(--color-rail-danger)]/50',  iconBg: 'bg-[var(--color-rail-danger)]/50',  iconText: 'text-[var(--color-rail-danger)]',  badge: 'bg-[var(--color-rail-danger)] text-white' },
  medium: { label: 'Medium (Moderate Delays)', cardBg: 'bg-[var(--color-rail-warning)]/20', cardBorder: 'border-[var(--color-rail-warning)]/50', iconBg: 'bg-[var(--color-rail-warning)]/50', iconText: 'text-[var(--color-rail-warning)]', badge: 'bg-[var(--color-rail-warning)] text-black' },
  low:    { label: 'Low (Minor Delays)',     cardBg: 'bg-blue-950/20',                    cardBorder: 'border-blue-900/50',                    iconBg: 'bg-blue-900/50',                    iconText: 'text-blue-400',                    badge: 'bg-blue-500 text-white' },
};

const defaultForm = () => ({
  type:              DISRUPTION_TYPES[0] as string,
  fromSignal:        signalList[0] ?? '',
  toSignal:          signalList[1] ?? '',
  severity:          'medium' as 'high' | 'medium' | 'low',
  description:       '',
  selectedStations:  [] as string[],
});

// ── component ─────────────────────────────────────────────────────────────────
export default function Disruptions() {
  const [disruptions, setDisruptions]   = useState<Disruption[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding]         = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [resolvingId, setResolvingId]   = useState<string | null>(null);

  // ── form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState(defaultForm);

  const setField = <K extends keyof ReturnType<typeof defaultForm>>(
    key: K,
    value: ReturnType<typeof defaultForm>[K]
  ) => setForm(prev => ({ ...prev, [key]: value }));

  // When fromSignal changes, keep toSignal on the same track
  const handleFromSignalChange = (newFrom: string) => {
    setField('fromSignal', newFrom);
    const trackMatch = newFrom.match(/^(\d+)-/);
    if (trackMatch) {
      const track = trackMatch[1];
      const sameTrack = signalList.filter(s => s.startsWith(`${track}-`) && s !== newFrom);
      if (sameTrack.length > 0 && !sameTrack.includes(form.toSignal)) {
        setField('toSignal', sameTrack[0]);
      }
    }
  };

  const toSignalOptions = signalList.filter(s => {
    const trackMatch = form.fromSignal.match(/^(\d+)-/);
    return trackMatch ? s.startsWith(`${trackMatch[1]}-`) : true;
  });

  const handleStationToggle = (station: string) => {
    setField(
      'selectedStations',
      form.selectedStations.includes(station)
        ? form.selectedStations.filter(s => s !== station)
        : [...form.selectedStations, station]
    );
  };

  const handleSelectAll = () => {
    setField(
      'selectedStations',
      form.selectedStations.length === ALL_STATIONS.length ? [] : ALL_STATIONS
    );
  };

  // ── data fetching ───────────────────────────────────────────────────────────
  const fetchDisruptions = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch('/api/disruptions');
      if (res.ok) {
        const data: Disruption[] = await res.json();
        // Sort: active first, then by newest reportedAt
        data.sort((a, b) => {
          if (a.status !== b.status)
            return a.status === 'active' ? -1 : 1;
          return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
        });
        setDisruptions(data);
      } else {
        console.warn('Disruption fetch returned non-ok status');
      }
    } catch (err) {
      console.warn('Failed to fetch disruptions:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDisruptions();
    const interval = setInterval(() => fetchDisruptions(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchDisruptions]);

  // ── submit ──────────────────────────────────────────────────────────────────
  const handleAddDisruption = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Client-side guard
    if (!form.description.trim()) {
      setSubmitError('Description is required.');
      return;
    }
    if (form.fromSignal === form.toSignal) {
      setSubmitError('From Signal and To Signal must be different.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/disruptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:              form.type,
          fromSignal:        form.fromSignal,
          toSignal:          form.toSignal,
          severity:          form.severity,
          description:       form.description.trim(),
          notifiedStations:  form.selectedStations,
          expectedResolution: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setForm(defaultForm());
        await fetchDisruptions();
      } else {
        // Surface server error message if available
        let msg = `Server error (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody?.error) msg = errBody.error;
        } catch { /* ignore parse error */ }
        setSubmitError(msg);
      }
    } catch (err) {
      setSubmitError('Network error — could not reach server.');
      console.warn('Failed to add disruption:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── resolve ─────────────────────────────────────────────────────────────────
  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/disruptions/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'resolved' }),
      });
      if (res.ok) {
        // Optimistic update — flip status locally, then sync
        setDisruptions(prev =>
          prev.map(d => d.id === id ? { ...d, status: 'resolved' } : d)
        );
        await fetchDisruptions(true);
      } else {
        console.warn('Resolve returned non-ok status:', res.status);
      }
    } catch (err) {
      console.warn('Failed to resolve disruption:', err);
    } finally {
      setResolvingId(null);
    }
  };

  // ── counts ───────────────────────────────────────────────────────────────────
  const activeCount   = disruptions.filter(d => d.status === 'active').length;
  const resolvedCount = disruptions.filter(d => d.status === 'resolved').length;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Disruption Management
          </h1>
          <p className="text-[var(--color-rail-text-muted)] mt-1">
            Monitor and manage active network disruptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Stat pills */}
          {!isLoading && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-[var(--color-rail-danger)]/20 text-[var(--color-rail-danger)] font-bold border border-[var(--color-rail-danger)]/40">
                {activeCount} Active
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400 font-bold border border-emerald-800/40">
                {resolvedCount} Resolved
              </span>
            </div>
          )}

          <button
            onClick={() => fetchDisruptions(true)}
            disabled={isRefreshing}
            title="Refresh"
            className="p-2 rounded bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] 
                       text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => { setIsAdding(v => !v); setSubmitError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-rail-accent)] text-black 
                       font-bold rounded hover:bg-emerald-400 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Report Disruption
          </button>
        </div>
      </div>

      {/* ── Add Form ── */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] 
                       rounded-xl p-6 crystal-card"
          >
            <h2 className="text-xl font-bold text-white mb-5">Report New Disruption</h2>

            {/* Error banner */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg 
                             bg-[var(--color-rail-danger)]/20 border border-[var(--color-rail-danger)]/50 
                             text-[var(--color-rail-danger)] text-sm"
                >
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {submitError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAddDisruption} className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setField('type', e.target.value)}
                  className="w-full bg-black border border-slate-700 rounded p-2 text-white 
                             focus:outline-none focus:border-[var(--color-rail-accent)]"
                >
                  {DISRUPTION_TYPES.map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={e => setField('severity', e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full bg-black border border-slate-700 rounded p-2 text-white 
                             focus:outline-none focus:border-[var(--color-rail-accent)]"
                >
                  {(Object.keys(severityMeta) as Array<keyof typeof severityMeta>).map(k => (
                    <option key={k} value={k}>{severityMeta[k].label}</option>
                  ))}
                </select>
              </div>

              {/* From Signal */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">From Signal</label>
                <select
                  value={form.fromSignal}
                  onChange={e => handleFromSignalChange(e.target.value)}
                  className="w-full bg-black border border-slate-700 rounded p-2 text-white font-mono 
                             focus:outline-none focus:border-[var(--color-rail-accent)]"
                >
                  {signalList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* To Signal */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">To Signal</label>
                <select
                  value={form.toSignal}
                  onChange={e => setField('toSignal', e.target.value)}
                  className="w-full bg-black border border-slate-700 rounded p-2 text-white font-mono 
                             focus:outline-none focus:border-[var(--color-rail-accent)]"
                >
                  {toSignalOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {form.fromSignal === form.toSignal && (
                  <p className="text-xs text-[var(--color-rail-danger)] mt-1">
                    Must differ from From Signal.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-black border border-slate-700 rounded p-2 text-white 
                             resize-none focus:outline-none focus:border-[var(--color-rail-accent)] 
                             placeholder:text-slate-600"
                  placeholder="Provide details about the disruption…"
                />
              </div>

              {/* Station Notifications */}
              <div className="md:col-span-2 border-t border-[var(--color-rail-border)] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-400">
                    Notify Stations
                    {form.selectedStations.length > 0 && (
                      <span className="ml-2 text-xs text-[var(--color-rail-accent)] font-bold">
                        ({form.selectedStations.length} selected)
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-[var(--color-rail-accent)] hover:underline font-medium"
                  >
                    {form.selectedStations.length === ALL_STATIONS.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Up Stations',   list: UP_STATIONS },
                    { title: 'Down Stations', list: DOWN_STATIONS },
                  ].map(group => (
                    <div
                      key={group.title}
                      className="space-y-2 p-3 bg-black/50 border border-[var(--color-rail-border)] rounded"
                    >
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        {group.title}
                      </div>
                      {group.list.map(station => (
                        <label
                          key={station}
                          className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={form.selectedStations.includes(station)}
                            onChange={() => handleStationToggle(station)}
                            className="rounded border-slate-600 bg-black 
                                       text-[var(--color-rail-accent)] 
                                       focus:ring-[var(--color-rail-accent)] cursor-pointer"
                          />
                          {station}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setForm(defaultForm()); setSubmitError(null); }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || form.fromSignal === form.toSignal}
                  className="flex items-center gap-2 px-6 py-2 bg-[var(--color-rail-danger)] 
                             hover:bg-[var(--color-rail-danger)]/80 text-white font-bold rounded 
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                    : 'Submit Report'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── List ── */}
      <div className="space-y-4">
        {isLoading ? (
          /* Skeleton */
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-[var(--color-rail-border)] 
                         bg-[var(--color-rail-card)] animate-pulse"
            />
          ))
        ) : disruptions.length === 0 ? (
          <div className="text-center py-14 bg-[var(--color-rail-card)] rounded-xl 
                          border border-[var(--color-rail-border)] crystal-card">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">No Disruptions</h3>
            <p className="text-slate-400 mt-1">The network is running smoothly.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {disruptions.map(disruption => {
              const meta = severityMeta[disruption.severity];
              const resolved = disruption.status === 'resolved';

              return (
                <motion.div
                  key={disruption.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`p-5 rounded-xl border crystal-card transition-opacity ${
                    resolved
                      ? 'bg-[var(--color-rail-bg)] border-[var(--color-rail-border)] opacity-50'
                      : `${meta.cardBg} ${meta.cardBorder}`
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    {/* Left: icon + info */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`flex-shrink-0 p-3 rounded-lg ${
                        resolved
                          ? 'bg-[var(--color-rail-bg)] text-slate-400'
                          : `${meta.iconBg} ${meta.iconText}`
                      }`}>
                        {resolved
                          ? <CheckCircle2 className="h-6 w-6" />
                          : <AlertTriangle className="h-6 w-6" />}
                      </div>

                      <div className="min-w-0">
                        {/* Title row */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-white">{disruption.type}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                            resolved
                              ? 'bg-slate-700 text-slate-300'
                              : meta.badge
                          }`}>
                            {resolved ? 'Resolved' : disruption.severity}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                          {disruption.description}
                        </p>

                        {/* Meta row */}
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {disruption.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            Reported: {new Date(disruption.reportedAt).toLocaleTimeString([], {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          {!resolved && (
                            <span className="flex items-center gap-1 text-[var(--color-rail-warning)]">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              Est. Resolution: {new Date(disruption.expectedResolution).toLocaleTimeString([], {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>

                        {/* Notified stations */}
                        {disruption.notifiedStations && disruption.notifiedStations.length > 0 && (
                          <div className="mt-2 text-xs text-slate-400">
                            <span className="font-bold text-slate-500 uppercase tracking-wider mr-2">
                              Notified:
                            </span>
                            {disruption.notifiedStations.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: resolve button */}
                    {!resolved && (
                      <button
                        onClick={() => handleResolve(disruption.id)}
                        disabled={resolvingId === disruption.id}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 
                                   bg-[var(--color-rail-bg)] hover:bg-[var(--color-rail-border)] 
                                   text-white text-sm font-bold rounded transition-colors 
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resolvingId === disruption.id
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Resolving…</>
                          : <><CheckCircle2 className="h-4 w-4" /> Mark Resolved</>}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}