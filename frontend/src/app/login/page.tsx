'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Bike, Building2, Lock, Mail, Phone, User, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'customer' | 'rider' | 'store'>('customer');
  const [isSignup, setIsSignup] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [storeCode, setStoreCode] = useState('STORE_LKO_01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tab === 'store') {
        // Store Admin Login
        const res = await fetch('http://localhost:5000/api/auth/store-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeCode, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Store login failed');

        localStorage.setItem('sb_token', data.token);
        localStorage.setItem('sb_role', 'store_admin');
        localStorage.setItem('sb_store', JSON.stringify(data.store));
        router.push('/store-admin');
      } else {
        // Customer / Rider Login or Signup
        const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
        const payload = isSignup
          ? { name, email, password, phone, role: tab, vehicleNo }
          : { email, password };

        const res = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Authentication failed');

        localStorage.setItem('sb_token', data.token);
        localStorage.setItem('sb_role', data.user.role);
        localStorage.setItem('sb_user', JSON.stringify(data.user));

        if (data.user.role === 'rider') router.push('/rider');
        else router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center font-black text-slate-950 text-xl shadow-lg">
            SB
          </div>
          <h1 className="text-xl font-black text-white mt-3">SmartBasket Portal Login</h1>
          <p className="text-xs text-slate-400">Choose your role to access dashboard</p>
        </div>

        {/* 3 Role Selection Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('customer'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'customer' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Customer
          </button>
          <button
            type="button"
            onClick={() => { setTab('rider'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'rider' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" /> Rider
          </button>
          <button
            type="button"
            onClick={() => { setTab('store'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'store' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Store Admin
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'store' ? (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Specific Store ID</label>
                <div className="relative mt-1">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    placeholder="e.g. STORE_LKO_01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Store Master Password</label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Store password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {isSignup && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Full Name</label>
                    <div className="relative mt-1">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Phone Number</label>
                    <div className="relative mt-1">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  {tab === 'rider' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Vehicle Number</label>
                      <input
                        type="text"
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        placeholder="UP-32-AB-1234"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 mt-1"
                      />
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Email Address</label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={tab === 'rider' ? 'rider@smartbasket.com' : 'customer@smartbasket.com'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Password</label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-black text-xs py-3 rounded-xl mt-4 shadow-lg transition-all ${
              tab === 'store'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : tab === 'rider'
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {loading ? 'Authenticating...' : tab === 'store' ? 'ENTER STORE ADMIN' : isSignup ? 'CREATE ACCOUNT' : 'LOG IN'}
          </button>
        </form>

        {tab !== 'store' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
