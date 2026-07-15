// src/components/WalkieTalkie.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Send, Volume2, AlertCircle } from 'lucide-react';

interface WalkieTalkieProps {
  isOpen: boolean;
  onClose: () => void;
  trains: any[];
  tracks: any[];
  signals: Record<string, any>;
  switches: Record<string, any>;
  incomingTransmissions?: { trainId: string, text: string, id: string }[];
}

// ── Local response engine (replaces Gemini) ───────────────────────────────────

function generateLocoPilotResponse(
  userMsg: string,
  trainId: string,
  trainData: any,
  trackData: any,
  nextSignal: any
): string {
  const msg = userMsg.toLowerCase();
  const speed = trainData ? Math.round(trainData.speed * 20) : 0;
  const trackName = trackData?.name || 'Unknown Track';
  const sigState = nextSignal?.state || 'clear';
  const sigId = nextSignal?.id || 'N/A';
  const isDelayed = trainData?.delayTicks > 100;
  const isStopped = trainData?.speed === 0;

  // ── Greeting / check ─────────────────────────────────────────────────────
  if (msg.includes('hello') || msg.includes('haan') || msg.includes('check')) {
    return `Ji sir, Loco Pilot ${trainId} bol raha hoon. Sab theek hai. Over.`;
  }

  // ── Speed queries ─────────────────────────────────────────────────────────
  if (msg.includes('speed') || msg.includes('kitni') || msg.includes('raftar')) {
    if (isStopped) {
      return `Sir, gaadi abhi rukhi hui hai. Speed zero. Signal dekhkar ruk gaye hain. Over.`;
    }
    return `Ji sir, abhi ${speed} km/h chal rahe hain ${trackName} par. Over.`;
  }

  // ── Signal queries ────────────────────────────────────────────────────────
  if (msg.includes('signal') || msg.includes('aspect') || msg.includes('light')) {
    if (!nextSignal) {
      return `Sir, aage koi signal nahi dikh raha. Track clear lag raha hai. Over.`;
    }
    const aspectMap: Record<string, string> = {
      'red':           'RED aspect hai sir, rukna padega. Over.',
      'yellow':        'YELLOW aspect hai sir, caution speed pe chal rahe hain. Over.',
      'double-yellow': 'DOUBLE YELLOW hai sir, 25 km/h se chal rahe hain. Over.',
      'green':         'GREEN aspect hai sir, line clear hai. Proceed kar rahe hain. Over.',
    };
    return `Signal ${sigId} par ${aspectMap[sigState] || 'aspect dekh raha hoon. Over.'}`;
  }

  // ── Position / location ───────────────────────────────────────────────────
  if (msg.includes('position') || msg.includes('kahan') || msg.includes('location')) {
    return `Sir, abhi ${trackName} par hain. ${isDelayed ? `${Math.floor((trainData?.delayTicks || 0) / 20)} minute late chal rahe hain.` : 'Time pe chal rahe hain.'} Over.`;
  }

  // ── Clearance / proceed ───────────────────────────────────────────────────
  if (
    msg.includes('proceed') || msg.includes('clear') ||
    msg.includes('aage') || msg.includes('jao') ||
    msg.includes('line clear')
  ) {
    return `Roger sir, line clear mil gaya. Aage badh rahe hain. Over.`;
  }

  // ── Stop / ruko ───────────────────────────────────────────────────────────
  if (
    msg.includes('stop') || msg.includes('ruko') ||
    msg.includes('brake') || msg.includes('hold')
  ) {
    return `Copy that sir, brakes laga rahe hain. Gaadi rok rahe hain. Understood. Over.`;
  }

  // ── Slow down ────────────────────────────────────────────────────────────
  if (
    msg.includes('slow') || msg.includes('dhire') ||
    msg.includes('caution') || msg.includes('reduce')
  ) {
    return `Ji sir, speed reduce kar rahe hain. Caution speed pe aa jayenge. Over.`;
  }

  // ── Emergency ────────────────────────────────────────────────────────────
  if (
    msg.includes('emergency') || msg.includes('accident') ||
    msg.includes('derail') || msg.includes('fire')
  ) {
    return `MAYDAY MAYDAY! Sir, emergency brakes laga diye hain! Gaadi rok raha hoon! Assistance bhejo! Over!`;
  }

  // ── Platform / arrival ───────────────────────────────────────────────────
  if (
    msg.includes('platform') || msg.includes('station') ||
    msg.includes('arrive') || msg.includes('pahunch')
  ) {
    return `Sir, platform approach kar rahe hain. ${speed > 0 ? `${speed} km/h pe aa rahe hain.` : 'Platform par khade hain.'} Over.`;
  }

  // ── Status report ─────────────────────────────────────────────────────────
  if (
    msg.includes('status') || msg.includes('report') ||
    msg.includes('update') || msg.includes('batao')
  ) {
    return `Sir, status report: Train ${trainId}, ${trackName} par, speed ${speed} km/h, agle signal ${sigId} par ${sigState} aspect. ${isDelayed ? `${Math.floor((trainData?.delayTicks || 0) / 20)} min late.` : 'On time.'} Over.`;
  }

  // ── Acknowledgement / roger ───────────────────────────────────────────────
  if (
    msg.includes('roger') || msg.includes('copy') ||
    msg.includes('ok') || msg.includes('theek') ||
    msg.includes('understood')
  ) {
    return `Roger that sir. Copy. Out.`;
  }

  // ── Delay inquiry ─────────────────────────────────────────────────────────
  if (
    msg.includes('delay') || msg.includes('late') ||
    msg.includes('time')
  ) {
    if (isDelayed) {
      const delayMin = Math.floor((trainData?.delayTicks || 0) / 20);
      return `Sir, ${delayMin} minute late chal rahe hain. Signal waiting ki wajah se delay hua. Over.`;
    }
    return `Sir, abhi on time chal rahe hain. Koi delay nahi. Over.`;
  }

  // ── Default response ──────────────────────────────────────────────────────
  const defaults = [
    `Ji sir, samajh gaya. Copy that. Over.`,
    `Roger sir. Instruction receive ho gaya. Over.`,
    `Theek hai sir. Aapka message mil gaya. Over.`,
    `Copy sir. Dhyan rakhenge. Over.`,
    `Ji sir, acknowledge kiya. Aage proceed kar rahe hain. Over.`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WalkieTalkie({
  isOpen,
  onClose,
  trains,
  tracks,
  signals,
  switches,
  incomingTransmissions = [],
}: WalkieTalkieProps) {
  const [selectedTrainId, setSelectedTrainId]   = useState<string>('');
  const [message, setMessage]                   = useState('');
  const [chatLog, setChatLog]                   = useState<
    { sender: string; text: string; id?: string }[]
  >([]);
  const [isTyping, setIsTyping]                 = useState(false);
  const [isSpeaking, setIsSpeaking]             = useState(false);

  const scrollRef              = useRef<HTMLDivElement>(null);
  const processedTransmissions = useRef<Set<string>>(new Set());

  // ── Incoming transmissions ────────────────────────────────────────────────
  useEffect(() => {
    incomingTransmissions.forEach(tx => {
      if (!processedTransmissions.current.has(tx.id)) {
        processedTransmissions.current.add(tx.id);
        setChatLog(prev => [
          ...prev,
          { sender: `Loco Pilot ${tx.trainId}`, text: tx.text, id: tx.id },
        ]);
        setSelectedTrainId(tx.trainId);
        speakResponse(tx.text);
      }
    });
  }, [incomingTransmissions]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLog]);

  // ── Cleanup speech on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || !selectedTrainId) return;

    const userMsg = message.trim();
    setMessage('');
    setChatLog(prev => [...prev, { sender: 'You (SM)', text: userMsg }]);
    setIsTyping(true);

    // Simulate radio delay (0.5 – 1.5 s)
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

    try {
      const activeTrain = trains.find(t => t.id === selectedTrainId);
      const activeTrack = tracks.find(t => t.id === activeTrain?.trackId);

      // Find next signal ahead
      const sigsOnTrack = Object.values(signals)
        .filter(s => s.trackId === activeTrack?.id)
        .sort((a: any, b: any) =>
          activeTrack?.direction === 'up' ? a.x - b.x : b.x - a.x
        );

      const nextSignal = activeTrain
        ? activeTrack?.direction === 'up'
          ? sigsOnTrack.find((s: any) => s.x > activeTrain.x)
          : sigsOnTrack.find((s: any) => s.x < activeTrain.x)
        : null;

      // Generate local response (no API needed)
      const reply = generateLocoPilotResponse(
        userMsg,
        selectedTrainId,
        activeTrain,
        activeTrack,
        nextSignal
      );

      setChatLog(prev => [
        ...prev,
        { sender: `Loco Pilot ${selectedTrainId}`, text: reply },
      ]);
      speakResponse(reply);

    } catch (err) {
      console.error('WalkieTalkie error:', err);
      setChatLog(prev => [
        ...prev,
        { sender: 'System', text: 'Radio communication failed. Static noise.' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Text-to-speech ────────────────────────────────────────────────────────
  const speakResponse = (text: string) => {
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*.*?\*/g, '').replace(/\(.*?\)/g, '');
    const utt   = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();

    const voice =
      voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.name.includes('Male')) ||
      voices.find(v => v.lang.startsWith('en'));

    if (voice) utt.voice = voice;
    utt.rate  = 0.9;
    utt.pitch = 0.8;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 w-80 bg-[#1e293b] border-2 border-slate-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden"
          style={{ height: '450px' }}
        >
          {/* ── Header ── */}
          <div className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500 opacity-50" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-slate-700 rounded-t-sm" />
                <Volume2 className={`h-4 w-4 ${isSpeaking ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm tracking-wide">VHF RADIO</h3>
                <p className="text-[10px] text-slate-500 font-mono">CH-16 / INTERLOCKING</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 flex flex-col p-3 gap-3 min-h-0 bg-[#0f172a]">

            {/* Train selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider">
                SELECT TARGET TRAIN
              </label>
              <select
                value={selectedTrainId}
                onChange={e => setSelectedTrainId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded p-1.5 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="">-- ALL TRAINS (BROADCAST) --</option>
                {trains.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id} - {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chat log */}
            <div
              ref={scrollRef}
              className="flex-1 bg-[#1a2e25] border border-slate-700 rounded p-2 overflow-y-auto space-y-2 relative shadow-inner"
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 2px)',
                }}
              />

              {chatLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#4ade80] opacity-50 space-y-2">
                  <Mic className="h-6 w-6" />
                  <p className="text-xs font-mono text-center">
                    RADIO READY
                    <br />
                    AWAITING TRANSMISSION
                  </p>
                </div>
              ) : (
                chatLog.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      log.sender === 'You (SM)' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold text-[#22c55e] opacity-70 mb-0.5">
                      {log.sender}
                    </span>
                    <div
                      className={`px-2 py-1.5 rounded relative z-10 max-w-[85%] font-mono text-xs ${
                        log.sender === 'You (SM)'
                          ? 'bg-[#064e3b] text-[#4ade80] border border-[#047857]'
                          : log.sender === 'System'
                          ? 'bg-red-900/50 text-red-400 border border-red-800'
                          : 'bg-[#0f172a]/80 text-[#34d399] border border-[#1e293b]'
                      }`}
                    >
                      {log.text}
                    </div>
                  </div>
                ))
              )}

              {isTyping && (
                <div className="flex flex-col items-start">
                  <div className="px-2 py-1 rounded bg-[#0f172a]/80 text-[#34d399] border border-[#1e293b] text-[10px] italic animate-pulse font-mono">
                    RX SIGNAL...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={selectedTrainId ? 'Over...' : 'Select a train first'}
                disabled={!selectedTrainId}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || !selectedTrainId || isTyping}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-2 rounded transition-colors flex items-center justify-center shrink-0 w-10 disabled:cursor-not-allowed"
              >
                <span className="font-bold font-mono text-xs">PTT</span>
              </button>
            </div>

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                <span className="text-[9px] font-mono text-red-500 tracking-wider">
                  RX ACTIVE
                </span>
                <div
                  className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}