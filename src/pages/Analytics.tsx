import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, PieChart, Pie, Cell
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, Train, Zap, Clock, Maximize, AlertTriangle } from 'lucide-react';
import { TRAIN_DATA } from '../data/trainData';

export default function Analytics() {
  const totalTrains = TRAIN_DATA.length;
  
  // Mock data for analytics
  const performanceData = [
    { time: '06:00', throughput: 42, baseline: 35, delayRec: 5, aiOptimized: 40 },
    { time: '08:00', throughput: 68, baseline: 50, delayRec: 12, aiOptimized: 65 },
    { time: '10:00', throughput: 75, baseline: 55, delayRec: 18, aiOptimized: 70 },
    { time: '12:00', throughput: 62, baseline: 45, delayRec: 8, aiOptimized: 60 },
    { time: '14:00', throughput: 55, baseline: 40, delayRec: 6, aiOptimized: 52 },
    { time: '16:00', throughput: 70, baseline: 52, delayRec: 15, aiOptimized: 68 },
    { time: '18:00', throughput: 82, baseline: 60, delayRec: 22, aiOptimized: 80 },
    { time: '20:00', throughput: 65, baseline: 48, delayRec: 10, aiOptimized: 62 },
    { time: '22:00', throughput: 45, baseline: 38, delayRec: 4, aiOptimized: 43 }
  ];

  const delayCauses = [
    { name: 'Signal Failure', count: 12, recovered: 10 },
    { name: 'Track Maintenance', count: 8, recovered: 5 },
    { name: 'Weather', count: 15, recovered: 12 },
    { name: 'Technical', count: 6, recovered: 4 }
  ];

  const totalDelays = 41;
  const overcomeDelays = 31;
  const throughputIncrease = 24.5; // percentage

  const gaugeValue = 78; // 78% capacity utilization
  const gaugeData = [
    { name: 'Used', value: gaugeValue },
    { name: 'Available', value: 100 - gaugeValue }
  ];
  const gaugeColors = ['var(--color-rail-accent)', 'rgba(255,255,255,0.1)'];

  const StatCard = ({ title, value, subtitle, icon, trend, trendValue }: any) => (
    <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-5 crystal-card relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        {icon}
      </div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-rail-text-muted)]">{title}</p>
          <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
        </div>
        <div className="p-2 bg-[var(--color-rail-accent-muted)] rounded-lg text-[var(--color-rail-accent)]">
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm mt-4">
        {trend === 'up' ? (
          <TrendingUp className="h-4 w-4 text-[var(--color-rail-accent)]" />
        ) : trend === 'down' ? (
          <TrendingDown className="h-4 w-4 text-[var(--color-rail-danger)]" />
        ) : null}
        <span className={trend === 'down' ? 'text-[var(--color-rail-danger)]' : 'text-[var(--color-rail-accent)]'}>
          {trendValue}
        </span>
        <span className="text-[var(--color-rail-text-muted)]">{subtitle}</span>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[var(--color-rail-accent-muted)] to-transparent opacity-20 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-rail-accent)] rounded-full blur-[120px] opacity-10 pointer-events-none" />

      <div className="mb-8 relative z-10">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Activity className="h-8 w-8 text-[var(--color-rail-accent)]" />
          Network Analytics
        </h1>
        <p className="text-[var(--color-rail-text-muted)] mt-2 max-w-2xl">
          Comprehensive performance metrics, delay analysis, and AI optimization impact for the network.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        <StatCard 
          title="Total Trains Operated" 
          value={totalTrains.toString()} 
          subtitle="Scheduled today"
          icon={<Train className="h-6 w-6" />}
          trend="up"
          trendValue="+12%"
        />
        <StatCard 
          title="Delays Reported" 
          value={totalDelays.toString()} 
          subtitle="vs yesterday"
          icon={<Clock className="h-6 w-6" />}
          trend="down"
          trendValue="-15%"
        />
        <StatCard 
          title="Delays Overcome" 
          value={`${Math.round((overcomeDelays / totalDelays) * 100)}%`} 
          subtitle="AI recovery rate"
          icon={<Zap className="h-6 w-6" />}
          trend="up"
          trendValue="+8.5%"
        />
        <StatCard 
          title="Throughput Maximization" 
          value={`+${throughputIncrease}%`} 
          subtitle="Section capacity increase"
          icon={<Maximize className="h-6 w-6" />}
          trend="up"
          trendValue="+4.2%"
        />
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
        {/* Section Throughput Chart */}
        <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Maximize className="h-5 w-5 text-[var(--color-rail-accent)]" />
            Section Throughput Over Time
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-rail-accent)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-rail-accent)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B9BB4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B9BB4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rail-border)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--color-rail-text-muted)" tick={{fill: 'var(--color-rail-text-muted)', fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-rail-text-muted)" tick={{fill: 'var(--color-rail-text-muted)', fontSize: 12}} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0A0F1C', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="throughput" name="Actual Throughput (AI Assisted)" stroke="var(--color-rail-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" />
                <Area type="monotone" dataKey="baseline" name="Baseline Capacity" stroke="#8B9BB4" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorBaseline)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-[var(--color-rail-text-muted)] mt-4">
            Shows actual number of trains passing through key sections compared to theoretical baseline capacity without AI optimization.
          </p>
        </div>

        {/* Delay Recovery Analysis */}
        <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--color-rail-accent)]" />
            Delay Recovery by AI
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rail-border)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--color-rail-text-muted)" tick={{fill: 'var(--color-rail-text-muted)', fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-rail-text-muted)" tick={{fill: 'var(--color-rail-text-muted)', fontSize: 12}} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0A0F1C', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Bar dataKey="delayRec" name="Minutes Recovered" fill="var(--color-rail-accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="aiOptimized" name="AI Optimization Score" stroke="#F59E0B" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-[var(--color-rail-text-muted)] mt-4">
            Analyzes how dynamic AI routing and speed optimization reduces delay propagation across the network.
          </p>
        </div>
      </div>

      {/* Bottom Area: Disruption & Cause Breakdown + Capacity Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
        <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--color-rail-danger)]" />
            Disruption Causes & AI Recovery Success
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayCauses} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rail-border)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-rail-text-muted)" tick={{fill: 'var(--color-rail-text-muted)', fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--color-rail-text-muted)" tick={{fill: 'white', fontSize: 12}} tickLine={false} axisLine={false} width={120} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0A0F1C', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="count" name="Total Incidents" fill="var(--color-rail-border)" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="recovered" name="Successfully Managed by AI" fill="var(--color-rail-accent)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capacity Utilization Gauge */}
        <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--color-rail-accent)]" />
            Real-Time Station Capacity
          </h3>
          <div className="h-72 w-full flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="70%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={gaugeColors[index % gaugeColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-4xl font-bold text-white">{gaugeValue}%</span>
              <p className="text-sm text-[var(--color-rail-text-muted)] mt-1">Utilization</p>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center w-full">
               <p className="text-sm text-[var(--color-rail-text-muted)]">
                 Current throughput: <span className="text-white font-medium">82 trains/hr</span>
               </p>
               <p className="text-xs text-slate-500 mt-1">Max theoretical limit: 105 trains/hr</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
