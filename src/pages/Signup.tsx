import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Train, Lock, User, BadgeCheck } from 'lucide-react';

export default function Signup() {
  const [stationId, setStationId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, name, password })
      });
      
      if (res.ok) {
        localStorage.setItem('railoptima_auth', 'true');
        navigate('/app/dashboard');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 mb-6">
          <Train className="h-10 w-10 text-[var(--color-rail-accent)]" />
          <span className="text-3xl font-bold tracking-tight text-white">RailOptima</span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          Register Station Master
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--color-rail-card)] py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-[var(--color-rail-border)] crystal-card">
          <form className="space-y-6" onSubmit={handleSignup}>
            {error && (
              <div className="p-3 bg-[var(--color-rail-danger)]/10 border border-[var(--color-rail-danger)]/50 rounded text-[var(--color-rail-danger)] text-sm text-center">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--color-rail-text-muted)]">
                Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BadgeCheck className="h-5 w-5 text-[var(--color-rail-text-muted)]" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 bg-[var(--color-rail-bg)] border border-[var(--color-rail-border)] rounded-md py-2 text-white focus:ring-[var(--color-rail-accent)] focus:border-[var(--color-rail-accent)] sm:text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="stationId" className="block text-sm font-medium text-[var(--color-rail-text-muted)]">
                Requested Station ID
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

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-black bg-[var(--color-rail-accent)] hover:bg-[var(--color-rail-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-rail-accent)] focus:ring-offset-[var(--color-rail-bg)] transition-colors"
              >
                Register & Authenticate
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
                  Already registered?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/login" className="font-medium text-[var(--color-rail-accent)] hover:text-[var(--color-rail-accent-hover)]">
                Login to your account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
