import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Train, Lock, User } from 'lucide-react';

export default function Login() {
  const [stationId, setStationId] = useState('');
  const [password, setPassword] = useState('');
  // const [error, setError] = useState('');
  const navigate = useNavigate();

  // const handleLogin = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   try {
  //     const res = await fetch('/api/auth/login', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ stationId, password })
  //     });
      
  //     if (res.ok) {
  //       localStorage.setItem('railoptima_auth', 'true');
  //       navigate('/app/dashboard');
  //     } else {
  //       setError('Invalid Station ID or Password');
  //     }
  //   } catch (err) {
  //     setError('Connection error. Please try again.');
  //   }
  // };

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  // Store dummy auth
  localStorage.setItem("railoptima_auth", "true");
  localStorage.setItem("stationId", stationId || "SM-0001");
  localStorage.setItem("stationName", "Demo Station Master");

  // Go directly to dashboard
  navigate("/app/dashboard");
};

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 mb-6">
          <Train className="h-10 w-10 text-[var(--color-rail-accent)]" />
          <span className="text-3xl font-bold tracking-tight text-white">RailOptima</span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          Station Master Login
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--color-rail-card)] py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-[var(--color-rail-border)] crystal-card">
          <form className="space-y-6" onSubmit={handleLogin}>
            {/* {error && (
              <div className="p-3 bg-[var(--color-rail-danger)]/10 border border-[var(--color-rail-danger)]/50 rounded text-[var(--color-rail-danger)] text-sm text-center">
                {error}
              </div>
            )}
             */}
            <div>
              <label htmlFor="stationId" className="block text-sm font-medium text-[var(--color-rail-text-muted)]">
                Station ID / Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[var(--color-rail-text-muted)]" />
                </div>
                <input
                  id="stationId"
                  type="text"
                  required
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="block w-full pl-10 bg-[var(--color-rail-bg)] border border-[var(--color-rail-border)] rounded-md py-2 text-white focus:ring-[var(--color-rail-accent)] focus:border-[var(--color-rail-accent)] sm:text-sm"
                  placeholder="e.g. SM-7042"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-rail-text-muted)]">
                Access Code / Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--color-rail-text-muted)]" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 bg-[var(--color-rail-bg)] border border-[var(--color-rail-border)] rounded-md py-2 text-white focus:ring-[var(--color-rail-accent)] focus:border-[var(--color-rail-accent)] sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[var(--color-rail-accent)] focus:ring-[var(--color-rail-accent)] border-[var(--color-rail-border)] rounded bg-[var(--color-rail-bg)]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--color-rail-text-muted)]">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-[var(--color-rail-accent)] hover:text-[var(--color-rail-accent-hover)]">
                  Forgot code?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-black bg-[var(--color-rail-accent)] hover:bg-[var(--color-rail-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-rail-accent)] focus:ring-offset-[var(--color-rail-bg)] transition-colors"
              >
                Authenticate
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-rail-border)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[var(--color-rail-card)] text-[var(--color-rail-text-muted)]">
                  New Station Master?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/signup" className="font-medium text-[var(--color-rail-accent)] hover:text-[var(--color-rail-accent-hover)]">
                Register for access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
