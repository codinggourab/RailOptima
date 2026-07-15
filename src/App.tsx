/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Activity, 
  AlertTriangle, 
  Settings, 
  Train,
  Bell,
  Search,
  Menu,
  BrainCircuit,
  BookOpen,
  LogOut,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import TrackDiagram from './components/TrackDiagram';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AIOptimization from './pages/AIOptimization';
import Disruptions from './pages/Disruptions';
import SignalRules from './pages/SignalRules';
import LiveTrains from './pages/LiveTrains';

import Analytics from './pages/Analytics';

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const navigate = useNavigate();
  const location = useLocation();

  // Page loading animation on route change
  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => setIsPageLoading(false), 1200);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Fetch notifications (disruptions)
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/disruptions');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.filter((d: any) => d.status === 'active'));
        }
      } catch (e) {}
    };
    fetchNotifs();
    const int = setInterval(fetchNotifs, 15000);
    return () => clearInterval(int);
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('railoptima_auth');
    setShowLogoutModal(false);
    navigate('/');
  };

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent text-[var(--color-rail-text)]">
      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 240 }}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        className="flex flex-col border-r border-[var(--color-rail-border)] bg-[var(--color-rail-card)] z-20"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--color-rail-border)]">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Train className="h-6 w-6 text-[var(--color-rail-accent)]" />
              <span className="text-lg font-bold tracking-tight text-white">RailOptima</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-[var(--color-rail-accent-muted)] text-[var(--color-rail-text-muted)] hover:text-[var(--color-rail-accent)] transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={currentPath === '/app/dashboard'} 
            onClick={() => navigate('/app/dashboard')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={<Map />} 
            label="Interlocking" 
            active={currentPath === '/app/track'} 
            onClick={() => navigate('/app/track')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={<BrainCircuit />} 
            label="AI Optimization" 
            active={currentPath === '/app/ai'} 
            onClick={() => navigate('/app/ai')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={<Activity />} 
            label="Analytics" 
            active={currentPath === '/app/analytics'} 
            onClick={() => navigate('/app/analytics')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={<AlertTriangle />} 
            label="Disruptions" 
            active={currentPath === '/app/disruptions'} 
            onClick={() => navigate('/app/disruptions')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={<BookOpen />} 
            label="Signal Rules" 
            active={currentPath === '/app/rules'} 
            onClick={() => navigate('/app/rules')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={<Train />} 
            label="Live Trains" 
            active={currentPath === '/app/live'} 
            onClick={() => navigate('/app/live')}
            collapsed={!sidebarOpen}
          />
        </nav>

        <div className="p-3 border-t border-[var(--color-rail-border)]">
          <NavItem 
            icon={<Settings />} 
            label="Settings" 
            active={currentPath === '/app/settings'} 
            onClick={() => navigate('/app/settings')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={<LogOut />} 
            label="Logout" 
            active={false} 
            onClick={handleLogoutClick}
            collapsed={!sidebarOpen}
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--color-rail-border)] bg-[var(--color-rail-card)] z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-rail-text-muted)]" />
              <input 
                type="text" 
                placeholder="Search trains, stations..." 
                className="w-full bg-[var(--color-rail-bg)] border border-[var(--color-rail-border)] rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-rail-accent)] focus:ring-1 focus:ring-[var(--color-rail-accent)] transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-mono text-[var(--color-rail-text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-rail-accent)] animate-pulse"></span>
              System Live
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-[var(--color-rail-accent-muted)] text-[var(--color-rail-text-muted)] hover:text-[var(--color-rail-accent)] transition-colors"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--color-rail-danger)] border-2 border-[var(--color-rail-card)]"></span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl shadow-2xl overflow-hidden z-50 crystal-card"
                  >
                    <div className="p-3 border-b border-[var(--color-rail-border)] flex justify-between items-center bg-[var(--color-rail-bg)]">
                      <h3 className="font-bold text-white">Notifications</h3>
                      <span className="text-xs bg-[var(--color-rail-danger)] text-white px-2 py-0.5 rounded-full">{notifications.length} New</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-[var(--color-rail-text-muted)] text-sm">No active notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-3 border-b border-[var(--color-rail-border)] hover:bg-[var(--color-rail-bg)] transition-colors cursor-pointer" onClick={() => {navigate('/app/disruptions'); setShowNotifications(false);}}>
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={`h-5 w-5 mt-0.5 ${n.severity === 'high' ? 'text-[var(--color-rail-danger)]' : 'text-[var(--color-rail-warning)]'}`} />
                              <div>
                                <h4 className="text-sm font-bold text-white">{n.type}</h4>
                                <p className="text-xs text-[var(--color-rail-text-muted)] mt-1 line-clamp-2">{n.description}</p>
                                <span className="text-[10px] text-[var(--color-rail-text-muted)] mt-2 block">{new Date(n.reportedAt).toLocaleTimeString()} • {n.location}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-8 rounded-full bg-[var(--color-rail-border)] flex items-center justify-center border border-[var(--color-rail-accent)] text-sm font-medium">
              SM
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative">
          {/* Always mounted TrackDiagram */}
          <div 
            className="absolute inset-0 p-6 z-0" 
            style={{ 
              opacity: currentPath === '/app/track' && !isPageLoading ? 1 : 0, 
              pointerEvents: currentPath === '/app/track' && !isPageLoading ? 'auto' : 'none' 
            }}
          >
            <TrackDiagram />
          </div>

          <AnimatePresence mode="wait">
            {isPageLoading ? (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--color-rail-bg)]"
              >
                <div className="flex flex-col items-center">
                  <Train className="h-12 w-12 text-[var(--color-rail-accent)] animate-bounce mb-4" />
                  <div className="text-lg font-medium text-white animate-pulse">Loading Module...</div>
                </div>
              </motion.div>
            ) : currentPath !== '/app/track' ? (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-6 z-10 bg-[var(--color-rail-bg)] overflow-auto"
              >
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="ai" element={<AIOptimization />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="disruptions" element={<Disruptions />} />
                  <Route path="rules" element={<SignalRules />} />
                  <Route path="live" element={<LiveTrains />} />
                  <Route path="*" element={
                    <div className="flex h-full items-center justify-center text-[var(--color-rail-text-muted)]">
                      <div className="text-center">
                        <Train className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <h2 className="text-xl font-medium text-white mb-2">Module Under Construction</h2>
                        <p>This module is currently being developed.</p>
                      </div>
                    </div>
                  } />
                </Routes>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-rail-card)] border border-[var(--color-rail-border)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden crystal-card"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[var(--color-rail-danger)]/10 rounded-full">
                    <LogOut className="h-6 w-6 text-[var(--color-rail-danger)]" />
                  </div>
                  <button onClick={() => setShowLogoutModal(false)} className="text-[var(--color-rail-text-muted)] hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Confirm Logout</h3>
                <p className="text-[var(--color-rail-text-muted)] mb-6">Are you sure you want to log out of RailOptima? Your session will be terminated.</p>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowLogoutModal(false)}
                    className="px-4 py-2 rounded-md border border-[var(--color-rail-border)] text-[var(--color-rail-text)] hover:bg-[var(--color-rail-bg)] hover:text-white transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmLogout}
                    className="px-4 py-2 rounded-md bg-[var(--color-rail-danger)] hover:bg-[var(--color-rail-danger)]/80 text-white transition-colors font-bold"
                  >
                    Yes, Log Out
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-md transition-all ${
        active 
          ? 'bg-[var(--color-rail-accent-muted)] text-[var(--color-rail-accent)] border border-[var(--color-rail-accent)]/20' 
          : 'text-[var(--color-rail-text-muted)] hover:bg-[var(--color-rail-border)] hover:text-white'
      }`}
      title={collapsed ? label : undefined}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
    </button>
  );
}

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = localStorage.getItem('railoptima_auth') === 'true';
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route 
        path="/app/*" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
