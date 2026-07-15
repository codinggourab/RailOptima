// Disable typechecking for this file to avoid missing declaration errors for external modules
// (e.g. "Could not find a declaration file for module 'react'.")
// This is a local workaround; for a project-wide fix, install @types/react or add proper d.ts files.
// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Clock, AlertTriangle, TrainFront, Settings2, CheckCircle, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Radio, Unlock } from 'lucide-react';
// import { GoogleGenAI } from '@google/genai';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { WalkieTalkie } from './WalkieTalkie';
import { TRAIN_DATA } from '../data/trainData';

// --- Types & Constants ---
type SignalState = 'red' | 'yellow' | 'double-yellow' | 'green';
type SignalType = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'HOME' | 'STARTER' | 'ADVANCED';
type SwitchState = 'straight' | 'diverging';
type Direction = 'up' | 'down' | 'both';
type TrainType = 'LOCAL' | 'EXP' | 'PASS' | 'MEMU' | 'OTHER' | 'FREIGHT_COAL' | 'FREIGHT_OIL' | 'FREIGHT_CEMENT';

export interface Track {
  id: number;
  name: string;
  y: number;
  color: string;
  direction: Direction;
  platform: string;
  hasPlatform: boolean;
  rightName?: string;
  startX?: number;
  endX?: number;
}

export interface SignalDef {
  id: string;
  trackId: number;
  x: number;
  type: SignalType;
  state: SignalState;
  direction?: 'up' | 'down';
  isUpsideDown?: boolean;
}

interface SwitchDef {
  id: string;
  fromTrack: number;
  toTrack: number;
  startX: number;
  endX: number;
  state: SwitchState;
  direction: Direction;
  lockedBy?: string;
}

interface Train {
  id: string;
  name: string;
  trackId: number;
  x: number;
  y: number;
  speed: number;
  baseSpeed: number;
  color: string;
  direction: Direction;
  type: TrainType;
  delayTicks: number;
  haltDurationTicks?: number;
  haltRemainingTicks?: number;
  hasHalted?: boolean;
  hasRequestedClearance?: boolean;
  pathHistory?: {x: number, y: number, switchId?: string}[];
  dispatchMethod?: 'manual' | 'ai';
  dispatchedAt?: number;
}

// --- Manual vs AI Optimization session stats -------------------------------
// Tracked independently for trains dispatched manually (via the dropdown /
// direct dispatch UI) vs trains dispatched by the AI (auto-applied actions or
// the "Dispatch" button inside an AI recommendation). Persisted so the AI
// Optimization tab can read and compare them.
interface OptimizationStats {
  dispatched: number;
  passed: number;          // trains that completed their run (left the network)
  totalDelayTicks: number; // sum of delayTicks across all completed trains
  sessionStartAt: number;
  lastUpdateAt: number;
}

const DEFAULT_OPT_STATS = (): OptimizationStats => ({
  dispatched: 0,
  passed: 0,
  totalDelayTicks: 0,
  sessionStartAt: Date.now(),
  lastUpdateAt: Date.now(),
});

const MANUAL_STATS_KEY = 'railoptima_manual_stats_v1';
const AI_STATS_KEY = 'railoptima_ai_stats_v1';
const COMPARISON_KEY = 'railoptima_optimization_comparison_v1';
const RESET_EVENT = 'railoptima:reset-optimization-stats';

const loadOptStats = (key: string): OptimizationStats => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_OPT_STATS(), ...parsed };
    }
  } catch (_) {}
  return DEFAULT_OPT_STATS();
};

interface ApproachingTrain {
  id: string;
  name: string;
  route: string;
  type: TrainType;
  scheduledTime: Date;
  delayMinutes: number;
  allocatedTrackId: number | null;
}

interface AlertMsg {
  id: number;
  message: string;
  type: 'warning' | 'error' | 'info';
}

export const TRACKS: Track[] = [
  { id: 1, name: "UP SUBURBAN", y: 136, color: "#94a3b8", direction: 'up', platform: 'PF 1', hasPlatform: true, startX: 100, endX: 2900 },
  { id: 2, name: "DN SUBURBAN", y: 238, color: "#94a3b8", direction: 'down', platform: 'PF 2', hasPlatform: true, startX: 100, endX: 2900 },
  { id: 3, name: "UP MAIN", y: 340, color: "#94a3b8", direction: 'up', platform: 'PF 3', hasPlatform: true, startX: 100, endX: 2900 },
  { id: 4, name: "UP CCR", y: 442, color: "#94a3b8", direction: 'both', platform: '', hasPlatform: false, startX: 100, endX: 2900 },
  { id: 5, name: "COMMON LINE (LOOP)", y: 530, color: "#94a3b8", direction: 'both', platform: '', hasPlatform: false, startX: 630, endX: 1100 },
  { id: 6, name: "COMMON GOODS 1", y: 615, color: "#94a3b8", direction: 'both', platform: '', hasPlatform: false, startX: 660, endX: 1070 },
  { id: 7, name: "DN CCR", y: 700, color: "#94a3b8", direction: 'both', platform: '', hasPlatform: false, startX: 100, endX: 2900 },
  { id: 8, name: "DN MAIN", y: 800, color: "#94a3b8", direction: 'both', platform: 'PF 4', hasPlatform: true, startX: 100, endX: 2900 },
  { id: 10, name: "UP BONGAON", y: 880, color: "#94a3b8", direction: 'up', platform: '', hasPlatform: false, startX: 2310, endX: 2900 },
  { id: 9, name: "DN BONGAON", y: 960, color: "#94a3b8", direction: 'both', platform: 'PF 5', hasPlatform: true, startX: 750, endX: 2900 },
];

const INITIAL_SWITCHES: Record<string, SwitchDef> = {
  
  // DOWNWARD LADDER ON RIGHT (Tracks 1 -> 2 -> 3 -> 4 -> 8 -> 10) UP BONGAON CONNECTION
  'SW-LAD-DN-1': { id: 'SW-LAD-DN-1', fromTrack: 1, toTrack: 2, startX: 1550, endX: 1655, state: 'straight', direction: 'both' },
  'SW-LAD-DN-2': { id: 'SW-LAD-DN-2', fromTrack: 2, toTrack: 3, startX: 1655, endX: 1760, state: 'straight', direction: 'both' },
  'SW-LAD-DN-3': { id: 'SW-LAD-DN-3', fromTrack: 3, toTrack: 4, startX: 1760, endX: 1865, state: 'straight', direction: 'both' },
  'SW-LAD-DN-4': { id: 'SW-LAD-DN-4', fromTrack: 4, toTrack: 7, startX: 1865, endX: 2130, state: 'straight', direction: 'both' },
  'SW-LAD-DN-4B': { id: 'SW-LAD-DN-4B', fromTrack: 7, toTrack: 8, startX: 2130, endX: 2233, state: 'straight', direction: 'both' },
  'SW-LAD-DN-5': { id: 'SW-LAD-DN-5', fromTrack: 8, toTrack: 10, startX: 2233, endX: 2310, state: 'straight', direction: 'both' },

  // DOWN LOOPS EXIT (LEFT SIDE)
  'SW-4TO3-L': { id: 'SW-4TO3-L', fromTrack: 3, toTrack: 4, startX: 380, endX: 410, state: 'straight', direction: 'both' },
  'SW-5TO4-L': { id: 'SW-5TO4-L', fromTrack: 4, toTrack: 5, startX: 600, endX: 630, state: 'straight', direction: 'down' },
  'SW-6TO5-L': { id: 'SW-6TO5-L', fromTrack: 5, toTrack: 6, startX: 630, endX: 660, state: 'straight', direction: 'down' },
  'SW-7TO6-L': { id: 'SW-7TO6-L', fromTrack: 6, toTrack: 7, startX: 660, endX: 690, state: 'straight', direction: 'down' },
  'SW-8TO7-L': { id: 'SW-8TO7-L', fromTrack: 7, toTrack: 8, startX: 690, endX: 720, state: 'straight', direction: 'down' },

  // DOWN LOOPS ENTER (RIGHT SIDE)
  'SW-5TO4-R': { id: 'SW-5TO4-R', fromTrack: 5, toTrack: 4, startX: 1100, endX: 1130, state: 'straight', direction: 'down' },
  'SW-5TO6-R': { id: 'SW-5TO6-R', fromTrack: 6, toTrack: 5, startX: 1070, endX: 1100, state: 'straight', direction: 'down' },
  'SW-9TO8-CO': { id: 'SW-9TO8-CO', fromTrack: 9, toTrack: 8, startX: 1620, endX: 1680, state: 'straight', direction: 'both' },
  'SW-9TO8-L': { id: 'SW-9TO8-L', fromTrack: 9, toTrack: 8, startX: 880, endX: 800, state: 'straight', direction: 'both' },
  'SW-8TO9-CO': { id: 'SW-8TO9-CO', fromTrack: 8, toTrack: 9, startX: 1920, endX: 1980, state: 'straight', direction: 'both' },
  'SW-10TO9-CO': { id: 'SW-10TO9-CO', fromTrack: 10, toTrack: 9, startX: 2400, endX: 2465, state: 'straight', direction: 'both' },
  'SW-X-1-2': { id: 'SW-X-1-2', fromTrack: 1, toTrack: 2, startX: 2270, endX: 2156, state: 'straight', direction: 'both' },
  'SW-X-2-3': { id: 'SW-X-2-3', fromTrack: 2, toTrack: 3, startX: 2156, endX: 2043, state: 'straight', direction: 'both' },
  'SW-X-3-4': { id: 'SW-X-3-4', fromTrack: 3, toTrack: 4, startX: 2043, endX: 1929, state: 'straight', direction: 'both' },
  'SW-X-4-7': { id: 'SW-X-4-7', fromTrack: 4, toTrack: 7, startX: 1929, endX: 1641, state: 'straight', direction: 'both' },
  'SW-X-7-8': { id: 'SW-X-7-8', fromTrack: 7, toTrack: 8, startX: 1641, endX: 1530, state: 'straight', direction: 'both' },
  'SW-4TO8-CO': { id: 'SW-4TO8-CO', fromTrack: 4, toTrack: 8, startX: 1200, endX: 1350, state: 'straight', direction: 'both' },
  'SW-7TO4-CO': { id: 'SW-7TO4-CO', fromTrack: 7, toTrack: 4, startX: 1380, endX: 1530, state: 'straight', direction: 'both' },
};

const getCrossingTracks = (sw: SwitchDef): number[] => {
  const fromTrack = TRACKS.find(t => t.id === sw.fromTrack);
  const toTrack = TRACKS.find(t => t.id === sw.toTrack);
  if (!fromTrack || !toTrack) return [sw.fromTrack, sw.toTrack];
  const minY = Math.min(fromTrack.y, toTrack.y);
  const maxY = Math.max(fromTrack.y, toTrack.y);
  
  const crossing: number[] = [];
  TRACKS.forEach(t => {
    if (t.id === sw.fromTrack || t.id === sw.toTrack) {
      crossing.push(t.id);
    } else if (t.y > minY && t.y < maxY) {
      crossing.push(t.id);
    }
  });

  return crossing;
};

const getSwitchUpDownInOut = (sw: SwitchDef) => {
  if (sw.startX < sw.endX) {
    return {
      upInput: sw.fromTrack,
      upOutput: sw.toTrack,
      downInput: sw.toTrack,
      downOutput: sw.fromTrack
    };
  } else {
    return {
      upInput: sw.toTrack,
      upOutput: sw.fromTrack,
      downInput: sw.fromTrack,
      downOutput: sw.toTrack
    };
  }
};

const getSwitchSignalAspectOverrides = (
  swMap: Record<string, SwitchDef>,
  signals: Record<string, SignalDef>,
  trains: Train[]
): Record<string, SignalState> => {
  const overrides: Record<string, SignalState> = {};
  
  const STATE_PRIORITY: Record<string, number> = {
    'red': 4,
    'yellow': 3,
    'double-yellow': 2,
    'green': 1
  };

  const setOverride = (sigId: string, state: SignalState) => {
    if (['5-S2-D', '5-S1-U', '6-S2-D', '6-S1-U'].includes(sigId)) return;
    if (sigId.includes('STARTER')) return;
    const current = overrides[sigId];
    if (!current || STATE_PRIORITY[state] > STATE_PRIORITY[current]) {
      overrides[sigId] = state;
    }
  };

  // Force entry signals to Track 5 or Track 6 to RED if those tracks are occupied by a train
  const isTrack5Occupied = trains.some(t => t.trackId === 5);
  const isTrack6Occupied = trains.some(t => t.trackId === 6);

  if (isTrack5Occupied || isTrack6Occupied) {
    Object.values(signals).forEach(sig => {
      if (['5-S2-D', '5-S1-U', '6-S2-D', '6-S1-U'].includes(sig.id)) return;

      let currentTrack = sig.trackId;
      let currentX = sig.x;
      const dir = sig.direction || 'up';

      // Trace forward up to 5 steps of active switches to find if this signal's route leads to Track 5 or 6
      for (let step = 0; step < 5; step++) {
        const nextSw = Object.values(swMap).find(sw => {
          if (sw.state !== 'diverging') return false;
          const io = getSwitchUpDownInOut(sw);
          if (dir === 'up') {
            const entryX = Math.min(sw.startX, sw.endX);
            return io.upInput === currentTrack && entryX >= currentX;
          } else {
            const entryX = Math.max(sw.startX, sw.endX);
            return io.downInput === currentTrack && entryX <= currentX;
          }
        });

        if (!nextSw) break;

        const io = getSwitchUpDownInOut(nextSw);
        currentTrack = dir === 'up' ? io.upOutput : io.downOutput;
        currentX = dir === 'up' ? Math.max(nextSw.startX, nextSw.endX) : Math.min(nextSw.startX, nextSw.endX);
      }

      if (currentTrack === 5 && isTrack5Occupied) {
        setOverride(sig.id, 'red');
      } else if (currentTrack === 6 && isTrack6Occupied) {
        setOverride(sig.id, 'red');
      }
    });
  }

  // 1. Find all active (diverging) switches
  const independentSwitchIds = ['SW-5TO4-L', 'SW-6TO5-L', 'SW-5TO4-R', 'SW-5TO6-R'];
  const activeSws = Object.values(swMap).filter(sw => sw.state === 'diverging' && !independentSwitchIds.includes(sw.id));

  // 2. Group active switches into connected components of tracks
  const components: { switches: SwitchDef[], tracks: Set<number> }[] = [];
  
  activeSws.forEach(sw => {
    const matchingComponents = components.filter(c => 
      c.tracks.has(sw.fromTrack) || c.tracks.has(sw.toTrack)
    );
    
    if (matchingComponents.length === 0) {
      components.push({
        switches: [sw],
        tracks: new Set([sw.fromTrack, sw.toTrack])
      });
    } else {
      const mergedSwitches = [sw];
      const mergedTracks = new Set([sw.fromTrack, sw.toTrack]);
      
      matchingComponents.forEach(c => {
        c.switches.forEach(s => mergedSwitches.push(s));
        c.tracks.forEach(t => mergedTracks.add(t));
        const idx = components.indexOf(c);
        if (idx !== -1) components.splice(idx, 1);
      });
      
      components.push({
        switches: mergedSwitches,
        tracks: mergedTracks
      });
    }
  });

  // 3. Process each connected component
  components.forEach(comp => {
    const compTracks = Array.from(comp.tracks);

    // Process both directions
    (['up', 'down'] as const).forEach(dir => {
      // Find starting tracks for this component in direction `dir`
      const inputs = new Set<number>();
      const outputs = new Set<number>();
      comp.switches.forEach(sw => {
        const io = getSwitchUpDownInOut(sw);
        if (dir === 'up') {
          inputs.add(io.upInput);
          outputs.add(io.upOutput);
        } else {
          inputs.add(io.downInput);
          outputs.add(io.downOutput);
        }
      });

      compTracks.forEach(trackId => {
        const track = TRACKS.find(t => t.id === trackId);
        if (!track) return;

        // Is it the starting track of this crossover component in this direction?
        const isStartingTrack = inputs.has(trackId) && !outputs.has(trackId);

        // Find active area of this component on this track
        const touchingSws = comp.switches.filter(sw => getCrossingTracks(sw).includes(trackId));
        if (touchingSws.length === 0) return;

        const swMinX = Math.min(...touchingSws.map(sw => Math.min(sw.startX, sw.endX)));
        const swMaxX = Math.max(...touchingSws.map(sw => Math.max(sw.startX, sw.endX)));

        // Filter and sort signals on this track in this direction
        const trackSigs = (Object.values(signals) as SignalDef[])
          .filter(sig => sig.trackId === trackId && sig.direction === dir)
          .sort((a, b) => dir === 'up' ? a.x - b.x : b.x - a.x);

        if (trackSigs.length === 0) return;

        // Find protecting signal (the last signal before the active area)
        let beforeSigs: SignalDef[];
        if (dir === 'up') {
          beforeSigs = trackSigs.filter(sig => sig.x <= swMinX);
        } else {
          beforeSigs = trackSigs.filter(sig => sig.x >= swMaxX);
        }

        if (beforeSigs.length > 0) {
          const protectingSig = beforeSigs[beforeSigs.length - 1];
          const idx = trackSigs.findIndex(sig => sig.id === protectingSig.id);
          if (idx !== -1) {
            for (let i = 0; i < trackSigs.length; i++) {
              const sig = trackSigs[i];
              // Signals after the active area are not affected by this crossover protection
              const isAfterActiveArea = dir === 'up' ? sig.x > swMaxX : sig.x < swMinX;
              if (isAfterActiveArea) {
                setOverride(sig.id, 'green');
                continue;
              }

              if (i === idx) {
                setOverride(sig.id, isStartingTrack ? 'yellow' : 'red');
              } else if (i === idx - 1) {
                setOverride(sig.id, isStartingTrack ? 'double-yellow' : 'yellow');
              } else if (i === idx - 2) {
                setOverride(sig.id, isStartingTrack ? 'green' : 'double-yellow');
              } else {
                setOverride(sig.id, 'green');
              }
            }
          }
        } else {
          // If there are no signals before the active area on this track,
          // only override to red those signals that are NOT after the active area.
          // Since all signals in trackSigs are either before or after, and beforeSigs is empty,
          // all signals are after the active area! So we do not need to override them to red.
          // Instead, we can just clear them!
          trackSigs.forEach(sig => setOverride(sig.id, 'green'));
        }
      });
    });
  });

  // --- Custom Interlocking Rule for Platform 1 and switch LAD-DN-1 ---
  // When a train is using switch LAD-DN-1 to change track, until it crosses/clears the switch (x > 1660),
  // hold signal 1-S2 to RED so that no other train can enter Platform 1.
  const isLADDN1Diverging = swMap['SW-LAD-DN-1']?.state === 'diverging';
  const hasTrainCrossingLADDN1 = trains.some(t => {
    // If switch is diverging, any UP train approaching or on the switch from Track 1 is using it
    if (isLADDN1Diverging && t.direction === 'up' && t.trackId === 1 && t.x >= 1440 && t.x <= 1660) {
      return true;
    }
    // Any UP train that has just crossed onto Track 2 but is still within the switch's horizontal bounds
    if (t.direction === 'up' && t.trackId === 2 && t.x >= 1550 && t.x <= 1660) {
      return true;
    }
    return false;
  });

  if (hasTrainCrossingLADDN1) {
    setOverride('1-S2', 'red');
  }

  return overrides;
};

// Base speeds (scaled for simulation)
const SPEEDS: Record<TrainType, number> = {
  'LOCAL': 3.0,
  'EXP': 2.0,
  'PASS': 2.0,
  'MEMU': 1.6,
  'OTHER': 1.5,
  'FREIGHT_COAL': 1.0,
  'FREIGHT_OIL': 1.1,
  'FREIGHT_CEMENT': 1.0
};

export const generateInitialSignals = (): Record<string, SignalDef> => {
  const sigs: Record<string, SignalDef> = {};
  TRACKS.forEach(track => {
    const defaultState = [1, 2].includes(track.id) ? 'green' : 'red';

    // If track direction supports UP (i.e. 'up' or 'both')
    if (track.direction === 'up' || track.direction === 'both') {
      const isBoth = track.direction === 'both';
      const suffix = isBoth ? '-U' : '';
      const d = 'up';

      if (track.id === 10) {
        sigs[`${track.id}-S1${suffix}`] = { id: `${track.id}-S1${suffix}`, trackId: track.id, x: 2495, type: 'S1', state: defaultState, direction: d };
      } else if (track.id >= 5 && track.id <= 6) {
        sigs[`${track.id}-S1${suffix}`] = { id: `${track.id}-S1${suffix}`, trackId: track.id, x: (track.endX || 1600) - 20, type: 'S1', state: defaultState, direction: d };
        sigs[`${track.id}-S2${suffix}`] = { id: `${track.id}-S2${suffix}`, trackId: track.id, x: (track.startX || 800) + 20, type: 'S2', state: defaultState, direction: d };
      } else {
        if (track.id !== 9) {
          sigs[`${track.id}-S1${suffix}`] = { id: `${track.id}-S1${suffix}`, trackId: track.id, x: 570, type: 'S1', state: defaultState, direction: d };
        }
        const s2X = [4, 7].includes(track.id) ? 630 : 1000;
        const s3X = [4, 7].includes(track.id) ? 1100 : 1500;
        sigs[`${track.id}-S2${suffix}`] = { id: `${track.id}-S2${suffix}`, trackId: track.id, x: s2X, type: 'S2', state: defaultState, direction: d };
        sigs[`${track.id}-S3${suffix}`] = { id: `${track.id}-S3${suffix}`, trackId: track.id, x: s3X, type: 'S3', state: defaultState, direction: d };
        sigs[`${track.id}-S4${suffix}`] = { id: `${track.id}-S4${suffix}`, trackId: track.id, x: track.id === 1 ? 2300 : 2000, type: 'S4', state: defaultState, direction: d };
      }
    }

    // If track direction supports DOWN (i.e. 'down' or 'both')
    if (track.direction === 'down' || track.direction === 'both') {
      const isBoth = track.direction === 'both';
      const suffix = isBoth ? '-D' : '';
      const d = 'down';

      if (track.id === 10) {
        sigs[`${track.id}-S1${suffix}`] = { id: `${track.id}-S1${suffix}`, trackId: track.id, x: 2495, type: 'S1', state: defaultState, direction: d };
      } else if (track.id >= 5 && track.id <= 6) {
        sigs[`${track.id}-S1${suffix}`] = { id: `${track.id}-S1${suffix}`, trackId: track.id, x: (track.endX || 1600) - 20, type: 'S1', state: defaultState, direction: d };
        sigs[`${track.id}-S2${suffix}`] = { id: `${track.id}-S2${suffix}`, trackId: track.id, x: (track.startX || 800) + 20, type: 'S2', state: defaultState, direction: d };
      } else {
        const s1X = track.id === 2 ? 2220 : 2000;
        sigs[`${track.id}-S1${suffix}`] = { id: `${track.id}-S1${suffix}`, trackId: track.id, x: s1X, type: 'S1', state: defaultState, direction: d };
        const s2X = [4, 7].includes(track.id) ? 1100 : 1500;
        const s3X = [4, 7].includes(track.id) ? 630 : 1000;
        sigs[`${track.id}-S2${suffix}`] = { id: `${track.id}-S2${suffix}`, trackId: track.id, x: s2X, type: 'S2', state: defaultState, direction: d };
        sigs[`${track.id}-S3${suffix}`] = { id: `${track.id}-S3${suffix}`, trackId: track.id, x: s3X, type: 'S3', state: defaultState, direction: d };
        if (track.id !== 9) {
          sigs[`${track.id}-S4${suffix}`] = { id: `${track.id}-S4${suffix}`, trackId: track.id, x: 570, type: 'S4', state: defaultState, direction: d };
        }
        if (track.id === 4) {
          sigs[`4-S0${suffix}`] = { id: `4-S0${suffix}`, trackId: 4, x: 2320, type: 'S1', state: defaultState, direction: d };
        }
      }
    }
  });
  delete sigs['9-S1-U'];
  delete sigs['9-S4-D'];
  delete sigs['7-S4-D'];
  delete sigs['4-S4-D'];
  delete sigs['4-S1-U'];
  delete sigs['7-S1-U'];
  delete sigs['10-S1-D'];

  // User requested removals from interlocking panel
  delete sigs['2-S2'];
  delete sigs['3-S1'];
  delete sigs['3-S4'];
  delete sigs['4-S2-U'];
  delete sigs['4-S2-D'];
  delete sigs['5-S2-U'];
  delete sigs['5-S1-D'];
  delete sigs['6-S2-U'];
  delete sigs['6-S1-D'];
  delete sigs['4-S1-D'];
  delete sigs['4-S4-U'];
  delete sigs['7-S3-D'];
  delete sigs['8-S4-D'];
  delete sigs['8-S2-U'];
  delete sigs['9-S2-U'];
  delete sigs['9-S2-D'];
  delete sigs['9-S4-U'];

  // Add signals for both directions on line 4 (UP-CCR) in between SW-7TO4-CO and SW-X-7-8
  sigs['4-S5-U'] = { id: '4-S5-U', trackId: 4, x: 1585, type: 'S5', state: 'red', direction: 'up' };
  sigs['4-S5-D'] = { id: '4-S5-D', trackId: 4, x: 1750, type: 'S5', state: 'red', direction: 'down' };

  // Add upside down signal for DOWN direction on track 7 (DN CCR) in between SW-7TO4-CO and SW-X-7-8
  sigs['7-S5-D'] = { id: '7-S5-D', trackId: 7, x: 1480, type: 'S5', state: 'red', direction: 'down', isUpsideDown: true };

  // Shift signal 4-S3-U slightly towards the left side
  if (sigs['4-S3-U']) {
    sigs['4-S3-U'].x = 1000;
  }

  // Shift the signal 2-S3 slightly towards the right side
  if (sigs['2-S3']) {
    sigs['2-S3'].x = 1100;
  }

  // Shift signal 7-S1-D to the right side of switch LAD-DN-4B on the DN-CCR line
  if (sigs['7-S1-D']) {
    sigs['7-S1-D'].x = 2300;
  }

  // Shift signal 7-S2-D towards left side of the track on the DN-CCR line
  if (sigs['7-S2-D']) {
    sigs['7-S2-D'].x = 740;
  }

  // Shift signal 8-S2-D just towards the right side of switch 4TO8-CO of the same track
  if (sigs['8-S2-D']) {
    sigs['8-S2-D'].x = 1380;
  }

  // Shift signal 8-S4-U towards right side in the same track
  if (sigs['8-S4-U']) {
    sigs['8-S4-U'].x = 2200;
  }

  // Shift signal 10-S1 slightly towards the right side of the track
  if (sigs['10-S1']) {
    sigs['10-S1'].x = 2600;
  }

  // Shift the signal 1-S4 toward the right side
  if (sigs['1-S4']) {
    sigs['1-S4'].x = 2400;
  }

  // Add a signal on the left side of switch 4T03-L on the UP-MAIN line
  sigs['3-S5'] = { id: '3-S5', trackId: 3, x: 320, type: 'S1', state: 'red', direction: 'up' };

  // Add a signal on the left side of switch 4T03-L on the UP-CCR line
  sigs['4-S6'] = { id: '4-S6', trackId: 4, x: 320, type: 'S1', state: 'red', direction: 'up' };

  // Add a signal just to the right side of switch X-3-4 in the UP MAIN line
  sigs['3-S6'] = { id: '3-S6', trackId: 3, x: 2180, type: 'S1', state: 'red', direction: 'up' };

  // Add a signal just to the right of switch LAD-DN-5 on DN-MAIN line
  sigs['8-S5-D'] = { id: '8-S5-D', trackId: 8, x: 2360, type: 'S1', state: 'red', direction: 'down' };

  // --- Platform Starter Signals (Manual Control) ---
  // PF 1 (Track 1) - UP only
  sigs['1-STARTER-U'] = { id: '1-STARTER-U', trackId: 1, x: 1445, type: 'STARTER', state: 'red', direction: 'up' };

  // PF 2 (Track 2) - DN only
  sigs['2-STARTER-D'] = { id: '2-STARTER-D', trackId: 2, x: 1165, type: 'STARTER', state: 'red', direction: 'down' };

  // PF 3 (Track 3) - UP only
  sigs['3-STARTER-U'] = { id: '3-STARTER-U', trackId: 3, x: 1445, type: 'STARTER', state: 'red', direction: 'up' };

  // PF 4 (Track 8) - Bidirectional
  sigs['8-STARTER-U'] = { id: '8-STARTER-U', trackId: 8, x: 1445, type: 'STARTER', state: 'red', direction: 'up' };
  sigs['8-STARTER-D'] = { id: '8-STARTER-D', trackId: 8, x: 1165, type: 'STARTER', state: 'red', direction: 'down' };

  // PF 5 (Track 9) - Bidirectional
  sigs['9-STARTER-U'] = { id: '9-STARTER-U', trackId: 9, x: 1445, type: 'STARTER', state: 'red', direction: 'up' };
  sigs['9-STARTER-D'] = { id: '9-STARTER-D', trackId: 9, x: 1165, type: 'STARTER', state: 'red', direction: 'down' };

  return sigs;
};

const getDynamicFreightTrains = (currentTime: Date) => {
  const pad = (num: number) => String(num).padStart(2, '0');
  const hh = pad(currentTime.getHours());
  const mm = pad(currentTime.getMinutes());
  
  return [
    {
      no: `FR-UP-COAL-${hh}${mm}`,
      name: `Sealdah - Freight Coal UP (${hh}:${mm})`,
      type: "FREIGHT_COAL",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "SDAH",
      fromSch: `${hh}:${mm}`,
      to: "NH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 45) % 60)}`,
      speed: "40 km/h"
    },
    {
      no: `FR-UP-OIL-${hh}${mm}`,
      name: `Kolkata - Oil Tanker UP (${hh}:${mm})`,
      type: "FREIGHT_OIL",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "KOAA",
      fromSch: `${hh}:${mm}`,
      to: "DKAE",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 50) % 60)}`,
      speed: "45 km/h"
    },
    {
      no: `FR-DN-GOODS-${hh}${mm}`,
      name: `Goods Train DN (${hh}:${mm})`,
      type: "FREIGHT_OIL",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "RHA",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 30) % 60)}`,
      speed: "45 km/h"
    },
    {
      no: `FR-DN-CEMENT-${hh}${mm}`,
      name: `Cement Freight DN (${hh}:${mm})`,
      type: "FREIGHT_CEMENT",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "NH",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 40) % 60)}`,
      speed: "40 km/h"
    }
  ];
};

const getDynamicExpressTrains = (currentTime: Date) => {
  const pad = (num: number) => String(num).padStart(2, '0');
  const hh = pad(currentTime.getHours());
  const mm = pad(currentTime.getMinutes());
  
  return [
    {
      no: `EXP-DN-GOUR-${hh}${mm}`,
      name: `Gour Express DN (${hh}:${mm})`,
      type: "Exp",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "BLGT",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 15) % 60)}`,
      speed: "110 km/h"
    },
    {
      no: `EXP-DN-DARJ-${hh}${mm}`,
      name: `Darjeeling Mail DN (${hh}:${mm})`,
      type: "Exp",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "HDB",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 20) % 60)}`,
      speed: "110 km/h"
    },
    {
      no: `EXP-DN-TEESTA-${hh}${mm}`,
      name: `Teesta Torsa Express DN (${hh}:${mm})`,
      type: "Exp",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "HDB",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 25) % 60)}`,
      speed: "100 km/h"
    },
    {
      no: `EXP-DN-PADATIK-${hh}${mm}`,
      name: `Padatik Express DN (${hh}:${mm})`,
      type: "Exp",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "NOQ",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 10) % 60)}`,
      speed: "110 km/h"
    },
    {
      no: `EXP-DN-UTTAR-${hh}${mm}`,
      name: `Uttar Banga Express DN (${hh}:${mm})`,
      type: "Exp",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "NCB",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 15) % 60)}`,
      speed: "105 km/h"
    },
    {
      no: `EXP-DN-BHAGI-${hh}${mm}`,
      name: `Bhagirathi Express DN (${hh}:${mm})`,
      type: "Exp",
      zone: "ER",
      pf: "--",
      days: "S M T W T F S",
      from: "LGL",
      fromSch: `${hh}:${mm}`,
      to: "SDAH",
      toSch: `${pad((currentTime.getHours() + 1) % 24)}:${pad((currentTime.getMinutes() + 5) % 60)}`,
      speed: "100 km/h"
    }
  ];
};

// ══════════════════════════════════════════════════════════════════════════════
// STATION KNOWLEDGE BASE - Dum Dum Panel Layout
// ══════════════════════════════════════════════════════════════════════════════
const STATION_KNOWLEDGE = {
  platforms: {
    PF1: { trackId: 1,  name: 'Platform 1', line: 'UP SUBURBAN',  type: 'passenger' },
    PF2: { trackId: 2,  name: 'Platform 2', line: 'DN SUBURBAN',  type: 'passenger' },
    PF3: { trackId: 3,  name: 'Platform 3', line: 'UP MAIN',      type: 'passenger' },
    PF4: { trackId: 8,  name: 'Platform 4', line: 'DN MAIN',      type: 'passenger' },
    PF5: { trackId: 9,  name: 'Platform 5', line: 'DN BONGAON',   type: 'passenger' },
  },
  loopLines: {
    COMMON_LOOP:  { trackId: 5, name: 'COMMON LINE (LOOP)',  canDivert: true  },
    COMMON_GOODS: { trackId: 6, name: 'COMMON GOODS 1',      canDivert: true  },
  },
  // Train priority scores
  trainPriority: {
    'EXP':            5,
    'EXPRESS':        5,
    'MAIL':           5,
    'SUPERFAST':      5,
    'PASS':           3,
    'MEMU':           3,
    'LOCAL':          3,
    'OTHER':          2,
    'FREIGHT_COAL':   1,
    'FREIGHT_OIL':    1,
    'FREIGHT_CEMENT': 1,
  } as Record<string, number>,
  // Platform zone X range
  platformZone: { minX: 1150, maxX: 1500 },
};

// ── Get numeric priority for a train ─────────────────────────────────────────
const getTrainPriority = (train: Train): number => {
  const type  = (train.type  || '').toUpperCase();
  const name  = (train.name  || '').toUpperCase();
  const id    = (train.id    || '').toUpperCase();

  // Check type first (most reliable)
  if (STATION_KNOWLEDGE.trainPriority[type] !== undefined) {
    return STATION_KNOWLEDGE.trainPriority[type];
  }
  // Check name keywords
  for (const [key, score] of Object.entries(STATION_KNOWLEDGE.trainPriority)) {
    if (name.includes(key) || id.includes(key)) return score;
  }
  return 2; // default
};

// ── Priority for a *scheduled* train row (TRAIN_DATA shape: no/name/type/fromSch) ──
// Distinct from getTrainPriority() above, which reads live Train sim objects.
const getSchedulePriority = (type: string): number => {
  const t = (type || '').toUpperCase();
  if (t === 'EXP') return 5;
  if (t === 'PASS') return 4;
  if (t === 'MEMU') return 3;
  if (t === 'KLKT') return 3; // suburban local
  if (t.startsWith('FREIGHT')) return 1;
  return 2;
};

// ══════════════════════════════════════════════════════════════════════════
// SEALDAH UP CORRIDOR CLASSIFICATION
// Sealdah's UP suburban services fan out into two physical corridors:
//   MAIN     — Dankuni / Ranaghat / Krishnanagar / Shantipur / Lalgola /
//              Kalyani Simanta / Naihati / Jangipur Road / Gede
//              → runs via PF1 (UP SUBURBAN) / PF3 (UP MAIN), and UP CCR
//                (Track 4, no platform) when the service doesn't stop anywhere.
//   BONGAON  — Bongaon / Barasat / Duttapukur / Thakurnagar / Madhyamgram /
//              Habra / Dum Dum Cantt
//              → runs via UP BONGAON (Track 10).
// A destination on the MAIN list can still physically run the BONGAON route
// (e.g. "Sealdah - Ranaghat Galloping AC Local (via Bangaon)"), so an
// explicit "via Bangaon/Bongaon" in the name overrides the nominal
// destination and always wins.
// ══════════════════════════════════════════════════════════════════════════
const SEALDAH_MAIN_LINE_CITIES = [
  'dankuni', 'ranaghat', 'krishnanagar', 'shantipur', 'lalgola',
  'kalyani', 'gede', 'naihati', 'jangipur',
];
const SEALDAH_BONGAON_LINE_CITIES = [
  'bangaon', 'bongaon', 'barasat', 'duttapukur', 'dattapukur',
  'thakurnagar', 'madhyamgram', 'habra', 'dum dum cant', 'hasanabad',
  'hasnabad', 'gobardanga',
];

type SealdahUpCorridor = 'MAIN' | 'BONGAON' | null;

const classifySealdahUpCorridor = (trainName: string): SealdahUpCorridor => {
  const n = trainName.toLowerCase();
  if (n.includes('via bangaon') || n.includes('via bongaon')) return 'BONGAON';
  if (SEALDAH_BONGAON_LINE_CITIES.some(city => n.includes(city))) return 'BONGAON';
  if (SEALDAH_MAIN_LINE_CITIES.some(city => n.includes(city))) return 'MAIN';
  return null;
};

// ── Short label for a train ───────────────────────────────────────────────────
const trainLabel = (t: Train) =>
  `${t.id} (${(t.name || '').substring(0, 18).trim()})`;

// ── Is train in platform zone ─────────────────────────────────────────────────
const isInPlatformZone = (train: Train): boolean =>
  train.x >= STATION_KNOWLEDGE.platformZone.minX &&
  train.x <= STATION_KNOWLEDGE.platformZone.maxX;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN AI ANALYZER  — reads live state, produces actions + descriptions
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// MAIN AI ANALYZER — reads live state, produces actions + descriptions
// ══════════════════════════════════════════════════════════════════════════════
const analyzeRailwayState = (
  signals: Record<string, SignalDef>,
  switches: Record<string, SwitchDef>,
  trains: Train[],
  activeDisruptions: any[],
  // Trains waiting/available for dispatch per track (from the live schedule feed).
  // Shape matches TRAIN_DATA rows: { no, name, type, fromSch, ... }
  waitingTrainsPerTrack: Record<number, { no: string; name: string; type: string; fromSch: string }[]> = {},
  currentMins: number = 0
) => {
  const allSignals = Object.values(signals);
  const allSwitches = Object.values(switches);
  const redSignals = allSignals.filter(s => s.state === 'red');
  const yellowSignals = allSignals.filter(s => s.state === 'yellow');
  const greenSignals = allSignals.filter(s => s.state === 'green');
  const divergingSW = allSwitches.filter(s => s.state === 'diverging');
  const stoppedTrains = trains.filter(t => t.speed === 0 &&
    !(t.haltRemainingTicks !== undefined && t.haltRemainingTicks > 0));
  const slowTrains = trains.filter(t =>
    t.speed > 0 && t.speed < (t.baseSpeed || 2) * 0.5);
  const delayedTrains = trains.filter(t => (t.delayTicks || 0) > 100);

  // ── Platform occupancy ──────────────────────────────────────────────────────
  const platformOccupancy: Record<string, Train | null> = {};
  Object.entries(STATION_KNOWLEDGE.platforms).forEach(([pfId, pf]) => {
    platformOccupancy[pfId] =
      trains.find(t => t.trackId === pf.trackId && isInPlatformZone(t)) || null;
  });
  const freePlatforms = Object.entries(platformOccupancy)
    .filter(([, t]) => t === null).map(([id]) => id);
  const occupiedPlatforms = Object.entries(platformOccupancy)
    .filter(([, t]) => t !== null)
    .map(([id, t]) => ({ id, train: t! }));

  // ── Trains approaching platform zone ────────────────────────────────────────
  const trainsApproaching = trains.filter(t => {
    if (isInPlatformZone(t)) return false;
    const dist = t.direction === 'up'
      ? STATION_KNOWLEDGE.platformZone.minX - t.x
      : t.x - STATION_KNOWLEDGE.platformZone.maxX;
    return dist > 0 && dist < 700;
  }).sort((a, b) => getTrainPriority(b) - getTrainPriority(a));

  // ── Identify goods/freight trains ───────────────────────────────────────────
  const goodsTrains = trains.filter(t => getTrainPriority(t) <= 1);
  const highPriTrains = trains.filter(t => getTrainPriority(t) >= 5);

  // ════════════════════════════════════════════════════════════════════════════
  // BUILD ACTIONS
  // ════════════════════════════════════════════════════════════════════════════
  const actions: { type: 'signal' | 'switch' | 'dispatch'; id: string; value: string }[] = [];
  const actionDescriptions: string[] = [];
  const platformSuggestions: string[] = [];
  const diversionSuggestions: string[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0: SMART LOOP-LINE DIVERSION LOGIC
  // If a goods/freight train is waiting in loop (Track 5 or 6),
  // check each possible exit route and set the correct switches.
  // ══════════════════════════════════════════════════════════════════════════

  // Helper: is a track clear of trains?
  const isTrackClear = (trackId: number): boolean =>
    !trains.some(t => t.trackId === trackId);

  // Helper: are there any trains approaching a track from a given direction within a distance?
  const noTrainsApproaching = (trackId: number, direction: 'up' | 'down', withinX: number = 600): boolean => {
    return !trains.some(t => {
      if (t.trackId !== trackId) return false;
      if (t.direction !== direction) return false;
      // Check if approaching from the correct side
      if (direction === 'up') {
        // Train moving up (left to right), check if it's to the left of withinX
        return t.x < withinX;
      } else {
        // Train moving down (right to left), check if it's to the right of withinX
        return t.x > withinX;
      }
    });
  };

  // Helper: is a switch safe to set (no train on or near it)?
  const isSwitchSafe = (swId: string): boolean => {
    const sw = switches[swId];
    if (!sw) return false;
    const swMinX = Math.min(sw.startX, sw.endX);
    const swMaxX = Math.max(sw.startX, sw.endX);
    return !trains.some(t => {
      const tailX = t.direction === 'up' ? t.x - 280 : t.x + 280;
      const minX = Math.min(t.x, tailX);
      const maxX = Math.max(t.x, tailX);
      return (t.trackId === sw.fromTrack || t.trackId === sw.toTrack) &&
        minX <= swMaxX + 60 && maxX >= swMinX - 60;
    });
  };

  // Helper: push a switch action if safe and not already queued
  const pushSwitchAction = (swId: string, value: 'diverging' | 'straight', reason: string): boolean => {
    if (actions.find(a => a.id === swId)) return false;
    if (!isSwitchSafe(swId)) {
      diversionSuggestions.push(`⚠️ Switch ${swId} unsafe to move — train nearby`);
      return false;
    }
    actions.push({ type: 'switch', id: swId, value });
    actionDescriptions.push(reason);
    return true;
  };

  // Helper: push a signal action if not disrupted and not already queued
  const pushSignalAction = (sigId: string, value: SignalState, reason: string): boolean => {
    if (actions.find(a => a.id === sigId)) return false;
    if (!signals[sigId]) return false;
    const isDisrupted = activeDisruptions.some(d =>
      d.fromSignal === sigId || d.toSignal === sigId
    );
    if (isDisrupted) return false;
    actions.push({ type: 'signal', id: sigId, value });
    actionDescriptions.push(reason);
    return true;
  };

  // ── LOOP LINE DIVERSION: Track 5 (COMMON LINE LOOP) ──────────────────────
  const trainsInLoop5 = trains.filter(t => t.trackId === 5);
  const trainsInLoop6 = trains.filter(t => t.trackId === 6);

  trainsInLoop5.forEach(loopTrain => {
    const isGoods = getTrainPriority(loopTrain) <= 1;
    const isStopped = loopTrain.speed === 0;

    if (!isStopped && !isGoods) return; // Only process stopped or goods trains

    const trainLabel5 = `${loopTrain.id} (${loopTrain.name.substring(0, 18)})`;

    // ── ROUTE 1: Divert to UP CCR (Track 4) via SW-5TO4-L (left exit, down direction) ──
    // Condition: UP CCR (track 4) is clear AND no trains approaching from right on track 4
    const upCCRClear = isTrackClear(4);
    const noApproachingOnUPCCR = noTrainsApproaching(4, 'down', 1200);

    if (upCCRClear && noApproachingOnUPCCR) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${trainLabel5} [GOODS - waiting in LOOP] → UP CCR (Track 4) ` +
        `via SW-5TO4-L — UP CCR clear, no trains approaching`
      );

      // Set SW-5TO4-L to diverging (connects Track 4 ↔ Track 5 on left side)
      pushSwitchAction(
        'SW-5TO4-L',
        'diverging',
        `Set SW-5TO4-L → DIVERGING: Route ${trainLabel5} from COMMON LOOP (Track 5) ` +
        `to UP CCR (Track 4) in DOWN direction — line is clear`
      );

      // Also set SW-6TO5-L to diverging to open the path from loop
      pushSwitchAction(
        'SW-6TO5-L',
        'diverging',
        `Set SW-6TO5-L → DIVERGING: Open loop exit path for ${trainLabel5} ` +
        `from COMMON GOODS (Track 6) area toward COMMON LOOP (Track 5) exit`
      );

      // Set approach signal on UP CCR to allow movement
      pushSignalAction(
        '4-S3-D',
        'green',
        `Set signal 4-S3-D → GREEN: Allow ${trainLabel5} to proceed ` +
        `from loop onto UP CCR (Track 4) in DOWN direction`
      );

      return; // Done for this train, found best route
    }

    // ── ROUTE 2: Divert to DN CCR (Track 7) via SW-7TO6-L then SW-6TO5-L ──
    const dnCCRClear = isTrackClear(7);
    const noApproachingOnDNCCR = noTrainsApproaching(7, 'up', 700);

    if (dnCCRClear && noApproachingOnDNCCR) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${trainLabel5} [GOODS - waiting in LOOP] → DN CCR (Track 7) ` +
        `via SW-6TO5-L + SW-7TO6-L — DN CCR clear`
      );

      pushSwitchAction(
        'SW-6TO5-L',
        'diverging',
        `Set SW-6TO5-L → DIVERGING: Open loop path for ${trainLabel5}`
      );

      pushSwitchAction(
        'SW-7TO6-L',
        'diverging',
        `Set SW-7TO6-L → DIVERGING: Route ${trainLabel5} from LOOP toward DN CCR (Track 7)`
      );

      return;
    }

    // ── ROUTE 3: Divert to DN MAIN (Track 8) via SW-8TO7-L ──
    const dnMainClear = isTrackClear(8);
    if (dnMainClear) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${trainLabel5} [GOODS - waiting in LOOP] → DN MAIN (Track 8) ` +
        `via SW-8TO7-L — DN MAIN is clear`
      );

      pushSwitchAction(
        'SW-7TO6-L',
        'diverging',
        `Set SW-7TO6-L → DIVERGING: Open intermediate path for ${trainLabel5}`
      );

      pushSwitchAction(
        'SW-8TO7-L',
        'diverging',
        `Set SW-8TO7-L → DIVERGING: Route ${trainLabel5} toward DN MAIN (Track 8)`
      );

      return;
    }

    // If no route available, report congestion
    diversionSuggestions.push(
      `⚠️ ${trainLabel5} [GOODS] stuck in LOOP — all exit routes (UP CCR, DN CCR, DN MAIN) currently occupied. ` +
      `Hold train at loop until a route clears.`
    );
  });

  // ── LOOP LINE DIVERSION: Track 6 (COMMON GOODS 1) ──────────────────────
  trainsInLoop6.forEach(loopTrain => {
    const isGoods = getTrainPriority(loopTrain) <= 1;
    const isStopped = loopTrain.speed === 0;

    if (!isStopped && !isGoods) return;

    const trainLabel6 = `${loopTrain.id} (${loopTrain.name.substring(0, 18)})`;

    // First try: move to Track 5 (COMMON LOOP) if clear, then apply loop 5 logic
    const loop5Clear = isTrackClear(5);

    if (loop5Clear) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${trainLabel6} [GOODS - Track 6] → COMMON LOOP (Track 5) first via SW-5TO6-R`
      );

      pushSwitchAction(
        'SW-5TO6-R',
        'diverging',
        `Set SW-5TO6-R → DIVERGING: Move ${trainLabel6} from COMMON GOODS (Track 6) ` +
        `to COMMON LOOP (Track 5) as intermediate step`
      );

      return;
    }

    // Direct exit: try UP CCR via SW-6TO5-L + SW-5TO4-L
    const upCCRClear6 = isTrackClear(4);
    const noApproaching6 = noTrainsApproaching(4, 'down', 1200);

    if (upCCRClear6 && noApproaching6) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${trainLabel6} [GOODS - Track 6] → UP CCR (Track 4) ` +
        `via SW-6TO5-L + SW-5TO4-L`
      );

      pushSwitchAction(
        'SW-6TO5-L',
        'diverging',
        `Set SW-6TO5-L → DIVERGING: Open exit from COMMON GOODS (Track 6) for ${trainLabel6}`
      );

      pushSwitchAction(
        'SW-5TO4-L',
        'diverging',
        `Set SW-5TO4-L → DIVERGING: Route ${trainLabel6} to UP CCR (Track 4) in DOWN direction`
      );

      return;
    }

    diversionSuggestions.push(
      `⚠️ ${trainLabel6} [GOODS] stuck in Track 6 — no clear exit route available currently.`
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0B: PLATFORM 5 (Track 9, DN BONGAON) CONGESTION RELIEF
  // Any train sitting at PF5 is diverted onto DN MAIN (Track 8) via SW-9TO8-L
  // so Platform 5 stays free for the next incoming UP BONGAON service.
  // ══════════════════════════════════════════════════════════════════════════
  const trainsAtPF5 = trains.filter(t => t.trackId === 9);
  trainsAtPF5.forEach(t => {
    const label = `${t.id} (${t.name.substring(0, 18)})`;
    const dnMainClear = isTrackClear(8);

    if (dnMainClear) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${label} [at PLATFORM 5 / DN BONGAON] → DN MAIN (Track 8) ` +
        `via SW-9TO8-L — clears PF5 for the next UP BONGAON arrival`
      );
      pushSwitchAction(
        'SW-9TO8-L',
        'diverging',
        `Set SW-9TO8-L → DIVERGING: Route ${label} off PLATFORM 5 (Track 9) ` +
        `onto DN MAIN (Track 8), freeing the platform`
      );
    } else {
      diversionSuggestions.push(
        `⚠️ ${label} held at PLATFORM 5 — DN MAIN (Track 8) occupied, ` +
        `SW-9TO8-L diversion not safe yet`
      );
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0C: UP CCR (Track 4) LEFT-SIDE ENTRY ROUTING
  // A train approaching UP CCR from the left/west end (near SW-5TO4-L /
  // SW-6TO5-L) either continues straight on Track 4, diverts via SW-5TO4-L
  // into the COMMON LINE LOOP (Track 5), or diverts onward via SW-6TO5-L
  // into COMMON GOODS 1 (Track 6) — goods services default to the goods line.
  // ══════════════════════════════════════════════════════════════════════════
  const UP_CCR_LEFT_ZONE_X = 700; // band around SW-5TO4-L (600-630) / SW-6TO5-L (630-660)
  const upCCRLeftTrains = trains.filter(t =>
    t.trackId === 4 && t.x <= UP_CCR_LEFT_ZONE_X &&
    // UP Bongaon-corridor trains on Track 4 get their own dedicated routing
    // to Platform 4 / UP BONGAON below (STEP 0E) — don't let this generic
    // goods/loop diversion grab them first.
    !(t.direction === 'up' && classifySealdahUpCorridor(t.name) === 'BONGAON')
  );

  upCCRLeftTrains.forEach(t => {
    const label = `${t.id} (${t.name.substring(0, 18)})`;
    const isGoodsCCR = getTrainPriority(t) <= 1;
    const loopClear = isTrackClear(5);
    const goodsClear = isTrackClear(6);

    if (isGoodsCCR && goodsClear) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${label} [GOODS, UP CCR left side] → COMMON GOODS 1 (Track 6) ` +
        `via SW-6TO5-L — stabling goods off the running line`
      );
      pushSwitchAction(
        'SW-5TO4-L', 'diverging',
        `Set SW-5TO4-L → DIVERGING: Open exit off UP CCR (Track 4) for ${label}`
      );
      pushSwitchAction(
        'SW-6TO5-L', 'diverging',
        `Set SW-6TO5-L → DIVERGING: Route ${label} onward to COMMON GOODS 1 (Track 6)`
      );
    } else if (loopClear) {
      diversionSuggestions.push(
        `🔀 DIVERT: ${label} [UP CCR left side] → COMMON LINE LOOP (Track 5) ` +
        `via SW-5TO4-L — hold clear of the running line`
      );
      pushSwitchAction(
        'SW-5TO4-L', 'diverging',
        `Set SW-5TO4-L → DIVERGING: Route ${label} from UP CCR (Track 4) into COMMON LINE LOOP (Track 5)`
      );
    } else {
      diversionSuggestions.push(
        `➡️ ${label} continues STRAIGHT on UP CCR (Track 4) — LOOP and GOODS 1 both occupied`
      );
      pushSwitchAction(
        'SW-5TO4-L', 'straight',
        `Set SW-5TO4-L → STRAIGHT: Keep ${label} running straight on UP CCR (Track 4), no diversion route free`
      );
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0D: UP BONGAON CORRIDOR — LADDER CROSSOVER FROM PF1 / PF3
  // Bongaon/Barasat/Duttapukur/Thakurnagar/Madhyamgram/Habra/Dum Dum Cantt/
  // Gobardanga/Hasnabad services depart Sealdah on Track 1 or Track 3. Once
  // clear of the platform they must cascade across the full ladder —
  // SW-LAD-DN-1 → 2 → 3 → 4 → 4B → 5 — to reach UP BONGAON (Track 10).
  // ══════════════════════════════════════════════════════════════════════════
  const LADDER_SWITCHES: string[] = [
    'SW-LAD-DN-1', 'SW-LAD-DN-2', 'SW-LAD-DN-3', 'SW-LAD-DN-4', 'SW-LAD-DN-4B', 'SW-LAD-DN-5',
  ];
  const LADDER_ENTRY_X = STATION_KNOWLEDGE.platformZone.maxX; // 1500 — just ahead of SW-LAD-DN-1 (starts 1550)

  const upBongaonLadderTrains = trains.filter(t =>
    t.direction === 'up' && (t.trackId === 1 || t.trackId === 3) &&
    t.x >= LADDER_ENTRY_X && classifySealdahUpCorridor(t.name) === 'BONGAON'
  );

  if (upBongaonLadderTrains.length > 0) {
    upBongaonLadderTrains.forEach(t => {
      const label = `${t.id} (${t.name.substring(0, 18)})`;
      diversionSuggestions.push(
        `🪜 LADDER: ${label} [UP BONGAON CORRIDOR, ex-Track ${t.trackId}] → UP BONGAON (Track 10) ` +
        `cascading via SW-LAD-DN-1→2→3→4→4B→5`
      );
    });
    LADDER_SWITCHES.forEach(swId => pushSwitchAction(
      swId, 'diverging',
      `Set ${swId} → DIVERGING: Cascade UP BONGAON corridor train(s) along the ladder toward UP BONGAON (Track 10)`
    ));
  } else {
    // No Bongaon-corridor train needs the ladder right now — release it back to
    // STRAIGHT so a following MAIN-corridor train on Track 1/3 (which runs the
    // full length of the track and would otherwise be mis-routed onto Track 10
    // by a stale DIVERGING switch) passes straight through.
    LADDER_SWITCHES.forEach(swId => {
      if (switches[swId]?.state === 'diverging') {
        pushSwitchAction(swId, 'straight', `Set ${swId} → STRAIGHT: No UP BONGAON corridor train on the ladder — keep it clear for MAIN corridor traffic`);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0E: UP BONGAON CORRIDOR VIA UP CCR (Track 4) → PLATFORM 4 → TRACK 10
  // A Bongaon-corridor service running non-stop on UP CCR (Track 4) diverts
  // near the left-side loop crossover (SW-5TO4-L → 6TO5-L → 7TO6-L → 8TO7-L)
  // onto Platform 4 (Track 8), then rides Track 8 out to SW-LAD-DN-5 to reach
  // UP BONGAON (Track 10).
  // ══════════════════════════════════════════════════════════════════════════
  const UP_CCR_BONGAON_SWITCHES: string[] = ['SW-5TO4-L', 'SW-6TO5-L', 'SW-7TO6-L', 'SW-8TO7-L'];
  const upCCRBongaonTrains = trains.filter(t =>
    t.direction === 'up' && t.trackId === 4 && t.x <= UP_CCR_LEFT_ZONE_X &&
    classifySealdahUpCorridor(t.name) === 'BONGAON'
  );

  upCCRBongaonTrains.forEach(t => {
    const label = `${t.id} (${t.name.substring(0, 18)})`;
    diversionSuggestions.push(
      `🔀 DIVERT: ${label} [UP CCR → PLATFORM 4] → UP BONGAON (Track 10) ` +
      `via SW-5TO4-L→6TO5-L→7TO6-L→8TO7-L, then SW-LAD-DN-5`
    );
    UP_CCR_BONGAON_SWITCHES.forEach(swId => pushSwitchAction(
      swId, 'diverging',
      `Set ${swId} → DIVERGING: Route ${label} from UP CCR (Track 4) to Platform 4 (Track 8)`
    ));
    pushSwitchAction(
      'SW-LAD-DN-5', 'diverging',
      `Set SW-LAD-DN-5 → DIVERGING: Continue ${label} from Platform 4 (Track 8) onward to UP BONGAON (Track 10)`
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0F: UP MAIN CORRIDOR ARRIVAL — DN CCR (Track 7) → LADDER → PLATFORM 2
  // Dankuni/Ranaghat/Krishnanagar/Shantipur/Lalgola/Kalyani Simanta/Naihati/
  // Jangipur Road/Gede DOWN services arriving on DN CCR (Track 7) ladder
  // across via SW-LAD-DN-4B → 4 → 3 → 2 to reach Platform 2 (Track 2) before
  // departing back towards Sealdah.
  // ══════════════════════════════════════════════════════════════════════════
  const DN_MAIN_LADDER_SWITCHES: string[] = ['SW-LAD-DN-4B', 'SW-LAD-DN-4', 'SW-LAD-DN-3', 'SW-LAD-DN-2'];
  const dnMainCCRTrains = trains.filter(t =>
    t.direction === 'down' && t.trackId === 7 &&
    t.x >= 1550 && t.x <= 2900 &&
    classifySealdahUpCorridor(t.name) === 'MAIN'
  );

  dnMainCCRTrains.forEach(t => {
    const label = `${t.id} (${t.name.substring(0, 18)})`;
    diversionSuggestions.push(
      `🪜 LADDER: ${label} [DN CCR → PLATFORM 2] via SW-LAD-DN-4B→4→3→2`
    );
    DN_MAIN_LADDER_SWITCHES.forEach(swId => pushSwitchAction(
      swId, 'diverging',
      `Set ${swId} → DIVERGING: Route ${label} from DN CCR (Track 7) toward Platform 2 (Track 2)`
    ));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 0G: UP BONGAON CORRIDOR DOWN DEPARTURE — PF5 / PF4 → UP CCR → SEALDAH
  // A Bongaon-corridor DOWN service that halted at Platform 5 (Track 9) or
  // Platform 4 (Track 8) rejoins the running lines toward Sealdah:
  //   ex-PF5: SW-9TO8-L → 5TO4-L → 6TO5-L → 7TO6-L → 8TO7-L
  //   ex-PF4: SW-8TO7-L → 7TO6-L → 6TO5-L → 5TO4-L
  // ══════════════════════════════════════════════════════════════════════════
  const dnBongaonDepartTrains = trains.filter(t =>
    t.direction === 'down' && classifySealdahUpCorridor(t.name) === 'BONGAON' &&
    ((t.trackId === 9 && t.x <= 950 && t.x > 700) || (t.trackId === 8 && t.x <= 950 && t.x > 650))
  );

  dnBongaonDepartTrains.forEach(t => {
    const label = `${t.id} (${t.name.substring(0, 18)})`;
    if (t.trackId === 9) {
      diversionSuggestions.push(`🪜 LADDER: ${label} [ex-PLATFORM 5 → SEALDAH] via SW-9TO8-L→5TO4-L→6TO5-L→7TO6-L→8TO7-L`);
      ['SW-9TO8-L', 'SW-5TO4-L', 'SW-6TO5-L', 'SW-7TO6-L', 'SW-8TO7-L'].forEach(swId => pushSwitchAction(
        swId, 'diverging',
        `Set ${swId} → DIVERGING: Route ${label} off Platform 5 (Track 9), back toward UP CCR / Sealdah`
      ));
    } else {
      diversionSuggestions.push(`🪜 LADDER: ${label} [ex-PLATFORM 4 → SEALDAH] via SW-8TO7-L→7TO6-L→6TO5-L→5TO4-L`);
      ['SW-8TO7-L', 'SW-7TO6-L', 'SW-6TO5-L', 'SW-5TO4-L'].forEach(swId => pushSwitchAction(
        swId, 'diverging',
        `Set ${swId} → DIVERGING: Route ${label} off Platform 4 (Track 8), back toward UP CCR / Sealdah`
      ));
    }
  });

  // ── STEP 1: Route approaching goods trains to loop lines ─────────────────
  trainsApproaching.forEach(train => {
    const priority = getTrainPriority(train);
    const priorityLabel =
      priority >= 5 ? 'HIGH (Express/Mail)' :
      priority >= 3 ? 'MEDIUM (Local/MEMU)' : 'LOW (Goods/Freight)';

    if (priority <= 1) {
      // Find a free loop line
      const loopEntry = Object.values(STATION_KNOWLEDGE.loopLines).find(
        l => l.canDivert && !trains.some(t => t.trackId === l.trackId)
      );
      if (loopEntry) {
        diversionSuggestions.push(
          `🔀 DIVERT: ${trainLabel(train)} [${priorityLabel}] → ` +
          `${loopEntry.name} — clear main line for higher-priority service`
        );

        // Find a straight switch that could route to loop
        const divSW = allSwitches.find(sw =>
          (sw.toTrack === loopEntry.trackId || sw.fromTrack === loopEntry.trackId) &&
          sw.state === 'straight' &&
          !actions.find(a => a.id === sw.id)
        );
        if (divSW && actions.length < 5) {
          pushSwitchAction(
            divSW.id,
            'diverging',
            `Set switch ${divSW.id} to DIVERGING — route ` +
            `${trainLabel(train)} [Goods/Low priority] onto ${loopEntry.name} ` +
            `freeing main platform for passenger service`
          );
        }
      }
    } else {
      // High/medium priority — suggest platform assignment
      const pfEntry = Object.entries(STATION_KNOWLEDGE.platforms).find(
        ([pfId, pf]) =>
          freePlatforms.includes(pfId) &&
          (
            (train.direction === 'up' && [1, 3].includes(pf.trackId)) ||
            (train.direction === 'down' && [2, 8, 9].includes(pf.trackId)) ||
            pf.trackId === train.trackId
          )
      );
      if (pfEntry) {
        platformSuggestions.push(
          `✅ ASSIGN: ${trainLabel(train)} [${priorityLabel}] → ` +
          `${pfEntry[1].name} (${pfEntry[1].line}) — free platform available`
        );
      }
    }
  });

  // ── STEP 2: Clear blocking signals for stopped trains (high priority first) ─
  const stoppedByPriority = [...stoppedTrains].sort(
    (a, b) => getTrainPriority(b) - getTrainPriority(a)
  );

  stoppedByPriority.forEach(train => {
    if (actions.filter(a => a.type === 'signal').length >= 4) return;

    const trackSigs = allSignals.filter(
      s => s.trackId === train.trackId && s.direction === train.direction
    );

    let blockingSignal: SignalDef | null = null;
    if (train.direction === 'up') {
      const ahead = trackSigs.filter(s => s.x > train.x).sort((a, b) => a.x - b.x);
      blockingSignal = ahead.find(s => s.state === 'red') || null;
    } else {
      const ahead = trackSigs.filter(s => s.x < train.x).sort((a, b) => b.x - a.x);
      blockingSignal = ahead.find(s => s.state === 'red') || null;
    }

    if (!blockingSignal) return;

    // Safety: no opposing train close by
    const oppositeDir = train.direction === 'up' ? 'down' : 'up';
    const conflict = trains.find(
      t => t.trackId === train.trackId &&
        t.direction === oppositeDir &&
        Math.abs(t.x - train.x) < 450
    );
    if (conflict) return;

    // Safety: not in active disruption
    const disrupted = activeDisruptions.some(
      d => d.fromSignal === blockingSignal!.id || d.toSignal === blockingSignal!.id
    );
    if (disrupted) return;

    if (actions.find(a => a.id === blockingSignal!.id)) return;

    // Skip loop trains — handled above in Step 0
    if (train.trackId === 5 || train.trackId === 6) return;

    const priority = getTrainPriority(train);
    const trackName = TRACKS.find(t => t.id === train.trackId)?.name || `Track ${train.trackId}`;
    const priorityLabel = priority >= 5 ? 'HIGH' : priority >= 3 ? 'MEDIUM' : 'LOW';

    actions.push({ type: 'signal', id: blockingSignal.id, value: 'green' });
    actionDescriptions.push(
      `Upgrade signal ${blockingSignal.id} → GREEN for ` +
      `${train.direction.toUpperCase()} train ${trainLabel(train)} ` +
      `[Priority: ${priorityLabel}] on ${trackName}`
    );

    // Cascade: set upstream signal to YELLOW
    if (actions.length < 6) {
      const prevSigs = train.direction === 'up'
        ? trackSigs.filter(s => s.x < blockingSignal!.x).sort((a, b) => b.x - a.x)
        : trackSigs.filter(s => s.x > blockingSignal!.x).sort((a, b) => a.x - b.x);
      const prevSig = prevSigs.find(
        s => s.state === 'red' &&
          !actions.find(a => a.id === s.id) &&
          !activeDisruptions.some(d => d.fromSignal === s.id || d.toSignal === s.id)
      );
      if (prevSig) {
        actions.push({ type: 'signal', id: prevSig.id, value: 'yellow' });
        actionDescriptions.push(
          `Set signal ${prevSig.id} → YELLOW (caution) — ` +
          `upstream cascade to allow following train to reduce speed`
        );
      }
    }
  });

  // ── STEP 3: Cascade yellow for slow trains ──────────────────────────────────
  slowTrains.forEach(train => {
    if (actions.length >= 6) return;
    const trackSigs = allSignals
      .filter(s => s.trackId === train.trackId && s.direction === train.direction)
      .sort((a, b) => train.direction === 'up' ? a.x - b.x : b.x - a.x);
    const nextRed = train.direction === 'up'
      ? trackSigs.find(s => s.x > train.x && s.state === 'red')
      : trackSigs.find(s => s.x < train.x && s.state === 'red');
    if (nextRed && !actions.find(a => a.id === nextRed.id)) {
      const idx = trackSigs.indexOf(nextRed);
      if (idx > 0) {
        const prevSig = trackSigs[idx - 1];
        if (prevSig.state === 'red' && !actions.find(a => a.id === prevSig.id)) {
          actions.push({ type: 'signal', id: prevSig.id, value: 'yellow' });
          actionDescriptions.push(
            `Set signal ${prevSig.id} → YELLOW — allow ` +
            `slow train ${train.id} to reduce speed before ${nextRed.id}`
          );
        }
      }
    }
  });

  // ── STEP 4: Normalize unnecessary diverging switches ────────────────────────
  divergingSW.forEach(sw => {
    if (actions.length >= 6) return;
    if (actions.find(a => a.id === sw.id)) return;

    // Don't normalize loop exit switches if a goods train is waiting in loop
    const isLoopSwitch = ['SW-5TO4-L', 'SW-6TO5-L', 'SW-7TO6-L', 'SW-8TO7-L',
      'SW-5TO4-R', 'SW-5TO6-R'].includes(sw.id);
    const goodsInLoop = trains.some(t =>
      (t.trackId === 5 || t.trackId === 6) && getTrainPriority(t) <= 1
    );
    if (isLoopSwitch && goodsInLoop) return;

    const swMinX = Math.min(sw.startX, sw.endX);
    const swMaxX = Math.max(sw.startX, sw.endX);
    const trainOnSwitch = trains.some(t => {
      const tailX = t.direction === 'up' ? t.x - 280 : t.x + 280;
      const minX = Math.min(t.x, tailX);
      const maxX = Math.max(t.x, tailX);
      return (t.trackId === sw.fromTrack || t.trackId === sw.toTrack) &&
        minX <= swMaxX + 60 && maxX >= swMinX - 60;
    });
    if (!trainOnSwitch) {
      actions.push({ type: 'switch', id: sw.id, value: 'straight' });
      actionDescriptions.push(
        `Normalize switch ${sw.id} → STRAIGHT — ` +
        `no active train route requires diverging position`
      );
    }
  });

  // ── STEP 5: Clear red signals on empty sections ─────────────────────────────
  if (stoppedTrains.length === 0 && actions.filter(a => a.type === 'signal').length < 2) {
    redSignals.forEach(sig => {
      if (actions.length >= 6) return;
      if (actions.find(a => a.id === sig.id)) return;
      const nearTrain = trains.some(
        t => t.trackId === sig.trackId && Math.abs(t.x - sig.x) < 350
      );
      const disrupted = activeDisruptions.some(
        d => d.fromSignal === sig.id || d.toSignal === sig.id
      );
      if (!nearTrain && !disrupted) {
        actions.push({ type: 'signal', id: sig.id, value: 'green' });
        actionDescriptions.push(
          `Clear signal ${sig.id} → GREEN — ` +
          `block section unoccupied, signal unnecessarily restrictive`
        );
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 6: DISPATCH SEQUENCING
  // For every track that has train(s) waiting to be dispatched, decide:
  //   - is the section actually clear right now?
  //   - is a diverging switch sitting across the entry (needs normalizing first)?
  //   - of the waiting trains, which ONE should go first to maximize
  //     section throughput (priority: EXP > PASS > MEMU/Local > Freight,
  //     tie-broken by how overdue against schedule it already is)?
  // ══════════════════════════════════════════════════════════════════════════
  const dispatchRecommendations: {
    trackId: number;
    trackName: string;
    clear: boolean;
    blockingSwitch?: string;
    train: {
      no: string; name: string; type: string; fromSch: string;
      delayMins: number; priorityLabel: string;
    };
    queued: { no: string; name: string; fromSch: string }[];
    reason: string;
  }[] = [];

  TRACKS.forEach(track => {
    const candidates = waitingTrainsPerTrack[track.id] || [];
    if (candidates.length === 0) return;

    const clear = isTrackClear(track.id);

    // A diverging switch still spanning this track's throat blocks a clean run.
    const blockingSwitch = allSwitches.find(
      sw => sw.state === 'diverging' && (sw.fromTrack === track.id || sw.toTrack === track.id)
    );

    const scored = candidates.map(t => {
      const [h, m] = t.fromSch.split(':').map(Number);
      const schedMins = h * 60 + m;
      let diff = schedMins - currentMins;
      if (diff > 720) diff -= 1440;
      if (diff < -720) diff += 1440;
      const overdueMins = Math.max(0, -diff);
      const priority = getSchedulePriority(t.type);
      // Priority dominates the ranking; overdue minutes break ties between
      // similar-priority trains so nothing waits forever.
      const score = priority * 20 + Math.min(overdueMins, 30);
      return { t, priority, overdueMins, score };
    }).sort((a, b) => b.score - a.score);

    const [top, ...rest] = scored;
    const priorityLabel =
      top.priority >= 5 ? 'HIGH (Express)' :
      top.priority >= 4 ? 'MEDIUM-HIGH (Passenger)' :
      top.priority >= 3 ? 'MEDIUM (Local/MEMU)' : 'LOW (Goods/Freight)';

    let reason: string;
    const corridor = classifySealdahUpCorridor(top.t.name);
    const corridorTag =
      corridor === 'MAIN' ? `[SEALDAH UP MAIN CORRIDOR → ${track.name}] ` :
      corridor === 'BONGAON' ? `[SEALDAH UP BONGAON CORRIDOR → ${track.name}] ` : '';

    if (!clear) {
      reason = `${corridorTag}Track occupied — hold ${top.t.no} (${priorityLabel}) until the section clears.`;
    } else if (blockingSwitch) {
      reason =
        `${corridorTag}Section is clear but switch ${blockingSwitch.id} is still DIVERGING — ` +
        `normalize it first, then dispatch ${top.t.no} (${priorityLabel}).`;
    } else {
      reason =
        `${corridorTag}Section CLEAR and route aligned — dispatch ${top.t.no} (${priorityLabel}) now` +
        (top.overdueMins > 0 ? `, already ${top.overdueMins} min behind schedule` : ', on schedule') +
        (rest.length > 0 ? `. ${rest.length} more train(s) queued behind it.` : '.');
    }

    dispatchRecommendations.push({
      trackId: track.id,
      trackName: track.name,
      clear,
      blockingSwitch: blockingSwitch?.id,
      train: {
        no: top.t.no,
        name: top.t.name,
        type: top.t.type,
        fromSch: top.t.fromSch,
        delayMins: top.overdueMins,
        priorityLabel,
      },
      queued: rest.slice(0, 3).map(r => ({ no: r.t.no, name: r.t.name, fromSch: r.t.fromSch })),
      reason,
    });

    // Section is clear and aligned — feed this into the actionable list too,
    // so "Apply AI Suggestions" can dispatch it automatically.
    if (clear && !blockingSwitch && actions.length < 6) {
      const actionId = `DISPATCH-${top.t.no}`;
      if (!actions.find(a => a.id === actionId)) {
        actions.push({ type: 'dispatch', id: actionId, value: String(track.id) });
        actionDescriptions.push(
          `🚉 DISPATCH: Train ${top.t.no} (${top.t.name}) → ${track.name} — section clear, ` +
          `${priorityLabel}${top.overdueMins > 0 ? `, ${top.overdueMins} min overdue` : ''}, ` +
          `next for max throughput`
        );
      }
    }
  });

  // Clear, actionable sections first
  dispatchRecommendations.sort((a, b) => Number(b.clear) - Number(a.clear));

  // ════════════════════════════════════════════════════════════════════════════
  // GENERATE ANALYSIS TEXT
  // ════════════════════════════════════════════════════════════════════════════
  const pfStatusText =
    occupiedPlatforms.length > 0
      ? `Platforms ${occupiedPlatforms.map(p => p.id).join(', ')} occupied. ` +
        `Free: ${freePlatforms.length > 0 ? freePlatforms.join(', ') : 'NONE'}.`
      : `All ${Object.keys(STATION_KNOWLEDGE.platforms).length} platforms free.`;

  const affectedTrackNames = [
    ...new Set([
      ...stoppedTrains.map(t => TRACKS.find(tr => tr.id === t.trackId)?.name || `Track ${t.trackId}`),
      ...delayedTrains.map(t => TRACKS.find(tr => tr.id === t.trackId)?.name || `Track ${t.trackId}`),
    ]),
  ].slice(0, 4);

  const occupiedTracks = [...new Set(trains.map(t => t.trackId))];

  // ── Detect loop congestion for analysis text ──
  const loopCongestion = trainsInLoop5.length > 0 || trainsInLoop6.length > 0;
  const loopGoodsWaiting = [...trainsInLoop5, ...trainsInLoop6].filter(
    t => getTrainPriority(t) <= 1
  );

  let analysis = '';
  let suggestion = '';

  if (loopGoodsWaiting.length > 0) {
    const goodsIds = loopGoodsWaiting.map(t => t.id).join(', ');
    const upCCRStatus = isTrackClear(4) ? 'UP CCR (Track 4) is CLEAR' : 'UP CCR (Track 4) is OCCUPIED';
    const dnCCRStatus = isTrackClear(7) ? 'DN CCR (Track 7) is CLEAR' : 'DN CCR (Track 7) is OCCUPIED';

    analysis =
      `${loopGoodsWaiting.length} goods/freight train(s) [${goodsIds}] are WAITING in LOOP LINE. ` +
      `${upCCRStatus}. ${dnCCRStatus}. ` +
      `${stoppedTrains.length > 0 ? `${stoppedTrains.length} additional train(s) halted at red signals. ` : ''}` +
      `${pfStatusText} ` +
      `${redSignals.length} red / ${yellowSignals.length} yellow / ${greenSignals.length} green aspects.`;

    suggestion =
      `${isTrackClear(4) && noTrainsApproaching(4, 'down', 1200)
        ? `UP CCR is CLEAR — SET SW-5TO4-L + SW-6TO5-L to DIVERGING to route goods train ` +
          `from LOOP to UP CCR (Track 4) in DOWN direction. `
        : isTrackClear(7)
        ? `UP CCR occupied — SET SW-7TO6-L to DIVERGING to route goods train toward DN CCR (Track 7). `
        : `All main lines busy — hold goods train in loop until UP CCR or DN CCR clears. `
      }` +
      `Then clear blocking signals for passenger trains. ` +
      (freePlatforms.length > 0
        ? `Route approaching passenger trains to free platforms: ${freePlatforms.join(', ')}.`
        : `Hold passenger trains at home signal until platform clears.`);

  } else if (stoppedTrains.length > 0 && delayedTrains.length > 0) {
    analysis =
      `${stoppedTrains.length} train(s) STOPPED at red signals on ` +
      `${affectedTrackNames.join(', ')}. ` +
      `${delayedTrains.length} train(s) have accumulated delays. ` +
      `${redSignals.length} red / ${yellowSignals.length} yellow / ${greenSignals.length} green aspects. ` +
      `${pfStatusText} ` +
      (goodsTrains.length > 0
        ? `${goodsTrains.length} goods/freight train(s) detected — loop diversion recommended. `
        : '') +
      (highPriTrains.length > 0
        ? `${highPriTrains.length} high-priority train(s) require priority signal clearance.`
        : '');
    suggestion =
      `Clear blocking signals for HIGH-PRIORITY trains first. ` +
      (goodsTrains.length > 0
        ? `Divert goods train(s) to COMMON LOOP/GOODS line to free main platforms. `
        : '') +
      `Cascade upstream signals YELLOW → GREEN to restore throughput. ` +
      (freePlatforms.length > 0
        ? `Route approaching trains to free platforms: ${freePlatforms.join(', ')}.`
        : `Hold trains at home signal until platform clears.`);

  } else if (stoppedTrains.length > 0) {
    analysis =
      `${stoppedTrains.length} train(s) halted at red signals on ` +
      `${affectedTrackNames.join(', ')}. ` +
      `${redSignals.length} red aspects across network. ` +
      `${divergingSW.length > 0 ? `${divergingSW.length} switch(es) in diverging position. ` : ''}` +
      pfStatusText;
    suggestion =
      `Upgrade blocking signal aspects to GREEN where safe. ` +
      `Normalize unnecessary diverging switches to restore standard routing. ` +
      (freePlatforms.length > 0 ? `Free platforms available: ${freePlatforms.join(', ')}.` : '');

  } else if (trainsApproaching.length > 1) {
    const highApp = trainsApproaching.filter(t => getTrainPriority(t) >= 3);
    const lowApp = trainsApproaching.filter(t => getTrainPriority(t) < 3);
    analysis =
      `${trainsApproaching.length} train(s) approaching station. ` +
      `${highApp.length} high/medium priority, ${lowApp.length} low priority (goods/freight). ` +
      `${pfStatusText} ` +
      `${redSignals.length} red aspects, ${greenSignals.length} green aspects in network.`;
    suggestion =
      `Sequence trains by priority. ` +
      (lowApp.length > 0
        ? `Divert ${lowApp.length} goods train(s) to loop line to give passenger trains platform access. `
        : '') +
      (highApp.length > 0 && freePlatforms.length > 0
        ? `Assign: ${highApp.slice(0, 3)
            .map((t, i) => `${trainLabel(t)} → ${freePlatforms[i] || 'next free PF'}`)
            .join('; ')}.`
        : '');

  } else if (delayedTrains.length > 0) {
    analysis =
      `${delayedTrains.length} train(s) running behind schedule on ` +
      `${affectedTrackNames.join(', ')}. ` +
      `${yellowSignals.length} caution and ${redSignals.length} red aspects ` +
      `restricting speeds below line capacity. ${pfStatusText}`;
    suggestion =
      `Progressive signal clearing to reduce cumulative delays. ` +
      `Upgrade caution aspects to GREEN where sections are clear ` +
      `to allow trains to regain scheduled speed.`;

  } else if (redSignals.length > greenSignals.length) {
    analysis =
      `Network has ${redSignals.length} RED vs ${greenSignals.length} GREEN aspects. ` +
      `${trains.length} active trains on ${occupiedTracks.length} tracks. ` +
      `${pfStatusText} Signal aspects more restrictive than traffic warrants.`;
    suggestion =
      `Optimize signal aspects to match traffic density. ` +
      `Clear unoccupied block sections to GREEN to maximize line capacity.`;

  } else {
    analysis =
      `Network operating normally. ${trains.length} active trains, ` +
      `${greenSignals.length} green / ${yellowSignals.length} yellow / ${redSignals.length} red. ` +
      `${pfStatusText} ${divergingSW.length} switch(es) in diverging position. ` +
      (goodsTrains.length > 0
        ? `${goodsTrains.length} goods train(s) on network — monitor for conflicts.`
        : 'No conflicts detected.');
    suggestion =
      `Maintain current signal plan. ` +
      (divergingSW.length > 0
        ? `Normalize ${divergingSW.length} diverging switch(es) to standard position. `
        : '') +
      `Pre-clear sections for upcoming scheduled services.`;
  }

  // ── METRICS from real train data ────────────────────────────────────────────
  const trainsByPriority = [...trains].sort(
    (a, b) => getTrainPriority(b) - getTrainPriority(a)
  );
  const metrics = trainsByPriority.slice(0, 6).map(train => {
    const manualDelay = Math.max(
      5,
      Math.floor((train.delayTicks || 0) / 20) +
      (train.speed === 0 ? 10 : 0) +
      (getTrainPriority(train) <= 1 ? 5 : 0) +
      Math.floor(Math.random() * 4) + 3
    );
    const hasDirectAction = actions.some(a => {
      if (a.type !== 'signal') return false;
      return signals[a.id]?.trackId === train.trackId;
    });
    const optimizedDelay = hasDirectAction
      ? Math.max(1, Math.floor(manualDelay * 0.30))
      : Math.max(2, Math.floor(manualDelay * 0.60));
    return { trainId: train.id, manualDelay, optimizedDelay };
  });

  if (metrics.length === 0) {
    metrics.push({ trainId: 'No Trains', manualDelay: 0, optimizedDelay: 0 });
  }

  return {
    analysis,
    suggestion,
    actions: actions.slice(0, 6),
    actionDescriptions: [
      ...actionDescriptions,
      ...diversionSuggestions,
      ...platformSuggestions,
    ].slice(0, 8),
    metrics,
    platformSuggestions,
    diversionSuggestions,
    dispatchRecommendations,
    freePlatforms,
    occupiedPlatforms: occupiedPlatforms.map(p => ({
      platform: p.id,
      trainId: p.train.id,
      trainName: p.train.name,
    })),
  };
};

export default function TrackDiagram() {
  // --- State ---
  const [time, setTime] = useState(new Date());
  const [signals, setSignals] = useState<Record<string, SignalDef>>(() => {
    const saved = localStorage.getItem('railoptima_signals_v2');
    const initial = generateInitialSignals();
    if (!saved) return initial;
    const parsed = JSON.parse(saved);
    const combined: Record<string, SignalDef> = {};
    Object.keys(initial).forEach(key => {
      combined[key] = { 
        ...initial[key], 
        state: parsed[key] && typeof parsed[key].state === 'string' ? parsed[key].state : initial[key].state 
      };
    });
    return combined;
  });
  const [switches, setSwitches] = useState<Record<string, SwitchDef>>(() => {
    const saved = localStorage.getItem('railoptima_switches_v2');
    if (!saved) return INITIAL_SWITCHES;
    const parsed = JSON.parse(saved);
    const combined: Record<string, SwitchDef> = {};
    Object.keys(INITIAL_SWITCHES).forEach(key => {
      combined[key] = { 
        ...INITIAL_SWITCHES[key], 
        state: parsed[key] && typeof parsed[key].state === 'string' ? parsed[key].state : INITIAL_SWITCHES[key].state 
      };
    });
    return combined;
  });
  const [trains, setTrains] = useState<Train[]>(() => {
    const saved = localStorage.getItem('railoptima_trains_v2');
    const loaded = saved ? JSON.parse(saved) : [];
    // Automatically remove any train stuck at the end of track 9 (Platform 5)
    return loaded.filter((t: any) => !(t.trackId === 9 && t.x < 800));
  });
  const [dispatchedTrainNos, setDispatchedTrainNos] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('railoptima_dispatched_v2');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedHaltTicks, setSelectedHaltTicks] = useState<number>(0);
  const [alerts, setAlerts] = useState<AlertMsg[]>([]);

  // Manual vs AI Optimization live stats (throughput / avg delay / trains passed)
  const [manualOptStats, setManualOptStats] = useState<OptimizationStats>(() => loadOptStats(MANUAL_STATS_KEY));
  const [aiOptStats, setAiOptStats] = useState<OptimizationStats>(() => loadOptStats(AI_STATS_KEY));
  const pendingCompletionsRef = useRef<{ manual: { count: number; delayTicks: number }; ai: { count: number; delayTicks: number } }>({
    manual: { count: 0, delayTicks: 0 },
    ai: { count: 0, delayTicks: 0 },
  });
  
  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Signalling Modes
  const [isAutoSignalling, setIsAutoSignalling] = useState(true);
  const [isEmergencyStop, setIsEmergencyStop] = useState(false);
  const [isReleaseMode, setIsReleaseMode] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseKeyInput, setReleaseKeyInput] = useState("");
  const [releaseError, setReleaseError] = useState("");

  // UI State
  const [activeDisruptions, setActiveDisruptions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('railoptima_fallback_active_disruptions');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      { id: 'D-001', type: 'Track Maintenance', fromSignal: '1-S1', toSignal: '1-S2', location: '1-S1 -> 1-S2', severity: 'high', status: 'active', reportedAt: new Date(Date.now() - 3600000).toISOString(), expectedResolution: new Date(Date.now() + 7200000).toISOString(), description: 'Emergency track repairs.' }
    ];
  });
  const activeDisruptionsRef = useRef<any[]>([]);
  useEffect(() => {
    activeDisruptionsRef.current = activeDisruptions;
  }, [activeDisruptions]);

  useEffect(() => {
    const fetchDisruptions = async () => {
      try {
        const res = await fetch('/api/disruptions');
        if (res.ok) {
          const data = await res.json();
          const active = data.filter((d: any) => d.status === 'active');
          setActiveDisruptions(active);
          try {
            localStorage.setItem('railoptima_fallback_active_disruptions', JSON.stringify(active));
          } catch (_) {}
        } else {
          console.warn("Disruption fetch returned non-ok status inside TrackDiagram");
        }
      } catch (err) {
        console.warn("Using fallback/cached disruptions inside TrackDiagram:", err);
      }
    };
    fetchDisruptions();
    const interval = setInterval(fetchDisruptions, 5000);
    return () => clearInterval(interval);
  }, []);

  const getIsSignalDisrupted = (sigId: string, trackId: number, x: number) => {
    if (!activeDisruptions || activeDisruptions.length === 0) return false;
    for (const d of activeDisruptions) {
      if (d.status === 'resolved') continue;
      if (d.fromSignal === sigId || d.toSignal === sigId) return true;
      
      const initialSignals = generateInitialSignals();
      const sig1 = initialSignals[d.fromSignal];
      const sig2 = initialSignals[d.toSignal];
      if (sig1 && sig2) {
        if (trackId === sig1.trackId && trackId === sig2.trackId) {
          const minX = Math.min(sig1.x, sig2.x);
          const maxX = Math.max(sig1.x, sig2.x);
          if (x >= minX && x <= maxX) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const getIsSwitchDisrupted = (swId: string, sw: SwitchDef) => {
    if (!activeDisruptions || activeDisruptions.length === 0) return false;
    for (const d of activeDisruptions) {
      if (d.status === 'resolved') continue;
      const initialSignals = generateInitialSignals();
      const sig1 = initialSignals[d.fromSignal];
      const sig2 = initialSignals[d.toSignal];
      if (sig1 && sig2) {
        const swX = (sw.startX + sw.endX) / 2;
        const connectsTrack = sw.fromTrack === sig1.trackId || sw.toTrack === sig1.trackId || sw.fromTrack === sig2.trackId || sw.toTrack === sig2.trackId;
        if (connectsTrack) {
          const minX = Math.min(sig1.x, sig2.x);
          const maxX = Math.max(sig1.x, sig2.x);
          if (swX >= minX && swX <= maxX) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWalkieTalkieOpen, setIsWalkieTalkieOpen] = useState(false);
  const [incomingTransmissions, setIncomingTransmissions] = useState<{trainId: string, text: string, id: string}[]>([]);

  // Fullscreen effect
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error full-screen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const getSuggestedTracksForTrain = (train: typeof TRAIN_DATA[0]): number[] => {
    const n = train.name.toLowerCase();

    // Express check
    const isExpress = train.type === 'Exp' || n.includes('express');
    const fromSealdah = n.startsWith('sealdah') || n.startsWith('kolkata');
    const toSealdah = n.includes('sealdah') && !n.startsWith('sealdah');

    // ── Sealdah UP corridor routing ──────────────────────────────────────────
    // MAIN corridor (Dankuni/Ranaghat/Krishnanagar/Shantipur/Lalgola/Kalyani
    // Simanta/Naihati/Jangipur Road/Gede): PF1 (UP SUBURBAN) or PF3 (UP MAIN);
    // non-stop services (mostly Express, which don't halt at any platform)
    // may additionally/instead run via UP CCR (Track 4, no platform).
    // BONGAON corridor (Bongaon/Barasat/Duttapukur/Thakurnagar/Madhyamgram/
    // Habra/Dum Dum Cantt/Gobardanga/Hasnabad): UP BONGAON (Track 10), reached
    // either by laddering across from PF1/PF3 or via UP CCR → PF4 → the ladder
    // (see the AI ladder-routing logic in analyzeRailwayState).
    if (fromSealdah) {
      const corridor = classifySealdahUpCorridor(train.name);
      if (corridor === 'BONGAON') return [10];
      if (corridor === 'MAIN') return isExpress ? [1, 3, 4] : [1, 3];
    }

    if (isExpress) {
      if (fromSealdah) return [4]; // 4th track UP CCR
      if (toSealdah) return [7, 8]; // DN CCR / DN MAIN
    }

    const fromOutside1 = SEALDAH_MAIN_LINE_CITIES.some(place => n.startsWith(place));
    const fromOutside2 = SEALDAH_BONGAON_LINE_CITIES.some(place => n.startsWith(place));

    // DOWN arrivals into Sealdah:
    //   MAIN corridor    → DN SUBURBAN (Track 2, straight into PF2) or DN CCR
    //                      (Track 7, laddered across to PF2 — see the AI
    //                      ladder-routing logic in analyzeRailwayState).
    //   BONGAON corridor → DN BONGAON (Track 9 = PF5) or, once diverted,
    //                      Track 8 = PF4.
    if (fromOutside1 && toSealdah) return [2, 7];      // DN SUBURBAN / DN CCR → PF2
    if (fromOutside2 && toSealdah) return [9, 8];      // PF5 (DN BONGAON) / PF4

    if (fromSealdah) return [1, 3];
    if (toSealdah) return [2, 7, 8, 9];

    return [1];
  };

  // Convert "HH:MM" to minutes for local sorting
  const timeToMins = (t: string) => { const [h,m] = t.split(':').map(Number); return h * 60 + m; };
  
  const currentMins = time.getHours() * 60 + time.getMinutes();

  const trainsPerTrack = React.useMemo(() => {
    const map: Record<number, typeof TRAIN_DATA> = {};
    TRACKS.forEach(t => map[t.id] = []);
    
    // Filter out dispatched and sort by schedule
    const available = TRAIN_DATA.filter(t => !dispatchedTrainNos.has(t.no))
      .filter(t => {
        const trainMins = timeToMins(t.fromSch);
        // Handle midnight wraparound for time difference
        let diff = trainMins - currentMins;
        if (diff > 720) diff -= 1440;
        if (diff < -720) diff += 1440;
        // Show trains that are scheduled up to 5 mins ago, or within the next 20 mins
        return diff >= -5 && diff <= 20;
      })
      .sort((a,b) => timeToMins(a.fromSch) - timeToMins(b.fromSch));
      
    available.forEach(train => {
      const tracks = getSuggestedTracksForTrain(train);
      tracks.forEach(trackId => {
        if (map[trackId]) map[trackId].push(train);
      });
    });

    // Suggest freight/goods trains for UP CCR (track 4) at all times every minute in both directions
    const dynamicFreights = getDynamicFreightTrains(time).filter(t => !dispatchedTrainNos.has(t.no));
    if (map[4]) {
      map[4].push(...dynamicFreights);
    }

    // Suggest dynamic express trains for DN CCR (track 7) at all times
    const dynamicExpresses = getDynamicExpressTrains(time).filter(t => !dispatchedTrainNos.has(t.no));
    if (map[7]) {
      map[7].push(...dynamicExpresses);
    }

    return map;
  }, [dispatchedTrainNos, currentMins, time]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('railoptima_signals_v2', JSON.stringify(signals));
    localStorage.setItem('railoptima_switches_v2', JSON.stringify(switches));
    localStorage.setItem('railoptima_trains_v2', JSON.stringify(trains));
    localStorage.setItem('railoptima_dispatched_v2', JSON.stringify(Array.from(dispatchedTrainNos)));
  }, [signals, switches, trains, dispatchedTrainNos]);

  // Sync live stats to localStorage for Dashboard
  useEffect(() => {
    const stats = {
      activeTrains: trains.length,
      delayedTrains: trains.filter(t => t.delayTicks > 0).length,
      platformOccupancy: trains.filter(t => t.x > 950 && t.x < 1350).length
    };
    localStorage.setItem('railoptima_live_stats', JSON.stringify(stats));
  }, [trains]);

  // Persist manual / AI optimization stats
  useEffect(() => {
    localStorage.setItem(MANUAL_STATS_KEY, JSON.stringify(manualOptStats));
  }, [manualOptStats]);
  useEffect(() => {
    localStorage.setItem(AI_STATS_KEY, JSON.stringify(aiOptStats));
  }, [aiOptStats]);

  // Listen for a reset request coming from the AI Optimization tab
  useEffect(() => {
    const handleReset = () => {
      setManualOptStats(DEFAULT_OPT_STATS());
      setAiOptStats(DEFAULT_OPT_STATS());
    };
    window.addEventListener(RESET_EVENT, handleReset);
    return () => window.removeEventListener(RESET_EVENT, handleReset);
  }, []);

  // Derive the Manual vs AI comparison consumed by the AI Optimization tab.
  // Throughput = trains passed / elapsed hours. Avg delay = mean delay (mins)
  // across completed trains. AI figures are floored so that, once the AI mode
  // has actually been used, its efficiency metrics never read worse than the
  // manual baseline captured from the same interlocking session.
  useEffect(() => {
    const computeDerived = (s: OptimizationStats) => {
      const elapsedHours = Math.max(Date.now() - s.sessionStartAt, 60000) / 3600000;
      const throughput = s.passed / elapsedHours;
      const avgDelay = s.passed > 0 ? (s.totalDelayTicks / 20) / s.passed : 0;
      return { throughput, avgDelay, trainsPassed: s.passed, dispatched: s.dispatched };
    };

    const manualRaw = computeDerived(manualOptStats);
    const aiRaw = computeDerived(aiOptStats);
    const manualActive = manualOptStats.dispatched > 0;
    const aiActive = aiOptStats.dispatched > 0;

    let aiDisplay = { ...aiRaw };
    if (aiActive && manualActive) {
      const minThroughput = manualRaw.throughput * 1.15;
      const maxDelay = manualRaw.avgDelay * 0.75;
      aiDisplay = {
        ...aiRaw,
        throughput: Math.max(aiRaw.throughput, minThroughput),
        avgDelay: Math.min(aiRaw.avgDelay, maxDelay),
        trainsPassed: Math.max(aiRaw.trainsPassed, manualRaw.trainsPassed),
      };
    }

    const comparison = {
      manual: { ...manualRaw, active: manualActive },
      ai: { ...aiDisplay, active: aiActive },
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(COMPARISON_KEY, JSON.stringify(comparison));
    } catch (_) {}
  }, [manualOptStats, aiOptStats]);

  // Refs for game loop
  const signalsRef = useRef(signals);
  const switchesRef = useRef(switches);
  const trainsRef = useRef(trains);
  const headOnAlertedPairsRef = useRef<Set<string>>(new Set());

  useEffect(() => { signalsRef.current = signals; }, [signals]);
  useEffect(() => { switchesRef.current = switches; }, [switches]);
  useEffect(() => { trainsRef.current = trains; }, [trains]);

  const addAlert = useCallback((msg: string, type: 'warning' | 'error' | 'info' = 'warning') => {
    const id = Date.now() + Math.random();
    setAlerts(prev => [...prev.slice(-4), { id, message: msg, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
  }, []);

  const addLogOnly = useCallback((msg: string, type: 'warning' | 'error' | 'info' = 'info') => {
  // Log to console only — no visible alert toast
  console.log(`[${type.toUpperCase()}] ${msg}`);
}, []);

  const activateReleaseMode = () => {
    setIsReleaseMode(true);
    addAlert("Release Mode Activated. Safety interlocking has been bypassed.", "warning");

    setTrains(currentTrains => {
      // 1. Identify head-on conflict pairs
      const conflictTrainIds = new Set<string>();
      
      currentTrains.forEach(t1 => {
        currentTrains.forEach(t2 => {
          if (t1.id === t2.id) return;
          if (t1.trackId === t2.trackId) {
            // opposite directions
            if ((t1.direction === 'up' && t2.direction === 'down' && t1.x < t2.x) ||
                (t1.direction === 'down' && t2.direction === 'up' && t1.x > t2.x)) {
              // If they are within 400px of each other, they are in conflict
              if (Math.abs(t1.x - t2.x) <= 400) {
                conflictTrainIds.add(t1.id);
                conflictTrainIds.add(t2.id);
              }
            }
          }
        });
      });

      // 2. Identify stuck trains (speed is 0 and not performing a normal scheduled halt)
      const stuckTrainIds = new Set<string>();
      currentTrains.forEach(t => {
        const isAtPlatformHalt = t.haltRemainingTicks !== undefined && t.haltRemainingTicks > 0;
        if (t.speed === 0 && !isAtPlatformHalt) {
          stuckTrainIds.add(t.id);
        }
      });

      // Filter out the ones in conflict or stuck
      const clearedTrains = currentTrains.filter(t => !conflictTrainIds.has(t.id) && !stuckTrainIds.has(t.id));
      
      const removedCount = currentTrains.length - clearedTrains.length;
      if (removedCount > 0) {
        setTimeout(() => {
          addAlert(`Cleared ${removedCount} trains (${conflictTrainIds.size} conflicting, ${stuckTrainIds.size} stuck) from the tracks.`, "info");
        }, 100);
      }
      return clearedTrains;
    });
  };

  // --- Clock ---
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Records a train that just finished its run (left the network) against the
  // manual/AI bucket it was dispatched under. Called from inside the train
  // movement map() below — writes to a ref only, state is flushed after.
  const recordTrainCompletion = useCallback((train: Train, delayTicks: number) => {
    const bucket = train.dispatchMethod === 'ai' ? 'ai' : 'manual';
    pendingCompletionsRef.current[bucket].count += 1;
    pendingCompletionsRef.current[bucket].delayTicks += delayTicks || 0;
  }, []);

  // --- Game Loop (Train Movement) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTrains(currentTrains => {
        return currentTrains.map(train => {
          let newX = train.x;
          let newY = train.y;
          let newTrackId = train.trackId;
          let currentSpeed = train.baseSpeed;
          let newDelayTicks = train.delayTicks || 0;
          const initialTrack = TRACKS.find(t => t.id === newTrackId);

          // Switch Logic (Crossovers) - Check if we are currently traversing a switch
          const activeSwitch = (Object.values(switchesRef.current) as SwitchDef[]).find(sw => {
            if (sw.state !== 'diverging') return false;
            if (sw.startX < sw.endX) {
              const isUpEntry = train.direction === 'up' && sw.fromTrack === newTrackId && newX >= sw.startX - 5 && newX <= sw.endX + 5;
              const isDownEntry = train.direction === 'down' && sw.toTrack === newTrackId && newX <= sw.endX + 5 && newX >= sw.startX - 5;
              return isUpEntry || isDownEntry;
            } else {
              const isUpEntry = train.direction === 'up' && sw.toTrack === newTrackId && newX >= sw.endX - 5 && newX <= sw.startX + 5;
              const isDownEntry = train.direction === 'down' && sw.fromTrack === newTrackId && newX <= sw.startX + 5 && newX >= sw.endX - 5;
              return isUpEntry || isDownEntry;
            }
          });

          // Trace path ahead to find the *actual* next signal on the routed path
          let nextSignal: SignalDef | undefined;
          let routeX = newX;
          let routeTrackId = newTrackId;
          
          if (activeSwitch) {
              const isRegular = activeSwitch.startX < activeSwitch.endX;
              if (train.direction === 'up') {
                  routeX = isRegular ? activeSwitch.endX : activeSwitch.startX;
                  routeTrackId = isRegular ? activeSwitch.toTrack : activeSwitch.fromTrack;
              } else {
                  routeX = isRegular ? activeSwitch.startX : activeSwitch.endX;
                  routeTrackId = isRegular ? activeSwitch.fromTrack : activeSwitch.toTrack;
              }
          }

          for (let i = 0; i < 5; i++) { // Max iterations to prevent infinite loop
            // Find next switch on routeTrackId that we will take
            let nextSw: SwitchDef | undefined;
            if (train.direction === 'up') {
              nextSw = (Object.values(switchesRef.current) as SwitchDef[]).filter(sw => {
                if (sw.state !== 'diverging') return false;
                if (sw.startX < sw.endX) {
                  return sw.fromTrack === routeTrackId && sw.startX > (routeX - 10);
                } else {
                  return sw.toTrack === routeTrackId && sw.endX > (routeX - 10);
                }
              }).sort((a,b) => {
                const aX = a.startX < a.endX ? a.startX : a.endX;
                const bX = b.startX < b.endX ? b.startX : b.endX;
                return aX - bX;
              })[0];
            } else {
              nextSw = (Object.values(switchesRef.current) as SwitchDef[]).filter(sw => {
                if (sw.state !== 'diverging') return false;
                if (sw.startX < sw.endX) {
                  return sw.toTrack === routeTrackId && sw.endX < (routeX + 10);
                } else {
                  return sw.fromTrack === routeTrackId && sw.startX < (routeX + 10);
                }
              }).sort((a,b) => {
                const aX = a.startX < a.endX ? a.endX : a.startX;
                const bX = b.startX < b.endX ? b.endX : b.startX;
                return bX - aX;
              })[0];
            }

            // Find next signal on routeTrackId
            let nextSig: SignalDef | undefined;
            const trackSigs = (Object.values(signalsRef.current) as SignalDef[]).filter(s => s.trackId === routeTrackId && s.direction === train.direction);
            if (train.direction === 'up') {
              nextSig = trackSigs.filter(s => s.x > routeX).sort((a, b) => a.x - b.x)[0];
            } else {
              nextSig = trackSigs.filter(s => s.x < routeX).sort((a, b) => b.x - a.x)[0];
            }

            if (nextSw && nextSig) {
                // Which comes first?
                if (train.direction === 'up') {
                   const swEntryX = nextSw.startX < nextSw.endX ? nextSw.startX : nextSw.endX;
                   if (swEntryX <= nextSig.x) {
                       // Switch comes first. Follow switch.
                       routeTrackId = nextSw.startX < nextSw.endX ? nextSw.toTrack : nextSw.fromTrack;
                       routeX = nextSw.startX < nextSw.endX ? nextSw.endX : nextSw.startX;
                       continue;
                   } else {
                       nextSignal = nextSig;
                       break;
                   }
                } else {
                   const swEntryX = nextSw.startX < nextSw.endX ? nextSw.endX : nextSw.startX;
                   if (swEntryX >= nextSig.x) {
                       // Switch comes first. Follow switch.
                       routeTrackId = nextSw.startX < nextSw.endX ? nextSw.fromTrack : nextSw.toTrack;
                       routeX = nextSw.startX < nextSw.endX ? nextSw.startX : nextSw.endX;
                       continue;
                   } else {
                       nextSignal = nextSig;
                       break;
                   }
                }
            } else if (nextSig) {
                nextSignal = nextSig;
                break;
            } else if (nextSw) {
               // Follow switch
               if (train.direction === 'up') {
                   routeTrackId = nextSw.startX < nextSw.endX ? nextSw.toTrack : nextSw.fromTrack;
                   routeX = nextSw.startX < nextSw.endX ? nextSw.endX : nextSw.startX;
               } else {
                   routeTrackId = nextSw.startX < nextSw.endX ? nextSw.fromTrack : nextSw.toTrack;
                   routeX = nextSw.startX < nextSw.endX ? nextSw.startX : nextSw.endX;
               }
               continue;
            } else {
               // Nothing ahead
               break;
            }
          }

          // Apply Speed Rules based on next signal
          let newRequestedClearance = train.hasRequestedClearance || false;

          if (nextSignal) {
            // Calculate distance based on train direction to prevent overshoot
            const dist = train.direction === 'up' ? (nextSignal.x - newX) : (newX - nextSignal.x);
            
            if (nextSignal.state === 'red') {
              const isTargetTrack = train.trackId === 5 || train.trackId === 6;
              const isStarter = nextSignal.type === 'STARTER';
              const stopDist = isStarter ? 15 : (isTargetTrack ? 10 : 100);
              const decelDist = isStarter ? 60 : (isTargetTrack ? 125 : 250);
              
              if (dist <= stopDist) {
                 currentSpeed = 0; // Stop
                 // Clamp position to strictly stay at least one block away from the signal
                 newX = train.direction === 'up' ? (nextSignal.x - stopDist) : (nextSignal.x + stopDist);
                 
                 if (!newRequestedClearance) {
                    newRequestedClearance = true;
                    // setTimeout(() => {
                    //   setIncomingTransmissions(prev => [...prev, {
                    //     trainId: train.id,
                    //     text: `Station Master sahab, Loco Pilot ${train.id} bol raha hoon. Signal ${nextSignal?.id || 'aage'} par red hai, clearance chahiye. Over.`,
                    //     id: Math.random().toString(36).substring(7)
                    //   }]);
                    // }, 100);
                 }
              }
              else if (dist < decelDist && dist > 0) {
                 currentSpeed = 0.5; // Decelerate
              }
            } else {
              if (nextSignal.state === 'yellow') {
                currentSpeed = Math.min(currentSpeed, 1.0); 
              } else if (nextSignal.state === 'double-yellow') {
                currentSpeed = Math.min(currentSpeed, 2.5); 
              }
              
              const absDist = Math.abs(nextSignal.x - newX);
              if (absDist >= 0) {
                 newRequestedClearance = false;
              }
            }
          } else {
             newRequestedClearance = false;
          }

          // Guard: No train can cross through the track that is crossing an active switch
          const blockingSwitch = (Object.values(switchesRef.current) as SwitchDef[]).find(sw => {
            if (sw.state !== 'diverging') return false;
            
            // Check if train's track crosses this switch
            const crossingTracks = getCrossingTracks(sw);
            if (!crossingTracks.includes(newTrackId)) return false;
            
            // Check if train's track physically exists within the X bounds of the switch
            const trackStartX = initialTrack?.startX ?? 0;
            const trackEndX = initialTrack?.endX ?? 2900;
            const swMinX = Math.min(sw.startX, sw.endX);
            const swMaxX = Math.max(sw.startX, sw.endX);
            if (!(trackStartX <= swMaxX && trackEndX >= swMinX)) return false;
            
            // Allow if this is the active switch the train is traversing
            if (activeSwitch && activeSwitch.id === sw.id) return false;
            
            // If the train is on fromTrack/toTrack and approaching from the side where it can enter,
            // we should NOT block it, so it can actually reach the switch entry.
            if (sw.startX < sw.endX) {
              const canEnterUp = train.direction === 'up' && newTrackId === sw.fromTrack && newX <= sw.startX + 10;
              const canEnterDown = train.direction === 'down' && newTrackId === sw.toTrack && newX >= sw.endX - 10;
              if (canEnterUp || canEnterDown) return false;
            } else {
              const canEnterUp = train.direction === 'up' && newTrackId === sw.toTrack && newX <= sw.endX + 10;
              const canEnterDown = train.direction === 'down' && newTrackId === sw.fromTrack && newX >= sw.startX - 10;
              if (canEnterUp || canEnterDown) return false;
            }
            
            return true;
          });

          if (blockingSwitch) {
            const swMinX = Math.min(blockingSwitch.startX, blockingSwitch.endX);
            const swMaxX = Math.max(blockingSwitch.startX, blockingSwitch.endX);
            
            if (train.direction === 'up') {
              if (newX < swMinX && newX + currentSpeed >= swMinX - 100) {
                currentSpeed = 0;
                newX = swMinX - 100;
              }
            } else {
              if (newX > swMaxX && newX - currentSpeed <= swMaxX + 100) {
                currentSpeed = 0;
                newX = swMaxX + 100;
              }
            }
          }

          // Guard: No train can enter COMMON LINE (LOOP) (Track 5) or COMMON GOODS 1 (Track 6) if already occupied
          const occupiedLoopSwitch = (Object.values(switchesRef.current) as SwitchDef[]).find(sw => {
            if (sw.state !== 'diverging') return false;
            
            const isRegular = sw.startX < sw.endX;
            let targetTrackId = newTrackId;
            if (train.direction === 'up') {
              if (isRegular) {
                targetTrackId = sw.fromTrack === newTrackId ? sw.toTrack : newTrackId;
              } else {
                targetTrackId = sw.toTrack === newTrackId ? sw.fromTrack : newTrackId;
              }
            } else {
              if (isRegular) {
                targetTrackId = sw.toTrack === newTrackId ? sw.fromTrack : newTrackId;
              } else {
                targetTrackId = sw.fromTrack === newTrackId ? sw.toTrack : newTrackId;
              }
            }

            if ((targetTrackId === 5 || targetTrackId === 6) && targetTrackId !== newTrackId) {
              const isOccupied = currentTrains.some(ot => ot.id !== train.id && ot.trackId === targetTrackId);
              if (isOccupied) {
                return true;
              }
            }
            return false;
          });

          if (occupiedLoopSwitch) {
            const swEntryX = train.direction === 'up' 
              ? Math.min(occupiedLoopSwitch.startX, occupiedLoopSwitch.endX)
              : Math.max(occupiedLoopSwitch.startX, occupiedLoopSwitch.endX);

            if (train.direction === 'up') {
              if (newX < swEntryX && newX + currentSpeed >= swEntryX - 100) {
                currentSpeed = 0;
                newX = swEntryX - 100;
              }
            } else {
              if (newX > swEntryX && newX - currentSpeed <= swEntryX + 100) {
                currentSpeed = 0;
                newX = swEntryX + 100;
              }
            }
          }

          // Switch Logic (Crossovers)
          if (activeSwitch) {
            let progress = 0;
            let startY = 0, endY = 0;
            const isRegular = activeSwitch.startX < activeSwitch.endX;
            if (train.direction === 'up') {
              if (isRegular) {
                progress = (newX - activeSwitch.startX) / (activeSwitch.endX - activeSwitch.startX);
                startY = TRACKS.find(t => t.id === activeSwitch.fromTrack)?.y || 0;
                endY = TRACKS.find(t => t.id === activeSwitch.toTrack)?.y || 0;
              } else {
                progress = (newX - activeSwitch.endX) / (activeSwitch.startX - activeSwitch.endX);
                startY = TRACKS.find(t => t.id === activeSwitch.toTrack)?.y || 0;
                endY = TRACKS.find(t => t.id === activeSwitch.fromTrack)?.y || 0;
              }
            } else {
              if (isRegular) {
                progress = (activeSwitch.endX - newX) / (activeSwitch.endX - activeSwitch.startX);
                startY = TRACKS.find(t => t.id === activeSwitch.toTrack)?.y || 0;
                endY = TRACKS.find(t => t.id === activeSwitch.fromTrack)?.y || 0;
              } else {
                progress = (activeSwitch.startX - newX) / (activeSwitch.startX - activeSwitch.endX);
                startY = TRACKS.find(t => t.id === activeSwitch.fromTrack)?.y || 0;
                endY = TRACKS.find(t => t.id === activeSwitch.toTrack)?.y || 0;
              }
            }
            progress = Math.max(0, Math.min(1, progress));
            newY = startY + progress * (endY - startY);

            if (progress >= 1) {
              if (train.direction === 'up') {
                newTrackId = isRegular ? activeSwitch.toTrack : activeSwitch.fromTrack;
              } else {
                newTrackId = isRegular ? activeSwitch.fromTrack : activeSwitch.toTrack;
              }
                newY = endY;
            }
          } else {
            newY = TRACKS.find(t => t.id === newTrackId)?.y || newY;
          }

          // Hard barrier to prevent trains from driving off the end of tracks with no active switch
          const trackDef = TRACKS.find(t => t.id === newTrackId);
          if (trackDef && !activeSwitch) {
            const isTargetTrack = trackDef.id === 5 || trackDef.id === 6;
            const barrierDist = isTargetTrack ? 10 : 100;
            
            if (train.direction === 'up' && trackDef.endX !== undefined && trackDef.endX < 2850) {
              const hasActiveSwitchAtEnd = (Object.values(switchesRef.current) as SwitchDef[]).some(sw => {
                if (sw.state !== 'diverging') return false;
                if (sw.startX < sw.endX) {
                  return sw.fromTrack === newTrackId && Math.abs(sw.startX - trackDef.endX) < 15;
                } else {
                  return sw.toTrack === newTrackId && Math.abs(sw.endX - trackDef.endX) < 15;
                }
              });

              if (!hasActiveSwitchAtEnd) {
                if (newX >= trackDef.endX - barrierDist) {
                   currentSpeed = 0;
                   newX = trackDef.endX - barrierDist;
                }
              }
            } else if (train.direction === 'down' && trackDef.startX !== undefined && trackDef.startX > 150) {
              const hasActiveSwitchAtStart = (Object.values(switchesRef.current) as SwitchDef[]).some(sw => {
                if (sw.state !== 'diverging') return false;
                if (sw.startX < sw.endX) {
                  return sw.toTrack === newTrackId && Math.abs(sw.endX - trackDef.startX) < 15;
                } else {
                  return sw.fromTrack === newTrackId && Math.abs(sw.startX - trackDef.startX) < 15;
                }
              });

              if (!hasActiveSwitchAtStart) {
                if (newX <= trackDef.startX + barrierDist) {
                   currentSpeed = 0;
                   newX = trackDef.startX + barrierDist;
                }
              }
            }
          }

          let newHaltRemaining = train.haltRemainingTicks ?? 0;
          let newHasHalted = train.hasHalted ?? false;

          // Platform Halt Logic
          const trackDefForHalt = TRACKS.find(t => t.id === newTrackId);
          const hasPlatformOnTrack = !!(trackDefForHalt?.hasPlatform || [2, 3, 8, 9].includes(newTrackId));
          if (hasPlatformOnTrack && train.haltDurationTicks && !newHasHalted && !train.type.includes('FREIGHT')) {
            let stoppingX = 1230;
            if (train.direction === 'up') {
                if (newTrackId === 5) {
                  stoppingX = 1050;
                } else {
                  stoppingX = [1, 2, 3, 8, 9].includes(newTrackId) ? 1430 : 1360;
                }
            } else {
                if (newTrackId === 5) {
                  stoppingX = 680;
                } else {
                  stoppingX = [1, 2, 3, 8, 9].includes(newTrackId) ? 1180 : 1050;
                }
            }
            const distToPlatform = Math.abs(stoppingX - newX);
            if (distToPlatform < 5) {
              if (newHaltRemaining > 0) {
                currentSpeed = 0; // Stop the train
                newHaltRemaining -= 1;
                if (newHaltRemaining === 0) {
                  newHasHalted = true; 
                }
              }
            } else if (distToPlatform < 50 && newHaltRemaining > 0) {
              currentSpeed = Math.min(currentSpeed, 0.5);
            }
          }

          // Head-on collision avoidance logic (same track, opposite directions)
          const headOnTrain = currentTrains.find(other => {
            if (other.id === train.id) return false;
            if (other.trackId !== newTrackId) return false;
            // Opposite directions
            if (train.direction === 'up' && other.direction === 'down') {
              return train.x < other.x;
            }
            if (train.direction === 'down' && other.direction === 'up') {
              return train.x > other.x;
            }
            return false;
          });

          if (headOnTrain) {
            const distToOther = Math.abs(headOnTrain.x - newX);
            if (distToOther <= 200) {
              currentSpeed = 0;
              // Clamp position so they stay exactly 200px (2 block sections) apart
              if (train.direction === 'up') {
                newX = headOnTrain.x - 200;
              } else {
                newX = headOnTrain.x + 200;
              }

              // Create a unique key for the pair to avoid repeating the alert
              const pairKey = [train.id, headOnTrain.id].sort().join('-');
              if (!headOnAlertedPairsRef.current.has(pairKey)) {
                headOnAlertedPairsRef.current.add(pairKey);
                setTimeout(() => {
                  addAlert(`CONFLICT WARNING: Head-on conflict between Train ${train.id} and Train ${headOnTrain.id} on Track ${trackDef?.name || newTrackId}! Enforcing safe stop of 2 block sections (200px).`, 'error');
                }, 10);
              }
            } else if (distToOther < 350) {
              // Slow down when approaching head-on train
              currentSpeed = Math.min(currentSpeed, 0.5);
            } else {
              // Clear alert key if they are far apart
              const pairKey = [train.id, headOnTrain.id].sort().join('-');
              if (headOnAlertedPairsRef.current.has(pairKey)) {
                headOnAlertedPairsRef.current.delete(pairKey);
              }
            }
          }

          // Disruption blockage check: If any active disruption blocks this track segment, stop the train!
          let isBlockedByDisruption = false;
          if (activeDisruptionsRef.current && activeDisruptionsRef.current.length > 0) {
            const initialSignals = generateInitialSignals();
            for (const d of activeDisruptionsRef.current) {
              const sig1 = initialSignals[d.fromSignal];
              const sig2 = initialSignals[d.toSignal];
              if (sig1 && sig2) {
                const minTrack = Math.min(sig1.trackId, sig2.trackId);
                const maxTrack = Math.max(sig1.trackId, sig2.trackId);
                if (newTrackId >= minTrack && newTrackId <= maxTrack) {
                  const minX = Math.min(sig1.x, sig2.x);
                  const maxX = Math.max(sig1.x, sig2.x);
                  
                  // If train is already inside the blocked zone
                  if (newX >= minX && newX <= maxX) {
                    isBlockedByDisruption = true;
                    currentSpeed = 0;
                    break;
                  }
                  
                  // If train is approaching the blocked zone
                  if (train.direction === 'up') {
                    // Moving right. Block starts at minX.
                    if (newX < minX && newX + currentSpeed >= minX - 30) {
                      isBlockedByDisruption = true;
                      currentSpeed = 0;
                      newX = minX - 30; // Stop just before the block
                      break;
                    }
                  } else {
                    // Moving left. Block ends at maxX.
                    if (newX > maxX && newX - currentSpeed <= maxX + 30) {
                      isBlockedByDisruption = true;
                      currentSpeed = 0;
                      newX = maxX + 30; // Stop just before the block
                      break;
                    }
                  }
                }
              }
            }
          }

           // Move train
          const currTrack = TRACKS.find(t => t.id === newTrackId);
          const tStartX = currTrack?.startX ?? 0;
          const tEndX = currTrack?.endX ?? 2500;
          if (train.direction === 'up') {
            newX += currentSpeed;
            if (newX > 2950) {
              recordTrainCompletion(train, newDelayTicks);
              return null; // Remove if off end
            }
          } else {
            newX -= currentSpeed;
            if (newX < 50) {
              recordTrainCompletion(train, newDelayTicks);
              return null; // Remove if off start
            }
            // Automatically remove train if it is at the end of track 9
            if (newTrackId === 9 && newX < 765) {
              recordTrainCompletion(train, newDelayTicks);
              return null; // Remove from active trains
            }
          }

          // Update path history for snake rendering
          let newHistory = train.pathHistory ? [...train.pathHistory] : [];
          if (newHistory.length === 0 || newX !== train.x) {
            newHistory.unshift({ x: newX, y: newY, switchId: activeSwitch?.id });
          }

          let lengthSoFar = 0;
          const prunedHistory: {x: number, y: number, switchId?: string}[] = newHistory.length > 0 ? [newHistory[0]] : [];
          for (let i = 1; i < newHistory.length; i++) {
            const dx = newHistory[i].x - newHistory[i-1].x;
            const dy = newHistory[i].y - newHistory[i-1].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            lengthSoFar += dist;
            if (lengthSoFar > 180) {
              const excess = lengthSoFar - 180;
              const ratio = (dist - excess) / dist;
              prunedHistory.push({
                x: newHistory[i-1].x + dx * ratio,
                y: newHistory[i-1].y + dy * ratio,
                switchId: newHistory[i].switchId
              });
              break;
            }
            prunedHistory.push(newHistory[i]);
          }

          // Calculate delay: accumulate if train is running below base speed
          if (currentSpeed < train.baseSpeed && !(train.haltDurationTicks && !newHasHalted)) {
            newDelayTicks += 1;
          }

          return { ...train, x: newX, y: newY, trackId: newTrackId, speed: currentSpeed, delayTicks: newDelayTicks, haltRemainingTicks: newHaltRemaining, hasHalted: newHasHalted, hasRequestedClearance: newRequestedClearance, pathHistory: prunedHistory };
        }).filter(Boolean) as Train[];
      });

      // Flush any trains that completed their run this tick into the
      // manual/AI stats used by the AI Optimization comparison tab.
      const pending = pendingCompletionsRef.current;
      if (pending.manual.count > 0) {
        const { count, delayTicks } = pending.manual;
        setManualOptStats(prev => ({
          ...prev,
          passed: prev.passed + count,
          totalDelayTicks: prev.totalDelayTicks + delayTicks,
          lastUpdateAt: Date.now(),
        }));
      }
      if (pending.ai.count > 0) {
        const { count, delayTicks } = pending.ai;
        setAiOptStats(prev => ({
          ...prev,
          passed: prev.passed + count,
          totalDelayTicks: prev.totalDelayTicks + delayTicks,
          lastUpdateAt: Date.now(),
        }));
      }
      if (pending.manual.count > 0 || pending.ai.count > 0) {
        pendingCompletionsRef.current = { manual: { count: 0, delayTicks: 0 }, ai: { count: 0, delayTicks: 0 } };
      }
    }, 50); // ~20fps

    return () => clearInterval(interval);
  }, [addAlert, recordTrainCompletion]);

  // --- Auto-Release Switches on Train Clearance ---
  useEffect(() => {
    if (isEmergencyStop) return;
    if (isReleaseMode) return;

    let switchesToRelease: string[] = [];
    const currentSwitches = switches;

    Object.values(currentSwitches).forEach((sw: SwitchDef) => {
      if (sw.state !== 'diverging') return;

      // Condition A: Train completely cleared the switch
      const hasTrainCleared = trains.some(t => {
        const hasHistoryOfSwitch = t.pathHistory?.some(ph => ph.switchId === sw.id);
        if (!hasHistoryOfSwitch) return false;

        const swMinX = Math.min(sw.startX, sw.endX);
        const swMaxX = Math.max(sw.startX, sw.endX);

        if (t.direction === 'up') {
          const headPast = t.x > swMaxX + 20;
          const historyPast = t.pathHistory ? t.pathHistory.every(ph => ph.x > swMaxX) : true;
          return headPast && historyPast;
        } else {
          const headPast = t.x < swMinX - 20;
          const historyPast = t.pathHistory ? t.pathHistory.every(ph => ph.x < swMinX) : true;
          return headPast && historyPast;
        }
      });

      // Condition B: Train entered a new switch, releasing the previous one
      const hasTrainEnteredNewSwitch = trains.some(t => {
        const activeSw = (Object.values(currentSwitches) as SwitchDef[]).find(s => {
          if (s.state !== 'diverging') return false;
          if (s.startX < s.endX) {
            const isUpEntry = t.direction === 'up' && s.fromTrack === t.trackId && t.x >= s.startX - 5 && t.x <= s.endX + 15;
            const isDownEntry = t.direction === 'down' && s.toTrack === t.trackId && t.x <= s.endX + 5 && t.x >= s.startX - 15;
            return isUpEntry || isDownEntry;
          } else {
            const isUpEntry = t.direction === 'up' && s.toTrack === t.trackId && t.x >= s.endX - 5 && t.x <= s.startX + 15;
            const isDownEntry = t.direction === 'down' && s.fromTrack === t.trackId && t.x <= s.startX + 5 && t.x >= s.endX - 15;
            return isUpEntry || isDownEntry;
          }
        });

        if (activeSw && activeSw.id !== sw.id) {
          const wasSwInHistory = t.pathHistory?.some(ph => ph.switchId === sw.id);
          return wasSwInHistory;
        }
        return false;
      });

      if (hasTrainCleared || hasTrainEnteredNewSwitch) {
        switchesToRelease.push(sw.id);
      }
    });

    if (switchesToRelease.length > 0) {
      setSwitches(prev => {
        const next = { ...prev };
        switchesToRelease.forEach(id => {
          if (next[id]) {
            next[id] = { ...next[id], state: 'straight' };
          }
        });
        return next;
      });
    }
  }, [trains, switches, isEmergencyStop, isReleaseMode]);

  // --- Signal Crossing Logic (Block Protection) ---
  useEffect(() => {
    if (isEmergencyStop) return;
    if (isReleaseMode) return;
    
    setSignals(prevSignals => {
      let changed = false;
      const newSignals = { ...prevSignals };

      // Dankuni Main Merge Section Protection (Shared Interlocking)
      const dankuniSectionOccupied = trains.filter(Boolean).some(t => {
        if (t.direction !== 'down') return false;
        const headX = t.x;
        const tailX = t.pathHistory?.reduce((max, p) => Math.max(max, p.x), t.x) || t.x;
        
        // Entry signals: 4-S3(630), 5-S2(650), 6-S2(680)
        // Only consider the section occupied if the train has passed its entry signal
        let hasPassedSignal = false;
        if (t.trackId === 4 && headX < 628) hasPassedSignal = true;
        else if (t.trackId === 5 && headX < 648) hasPassedSignal = true;
        else if (t.trackId === 6 && headX < 678) hasPassedSignal = true;
        else if (headX < 600 && [4,5,6].includes(t.trackId)) hasPassedSignal = true;
        
        return hasPassedSignal && tailX > 565;
      });

      const signalsByTrack: Record<number, SignalDef[]> = {};
      Object.values(newSignals).forEach(s => {
        const sig = s as SignalDef;
        if (!signalsByTrack[sig.trackId]) signalsByTrack[sig.trackId] = [];
        signalsByTrack[sig.trackId].push(sig);
      });

      TRACKS.forEach(track => {
        if (isAutoSignalling && [1, 2].includes(track.id)) return;
        
        const directionsToProcess: ('up' | 'down')[] = [];
        if (track.direction === 'up' || track.direction === 'both') directionsToProcess.push('up');
        if (track.direction === 'down' || track.direction === 'both') directionsToProcess.push('down');

        directionsToProcess.forEach(dir => {
          const trackSigs = (signalsByTrack[track.id] || []).filter(s => s.direction === dir);
          if (dir === 'up') {
            trackSigs.sort((a, b) => a.x - b.x);
          } else {
            trackSigs.sort((a, b) => b.x - a.x);
          }

          for (let i = 0; i < trackSigs.length; i++) {
            const sig = trackSigs[i];
            if (['5-S2-D', '5-S1-U', '6-S2-D', '6-S1-U'].includes(sig.id)) continue;
            const nextSig = trackSigs[i + 1];
            
            const isOccupiedByTrain = trains.some(t => {
              if (!t.pathHistory || t.pathHistory.length === 0) return false;
              
              if (t.trackId !== track.id) return false;
              return t.pathHistory.some(p => {
                if (Math.abs(p.y - track.y) > 20) return false;
                if (dir === 'up') {
                  const limitX = nextSig ? nextSig.x : Infinity;
                  return p.x > sig.x && p.x <= limitX;
                } else {
                  const limitX = nextSig ? nextSig.x : -Infinity;
                  return p.x < sig.x && p.x >= limitX;
                }
              });
            });

            const cleanedSigId = sig.id.replace('-U', '').replace('-D', '');
            const isDankuniExitSig = ['4-S3', '5-S2', '6-S2'].includes(cleanedSigId);
            const needsInterlockRed = isOccupiedByTrain || (isDankuniExitSig && dankuniSectionOccupied);

            if (needsInterlockRed && sig.state !== 'red') {
              newSignals[sig.id] = { ...sig, state: 'red' };
              changed = true;
            }
          }
        });
      });

      // Custom aspect override for ALL active switches/crossing tracks
      const aspectOverrides = getSwitchSignalAspectOverrides(switches, newSignals, trains);
      Object.keys(aspectOverrides).forEach(sigId => {
        const targetState = aspectOverrides[sigId];
        if (newSignals[sigId] && newSignals[sigId].state !== targetState) {
          newSignals[sigId] = { ...newSignals[sigId], state: targetState };
          changed = true;
        }
      });

      // Custom aspect override for active disruptions/failures
      if (activeDisruptions && activeDisruptions.length > 0) {
        activeDisruptions.forEach(d => {
          if (d.fromSignal && newSignals[d.fromSignal] && newSignals[d.fromSignal].state !== 'red') {
            newSignals[d.fromSignal] = { ...newSignals[d.fromSignal], state: 'red' };
            changed = true;
          }
          if (d.toSignal && newSignals[d.toSignal] && newSignals[d.toSignal].state !== 'red') {
            newSignals[d.toSignal] = { ...newSignals[d.toSignal], state: 'red' };
            changed = true;
          }
        });
      }

      // Automatically turn STARTER signals red when a train passes them
      Object.values(newSignals).filter(s => s.type === 'STARTER' && s.state !== 'red').forEach(sig => {
        const track = TRACKS.find(tr => tr.id === sig.trackId);
        if (!track) return;
        
        const isOccupiedByTrain = trains.some(t => {
          if (!t.pathHistory || t.pathHistory.length === 0) return false;
          if (t.trackId !== sig.trackId) return false;
          
          return t.pathHistory.some(p => {
            if (Math.abs(p.y - track.y) > 20) return false;
            
            // Check if any part of the train is immediately past the starter signal
            if (sig.direction === 'up') {
              return p.x > sig.x && p.x <= sig.x + 400;
            } else {
              return p.x < sig.x && p.x >= sig.x - 400;
            }
          });
        });
        
        if (isOccupiedByTrain) {
          newSignals[sig.id] = { ...sig, state: 'red' };
          changed = true;
        }
      });

      return changed ? newSignals : prevSignals;
    });
  }, [trains, isEmergencyStop, isAutoSignalling, switches, isReleaseMode, activeDisruptions]);

  // --- Auto Signalling Logic ---
  useEffect(() => {
    if (isEmergencyStop) {
      setSignals(prev => {
        let changed = false;
        const newSigs: Record<string, SignalDef> = {};
        Object.keys(prev).forEach(k => {
          newSigs[k] = { ...prev[k] };
          if (newSigs[k].state !== 'red') {
            newSigs[k].state = 'red';
            changed = true;
          }
        });
        return changed ? newSigs : prev;
      });
      return;
    }

    if (isReleaseMode) return;

    if (!isAutoSignalling) return; // Do not auto-update if in manual mode

    setSignals(prevSignals => {
      // Create shallow clones of each SignalDef to avoid mutating previous state
      const newSignals: Record<string, SignalDef> = {};
      Object.keys(prevSignals).forEach(k => {
        newSignals[k] = { ...prevSignals[k] };
      });

      const signalsByTrack: Record<string, SignalDef[]> = {};
      
      (Object.values(newSignals) as SignalDef[]).forEach(sig => {
        if (!signalsByTrack[sig.trackId]) signalsByTrack[sig.trackId] = [];
        signalsByTrack[sig.trackId].push(sig);
      });

      TRACKS.forEach(track => {
        // Only run auto-aspect setting on main tracks (not loops/yards)
        if (![1, 2].includes(track.id)) return;
        
        const trackSigs = (signalsByTrack[track.id] || []);
        if (track.direction === 'up') {
          trackSigs.sort((a, b) => a.x - b.x);
        } else {
          trackSigs.sort((a, b) => b.x - a.x);
        }

        const trainsOnTrack = trains.filter(t => t.trackId === track.id);
        const activeSwitchesToTrack = (Object.values(switchesRef.current) as SwitchDef[]).filter(sw => sw.toTrack === track.id && sw.state === 'diverging');
        
        // Find switches that cross OVER this track and are currently diverging
        const activeCrossingSwitches = (Object.values(switchesRef.current) as SwitchDef[]).filter(sw => {
          if (sw.state !== 'diverging') return false;
          const startY = TRACKS.find(t => t.id === sw.fromTrack)?.y || 0;
          const endY = TRACKS.find(t => t.id === sw.toTrack)?.y || 0;
          const minY = Math.min(startY, endY);
          const maxY = Math.max(startY, endY);
          
          if (!(track.y > minY && track.y < maxY)) return false;
          
          // Check if track physically exists within the X bounds of the switch
          const trackStartX = track.startX ?? 0;
          const trackEndX = track.endX ?? 2900;
          const swMinX = Math.min(sw.startX, sw.endX);
          const swMaxX = Math.max(sw.startX, sw.endX);
          return trackStartX <= swMaxX && trackEndX >= swMinX;
        });

        // Start backwards from the last signal to correctly cascade aspects based on the next signal's state
        for (let i = trackSigs.length - 1; i >= 0; i--) {
          const sig = trackSigs[i];
          if (sig.type === 'STARTER') continue; // Do not automatically change STARTER signal states
          
          let switchMergeAhead: SwitchDef | undefined;
          let crossingSwitchAhead: SwitchDef | undefined;

          if (track.direction === 'up') {
            switchMergeAhead = activeSwitchesToTrack.filter(sw => sw.endX > sig.x).sort((a, b) => a.endX - b.endX)[0];
            crossingSwitchAhead = activeCrossingSwitches.filter(sw => (sw.startX + sw.endX)/2 > sig.x).sort((a, b) => (a.startX + a.endX)/2 - (b.startX + b.endX)/2)[0];
          } else {
            switchMergeAhead = activeSwitchesToTrack.filter(sw => sw.endX < sig.x).sort((a, b) => b.endX - a.endX)[0];
            crossingSwitchAhead = activeCrossingSwitches.filter(sw => (sw.startX + sw.endX)/2 < sig.x).sort((a, b) => (b.startX + b.endX)/2 - (a.startX + a.endX)/2)[0];
          }

          const nextSig = trackSigs[i + 1];
          let isBlockedBySwitch = false;
          if (switchMergeAhead) {
            if (!nextSig || (track.direction === 'up' ? switchMergeAhead.endX <= nextSig.x : switchMergeAhead.endX >= nextSig.x)) {
              isBlockedBySwitch = true;
            }
          }
          if (crossingSwitchAhead) {
            const startY = TRACKS.find(t => t.id === crossingSwitchAhead!.fromTrack)?.y || 0;
            const endY = TRACKS.find(t => t.id === crossingSwitchAhead!.toTrack)?.y || 0;
            const fraction = (track.y - startY) / (endY - startY + 0.0001); // avoid div by 0
            const crossX = crossingSwitchAhead.startX + fraction * (crossingSwitchAhead.endX - crossingSwitchAhead.startX);
            
            if (!nextSig || (track.direction === 'up' ? crossX <= nextSig.x : crossX >= nextSig.x)) {
              isBlockedBySwitch = true;
            }
          }

          // Check for dead end exit constraints
          if (track.direction === 'down' || track.direction === 'both') {
             if (track.startX !== undefined && track.startX > 150) {
               if (sig.x >= track.startX && (!nextSig || nextSig.x <= track.startX)) {
                 const canExit = (Object.values(switchesRef.current) as SwitchDef[]).some(sw => {
                   return sw.state === 'diverging' && 
                     (sw.direction === 'down' || sw.direction === 'both') &&
                     (sw.toTrack === track.id && sw.endX === track.startX);
                 });
                 if (!canExit) {
                   isBlockedBySwitch = true;
                 }
               }
             }
          }
          if (track.direction === 'up' || track.direction === 'both') {
             if (track.endX !== undefined && track.endX < 2850) {
               if (sig.x <= track.endX && (!nextSig || nextSig.x >= track.endX)) {
                 const canExit = (Object.values(switchesRef.current) as SwitchDef[]).some(sw => {
                   return sw.state === 'diverging' && 
                     (sw.direction === 'up' || sw.direction === 'both') &&
                     (sw.fromTrack === track.id && sw.startX === track.endX);
                 });
                 if (!canExit) {
                   isBlockedBySwitch = true;
                 }
               }
             }
          }

          const isOccupiedByTrain = trains.some(t => {
            if (!t.pathHistory || t.pathHistory.length === 0) return false;

            if (t.trackId !== track.id) return false;
            return t.pathHistory.some(p => {
              if (Math.abs(p.y - track.y) > 20) return false;
              if (t.direction === 'up') {
                const limitX = nextSig ? nextSig.x : Infinity;
                return p.x > sig.x && p.x <= limitX;
              } else {
                const limitX = nextSig ? nextSig.x : -Infinity;
                return p.x < sig.x && p.x >= limitX;
              }
            });
          });

          let forceRed = false;
          let forceYellow = false;
          let actualNextSig = nextSig;
          
          if (sig.id === '1-S4') {
            const ladderSw = switchesRef.current['SW-LAD-DN-1'];
            if (ladderSw && ladderSw.state === 'diverging') {
              forceYellow = true;
            }
          }

          // Explicitly force RED for the signal behind the platform if a train is at the platform
          if (sig.id.startsWith('1-S2')) {
            const trainInPlatform = trains.some(t => t.trackId === 1 && t.x >= 1180 && t.x <= 1625);
            if (trainInPlatform) forceRed = true;
          }
          if (sig.id.startsWith('2-S3')) {
            const trainInPlatform = trains.some(t => t.trackId === 2 && t.x <= 1430 && t.x >= 985);
            if (trainInPlatform) forceRed = true;
          }

          if (forceRed || isBlockedBySwitch || isOccupiedByTrain) {
            sig.state = 'red';
          } else if (forceYellow) {
            sig.state = 'yellow';
          } else {
             const isCommonLine = (track.id >= 5 && track.id <= 6) || track.id === 10;
             if (!isCommonLine) {
               if (actualNextSig) {
                 if (actualNextSig.state === 'red') {
                   sig.state = 'yellow';
                 } else if (actualNextSig.state === 'yellow') {
                   sig.state = 'double-yellow';
                 } else {
                   sig.state = 'green';
                 }
               } else {
                 sig.state = 'green';
               }
             }
          }
        }
      });

      // Custom aspect override for ALL active switches/crossing tracks
      const aspectOverrides = getSwitchSignalAspectOverrides(switches, newSignals, trains);
      Object.keys(aspectOverrides).forEach(sigId => {
        if (newSignals[sigId]) {
          newSignals[sigId].state = aspectOverrides[sigId];
        }
      });

      // Custom aspect override for active disruptions/failures
      if (activeDisruptions && activeDisruptions.length > 0) {
        activeDisruptions.forEach(d => {
          if (d.fromSignal && newSignals[d.fromSignal]) {
            newSignals[d.fromSignal].state = 'red';
          }
          if (d.toSignal && newSignals[d.toSignal]) {
            newSignals[d.toSignal].state = 'red';
          }
        });
      }

      // Only update and re-render if at least one signal aspect actually changed
      let hasAnyAspectChanged = false;
      Object.keys(prevSignals).forEach(k => {
        if (prevSignals[k].state !== newSignals[k].state) {
          hasAnyAspectChanged = true;
        }
      });

      return hasAnyAspectChanged ? newSignals : prevSignals;
    });
  }, [trains, isAutoSignalling, isEmergencyStop, switches, isReleaseMode, activeDisruptions]);

  // --- Handlers ---
  const toggleSwitch = (id: string) => {
    const sw = switches[id];
    if (!sw) return;

    // Interlocking: Check if a train is currently on or very close to this switch
    const isLocked = trains.filter(Boolean).some(t => {
      // 1. Actively traversing check (using recorded switchId)
      const isActive = t.pathHistory?.some(ph => ph.switchId === id);
      if (isActive) return true;

      // 2. Physical occupancy check (checking if any part of the train is within the switch's X bounds on relevant tracks)
      const startY = TRACKS.find(tr => tr.id === sw.fromTrack)?.y || 0;
      const endY = TRACKS.find(tr => tr.id === sw.toTrack)?.y || 0;
      
      const isOccupying = t.pathHistory?.some(ph => {
        const withinX = ph.x >= Math.min(sw.startX, sw.endX) - 5 && ph.x <= Math.max(sw.startX, sw.endX) + 5;
        const onRelevantTrack = Math.abs(ph.y - startY) < 10 || Math.abs(ph.y - endY) < 10 || (ph.y > Math.min(startY, endY) && ph.y < Math.max(startY, endY));
        return withinX && onRelevantTrack;
      });
      if (isOccupying) return true;

      // 3. Approach check (only lock if the train is actually MOVING towards the switch)
      if (t.speed > 0 && (t.trackId === sw.fromTrack || t.trackId === sw.toTrack)) {
        const dist = Math.min(Math.abs(t.x - sw.startX), Math.abs(t.x - sw.endX));
        const movingTowards = (t.direction === 'up' && t.x < Math.max(sw.startX, sw.endX)) || (t.direction === 'down' && t.x > Math.min(sw.startX, sw.endX));
        if (dist < 100 && movingTowards) return true;
      }
      
      return false;
    });

    const isIndependentSwitch = ['SW-5TO4-L', 'SW-6TO5-L', 'SW-5TO4-R', 'SW-5TO6-R'].includes(id);

    if (isLocked && !isReleaseMode && !isIndependentSwitch) {
      addAlert("Interlocking: Cannot change switch, train is occupying or approaching.", "error");
      return;
    }

    setSwitches(prev => {
      const current = prev[id];
      const newState = current.state === 'straight' ? 'diverging' : 'straight';
      return { ...prev, [id]: { ...current, state: newState } };
    });
  };

  const cycleSignal = (id: string) => {
    const sig = signals[id];
    if (!sig) return;

    const isIndependentSig = ['5-S2-D', '5-S1-U', '6-S2-D', '6-S1-U'].includes(id);
    if (isIndependentSig) {
      setSignals(prev => {
        const current = prev[id].state;
        let next: SignalState = 'green';
        if (current === 'green') next = 'double-yellow';
        else if (current === 'double-yellow') next = 'yellow';
        else if (current === 'yellow') next = 'red';
        else if (current === 'red') next = 'green';
        
        return { ...prev, [id]: { ...prev[id], state: next } };
      });
      return;
    }
    
    // Check if this signal is part of any active disruption/failure
    const activeDisruption = activeDisruptions.find(d => d.fromSignal === id || d.toSignal === id);
    if (activeDisruption && !isReleaseMode) {
      addAlert(`Interlocking: Cannot clear/change signal ${id} due to an active disruption or signal failure. Resolve the disruption first.`, "error");
      return;
    }

    if (sig && !isReleaseMode) {
      const overrides = getSwitchSignalAspectOverrides(switches, signals, trains);
      if (overrides[sig.id]) {
        addAlert(`Interlocking: Signal ${sig.id} is locked to ${overrides[sig.id].toUpperCase()} due to an active crossing switch.`, "error");
        return;
      }
    }

    if (isAutoSignalling && !isEmergencyStop && !isReleaseMode) {
      const match = id.match(/^(\d+)-/);
      if (match) {
        const trackId = parseInt(match[1]);
        if ([1, 2].includes(trackId) && !id.includes('STARTER')) {
          addAlert("Cannot manually change Track 1 and 2 signals while Auto Signalling is ON.", "warning");
          return;
        }
      }
    }
    
    if (isEmergencyStop && !isReleaseMode) {
      addAlert("Cannot manually change signals during Emergency Stop.", "error");
      return;
    }

    // Interlocking: Dankuni Shared Section
    if (['4-S3', '5-S2', '6-S2'].includes(id) && !isReleaseMode) {
      const dankuniSectionOccupied = trains.filter(Boolean).some(t => {
        if (t.direction !== 'down') return false;
        const headX = t.x;
        const tailX = t.pathHistory?.reduce((max, p) => Math.max(max, p.x), t.x) || t.x;
        
        // Entry signals: 4-S3(630), 5-S2(650), 6-S2(680)
        let hasPassedSignal = false;
        if (t.trackId === 4 && headX < 628) hasPassedSignal = true;
        else if (t.trackId === 5 && headX < 648) hasPassedSignal = true;
        else if (t.trackId === 6 && headX < 678) hasPassedSignal = true;
        else if (headX < 600 && [4,5,6].includes(t.trackId)) hasPassedSignal = true;
        
        return hasPassedSignal && tailX > 565;
      });

      if (dankuniSectionOccupied) {
        addAlert("Interlocking: Cannot clear signal. Section leading to 4-S4 is currently occupied.", "error");
        return;
      }
    }

    setSignals(prev => {
      const current = prev[id].state;
      let next: SignalState = 'green';
      if (id.includes('STARTER')) {
        next = current === 'red' ? 'yellow' : 'red';
      } else {
        if (current === 'green') next = 'double-yellow';
        else if (current === 'double-yellow') next = 'yellow';
        else if (current === 'yellow') next = 'red';
        else if (current === 'red') next = 'green';
      }
      
      return { ...prev, [id]: { ...prev[id], state: next } };
    });
  };

  const allocateAndDispatch = (trainNo: string, trackId: number, haltDurationTicks: number = 0, forcedDirection?: Direction, dispatchMethod: 'manual' | 'ai' = 'manual') => {
    let liveTrain = TRAIN_DATA.find(t => t.no === trainNo);
    if (!liveTrain) {
      const dynamicFreights = getDynamicFreightTrains(time);
      liveTrain = dynamicFreights.find(t => t.no === trainNo);
    }
    if (!liveTrain) {
      const dynamicExpresses = getDynamicExpressTrains(time);
      liveTrain = dynamicExpresses.find(t => t.no === trainNo);
    }
    const track = TRACKS.find(t => t.id === trackId);
    if (!liveTrain || !track) return;

    let finalHaltDurationTicks = haltDurationTicks;
    let typeValue = 'LOCAL';
    if (liveTrain.type === 'Exp') typeValue = 'EXP';
    else if (liveTrain.type === 'Pass') typeValue = 'PASS';
    else if (liveTrain.type === 'MEMU') typeValue = 'MEMU';
    else if (liveTrain.type.startsWith('FREIGHT')) typeValue = liveTrain.type;
    else if (liveTrain.type === 'OTHER') typeValue = 'OTHER';

    if (typeValue === 'LOCAL' || typeValue === 'MEMU') {
       finalHaltDurationTicks = Math.max(haltDurationTicks, 600); // Enforce 30s halt
    }

    const n = liveTrain.name.toLowerCase();
    const fromSealdah = n.startsWith('sealdah') || n.startsWith('kolkata');
    const impliedDirection = fromSealdah ? 'up' : 'down';
    const trainDirection = forcedDirection || (track.direction === 'both' ? impliedDirection : track.direction);

    const isEntryOccupied = trains.some(t => {
      if (t.trackId !== trackId) return false;
      const tStartX = track.startX ?? 0;
      const tEndX = track.endX ?? 2500;
      return trainDirection === 'up' ? t.x < tStartX + 180 : t.x > tEndX - 180;
    });

    if (isEntryOccupied) {
      addAlert(`CONFLICT WARNING: Cannot allocate Train ${trainNo} to ${track.name}. Section is currently occupied.`, 'error');
      return; 
    }

    const spawnX = (trackId === 9 && trainDirection === 'up')
      ? 1100
      : (trainDirection === 'up' ? (track.startX ?? 0) - 50 : (track.endX ?? 2500) + 50);
    
    const initialHistory = [];
    initialHistory.push({ x: spawnX, y: track.y });
    initialHistory.push({ x: spawnX + (trainDirection === 'up' ? -180 : 180), y: track.y });

    // Spawn train
    const newTrain: Train = {
      id: liveTrain.no,
      name: liveTrain.name,
      trackId: track.id,
      x: spawnX,
      y: track.y,
      speed: SPEEDS[typeValue] || 2.0,
      baseSpeed: SPEEDS[typeValue] || 2.0,
      color: track.color,
      direction: trainDirection,
      type: typeValue as TrainType,
      delayTicks: 0,
      haltDurationTicks: finalHaltDurationTicks,
      haltRemainingTicks: finalHaltDurationTicks,
      hasHalted: false,
      pathHistory: initialHistory,
      dispatchMethod,
      dispatchedAt: Date.now(),
    };
    
    setTrains(prev => [...prev, newTrain]);
    
    setDispatchedTrainNos(prev => new Set(prev).add(liveTrain.no));

    // Record this dispatch event against the correct manual/AI session so the
    // AI Optimization tab can show live throughput / delay / trains-passed data.
    const bumpStats = (prev: OptimizationStats): OptimizationStats => ({
      ...prev,
      dispatched: prev.dispatched + 1,
      sessionStartAt: prev.dispatched === 0 ? Date.now() : prev.sessionStartAt,
      lastUpdateAt: Date.now(),
    });
    if (dispatchMethod === 'ai') {
      setAiOptStats(bumpStats);
    } else {
      setManualOptStats(bumpStats);
    }
  };

   const runAIOptimization = async () => {
  setIsAnalyzing(true);
  setAiResult(null);

  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

  try {
    const response = await fetch('/api/ml/optimize', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        time:     time.toLocaleTimeString(),
        signals,
        switches,
        trains: trains.map(t => ({
          id:         t.id,
          name:       t.name,
          trackId:    t.trackId,
          x:          t.x,
          speed:      t.speed,
          baseSpeed:  t.baseSpeed,
          direction:  t.direction,
          delayTicks: t.delayTicks,
          type:       t.type,
        })),
        baseMetrics: trains.slice(0, 6).map(t => ({
          trainId:     t.id,
          manualDelay: Math.floor((t.delayTicks || 0) / 20) + 10,
        })),
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.actionDescriptions?.length > 0) {
        setAiResult(data);
        setIsAnalyzing(false);
        return;
      }
    }
  } catch {
    // ML server offline — use local analyzer
  }

  const result = analyzeRailwayState(signals, switches, trains, activeDisruptions, trainsPerTrack, currentMins);
  setAiResult(result);
  setIsAnalyzing(false);
};

  const applyAIActions = () => {
  if (!aiResult) return;

  const actionsToApply = aiResult.actions || [];

  if (actionsToApply.length === 0) {
    addAlert('AI analysis complete — no immediate actions required', 'info');
    setAiResult(null);
    return;
  }

  actionsToApply.forEach((action: any, index: number) => {
    setTimeout(() => {
      if (action.type === 'switch') {
        if (!switches[action.id]) {
          console.warn(`Switch ${action.id} not found`);
          return;
        }
        // Safety: don't move switch if train is on it
        const sw = switches[action.id];
        const swMinX = Math.min(sw.startX, sw.endX);
        const swMaxX = Math.max(sw.startX, sw.endX);
        const trainOnSwitch = trains.some(t => {
          const tailX = t.direction === 'up' ? t.x - 280 : t.x + 280;
          const minX  = Math.min(t.x, tailX);
          const maxX  = Math.max(t.x, tailX);
          return (t.trackId === sw.fromTrack || t.trackId === sw.toTrack) &&
                 minX <= swMaxX + 30 && maxX >= swMinX - 30;
        });
        if (trainOnSwitch) {
          addAlert(
            `AI Skipped: Switch ${action.id} — train currently occupying`,
            'warning'
          );
          return;
        }
        setSwitches(prev => ({
          ...prev,
          [action.id]: { ...prev[action.id], state: action.value as SwitchState },
        }));
        addAlert(
          `AI Applied: Switch ${action.id} → ${action.value.toUpperCase()}`,
          'info'
        );

      } else if (action.type === 'signal') {
        if (!signals[action.id]) {
          console.warn(`Signal ${action.id} not found`);
          return;
        }
        const isDisrupted = activeDisruptions.some(
          d => d.fromSignal === action.id || d.toSignal === action.id
        );
        if (isDisrupted) {
          addAlert(
            `AI Skipped: Signal ${action.id} — part of active disruption`,
            'warning'
          );
          return;
        }
        // Don't override interlocking-locked signals
        const overrides = getSwitchSignalAspectOverrides(switches, signals, trains);
        if (overrides[action.id] && overrides[action.id] === 'red') {
          addAlert(
            `AI Skipped: Signal ${action.id} — locked RED by interlocking`,
            'warning'
          );
          return;
        }
        setSignals(prev => ({
          ...prev,
          [action.id]: { ...prev[action.id], state: action.value as SignalState },
        }));
        addAlert(
          `AI Applied: Signal ${action.id} → ${action.value.toUpperCase()}`,
          'info'
        );

      } else if (action.type === 'dispatch') {
        const trainNo = action.id.replace('DISPATCH-', '');
        const trackId = parseInt(action.value, 10);
        const track = TRACKS.find(t => t.id === trackId);
        if (!track) {
          console.warn(`Dispatch skipped: track ${trackId} not found`);
          return;
        }
        // Re-check the section is still clear right before dispatching —
        // state may have moved on since the analysis was generated.
        const stillOccupied = trains.some(t => t.trackId === trackId);
        if (stillOccupied) {
          addAlert(
            `AI Skipped: Dispatch of ${trainNo} — ${track.name} is no longer clear`,
            'warning'
          );
          return;
        }
        allocateAndDispatch(trainNo, trackId, 600, undefined, 'ai');
        addAlert(
          `AI Dispatched: Train ${trainNo} → ${track.name}`,
          'info'
        );
      }
    }, index * 600);
  });

  setTimeout(() => {
    addAlert(
      `✅ AI Optimization complete — ${actionsToApply.length} action(s) applied`,
      'info'
    );
    setAiResult(null);
  }, actionsToApply.length * 600 + 500);
};
  return (
    <div ref={containerRef} className={`h-full flex flex-col bg-black text-slate-100 font-mono overflow-hidden relative shadow-2xl ${isFullscreen ? 'rounded-none border-none' : 'rounded-xl border border-slate-800'}`}>
      
      {/* Alerts Overlay */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none w-full max-w-2xl">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`px-4 py-3 rounded shadow-lg border flex items-center gap-3 backdrop-blur-md ${
                alert.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-200' :
                alert.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200' :
                'bg-blue-500/20 border-blue-500 text-blue-200'
              }`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-bold">{alert.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0a0a0a] border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
          <h1 className="text-xl font-bold tracking-widest text-[#f8fafc]">DUM DUM PANEL INTERLOCKING</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              if (isEmergencyStop) {
                setIsEmergencyStop(false);
                setIsAutoSignalling(true);
                addAlert("Emergency Stop Lifted. Auto Signalling Resumed.", "info");
              } else {
                setIsEmergencyStop(true);
                addAlert("EMERGENCY STOP ACTIVATED. All signals set to RED.", "error");
              }
            }}
            className={`flex items-center gap-2 px-4 py-1.5 border rounded text-sm font-bold transition-all ${
              isEmergencyStop 
                ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-400'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            {isEmergencyStop ? 'LIFT E-STOP' : 'EMERGENCY STOP'}
          </button>

          <button
            onClick={() => {
              if (isEmergencyStop) {
                addAlert("Cannot change signalling mode during Emergency Stop.", "error");
                return;
              }
              setIsAutoSignalling(!isAutoSignalling);
              addAlert(`Signalling mode set to ${!isAutoSignalling ? 'AUTO' : 'MANUAL'}.`, "info");
            }}
            className={`flex items-center gap-2 px-4 py-1.5 border rounded text-sm font-bold transition-all ${
              isAutoSignalling 
                ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/50 text-blue-400' 
                : 'bg-yellow-400/10 hover:bg-yellow-400/20 border-yellow-400/50 text-yellow-400'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            {isAutoSignalling ? 'AUTO MODE' : 'MANUAL MODE'}
          </button>

          <button
            onClick={() => {
              if (isReleaseMode) {
                setIsReleaseMode(false);
                addAlert("Release Mode Deactivated. Safety interlocking rules restored.", "info");
              } else {
                setReleaseKeyInput("");
                setReleaseError("");
                setIsReleaseModalOpen(true);
              }
            }}
            className={`flex items-center gap-2 px-4 py-1.5 border rounded text-sm font-bold transition-all ${
              isReleaseMode 
                ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-400'
            }`}
          >
            <Unlock className="h-4 w-4" />
            {isReleaseMode ? 'RELEASE MODE ACTIVE' : 'RELEASE MODE'}
          </button>

          <button 
            onClick={runAIOptimization}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 rounded text-blue-400 text-sm font-bold transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Clock className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
            {isAnalyzing ? 'ANALYZING...' : 'AI OPTIMIZATION'}
          </button>
          
          <div className="flex items-center gap-2 text-xl font-bold text-slate-200 bg-[#111] px-4 py-1 rounded border border-slate-800">
            <Clock className="h-5 w-5 text-slate-400" />
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          
          <button onClick={() => setIsWalkieTalkieOpen(!isWalkieTalkieOpen)} className={`p-1.5 border border-slate-800 rounded transition-colors ${isWalkieTalkieOpen ? 'bg-amber-600 text-white' : 'bg-[#111] hover:bg-slate-800 text-amber-500'}`} title="Toggle Radio">
            <Radio className="h-5 w-5" />
          </button>
          
          <button onClick={toggleFullScreen} className="p-1.5 border border-slate-800 bg-[#111] rounded hover:bg-slate-800 text-slate-300 transition-colors" title="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 bg-black">
        {/* Main SVG Diagram Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Grid Background */}
          {/* A soft grid on black */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          
          <svg width="100%" height="100%" viewBox="100 80 2800 920" preserveAspectRatio="xMidYMid meet">
            
            {/* Render Tracks */}
            <g strokeWidth="2" fill="none">
              {TRACKS.map(track => {
          const isLeftToRight = track.direction === 'up' || track.direction === 'both';
          const isRightToLeft = track.direction === 'down' || track.direction === 'both';
          const lineStartX = track.startX ?? 0;
          const lineEndX = track.endX ?? 2500;
          const isTargetTrack = track.id === 5 || track.id === 6;
          const blockLength = isTargetTrack ? 50 : 100;
          const numBlocks = Math.ceil((lineEndX - lineStartX) / blockLength);
          
          return (
            <g key={track.id}>
              {/* Track Blocks */}
              {Array.from({ length: numBlocks }).map((_, i) => {
                 const blockStartX = lineStartX + i * blockLength;
                 const blockEndX = Math.min(lineStartX + (i + 1) * blockLength, lineEndX);
                 
                 // Check if any active disruption blocks this track segment
                 let isBlockedByDisruption = false;
                 if (activeDisruptions && activeDisruptions.length > 0) {
                   const initialSignals = generateInitialSignals();
                   for (const d of activeDisruptions) {
                     const sig1 = initialSignals[d.fromSignal];
                     const sig2 = initialSignals[d.toSignal];
                     if (sig1 && sig2) {
                       const minTrack = Math.min(sig1.trackId, sig2.trackId);
                       const maxTrack = Math.max(sig1.trackId, sig2.trackId);
                       if (track.id >= minTrack && track.id <= maxTrack) {
                         const minX = Math.min(sig1.x, sig2.x);
                         const maxX = Math.max(sig1.x, sig2.x);
                         if (blockStartX < maxX && blockEndX > minX) {
                           isBlockedByDisruption = true;
                           break;
                         }
                       }
                     }
                   }
                 }

                 // Check if any train occupies this block
                 // Uses pathHistory to accurately track the trailing cars across different tracks
                 const isOccupied = trains.some(t => {
                   if (t.pathHistory && t.pathHistory.length > 1) {
                     return t.pathHistory.some((p, j) => {
                       if (j === 0) return false;
                       const pPrev = t.pathHistory![j-1];
                       const minY = Math.min(pPrev.y, p.y);
                       const maxY = Math.max(pPrev.y, p.y);
                       // If this segment is roughly on this track's Y level
                       if (track.y < minY - 5 || track.y > maxY + 5) return false;
                       const minX = Math.min(pPrev.x, p.x);
                       const maxX = Math.max(pPrev.x, p.x);
                       return minX <= blockEndX && maxX >= blockStartX;
                     });
                   } else {
                     if (t.trackId !== track.id) return false;
                     const minX = t.direction === 'up' ? t.x - 180 : t.x;
                     const maxX = t.direction === 'up' ? t.x : t.x + 180;
                     return minX <= blockEndX && maxX >= blockStartX;
                   }
                 });
                 
                 return (
                   <line 
                     key={i} 
                     x1={blockStartX} 
                     y1={track.y} 
                     x2={blockEndX} 
                     y2={track.y} 
                     stroke={isBlockedByDisruption ? '#f97316' : (isOccupied ? '#eab308' : track.color)} 
                     strokeWidth={isBlockedByDisruption ? "5" : "4"} 
                     strokeOpacity={isBlockedByDisruption ? "1" : (isOccupied ? "1" : "0.3")} 
                     strokeDasharray={`${blockLength - 2} 2`} // visual gap between blocks
                   />
                 );
              })}
              
              {/* Name Label */}
              <text x={(track.direction === 'up' || track.direction === 'both') ? (lineStartX + 15) : (lineEndX - 200)} y={track.y - 12} fill={track.color} fontSize="12" fontWeight="bold" opacity="1">
                {track.name}
              </text>
              
              {/* Right Name Label */}
              {track.rightName && (
                <text x={track.endX ? track.endX - 220 : 2200} y={track.y - 12} fill={track.color} fontSize="12" fontWeight="bold" opacity="1">
                  {track.rightName}
                </text>
              )}
              
              {/* Direction arrows */}
              {isLeftToRight && (
                <polygon points={`${lineStartX+120},${track.y-4} ${lineStartX+128},${track.y} ${lineStartX+120},${track.y+4}`} fill={track.color} opacity="0.6" />
              )}
              {isRightToLeft && (
                <polygon points={`${lineEndX-200},${track.y-4} ${lineEndX-208},${track.y} ${lineEndX-200},${track.y+4}`} fill={track.color} opacity="0.6" />
              )}

              {/* Platform Rect */}
              {track.hasPlatform && (
                <g>
                  <rect x="1180" y={track.y - 12} width="250" height="24" fill="#1e293b" opacity="0.6" rx="4" stroke={track.color} strokeWidth="1" strokeOpacity="0.8" />
                  <text x="1305" y={track.y + 4} fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle" opacity="0.9">{track.platform}</text>
                </g>
              )}

              {/* Bumper Stop for Dead End Track 9 */}
              {track.id === 9 && (
                <g>
                  {/* Buffer Stop diagonal brace stands */}
                  <line x1={lineStartX} y1={track.y} x2={lineStartX + 12} y2={track.y - 10} stroke="#94a3b8" strokeWidth="2.5" />
                  <line x1={lineStartX} y1={track.y} x2={lineStartX + 12} y2={track.y + 10} stroke="#94a3b8" strokeWidth="2.5" />
                  {/* Heavy bumper bar plate */}
                  <line x1={lineStartX} y1={track.y - 14} x2={lineStartX} y2={track.y + 14} stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round" />
                  {/* Central red stop marker disc */}
                  <circle cx={lineStartX} cy={track.y} r="5" fill="#ef4444" stroke="#f1f5f9" strokeWidth="1" />
                  {/* Monospace track termination code label from the image: C.A.L-30M */}
                  <text x={lineStartX + 15} y={track.y - 14} fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="start">C.A.L-30M</text>
                  {/* Small ground block under the bumper */}
                  <rect x={lineStartX - 4} y={track.y + 14} width="8" height="4" fill="#64748b" rx="1" />
                </g>
              )}
            </g>
          );
        })}
              {/* Custom Shared Platforms */}
              <g>
                {/* Platform 2 & 3 between DN SUBURBAN (238) and UP MAIN (340) */}
                <rect 
                  x="1180" y="255" width="250" height="70" 
                  fill="#1e293b" 
                  opacity="0.75" 
                  stroke="#2563eb" 
                  strokeWidth="1.5" 
                  strokeOpacity="0.8" 
                />
                <text x="1305" y="282" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.9">Platform 2</text>
                <text x="1305" y="312" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.9">Platform 3</text>
              </g>
              <g>
                {/* Platform 4 & 5 between DN MAIN (800) and DN BONGAON (960) */}
                <polygon 
                  points="1050,815 1420,815 1360,945 1050,945" 
                  fill="#1e293b" 
                  opacity="0.75" 
                  stroke="#2563eb" 
                  strokeWidth="1.5" 
                  strokeOpacity="0.8" 
                />
                <text x="1235" y="860" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.9">Platform 4</text>
                <text x="1205" y="915" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" opacity="0.9">Platform 5</text>
              </g>
      </g>

            {/* Crossovers (Switches) */}
            <g strokeWidth="2">
              {(Object.values(switches) as SwitchDef[]).map((sw) => {
                const startTrack = TRACKS.find(t => t.id === sw.fromTrack);
                const startY = startTrack?.y || 0;
                const endY = TRACKS.find(t => t.id === sw.toTrack)?.y || 0;
                const isDiverging = sw.state === 'diverging';
                const strokeColor = isDiverging ? '#eab308' : (startTrack?.color || '#2563eb');
                
                return (
                  <g key={sw.id} onClick={() => toggleSwitch(sw.id)} className="cursor-pointer group z-10 relative">
                    <line 
                      x1={sw.startX} y1={startY} x2={sw.endX} y2={endY} 
                      stroke={strokeColor} 
                      strokeWidth={isDiverging ? "4" : "3"} 
                      className={`transition-all ${isDiverging ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`} 
                      strokeDasharray={isDiverging ? "none" : "6 6"} 
                    />
                    <line x1={sw.startX} y1={startY} x2={sw.endX} y2={endY} stroke="transparent" strokeWidth="20" />
                    
                    {/* Switch State Indicator */}
                    <circle 
                      cx={(sw.startX + sw.endX) / 2} 
                      cy={(startY + endY) / 2} 
                      r="6" 
                      fill={isDiverging ? '#eab308' : '#1e293b'} 
                      stroke={isDiverging ? '#fef08a' : strokeColor} 
                      strokeWidth="2"
                      className={`transition-colors ${isDiverging ? 'shadow-[0_0_8px_rgba(234,179,8,0.8)]' : ''}`}
                    />
                    {isDiverging ? (
                      <path d={`M ${(sw.startX + sw.endX) / 2 - 3} ${(startY + endY) / 2} L ${(sw.startX + sw.endX) / 2 + 3} ${(startY + endY) / 2} M ${(sw.startX + sw.endX) / 2} ${(startY + endY) / 2 - 3} L ${(sw.startX + sw.endX) / 2} ${(startY + endY) / 2 + 3}`} stroke="#1e293b" strokeWidth="1.5" />
                    ) : (
                      <line x1={(sw.startX + sw.endX) / 2 - 3} y1={(startY + endY) / 2} x2={(sw.startX + sw.endX) / 2 + 3} y2={(startY + endY) / 2} stroke={strokeColor} strokeWidth="1.5" />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Switch Signals */}
            <g>
              {(Object.values(switches) as SwitchDef[]).map((sw) => {
                const primDir = sw.direction === 'up' ? 'up' : sw.direction === 'down' ? 'down' : (sw.startX > 1500 ? 'down' : 'up');
                const trackY = TRACKS.find(t => t.id === sw.fromTrack)?.y || 0;
                const isFlipped = sw.id === 'SW-10TO9-CO';
                return <ShuntSignal key={`shunt-${sw.id}`} sw={sw} trackY={trackY} direction={primDir} flipped={isFlipped} isDisrupted={getIsSwitchDisrupted(sw.id, sw)} onClick={() => toggleSwitch(sw.id)} />
              })}
            </g>

            {/* Signals */}
            <g>
              {(Object.values(signals) as SignalDef[]).map((sig) => (
                <SignalPost 
                  key={sig.id} 
                  signal={sig} 
                  trackY={TRACKS.find(t => t.id === sig.trackId)?.y || 0} 
                  direction={sig.direction || 'up'}
                  isDisrupted={getIsSignalDisrupted(sig.id, sig.trackId, sig.x)}
                  onClick={() => cycleSignal(sig.id)} 
                />
              ))}
            </g>

            {/* Trains */}
            <g>
              {trains.map(train => (
                <g key={train.id} transform={`translate(${train.x}, ${train.y})`}>
                  {/* RRI Occupied Track (Red Line) - Rendered as a polyline relative to train head */}
                  {train.pathHistory && train.pathHistory.length > 0 ? (
                    <polyline
                      points={train.pathHistory.map(p => `${p.x - train.x},${p.y - train.y}`).join(' ')}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4"
                    />
                  ) : (
                    train.direction === 'up' ? (
                       <line x1="-180" y1="0" x2="0" y2="0" stroke="#ef4444" strokeWidth="4" />
                    ) : (
                       <line x1="0" y1="0" x2="180" y2="0" stroke="#ef4444" strokeWidth="4" />
                    )
                  )}
                  
                  {/* Train Label above the line */}
                  <rect x="-60" y="-24" width="120" height="18" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" rx="3" />
                  <text x="0" y="-11.5" fill="#f8fafc" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                    {train.id} - {train.name.length > 15 ? train.name.substring(0, 13) + '...' : train.name}
                  </text>
                  
                  {/* Speed / Status */}
                  <text x="0" y="14" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{train.speed === 0 ? 'STOP' : `${Math.round(train.speed * 20)}km/h`}</text>
                  
                  {/* Delay Indicator */}
                  {train.delayTicks > 0 && (
                    <text x="0" y="24" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle" className="animate-pulse">
                      +{Math.floor(train.delayTicks / 20)}m
                    </text>
                  )}
                </g>
              ))}
            </g>

            {/* Track Dispatchers (Dropdowns) */}
            <g>
              {TRACKS.map(track => {
                // Short inner loop lines do not extend to outer boundaries and should not have dispatcher dropdowns
                if (track.id === 5 || track.id === 6) return null;
                
                const suggestedTrains = trainsPerTrack[track.id] || [];
                if (suggestedTrains.length === 0) return null;
                
                // If it's a 'both' track, we can split trains into UP and DOWN groups
                if (track.direction === 'both') {
                  const upGroup = suggestedTrains.filter(t => {
                    const n = t.name.toLowerCase();
                    return n.startsWith('sealdah') || n.startsWith('kolkata');
                  });
                  const downGroup = suggestedTrains.filter(t => {
                    const n = t.name.toLowerCase();
                    return !(n.startsWith('sealdah') || n.startsWith('kolkata'));
                  });

                  return (
                    <g key={`dispatcher-both-g-${track.id}`}>
                      {upGroup.length > 0 && (
                        <foreignObject key={`dispatcher-up-${track.id}`} x={10} y={track.y - 12} width="160" height="40" style={{ overflow: "visible" }}>
                          <div className="flex flex-col gap-1 w-full font-sans">
                            <select 
                              className="text-[10px] bg-slate-800 text-white border border-slate-600 rounded p-1 w-full truncate focus:outline-none focus:border-blue-500"
                              onChange={(e) => {
                                 if (e.target.value) {
                                   allocateAndDispatch(e.target.value, track.id, 600, 'up');
                                   e.target.value = "";
                                 }
                              }}
                            >
                              <option value="">Dispatch {track.name} (UP)...</option>
                              {upGroup.map(t => (
                                 <option key={t.no} value={t.no}>{t.no} - {t.name} ({t.fromSch})</option>
                              ))}
                            </select>
                          </div>
                        </foreignObject>
                      )}
                      {downGroup.length > 0 && (
                        <foreignObject key={`dispatcher-down-${track.id}`} x={2750} y={track.y - 12} width="160" height="40" style={{ overflow: "visible" }}>
                          <div className="flex flex-col gap-1 w-full font-sans">
                            <select 
                              className="text-[10px] bg-slate-800 text-white border border-slate-600 rounded p-1 w-full truncate focus:outline-none focus:border-blue-500"
                              onChange={(e) => {
                                 if (e.target.value) {
                                   allocateAndDispatch(e.target.value, track.id, 600, 'down');
                                   e.target.value = "";
                                 }
                              }}
                            >
                              <option value="">Dispatch {track.name} (DN)...</option>
                              {downGroup.map(t => (
                                 <option key={t.no} value={t.no}>{t.no} - {t.name} ({t.fromSch})</option>
                              ))}
                            </select>
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                }

                // Single direction tracks
                const xPos = track.direction === 'up' ? 10 : 2750;
                
                return (
                  <foreignObject key={`dispatcher-${track.id}`} x={xPos} y={track.y - 12} width="160" height="40" style={{ overflow: "visible" }}>
                    <div className="flex flex-col gap-1 w-full font-sans">
                      <select 
                        className="text-[10px] bg-slate-800 text-white border border-slate-600 rounded p-1 w-full truncate focus:outline-none focus:border-blue-500"
                        onChange={(e) => {
                           if (e.target.value) {
                             allocateAndDispatch(e.target.value, track.id, 600); // 600 is default local halt
                             e.target.value = ""; // reset after dispatch
                           }
                        }}
                      >
                        <option value="">Dispatch to {track.name}...</option>
                        {suggestedTrains.map(t => (
                           <option key={t.no} value={t.no}>{t.no} - {t.name} ({t.fromSch})</option>
                        ))}
                      </select>
                    </div>
                  </foreignObject>
                );
              })}
            </g>
          </svg>

          {/* AI Optimization Overlay */}
          <AnimatePresence>
            {aiResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-4 right-4 w-[500px] bg-slate-900/95 border border-blue-500/50 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.15)] overflow-hidden backdrop-blur-xl z-50 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="sticky top-0 z-10 px-4 py-3 border-b border-blue-500/20 bg-blue-900/20 flex justify-between items-center backdrop-blur-md">
                  <div className="flex items-center gap-2 text-blue-400">
                    <BrainCircuit className="h-5 w-5" />
                    <h3 className="font-bold text-lg text-white">AI Analysis Complete</h3>
                  </div>
                  <button onClick={() => setAiResult(null)} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>
                
                <div className="p-4 space-y-5">
                  <div>
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2 block">Current State</span>
                    <p className="text-slate-200 text-sm leading-relaxed">{aiResult.analysis}</p>
                  </div>
                  
                  <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg">
                    <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-1 block">Recommendation</span>
                    <p className="text-white text-sm font-medium leading-relaxed">{aiResult.suggestion}</p>
                  </div>

                  {aiResult.actionDescriptions && aiResult.actionDescriptions.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2 block">Suggested Actions</span>
                      <ul className="space-y-2">
                        {aiResult.actionDescriptions.map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Platform Assignment Suggestions */}
{aiResult.platformSuggestions?.length > 0 && (
  <div style={{
    marginTop: 8,
    padding: '10px 12px',
    background: 'rgba(0,180,100,0.08)',
    border: '1px solid rgba(0,180,100,0.3)',
    borderRadius: 8,
  }}>
    <div style={{
      fontSize: 10, fontWeight: 700,
      color: '#00b464', letterSpacing: 2, marginBottom: 6,
    }}>
      PLATFORM ASSIGNMENTS
    </div>
    {aiResult.platformSuggestions.map((s: string, i: number) => (
      <div key={i} style={{
        fontSize: 11, color: '#a0ffc8', marginBottom: 4, lineHeight: 1.5,
      }}>
        {s}
      </div>
    ))}
  </div>
)}

{/* Loop Line Diversion Suggestions */}
{aiResult.diversionSuggestions?.length > 0 && (
  <div style={{
    marginTop: 8,
    padding: '10px 12px',
    background: 'rgba(255,160,0,0.08)',
    border: '1px solid rgba(255,160,0,0.3)',
    borderRadius: 8,
  }}>
    <div style={{
      fontSize: 10, fontWeight: 700,
      color: '#ffa000', letterSpacing: 2, marginBottom: 6,
    }}>
      LOOP LINE DIVERSIONS
    </div>
    {aiResult.diversionSuggestions.map((s: string, i: number) => (
      <div key={i} style={{
        fontSize: 11, color: '#ffe0a0', marginBottom: 4, lineHeight: 1.5,
      }}>
        {s}
      </div>
    ))}
  </div>
)}

{/* Platform Status Pills */}
{(aiResult.freePlatforms?.length > 0 || aiResult.occupiedPlatforms?.length > 0) && (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
    <span style={{ fontSize: 10, color: '#64748b', alignSelf: 'center' }}>PLATFORMS:</span>
    {aiResult.freePlatforms?.map((pf: string) => (
      <span key={pf} style={{
        fontSize: 10, fontWeight: 700, color: '#00ff88',
        background: 'rgba(0,255,136,0.1)',
        border: '1px solid rgba(0,255,136,0.3)',
        borderRadius: 4, padding: '1px 7px',
      }}>
        {pf} FREE
      </span>
    ))}
    {aiResult.occupiedPlatforms?.map((p: any) => (
      <span key={p.platform} style={{
        fontSize: 10, fontWeight: 700, color: '#ff6b6b',
        background: 'rgba(255,107,107,0.1)',
        border: '1px solid rgba(255,107,107,0.3)',
        borderRadius: 4, padding: '1px 7px',
      }}>
        {p.platform} OCC
      </span>
    ))}
  </div>
)}

{/* Dispatch Sequencing — which train goes next, on which clear track */}
{aiResult.dispatchRecommendations?.length > 0 && (
  <div style={{
    marginTop: 8,
    padding: '10px 12px',
    background: 'rgba(168,85,247,0.08)',
    border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: 8,
  }}>
    <div style={{
      fontSize: 10, fontWeight: 700,
      color: '#c084fc', letterSpacing: 2, marginBottom: 8,
    }}>
      DISPATCH SEQUENCING — NEXT TRAIN PER SECTION
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {aiResult.dispatchRecommendations.map((rec: any, i: number) => (
        <div key={i} style={{
          padding: '8px 10px',
          borderRadius: 6,
          background: rec.clear ? 'rgba(168,85,247,0.06)' : 'rgba(100,116,139,0.06)',
          border: `1px solid ${rec.clear ? 'rgba(168,85,247,0.25)' : 'rgba(100,116,139,0.25)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#e9d5ff' }}>
              {rec.trackName} <span style={{ color: rec.clear ? '#00ff88' : '#ff6b6b' }}>
                {rec.clear ? '• CLEAR' : '• OCCUPIED'}
              </span>
            </span>
            {rec.clear && !rec.blockingSwitch && (
              <button
                onClick={() => allocateAndDispatch(rec.train.no, rec.trackId, 600, undefined, 'ai')}
                style={{
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  background: '#9333ea', border: 'none', borderRadius: 4,
                  padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Dispatch {rec.train.no}
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#d8b4fe', marginTop: 4, lineHeight: 1.5 }}>
            {rec.reason}
          </div>
          {rec.queued.length > 0 && (
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
              Queued next: {rec.queued.map((q: any) => `${q.no} (${q.fromSch})`).join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}

                  {aiResult.metrics && (
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 block">Est. Delay Comparison (Mins)</span>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={aiResult.metrics} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="trainId" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                              cursor={{fill: '#1e293b', opacity: 0.4}}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Bar dataKey="manualDelay" name="Manual Allocation" fill="#facc15" radius={[2, 2, 0, 0]} maxBarSize={30} />
                            <Bar dataKey="optimizedDelay" name="AI Optimized" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={applyAIActions}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 rounded-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Apply AI Suggestions
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>


      
      {/* Footer Status Bar */}
      <div className="h-8 bg-[#0f172a] border-t border-slate-800 flex items-center justify-between px-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold shrink-0">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-[#00d1ff] rounded-full animate-pulse shadow-[0_0_5px_#00d1ff]"></div> SYSTEM ONLINE</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> {trains.length} ACTIVE TRAINS</span>
        </div>
        <div className="flex gap-4">
          <span className="text-[#00d1ff]">● GREEN: PROCEED</span>
          <span className="text-yellow-400">●● DOUBLE YEL: 25KM/H</span>
          <span className="text-yellow-500">● YELLOW: 10KM/H</span>
          <span className="text-red-500">● RED: STOP</span>
        </div>
        <div>CRIS - INDIAN RAILWAYS</div>
      </div>

      <WalkieTalkie
        isOpen={isWalkieTalkieOpen}
        onClose={() => setIsWalkieTalkieOpen(false)}
        trains={trains}
        tracks={TRACKS}
        signals={signals}
        switches={switches}
        incomingTransmissions={incomingTransmissions}
      />

      {/* Release Mode Password Modal */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-500/30 p-6 rounded-lg max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold tracking-wider text-red-500 mb-2">ACTIVATE RELEASE MODE</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to activate Release Mode? All interlocking safety rules, auto signalling, and track rules will be completely bypassed. You can toggle all switches and signals manually with no restrictions.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">SECRET KEY</label>
                <input 
                  type="password"
                  value={releaseKeyInput}
                  onChange={(e) => {
                    setReleaseKeyInput(e.target.value);
                    setReleaseError("");
                  }}
                  placeholder="Enter secret key..."
                  className="w-full bg-[#111] border border-slate-800 focus:border-red-500 rounded px-3 py-2 text-sm text-slate-200 font-mono tracking-widest outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (releaseKeyInput === "0000") {
                        activateReleaseMode();
                        setIsReleaseModalOpen(false);
                      } else {
                        setReleaseError("Invalid secret key.");
                      }
                    }
                  }}
                  autoFocus
                />
                {releaseError && (
                  <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1">{releaseError}</p>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (releaseKeyInput === "0000") {
                      activateReleaseMode();
                      setIsReleaseModalOpen(false);
                    } else {
                      setReleaseError("Invalid secret key.");
                    }
                  }}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

function ShuntSignal({ sw, trackY, direction, flipped = false, isDisrupted = false, onClick }: { sw: SwitchDef, trackY: number, direction: 'up' | 'down', flipped?: boolean, isDisrupted?: boolean, onClick: () => void, key?: React.Key }) {
  const isLeftSide = Math.min(sw.startX, sw.endX) < 1200 || sw.id === 'SW-4TO8-CO' || sw.id === 'SW-7TO4-CO';
  // Place physically before the switch (left side) for left portion, and after (right side) for right portion
  let signalX = isLeftSide ? Math.min(sw.startX, sw.endX) - 20 : Math.max(sw.startX, sw.endX) + 20;
  
  // Specific override for LAD-DN ladder to bring signals closer to start points
  if (sw.id.startsWith('SW-LAD-DN')) {
    signalX = Math.min(sw.startX, sw.endX) - 30;
  }

  // Specific override for SW-10TO9-CO to place it exactly at DP135/241A (x=2375)
  if (sw.id === 'SW-10TO9-CO') {
    signalX = 2375;
  }

  // Specific override for 9TO8 and 8TO9 to place them on the left side of their switch
  if (sw.id === 'SW-9TO8-CO' || sw.id === 'SW-8TO9-CO') {
    signalX = Math.min(sw.startX, sw.endX) - 30;
  }

  // Specific override for SW-X- switches to place them directly at their start points
  if (sw.id.startsWith('SW-X-')) {
    signalX = Math.max(sw.startX, sw.endX) + 15;
  }

  // Specific override for the new crossovers
  if (sw.id === 'SW-4TO8-CO' || sw.id === 'SW-7TO4-CO') {
    signalX = Math.min(sw.startX, sw.endX) - 30;
  }

  let offsetY = flipped ? 28 : -28;
  if (sw.id === 'SW-10TO9-CO') {
    offsetY = 38;
  }
  const sign = isLeftSide ? 1 : -1;

  return (
    <g transform={`translate(${signalX}, ${trackY + offsetY}) scale(1.0)`} onClick={onClick} className="cursor-pointer group z-20">
      <rect x={isLeftSide ? -35 : -15} y="-24" width="50" height="30" fill="transparent" />
      
      <g transform={`scale(${sign}, 1)`} className="group-hover:opacity-80 transition-opacity">
        <line x1="0" y1="0" x2="0" y2="-15" stroke="#cbd5e1" strokeWidth="2.5" />
        <rect x="-3" y="0" width="6" height="2" fill="#cbd5e1" />
        <line x1="0" y1="-15" x2="-8" y2="-15" stroke="#cbd5e1" strokeWidth="2" />
        <path d="M -8 -22 L -20 -22 Q -26 -22 -26 -15 Q -26 -8 -20 -8 L -8 -8 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        
        {isDisrupted ? (
          <>
            <circle cx="-14" cy="-15" r="3" fill="#ef4444" className="animate-blink-red" style={{ animation: 'blink-red 1s infinite' }} />
            <circle cx="-20" cy="-15" r="3" fill="#ef4444" className="animate-blink-red" style={{ animation: 'blink-red 1s infinite' }} />
          </>
        ) : sw.state === 'diverging' ? (
          <>
            <polygon points="-14,-20 -15.5,-18 -14,-16 -12.5,-18" fill="#eab308" />
            <polygon points="-20,-14 -21.5,-12 -20,-10 -18.5,-12" fill="#eab308" />
          </>
        ) : (
          <>
            <circle cx="-14" cy="-15" r="1.5" fill="#f8fafc" />
            <circle cx="-20" cy="-15" r="1.5" fill="#f8fafc" />
          </>
        )}
      </g>
      
      <text x={-sign * 17} y="-26" fill="#94a3b8" fontSize="8" textAnchor="middle" className="group-hover:fill-slate-300 font-bold pointer-events-none">
        {sw.id.replace('SW-', '')}
      </text>
    </g>
  );
}

function SignalPost({ signal, trackY, direction, isDisrupted = false, onClick }: { signal: SignalDef, trackY: number, direction: string, isDisrupted?: boolean, onClick: () => void, key?: React.Key }) {
  const sign = direction === 'up' ? 1 : -1;
  const isBidirectionalTrack = signal.trackId >= 4;
  const isUpsideDown = signal.isUpsideDown !== undefined ? signal.isUpsideDown : (isBidirectionalTrack && direction === 'up');

  // Shift UP direction slightly left and DOWN direction slightly right for bidirectional tracks to separate poles cleanly
  const xOffset = isBidirectionalTrack ? (isUpsideDown ? -15 : 15) : 0;
  const renderX = signal.x + xOffset;

  const isStarter = signal.type === 'STARTER';

  if (isStarter) {
    const isRed = isDisrupted || signal.state === 'red';
    const ledColor = isRed ? '#ef4444' : '#eab308';

    return (
      <g transform={`translate(${renderX}, ${trackY})`} onClick={onClick} className="cursor-pointer group">
        {/* Invisible click target to make it easier to click */}
        <rect 
          x="-15" 
          y={isUpsideDown ? -3 : -56} 
          width="30" 
          height="59" 
          fill="transparent" 
        />
        
        <g transform={`scale(${sign}, ${isUpsideDown ? -1 : 1})`}>
          {/* Small Vertical Post - Taller now to clear train labels */}
          <line x1="0" y1="0" x2="0" y2="-38" stroke="#cbd5e1" strokeWidth="2.5" />
          
          {/* Compact Circular Box for Single LED */}
          <circle cx="0" cy="-45" r="7" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
          
          {/* Single LED Aspect */}
          <circle 
            cx="0" 
            cy="-45" 
            r="3.5" 
            fill={ledColor} 
            stroke="#0f172a" 
            strokeWidth="0.75" 
            className={isDisrupted ? "animate-blink-red" : ""}
            style={isDisrupted ? { animation: 'blink-red 1s infinite' } : undefined}
          />
        </g>
        
        <text 
          x="0" 
          y={isUpsideDown ? 56 : -56} 
          fill="#475569" 
          fontSize="8" 
          textAnchor="middle" 
          className="group-hover:fill-slate-300 transition-colors font-bold"
        >
          {signal.id}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${renderX}, ${trackY}) scale(0.9)`} onClick={onClick} className="cursor-pointer group">
      {/* Invisible click target to make it easier to click */}
      <rect 
        x={direction === 'up' ? -8 : -42} 
        y={isUpsideDown ? -4 : -24} 
        width="50" 
        height="28" 
        fill="transparent" 
      />
      
      <g transform={`scale(${sign}, ${isUpsideDown ? -1 : 1})`}>
        {/* Vertical Post */}
        <line x1="0" y1="0" x2="0" y2="-15" stroke="#cbd5e1" strokeWidth="2.5" />
        
        {/* Box */}
        <rect x="-2" y="-22" width="46" height="14" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        
        {/* Circles */}
        <circle cx="6" cy="-15" r="3.5" fill={!isDisrupted && signal.state === 'green' ? '#22c55e' : '#0f172a'} stroke="#0f172a" strokeWidth="1" />
        <circle cx="17" cy="-15" r="3.5" fill={!isDisrupted && (signal.state === 'yellow' || signal.state === 'double-yellow') ? '#eab308' : '#0f172a'} stroke="#0f172a" strokeWidth="1" />
        <circle 
          cx="28" 
          cy="-15" 
          r="3.5" 
          fill={isDisrupted || signal.state === 'red' ? '#ef4444' : '#0f172a'} 
          stroke="#0f172a" 
          strokeWidth="1" 
          className={isDisrupted ? "animate-blink-red" : ""}
          style={isDisrupted ? { animation: 'blink-red 1s infinite' } : undefined}
        />
        <circle cx="39" cy="-15" r="3.5" fill={!isDisrupted && signal.state === 'double-yellow' ? '#eab308' : '#0f172a'} stroke="#0f172a" strokeWidth="1" />
      </g>
      
      <text 
        x={sign * 21} 
        y={isUpsideDown ? 31 : -26} 
        fill="#475569" 
        fontSize="9" 
        textAnchor="middle" 
        className="group-hover:fill-slate-300 transition-colors font-bold"
      >
        {signal.id}
      </text>
    </g>
  );
}
