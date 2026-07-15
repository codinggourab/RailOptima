import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Hero section animation
      gsap.fromTo('.hero-content > *', 
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out',
        }
      );

      // Fade up elements
      gsap.utils.toArray<HTMLElement>('.animate-fade-up').forEach((el) => {
        gsap.fromTo(el, 
          { y: 30, opacity: 0 },
          {
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
          }
        );
      });

      // Sections animation
      gsap.utils.toArray<HTMLElement>('.animate-section').forEach((section) => {
        gsap.fromTo(section, 
          { y: 30, opacity: 0 },
          {
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
          }
        );
      });

      // Staggered cards animation
      gsap.utils.toArray<HTMLElement>('.stagger-cards').forEach((container) => {
        const cards = container.querySelectorAll('.stagger-card');
        gsap.fromTo(cards, 
          { y: 30, opacity: 0 },
          {
            scrollTrigger: {
              trigger: container,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="bg-transparent text-slate-900 dark:text-slate-100 selection:bg-primary selection:text-background-dark min-h-screen font-sans">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 border-b border-primary/10 bg-background-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="text-primary">
                <span className="material-symbols-outlined text-3xl">train</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-100">
                Rail<span className="text-primary">Optima</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#architecture">Architecture</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#benefits">Benefits</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#optimization">Optimization</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#simulation">Simulation</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="hidden sm:block px-4 py-2 text-sm font-bold border border-primary/30 rounded-lg hover:bg-primary/10 transition-all text-slate-100">
                Station Master
              </Link>
              <Link to="/login" className="px-4 py-2 text-sm font-bold bg-primary text-background-dark rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,209,255,0.4)]">
                Controller Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-[85vh] flex items-center justify-center overflow-hidden grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-dark/50 to-background-dark"></div>
        {/* Decorative Signal Indicators */}
        <div className="absolute top-20 left-10 flex flex-col gap-2 opacity-30">
          <div className="w-3 h-3 rounded-full bg-rail-red animate-pulse"></div>
          <div className="w-3 h-3 rounded-full bg-rail-amber"></div>
          <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_#00D1FF]"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center hero-content">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live Network Intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-100 leading-tight mb-6 font-display">
            AI Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Train Traffic</span> Control System
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Optimizing the pulse of the Indian Rail network with real-time AI intelligence, predictive scheduling, and automated safety protocols.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="px-8 py-4 bg-primary text-background-dark font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,209,255,0.3)]">
              <span className="material-symbols-outlined">dashboard</span>
              Station Master Login
            </Link>
            <Link to="/login" className="px-8 py-4 bg-[var(--color-rail-card)] text-slate-100 font-bold border border-[var(--color-rail-border)] rounded-xl hover:bg-[var(--color-rail-accent-muted)] transition-colors flex items-center justify-center gap-2 crystal-card">
              <span className="material-symbols-outlined">engineering</span>
              Controller Login
            </Link>
          </div>
        </div>
        {/* Abstract Track Visualization Background */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, transparent 49%, #00D1FF 50%, transparent 51%)', backgroundSize: '100px 100%' }}></div>
      </header>

      {/* System Architecture */}
      <section className="bg-transparent relative py-16" id="architecture">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-up">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">Neural Integration Architecture</h2>
            <p className="text-slate-400">End-to-end connectivity from physical track sensors to global AI optimization cores.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8 items-center stagger-cards">
            {/* Data Inputs */}
            <div className="space-y-6 stagger-card">
              <div className="p-6 rounded-xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:border-primary/50 transition-colors crystal-card">
                <span className="material-symbols-outlined text-primary mb-4 text-3xl">sensors</span>
                <h4 className="text-lg font-bold mb-2 text-slate-100">Track Sensors</h4>
                <p className="text-sm text-slate-400">Axle counters and track circuits feeding real-time occupancy data.</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:border-primary/50 transition-colors crystal-card">
                <span className="material-symbols-outlined text-rail-amber mb-4 text-3xl">traffic</span>
                <h4 className="text-lg font-bold mb-2 text-slate-100">Signal Blocks</h4>
                <p className="text-sm text-slate-400">Intelligent signal interlocking providing safety telemetry.</p>
              </div>
            </div>
            {/* Central AI Core */}
            <div className="relative group stagger-card">
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all"></div>
              <div className="relative bg-[var(--color-rail-card)] border-2 border-primary rounded-full aspect-square flex flex-col items-center justify-center text-center p-8 z-10 shadow-[0_0_50px_rgba(0,209,255,0.2)] crystal-card">
                <span className="material-symbols-outlined text-6xl text-primary mb-4 animate-pulse">memory</span>
                <h3 className="text-2xl font-black text-slate-100">AI CORE</h3>
                <p className="text-xs text-primary/70 font-mono mt-2 tracking-widest uppercase">Central Intelligence</p>
              </div>
            </div>
            {/* Outputs */}
            <div className="space-y-6 stagger-card">
              <div className="p-6 rounded-xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:border-primary/50 transition-colors text-right crystal-card">
                <span className="material-symbols-outlined text-primary mb-4 text-3xl">map</span>
                <h4 className="text-lg font-bold mb-2 text-slate-100">Dynamic Routing</h4>
                <p className="text-sm text-slate-400">Automated pathfinding for delay mitigation and congestion relief.</p>
              </div>
              <div className="p-6 rounded-xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:border-primary/50 transition-colors text-right crystal-card">
                <span className="material-symbols-outlined text-rail-red mb-4 text-3xl">report_problem</span>
                <h4 className="text-lg font-bold mb-2 text-slate-100">Collision Prevention</h4>
                <p className="text-sm text-slate-400">Zero-latency emergency braking commands and track protection.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Benefits */}
      <section className="bg-transparent border-y border-[var(--color-rail-border)] py-16" id="benefits">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-100 mb-12 flex items-center gap-3 animate-fade-up">
            <span className="w-8 h-[2px] bg-primary"></span> System Benefits
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-cards">
            {/* Benefit 1 */}
            <div className="group p-8 rounded-2xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:bg-[var(--color-rail-card)] transition-all crystal-card stagger-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Real-time Optimization</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Adjusts train speeds and platform assignments every second to maintain peak network throughput.</p>
            </div>
            {/* Benefit 2 */}
            <div className="group p-8 rounded-2xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:bg-[var(--color-rail-card)] transition-all crystal-card stagger-card">
              <div className="w-12 h-12 rounded-lg bg-rail-red/10 flex items-center justify-center text-rail-red mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">shield</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Collision Prevention</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Triple-redundant AI verification ensures zero-fault safety distances between moving rolling stock.</p>
            </div>
            {/* Benefit 3 */}
            <div className="group p-8 rounded-2xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:bg-[var(--color-rail-card)] transition-all crystal-card stagger-card">
              <div className="w-12 h-12 rounded-lg bg-rail-amber/10 flex items-center justify-center text-rail-amber mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">event_repeat</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Dynamic Scheduling</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Predictive algorithms manage rescheduling across the entire zone within minutes of a delay event.</p>
            </div>
            {/* Benefit 4 */}
            <div className="group p-8 rounded-2xl bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] hover:bg-[var(--color-rail-card)] transition-all crystal-card stagger-card">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">eco</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Energy Efficiency</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Regenerative braking coordination and coasting optimization reduces power consumption by up to 22%.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Optimization Overview */}
      <section className="overflow-hidden py-16 animate-section" id="optimization">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-black text-slate-100 mb-6 leading-tight">Neural Network Predictive Maintenance &amp; Delay Mitigation</h2>
              <p className="text-slate-400 text-lg mb-8">Our deep learning model processes over 100,000 data points per minute, identifying potential failures before they happen and rerouting traffic seamlessly.</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-1">check_circle</span>
                  <div>
                    <span className="block text-slate-100 font-bold">Probabilistic Delay Modeling</span>
                    <span className="text-sm text-slate-500">Predicts weather and mechanical impacts on schedule adherence with 98% accuracy.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-1">check_circle</span>
                  <div>
                    <span className="block text-slate-100 font-bold">Automated Re-routing</span>
                    <span className="text-sm text-slate-500">Calculates alternative paths across multiple interlocking zones in milliseconds.</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
              <div className="relative bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-2xl p-4 overflow-hidden shadow-2xl crystal-card">
                <div className="flex items-center gap-2 mb-4 border-b border-[var(--color-rail-border)] pb-2">
                  <div className="w-3 h-3 rounded-full bg-rail-red"></div>
                  <div className="w-3 h-3 rounded-full bg-rail-amber"></div>
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="ml-auto text-[10px] font-mono text-slate-500 uppercase">Live_Neural_Feed.sys</span>
                </div>
                <div className="h-64 flex items-end gap-2 overflow-hidden">
                  {/* Mock Data Visualization */}
                  <div className="w-full h-full bg-[var(--color-rail-bg)] rounded-lg p-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="h-2 w-full bg-[var(--color-rail-border)] rounded overflow-hidden">
                        <div className="h-full bg-primary w-2/3"></div>
                      </div>
                      <div className="h-2 w-full bg-[var(--color-rail-border)] rounded overflow-hidden">
                        <div className="h-full bg-rail-amber w-1/2"></div>
                      </div>
                      <div className="h-2 w-full bg-[var(--color-rail-border)] rounded overflow-hidden">
                        <div className="h-full bg-primary w-4/5"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-xs font-mono text-primary">ANALYSIS COMPLETE</div>
                      <div className="text-xs font-mono text-slate-500">99.8% CERTAINTY</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simulation Preview (Map) */}
      <section className="bg-transparent py-16 animate-section" id="simulation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-100">Live Network Simulation</h2>
          <p className="text-slate-400 mt-2">Interactive digital twin of the Kolkata Suburban Rail Network (Sealdah Division Sample)</p>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative bg-[var(--color-rail-card)] rounded-3xl border border-[var(--color-rail-border)] aspect-video overflow-hidden group shadow-[0_0_80px_rgba(0,0,0,0.5)] crystal-card">
            {/* Map Background */}
            <div className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700 bg-cover bg-center" data-alt="Map of Sealdah Division railway network in Kolkata" data-location="Kolkata" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC5efRwpDRYmoH4nSkzaYLsppB84z0GxC8Qg_WmtnfiQUSPody5PszN_lQRzVp433u1ok_K_54XDJnDG7iqVoo_u7w2z7nkBGuUczunKn4_cBbwVUGSxYvz-6Yh9MUjhqXPcXvds48XZbB6CryFNmvarrdAko7S6WFRb-ficQweQ39Q-qz9aJ1PLhHtuY7lKXPK0Wmhi4SJYLP1m_TMzjO8E7UgCszpC_KlDwujr6ZH0YTvBW4hBJI9fZP946Hv7oYVrDaSZae4t52b')" }}></div>
            {/* Glowing Overlay Grid */}
            <div className="absolute inset-0 grid-bg opacity-20"></div>
            {/* Simulation Elements */}
            <div className="absolute inset-0 p-8">
              {/* City Label */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <h3 className="text-7xl font-black text-slate-100/10 uppercase tracking-tighter">West Bengal<br/>Sealdah</h3>
              </div>
              {/* Station Marker: Sealdah */}
              <div className="absolute bottom-[15%] right-[20%] flex flex-col items-center">
                <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_#00D1FF]"></div>
                <span className="text-[10px] font-bold text-slate-300 mt-1 bg-background-dark/60 px-1 rounded">SEALDAH</span>
              </div>
              {/* Station Marker: Bidhannagar */}
              <div className="absolute bottom-[40%] right-[35%] flex flex-col items-center">
                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                <span className="text-[8px] font-bold text-slate-400 mt-1 bg-background-dark/60 px-1 rounded">BIDHANNAGAR RD</span>
              </div>
              {/* Station Marker: Dum Dum Jn */}
              <div className="absolute top-[30%] left-[40%] flex flex-col items-center">
                <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_#00D1FF]"></div>
                <span className="text-[10px] font-bold text-slate-300 mt-1 bg-background-dark/60 px-1 rounded">DUM DUM JN</span>
              </div>
              {/* Train Icon 1: Near Sealdah */}
              <div className="absolute bottom-[25%] right-[25%] flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary animate-pulse bg-background-dark/80 rounded-full p-1 border border-primary">train</span>
                  <div className="h-12 w-0.5 bg-gradient-to-b from-primary to-transparent"></div>
                </div>
                <div className="bg-background-dark/90 border border-primary p-2 rounded text-[10px] font-mono text-slate-100">
                  <span className="text-primary">13106 | Sealdah Ballia Exp</span><br/>
                  SPEED: 15km/h | STATUS: DEPARTED
                </div>
              </div>
              {/* Train Icon 2: Near Dum Dum */}
              <div className="absolute top-[35%] left-[45%] flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-rail-amber animate-pulse bg-background-dark/80 rounded-full p-1 border border-rail-amber">train</span>
                  <div className="h-12 w-0.5 bg-gradient-to-b from-rail-amber to-transparent"></div>
                </div>
                <div className="bg-background-dark/90 border border-rail-amber p-2 rounded text-[10px] font-mono text-slate-100">
                  <span className="text-rail-amber">33812 | Bongaon Local</span><br/>
                  SPEED: 45km/h | DELAY: +4m
                </div>
              </div>
              {/* HUD Elements */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] p-3 rounded-lg backdrop-blur-sm crystal-card">
                  <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-widest">Sealdah North Health</div>
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <div className="w-1 h-4 bg-rail-red rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Fullscreen Button */}
            <Link to="/login" className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary text-background-dark font-black rounded-full flex items-center gap-2 shadow-[0_0_30px_rgba(0,209,255,0.5)] hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">zoom_out_map</span>
              Launch Full Simulation
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-transparent border-t border-[var(--color-rail-border)] py-16 animate-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-primary">
                  <span className="material-symbols-outlined text-3xl">train</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-100 uppercase">RailOptima</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                Building the next generation of safe, efficient, and intelligent rail infrastructure for the people of India.
              </p>
            </div>
            <div>
              <h4 className="text-slate-100 font-bold mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a className="hover:text-primary transition-colors" href="#">Documentation</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Safety Protocols</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">System Status</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">API Access</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-100 font-bold mb-6">Portal Access</h4>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="text-left text-sm font-medium text-primary hover:underline">Station Master Login →</Link>
                <Link to="/login" className="text-left text-sm font-medium text-primary hover:underline">Controller Command Center →</Link>
                <Link to="/login" className="text-left text-sm font-medium text-primary hover:underline">Maintenance Portal →</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-8 flex flex-col md:row-auto md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-600">© 2024 Centre for Railway Information Systems (CRIS). All rights reserved.</p>
            <div className="flex gap-6 text-xs text-slate-600">
              <a className="hover:text-slate-300" href="#">Privacy Policy</a>
              <a className="hover:text-slate-300" href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
