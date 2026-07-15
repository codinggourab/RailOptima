import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Clock, MapPin, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [liveStats, setLiveStats] = useState({ activeTrains: 0, delayedTrains: 0, platformOccupancy: 0 });
  const [livePlatformData, setLivePlatformData] = useState<any[]>([
    { platform: "P1", train: "Empty", speed: "--", departure: "--", occupancy: 0 },
    { platform: "P2", train: "Empty", speed: "--", departure: "--", occupancy: 0 },
    { platform: "P3", train: "Empty", speed: "--", departure: "--", occupancy: 0 },
    { platform: "P4", train: "Empty", speed: "--", departure: "--", occupancy: 0 },
    { platform: "P5", train: "Empty", speed: "--", departure: "--", occupancy: 0 }
  ]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch mock data from our Express backend
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard data', err);
        setLoading(false);
      });

    // Fetch Disruptions
    fetch('/api/disruptions')
      .then(res => res.json())
      .then(data => {
        setDisruptions(data.filter((d: any) => d.status === 'active'));
      })
      .catch(err => console.error(err));
  }, []);

  // Poll local storage for live stats from interlocking
  useEffect(() => {
    const int = setInterval(() => {
      const stats = localStorage.getItem('railoptima_live_stats');
      if (stats) {
        setLiveStats(JSON.parse(stats));
      }

      const trainsData = localStorage.getItem('railoptima_trains_v2');
      if (trainsData) {
        const trains = JSON.parse(trainsData);
        
        const platforms = ['P1', 'P2', 'P3', 'P4', 'P5'];
        const platformOccupancy = platforms.map(p => {
          const trackId = p === 'P1' ? 1 : p === 'P2' ? 2 : p === 'P3' ? 3 : p === 'P4' ? 8 : 9;
          // Trains roughly between x=950 and x=1500 are considered at the platform
          const trainOnPlatform = trains.find((t: any) => t.trackId === trackId && t.x > 950 && t.x < 1500);
          
          if (trainOnPlatform) {
             const speedStr = trainOnPlatform.speed === 0 ? "0 km/h" : `${Math.round(trainOnPlatform.speed * 20)} km/h`;
             const isHalted = trainOnPlatform.speed === 0;
             return {
                platform: p,
                train: trainOnPlatform.id + " - " + trainOnPlatform.name,
                speed: speedStr,
                departure: isHalted ? "Halted" : "Departing",
                occupancy: isHalted ? 100 : 40
             }
          } else {
             return {
                platform: p,
                train: "Empty",
                speed: "--",
                departure: "--",
                occupancy: 0
             }
          }
        });
        setLivePlatformData(platformOccupancy);
      }
    }, 1000);
    return () => clearInterval(int);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-rail-accent)]"></div>
      </div>
    );
  }

  // Mock data for charts
  const throughputData = [
    { time: '06:00', value: 65 },
    { time: '07:00', value: 78 },
    { time: '08:00', value: 92 },
    { time: '09:00', value: 88 },
    { time: '10:00', value: 85 },
    { time: '11:00', value: 95 },
    { time: '12:00', value: 82 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Main Control Dashboard</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--color-rail-border)] hover:bg-[var(--color-rail-border)]/80 text-white rounded-md text-sm font-medium transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 bg-[var(--color-rail-accent)] hover:bg-[var(--color-rail-accent-hover)] text-black rounded-md text-sm font-bold transition-colors shadow-[0_0_15px_rgba(0,209,255,0.3)]">
            Optimize Schedule
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Active Trains" 
          value={liveStats.activeTrains.toString()} 
          icon={<Activity className="text-[var(--color-rail-accent)]" />} 
          trend="Live" 
          trendUp={true} 
        />
        <KpiCard 
          title="Delayed Trains" 
          value={liveStats.delayedTrains.toString()} 
          icon={<Clock className={liveStats.delayedTrains > 0 ? "text-[var(--color-rail-warning)]" : "text-[var(--color-rail-accent)]"} />} 
          trend={liveStats.delayedTrains > 0 ? "Needs Attention" : "On Time"} 
          trendUp={liveStats.delayedTrains === 0} 
        />
        <KpiCard 
          title="Platform Occupancy" 
          value={`${liveStats.platformOccupancy} Trains`} 
          icon={<MapPin className="text-[var(--color-rail-accent)]" />} 
          trend="Live" 
          trendUp={true} 
        />
        <KpiCard 
          title="Active Disruptions" 
          value={disruptions.length.toString()} 
          icon={<AlertTriangle className={disruptions.length > 0 ? "text-[var(--color-rail-danger)]" : "text-[var(--color-rail-accent)]"} />} 
          trend={disruptions.length > 0 ? "Critical" : "Clear"} 
          trendUp={disruptions.length === 0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-5 crystal-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Network Throughput (Live)</h2>
              <span className="text-xs font-mono bg-[var(--color-rail-accent-muted)] text-[var(--color-rail-accent)] px-2 py-1 rounded">Updating...</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={throughputData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-rail-accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-rail-accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rail-border)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--color-rail-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-rail-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--color-rail-card)', borderColor: 'var(--color-rail-border)', color: 'white' }}
                    itemStyle={{ color: 'var(--color-rail-accent)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--color-rail-accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform Occupancy */}
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-5 crystal-card">
            <h2 className="text-lg font-semibold text-white mb-4">Platform Occupancy</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[var(--color-rail-text-muted)] uppercase bg-[var(--color-rail-border)]/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-md">Platform</th>
                    <th className="px-4 py-3">Train</th>
                    <th className="px-4 py-3">Speed</th>
                    <th className="px-4 py-3">Departure</th>
                    <th className="px-4 py-3 rounded-tr-md">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {livePlatformData.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-[var(--color-rail-border)] last:border-0 hover:bg-[var(--color-rail-border)]/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-white">{item.platform}</td>
                      <td className="px-4 py-3">
                        {item.train === "Empty" ? (
                          <span className="text-slate-500 italic">Empty</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">{item.train.split(' - ')[0]}</span>
                            <span className="text-sm font-extrabold text-[var(--color-rail-accent)] leading-tight">{item.train.split(' - ')[1] || item.train}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.speed === '--' ? 'bg-[var(--color-rail-bg)] text-[var(--color-rail-text-muted)]' :
                          item.speed === '0 km/h' ? 'bg-[var(--color-rail-danger)]/20 text-[var(--color-rail-danger)]' :
                          'bg-[var(--color-rail-accent-muted)] text-[var(--color-rail-accent)]'
                        }`}>
                          {item.speed || item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">{item.departure}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-[var(--color-rail-border)] rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${item.occupancy > 90 ? 'bg-[var(--color-rail-danger)]' : 'bg-[var(--color-rail-accent)]'}`} 
                              style={{ width: `${item.occupancy}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono w-8 text-right">{item.occupancy}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-6">
          {/* Active Disruptions */}
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-5 crystal-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--color-rail-danger)]" />
                <h2 className="text-lg font-semibold text-white">Active Disruptions</h2>
              </div>
              <span className="bg-[var(--color-rail-danger)]/20 text-[var(--color-rail-danger)] text-xs font-bold px-2 py-0.5 rounded-full">
                {disruptions.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {disruptions.map((disruption: any) => (
                <div key={disruption.id} className="flex items-start gap-3 p-3 bg-[var(--color-rail-bg)] border-l-2 border-[var(--color-rail-danger)] rounded-r-lg">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-medium text-white">{disruption.type}</h3>
                      <span className="text-xs font-mono text-[var(--color-rail-text-muted)]">{new Date(disruption.reportedAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-[var(--color-rail-text-muted)] mt-1">Location: {disruption.location}</p>
                  </div>
                </div>
              ))}
              {disruptions.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-rail-accent)] p-3 bg-[var(--color-rail-accent-muted)] rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  No active disruptions
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, trend, trendUp }: { title: string, value: string | number, icon: React.ReactNode, trend: string, trendUp: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] p-5 rounded-xl flex flex-col crystal-card"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-[var(--color-rail-text-muted)]">{title}</h3>
        <div className="p-2 bg-[var(--color-rail-bg)] rounded-lg border border-[var(--color-rail-border)]">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between mt-auto">
        <div className="text-2xl font-bold text-white font-mono">{value}</div>
        <div className={`text-xs font-medium flex items-center gap-1 ${trendUp ? 'text-[var(--color-rail-accent)]' : 'text-[var(--color-rail-danger)]'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      </div>
    </motion.div>
  );
}
