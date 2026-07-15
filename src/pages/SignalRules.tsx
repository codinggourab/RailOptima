import React from 'react';
import { BookOpen, ShieldAlert, Train, Map, Cpu, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SignalRules() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[var(--color-rail-accent)]" />
            Signal Rules & Interlocking Logic
          </h1>
          <p className="text-[var(--color-rail-text-muted)] mt-1">
            Indian Railway Signalling System reference guide.
          </p>
        </div>
      </div>

      {/* Overview */}
      <section className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Map className="h-5 w-5 text-[var(--color-rail-accent)]" />
          Overview
        </h2>
        <p className="text-[var(--color-rail-text-muted)] leading-relaxed mb-6">
          The Indian Railway signalling system ensures safe, efficient, and conflict-free train movement through stations and block sections. At Dum Dum Junction, train movement follows a strict interlocking sequence:
        </p>
        
        <div className="bg-[var(--color-rail-bg)] border border-[var(--color-rail-border)] rounded-lg p-4 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max text-sm font-mono font-bold">
            <span className="text-white bg-[var(--color-rail-card)] px-3 py-1.5 rounded border border-[var(--color-rail-border)]">ENTRY</span>
            <span className="text-[var(--color-rail-text-muted)]">→</span>
            <span className="text-[var(--color-rail-warning)] bg-[var(--color-rail-card)] px-3 py-1.5 rounded border border-[var(--color-rail-border)]">DISTANT</span>
            <span className="text-[var(--color-rail-text-muted)]">→</span>
            <span className="text-[var(--color-rail-danger)] bg-[var(--color-rail-card)] px-3 py-1.5 rounded border border-[var(--color-rail-border)]">HOME</span>
            <span className="text-[var(--color-rail-text-muted)]">→</span>
            <span className="text-[var(--color-rail-accent)] bg-[var(--color-rail-card)] px-3 py-1.5 rounded border border-[var(--color-rail-border)]">PLATFORM</span>
            <span className="text-[var(--color-rail-text-muted)]">→</span>
            <span className="text-[var(--color-rail-warning)] bg-[var(--color-rail-card)] px-3 py-1.5 rounded border border-[var(--color-rail-border)]">STARTER</span>
            <span className="text-[var(--color-rail-text-muted)]">→</span>
            <span className="text-green-400 bg-[var(--color-rail-card)] px-3 py-1.5 rounded border border-[var(--color-rail-border)]">ADVANCED STARTER</span>
            <span className="text-[var(--color-rail-text-muted)]">→</span>
            <span className="text-white bg-[var(--color-rail-card)] px-3 py-1.5 rounded border border-[var(--color-rail-border)]">BLOCK SECTION</span>
          </div>
        </div>
      </section>

      {/* Signal Types */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[var(--color-rail-accent)]" />
          Types of Signals
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Distant */}
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-5 crystal-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-rail-warning)]/20 flex items-center justify-center border border-[var(--color-rail-warning)]">
                <div className="w-3 h-3 rounded-full bg-[var(--color-rail-warning)] animate-pulse"></div>
              </div>
              <h3 className="text-lg font-bold text-white">1️⃣ DISTANT SIGNAL</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Purpose</span>
                <p className="text-white">Warns driver about upcoming HOME signal</p>
              </div>
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Rules</span>
                <ul className="list-disc list-inside text-[var(--color-rail-text-muted)] mt-1">
                  <li>No RED aspect</li>
                  <li><span className="text-green-400 font-bold">GREEN</span> → Proceed, next signal is clear</li>
                  <li><span className="text-[var(--color-rail-warning)] font-bold">YELLOW</span> → Be ready to stop at HOME</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Home */}
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-danger)]/30 rounded-xl p-5 crystal-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-rail-danger)]/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-rail-danger)]/20 flex items-center justify-center border border-[var(--color-rail-danger)]">
                <div className="w-3 h-3 rounded-full bg-[var(--color-rail-danger)]"></div>
              </div>
              <h3 className="text-lg font-bold text-white">2️⃣ HOME SIGNAL</h3>
            </div>
            <div className="space-y-3 text-sm relative z-10">
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Purpose</span>
                <p className="text-white">Controls entry into station (Most critical)</p>
              </div>
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Rules</span>
                <ul className="list-disc list-inside text-[var(--color-rail-text-muted)] mt-1">
                  <li>Must be RED by default</li>
                  <li>Turn GREEN only when: Route is set, Platform is free, No conflicting movement</li>
                </ul>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[var(--color-rail-bg)] p-2 rounded border border-[var(--color-rail-border)]"><span className="text-[var(--color-rail-danger)] font-bold">RED</span> Stop</div>
                <div className="bg-[var(--color-rail-bg)] p-2 rounded border border-[var(--color-rail-border)]"><span className="text-[var(--color-rail-warning)] font-bold">YELLOW</span> Proceed cautiously</div>
                <div className="bg-[var(--color-rail-bg)] p-2 rounded border border-[var(--color-rail-border)]"><span className="text-orange-400 font-bold">DOUBLE YELLOW</span> Advance caution</div>
                <div className="bg-[var(--color-rail-bg)] p-2 rounded border border-[var(--color-rail-border)]"><span className="text-green-400 font-bold">GREEN</span> Proceed</div>
              </div>
            </div>
          </div>

          {/* Starter */}
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-5 crystal-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-rail-warning)]/20 flex items-center justify-center border border-[var(--color-rail-warning)]">
                <div className="w-3 h-3 rounded-full bg-[var(--color-rail-warning)]"></div>
              </div>
              <h3 className="text-lg font-bold text-white">3️⃣ STARTER SIGNAL</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Purpose</span>
                <p className="text-white">Controls departure from platform</p>
              </div>
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Rules</span>
                <ul className="list-disc list-inside text-[var(--color-rail-text-muted)] mt-1">
                  <li>Can turn GREEN only when: Platform route is clear & Next block is free</li>
                  <li>If RED → train waits at platform</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Advanced Starter */}
          <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-5 crystal-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <h3 className="text-lg font-bold text-white">4️⃣ ADVANCED STARTER</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Purpose</span>
                <p className="text-white">Final signal before block section</p>
              </div>
              <div>
                <span className="text-[var(--color-rail-text-muted)] uppercase text-xs font-bold">Rules</span>
                <ul className="list-disc list-inside text-[var(--color-rail-text-muted)] mt-1">
                  <li>GREEN only if: Block section is free</li>
                  <li>If RED → train held before block</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interlocking Rules */}
      <section className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[var(--color-rail-accent)]" />
          Interlocking Rules (Core Logic)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RuleCard icon="🔐" title="Rule 1: Route Locking" desc="Only one route can be active at a time. Once assigned → cannot be changed until train clears." />
          <RuleCard icon="🚧" title="Rule 2: Platform Allocation" desc="Train must be assigned a free platform. No two trains can occupy same platform." />
          <RuleCard icon="🚦" title="Rule 3: Signal Dependency" desc="HOME must be GREEN before entry. STARTER must be GREEN before departure." />
          <RuleCard icon="⛔" title="Rule 4: Safety First" desc="If any condition fails → signal stays RED. No manual override without clearance." />
          <RuleCard icon="⏱️" title="Rule 5: Minimum Headway" desc="Maintain safe distance between trains. Avoid rear-end collision." />
          <RuleCard icon="🔄" title="Rule 6: Block Occupancy" desc="Block FREE → train allowed. Block OCCUPIED → signal RED." />
        </div>
      </section>

      {/* Train Movement Logic & AI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Train className="h-5 w-5 text-[var(--color-rail-accent)]" />
            Train Movement Flow
          </h2>
          <ol className="space-y-4 text-sm relative border-l border-[var(--color-rail-border)] ml-3 pl-4">
            <FlowStep num="1" title="Train Arrives" desc="Waits at HOME signal" />
            <FlowStep num="2" title="Station Master Sets HOME" desc="If GREEN → train enters station. If RED → train held." />
            <FlowStep num="3" title="Route Assignment" desc="Platform selected (P1–P5). Route locked." />
            <FlowStep num="4" title="STARTER Signal" desc="GREEN → train leaves platform. RED → train held at platform." />
            <FlowStep num="5" title="ADVANCED STARTER" desc="GREEN → train enters block. RED → train held before block." />
            <FlowStep num="6" title="Block Clearance" desc="Train enters next section. Platform becomes FREE." isLast />
          </ol>
        </section>

        <div className="space-y-6">
          <section className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl p-6 crystal-card">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--color-rail-warning)]" />
              Conflict Detection
            </h2>
            <ul className="space-y-2 text-sm text-[var(--color-rail-text-muted)]">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-danger)]"></div> Platform conflict</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-danger)]"></div> Track conflict</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-danger)]"></div> Signal violation</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-danger)]"></div> Block occupancy conflict</li>
            </ul>
          </section>

          <section className="bg-[var(--color-rail-card)] border border-[var(--color-rail-accent)]/30 rounded-xl p-6 crystal-card shadow-[0_0_20px_rgba(0,209,255,0.05)]">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[var(--color-rail-accent)]" />
              AI Integration
            </h2>
            <p className="text-sm text-[var(--color-rail-text-muted)] mb-3">
              AI enhances signalling by:
            </p>
            <ul className="space-y-2 text-sm text-white">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-accent)]"></div> Predicting delays</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-accent)]"></div> Deciding train precedence</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-accent)]"></div> Reducing congestion</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-rail-accent)]"></div> Suggesting optimal signal sequence</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function RuleCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="bg-[var(--color-rail-bg)] border border-[var(--color-rail-border)] rounded-lg p-4 hover:border-[var(--color-rail-accent)]/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold text-white text-sm">{title}</h3>
      </div>
      <p className="text-xs text-[var(--color-rail-text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

function FlowStep({ num, title, desc, isLast = false }: { num: string, title: string, desc: string, isLast?: boolean }) {
  return (
    <li className="relative">
      <div className="absolute -left-[25px] top-0 w-6 h-6 rounded-full bg-[var(--color-rail-card)] border-2 border-[var(--color-rail-accent)] flex items-center justify-center text-[10px] font-bold text-white z-10">
        {num}
      </div>
      <div className="mb-1">
        <h4 className="font-bold text-white">{title}</h4>
        <p className="text-[var(--color-rail-text-muted)] text-xs mt-0.5">{desc}</p>
      </div>
      {!isLast && <div className="h-4"></div>}
    </li>
  );
}
