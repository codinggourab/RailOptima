import React, { useState, useEffect } from 'react';
import { Train, MapPin, Clock, Search, Filter, ArrowRight, Star, Info, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRAIN_DATA } from '../data/trainData';

export default function LiveTrains() {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [selectedTrain, setSelectedTrain] = useState<typeof TRAIN_DATA[0] | null>(null);
  const [disruptions, setDisruptions] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    // Simulate fetching disruptions from a real-time API
    const fetchDisruptions = async () => {
      // In a real application, you would fetch from an actual endpoint:
      // const response = await fetch('/api/disruptions');
      // const data = await response.json();
      
      setTimeout(() => {
        setDisruptions({
          "33860": "Signal failure near DDJ. Exp delay: 15m",
          "31844": "Late running of pairing train",
          "33812": "Track maintenance work en route",
          "31411": "Level crossing gate blocked",
          "31315": "Speed restriction on KLYM bridge",
          "53171": "Locomotive issue at BNJ"
        });
      }, 800);
    };
    
    fetchDisruptions();
  }, []);

  const filteredTrains = TRAIN_DATA.filter(train => {
    const matchesSearch = train.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      train.no.includes(searchTerm) ||
      train.to.toLowerCase().includes(searchTerm.toLowerCase());
      
    let matchesTime = true;
    if (timeFrom || timeTo) {
      if (timeFrom && train.fromSch < timeFrom) matchesTime = false;
      if (timeTo && train.fromSch > timeTo) matchesTime = false;
    }
    
    return matchesSearch && matchesTime;
  });

  const visibleTrains = filteredTrains.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl overflow-hidden crystal-card">
        <div className="bg-gradient-to-r from-[var(--color-rail-accent)]/20 to-transparent p-6 border-b border-[var(--color-rail-border)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <Train className="h-8 w-8 text-[var(--color-rail-accent)]" />
                Departures from DDJ/Dum Dum Junction (5 PFs)
              </h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-rail-text-muted)]">
                <span className="font-semibold text-white">दमदम जंक्शन</span>
                <span>•</span>
                <span className="font-semibold text-white">দমদম জংশন</span>
                <span>•</span>
                <span>Track: Quadruple Electric-Line</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-xs text-[var(--color-rail-text-muted)] bg-[var(--color-rail-bg)] px-3 py-1 rounded-full border border-[var(--color-rail-border)]">
                Updated: Nov 21 2022 (23:22)
              </div>
              <div className="mt-2 flex gap-2">
                <span className="text-xs font-bold px-2 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30">2 Mail/Express</span>
                <span className="text-xs font-bold px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">6 Passenger</span>
                <span className="text-xs font-bold px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">12 MEMU</span>
                <span className="text-xs font-bold px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">430 EMU</span>
              </div>
            </div>
          </div>
        </div>

        {/* Station Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-[var(--color-rail-bg)]/50">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-rail-accent)] uppercase tracking-wider mb-2">Station Address</h3>
            <p className="text-sm text-white">Dum Dum Road (Adjacent to Dumdum metro rly stn), Dumdum, Kolkata - 700030, Dist - North 24 Parganas</p>
            <p className="text-sm text-[var(--color-rail-text-muted)]"><span className="text-white">State:</span> West Bengal</p>
            <div className="flex gap-4 text-sm">
              <p className="text-[var(--color-rail-text-muted)]"><span className="text-white">Type:</span> Junction</p>
              <p className="text-[var(--color-rail-text-muted)]"><span className="text-white">Category:</span> SG-2</p>
            </div>
            <div className="flex gap-4 text-sm">
              <p className="text-[var(--color-rail-text-muted)]"><span className="text-white">Zone:</span> ER/Eastern</p>
              <p className="text-[var(--color-rail-text-muted)]"><span className="text-white">Division:</span> Sealdah</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-rail-accent)] uppercase tracking-wider mb-2">Station Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[var(--color-rail-card)] p-2 rounded border border-[var(--color-rail-border)]">
                <div className="text-[var(--color-rail-text-muted)] text-xs">Platforms</div>
                <div className="font-bold text-white text-lg">5</div>
              </div>
              <div className="bg-[var(--color-rail-card)] p-2 rounded border border-[var(--color-rail-border)]">
                <div className="text-[var(--color-rail-text-muted)] text-xs">Halting Trains</div>
                <div className="font-bold text-white text-lg">28</div>
              </div>
              <div className="bg-[var(--color-rail-card)] p-2 rounded border border-[var(--color-rail-border)]">
                <div className="text-[var(--color-rail-text-muted)] text-xs">Originating</div>
                <div className="font-bold text-white text-lg">0</div>
              </div>
              <div className="bg-[var(--color-rail-card)] p-2 rounded border border-[var(--color-rail-border)]">
                <div className="text-[var(--color-rail-text-muted)] text-xs">Terminating</div>
                <div className="font-bold text-white text-lg">0</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-rail-accent)] uppercase tracking-wider mb-2">Ratings & Reviews</h3>
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              <span className="text-lg font-bold text-white">3.6<span className="text-sm text-[var(--color-rail-text-muted)]">/5</span></span>
              <span className="text-xs text-[var(--color-rail-text-muted)]">(173 votes)</span>
            </div>
            <div className="space-y-1.5">
              <RatingBar label="Cleanliness" score="good" count={23} color="bg-green-500" />
              <RatingBar label="Porters/Escalators" score="average" count={20} color="bg-orange-500" />
              <RatingBar label="Food" score="good" count={22} color="bg-green-500" />
              <RatingBar label="Transportation" score="excellent" count={24} color="bg-[var(--color-rail-accent)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-[2] space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-rail-text-muted)]" />
              <input 
                type="text" 
                placeholder="Search by train number, name, or destination..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(50); }}
                className="w-full bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-rail-accent)] focus:ring-1 focus:ring-[var(--color-rail-accent)] transition-all"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-rail-text-muted)]">From:</span>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => { setTimeFrom(e.target.value); setVisibleCount(50); }}
                  className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-rail-accent)] focus:ring-1 focus:ring-[var(--color-rail-accent)] transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-rail-text-muted)]">To:</span>
                <input
                  type="time"
                  value={timeTo}
                  onChange={(e) => { setTimeTo(e.target.value); setVisibleCount(50); }}
                  className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-rail-accent)] focus:ring-1 focus:ring-[var(--color-rail-accent)] transition-all"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-lg text-sm text-white hover:border-[var(--color-rail-accent)] transition-colors">
                <Filter className="h-4 w-4" />
                Filter
              </button>
            </div>
          </div>

          {/* Train Table */}
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl overflow-hidden crystal-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--color-rail-bg)] border-b border-[var(--color-rail-border)] text-[var(--color-rail-text-muted)] uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">No.</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Zone</th>
                    <th className="px-4 py-3 font-medium">PF</th>
                    <th className="px-4 py-3 font-medium">Days</th>
                    <th className="px-4 py-3 font-medium">From</th>
                    <th className="px-4 py-3 font-medium">Sch</th>
                    <th className="px-4 py-3 font-medium">To</th>
                    <th className="px-4 py-3 font-medium">Sch</th>
                    <th className="px-4 py-3 font-medium">Status / Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rail-border)]">
                  {visibleTrains.length > 0 ? (
                    visibleTrains.map((train, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={train.no} 
                        onClick={() => setSelectedTrain(train)}
                        className={`transition-colors cursor-pointer ${selectedTrain?.no === train.no ? 'bg-[var(--color-rail-accent-muted)]' : 'hover:bg-[var(--color-rail-bg)]/80'}`}
                      >
                    <td className="px-4 py-3 font-mono text-[var(--color-rail-accent)] font-extrabold text-base">{train.no}</td>
                    <td className="px-4 py-3 text-white font-semibold text-base">{train.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        train.type === 'Klkt' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        train.type === 'MEMU' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        train.type === 'Pass' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        train.type.includes('FREIGHT') ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                        {train.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-rail-text-muted)]">{train.zone}</td>
                    <td className="px-4 py-3 font-mono text-white">{train.pf}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5 text-[10px] font-mono">
                        {train.days.split(' ').map((day, i) => (
                          <span key={i} className="w-4 h-4 flex items-center justify-center bg-[var(--color-rail-accent)]/20 text-[var(--color-rail-accent)] rounded-sm border border-[var(--color-rail-accent)]/30">{day}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{train.from}</td>
                    <td className="px-4 py-3 font-mono text-[var(--color-rail-text-muted)]">{train.fromSch}</td>
                    <td className="px-4 py-3 font-bold text-white">{train.to}</td>
                    <td className="px-4 py-3 font-mono text-[var(--color-rail-text-muted)]">{train.toSch}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                       {disruptions[train.no] ? (
                          <div className="flex flex-col">
                            <span className="text-red-400 text-xs font-bold tracking-wider uppercase">Delayed</span>
                            <span className="text-[10px] text-[var(--color-rail-text-muted)] truncate w-32" title={disruptions[train.no]}>{disruptions[train.no]}</span>
                          </div>
                       ) : parseInt(train.speed) === 0 ? (
                          <div className="flex flex-col">
                            <span className="text-red-400 text-xs font-bold tracking-wider uppercase">Delayed</span>
                            <span className="text-[10px] text-[var(--color-rail-text-muted)]">Awaiting update</span>
                          </div>
                       ) : (
                          <div className="flex flex-col">
                            <span className="text-green-400 text-xs font-bold tracking-wider uppercase">On Time</span>
                            <span className="text-[10px] text-[var(--color-rail-text-muted)]">{train.speed}</span>
                          </div>
                       )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[var(--color-rail-text-muted)]">
                    <div className="flex flex-col items-center justify-center">
                      <Info className="h-8 w-8 mb-2 opacity-50" />
                      <p>No trains found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {visibleCount < filteredTrains.length && (
          <div className="p-4 border-t border-[var(--color-rail-border)] bg-[var(--color-rail-bg)] flex justify-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + 50)}
              className="px-6 py-2 bg-[var(--color-rail-card)] border border-[var(--color-rail-accent)]/50 hover:bg-[var(--color-rail-accent)]/20 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              Load More Trains <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-4 border-t border-[var(--color-rail-border)] bg-[var(--color-rail-bg)] text-xs text-[var(--color-rail-text-muted)] flex justify-between items-center">
            <span>Showing {visibleTrains.length} of {filteredTrains.length} matching trains (Total: {TRAIN_DATA.length})</span>
            <span className="flex items-center gap-1">Status / Speed: <span className="text-[var(--color-rail-accent)]">Live</span></span>
          </div>
        </div>
        </div>

        {/* Live Tracking Map Section */}
        <AnimatePresence>
          {selectedTrain && (
            <motion.div 
              initial={{ opacity: 0, width: 0, scale: 0.95 }}
              animate={{ opacity: 1, width: 'auto', scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex-1 min-w-[320px] max-w-md shrink-0"
            >
               <MiniMap train={selectedTrain} disruption={disruptions[selectedTrain.no]} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MiniMap({ train, disruption }: { train: typeof TRAIN_DATA[0], disruption?: string }) {
  const speedMatch = train.speed.match(/(\d+)/);
  const speed = speedMatch ? parseInt(speedMatch[1], 10) : 0;
  
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset progress when train changes to simulate entering block
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        // speed in km/h -> map to progress % per tick
        // 50 km/h approx translates to +0.5% every 100ms
        const step = (speed || 40) * 0.01;
        let next = prev + step;
        if (next > 100) next = 0; // Seamless loop for simulation
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [train, speed]);

  return (
    <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card sticky top-6 shadow-2xl">
      <div className="mb-6 border-b border-[var(--color-rail-border)] pb-4">
        <h3 className="text-base font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-[var(--color-rail-accent)] animate-pulse" />
          Live Tracking • {train.no}
        </h3>
        <p className="text-2xl font-extrabold text-[var(--color-rail-accent)] tracking-tight">{train.name}</p>
      </div>
      <div className="flex gap-4 items-center mb-8 relative">
        <div className="flex-1 font-bold text-white text-right truncate overflow-hidden" title={train.from}>{train.from}</div>
        <div className="w-48 h-10 relative flex items-center shrink-0">
            {/* The Track Line */}
            <div className="absolute left-0 right-0 h-1.5 bg-[var(--color-rail-bg)] border border-[var(--color-rail-border)] rounded-full"></div>
            {/* Progress line */}
            <div className="absolute left-0 h-1 bg-[var(--color-rail-accent)] shadow-[0_0_8px_rgba(0,209,255,0.8)] rounded-full transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
            
            {/* Outline box around route */}
            <div className="absolute inset-0 border border-[var(--color-rail-border)]/50 rounded-lg pointer-events-none -m-2 opacity-50"></div>

            {/* Train Dot */}
            <div 
              className="absolute w-4 h-4 bg-white rounded-md border-2 border-[var(--color-rail-accent)] shadow-[0_0_12px_rgba(0,209,255,1)] transition-all duration-100 ease-linear z-10 flex items-center justify-center top-1/2 -translate-y-1/2" 
              style={{ left: `calc(${progress}% - 8px)` }}
            >
               <div className="w-1.5 h-1.5 bg-[var(--color-rail-bg)] rounded-sm"></div>
            </div>
            
            {/* Stations marks */}
            <div className="absolute left-0 w-2.5 h-2.5 rounded-full bg-[var(--color-rail-accent)] outline outline-2 outline-[var(--color-rail-bg)] top-1/2 -translate-y-1/2"></div>
            <div className="absolute right-0 w-2.5 h-2.5 rounded-full bg-[var(--color-rail-text-muted)] outline outline-2 outline-[var(--color-rail-bg)] top-1/2 -translate-y-1/2"></div>
        </div>
        <div className="flex-1 font-bold text-[var(--color-rail-text-muted)] truncate overflow-hidden" title={train.to}>{train.to}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
        <div className="p-4 bg-[var(--color-rail-bg)] rounded-lg border border-[var(--color-rail-border)]">
          <div className="text-[var(--color-rail-text-muted)] text-[10px] uppercase font-bold tracking-wider mb-1">Current Speed</div>
          <div className="font-mono text-white font-bold text-xl">{train.speed}</div>
        </div>
        <div className="p-4 bg-[var(--color-rail-bg)] rounded-lg border border-[var(--color-rail-border)]">
          <div className="text-[var(--color-rail-text-muted)] text-[10px] uppercase font-bold tracking-wider mb-1">Next Signal</div>
          <div className="font-bold text-green-400 text-sm flex items-center gap-1.5 pt-1">
             <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
             PROCEED
          </div>
        </div>
        <div className="col-span-2 p-4 bg-[var(--color-rail-bg)] rounded-lg border border-[var(--color-rail-border)] flex items-center justify-between">
           <div>
             <div className="text-[var(--color-rail-text-muted)] text-[10px] uppercase font-bold tracking-wider mb-1">Status</div>
             <div className={`font-bold text-sm ${disruption ? 'text-red-400' : 'text-[var(--color-rail-accent)]'}`}>
               {disruption ? "DELAYED" : speed > 0 ? "ON TIME" : "DELAYED"}
             </div>
           </div>
           <div className="text-right">
             <div className="text-[var(--color-rail-text-muted)] text-[10px] uppercase font-bold tracking-wider mb-1">Est. Arrival</div>
             <div className="font-mono text-white font-bold text-sm">{train.toSch}</div>
           </div>
        </div>
        {disruption && (
          <div className="col-span-2 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
            <div className="text-red-400 text-[10px] uppercase font-bold tracking-wider mb-1">Disruption Reported</div>
            <div className="text-sm text-red-200">{disruption}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function RatingBar({ label, score, count, color }: { label: string, score: string, count: number, color: string }) {
  const percentage = score === 'excellent' ? '100%' : score === 'good' ? '75%' : score === 'average' ? '50%' : '25%';
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-32 text-[var(--color-rail-text-muted)] truncate">{label}</div>
      <div className="flex-1 h-2 bg-[var(--color-rail-bg)] rounded-full overflow-hidden border border-[var(--color-rail-border)]">
        <div className={`h-full ${color}`} style={{ width: percentage }}></div>
      </div>
      <div className="w-24 text-right text-[var(--color-rail-text-muted)]">
        <span className="text-white capitalize">{score}</span> ({count})
      </div>
    </div>
  );
}
