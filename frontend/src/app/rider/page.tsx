'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Navigation, Bike, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

export default function RiderApp() {
  const [offer, setOffer] = useState<any | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<any | null>(null);
  const [etaSec, setEtaSec] = useState<number>(180); // 3 minutes simulated ETA
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('rider_offer', (order) => {
      if (!activeDelivery) {
        setOffer(order);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeDelivery]);

  // ETA Countdown simulation
  useEffect(() => {
    if (!activeDelivery || etaSec <= 0) return;
    const interval = setInterval(() => {
      setEtaSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeDelivery, etaSec]);

  async function acceptOffer() {
    if (!offer) return;
    try {
      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rider@smartbasket.com', password: 'password123' }),
      });
      const { token } = await loginRes.json();

      await fetch(`http://localhost:5000/api/orders/${offer._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'OUT_FOR_DELIVERY', actor: 'rider' }),
      });

      setActiveDelivery({ ...offer, token });
      setOffer(null);
    } catch (e) {
      console.error(e);
    }
  }

  async function verifyOtpAndComplete() {
    if (!activeDelivery || !otpInput) return;
    setOtpError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/orders/${activeDelivery._id}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeDelivery.token}`,
        },
        body: JSON.stringify({ otp: otpInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.message || 'Invalid OTP');
        return;
      }

      setDelivered(true);
      setActiveDelivery(null);
      setOtpInput('');
    } catch (e) {
      setOtpError('Failed to verify OTP');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 max-w-md mx-auto font-sans flex flex-col justify-between">
      {/* Top Rider Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bike className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-base font-black tracking-tight">SmartBasket Partner</h1>
              <p className="text-xs text-emerald-400 font-medium">● Online • Gomti Nagar</p>
            </div>
          </div>
        </div>

        {/* Incoming Delivery Offer Modal */}
        {offer && !activeDelivery && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-800 border-2 border-emerald-500 shadow-2xl animate-pulse">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              New Delivery Offer
            </span>
            <h2 className="text-lg font-black mt-1">₹50 Earning • 1.8 km</h2>
            <p className="text-xs text-slate-400 mt-1">
              Pickup: Gomti Nagar Dark Store <br />
              Drop: {offer.address?.addressLine}
            </p>
            <button
              onClick={acceptOffer}
              className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-sm"
            >
              ACCEPT DELIVERY OFFER
            </button>
          </div>
        )}

        {/* Active Delivery Screen */}
        {activeDelivery && (
          <div className="mt-4 space-y-4">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>SIMULATED GPS NAVIGATION</span>
                <span className="text-emerald-400 font-bold">{Math.floor(etaSec / 60)}m {etaSec % 60}s ETA</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Navigation className="w-5 h-5 text-emerald-400 animate-spin" />
                <span>Navigating to Customer Address</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-rose-400" />
                {activeDelivery.address?.addressLine}
              </p>
            </div>

            {/* OTP Verification Box */}
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">Customer Delivery OTP</h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Ask customer for the 4-digit code shown on their order screen.
              </p>

              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="4-digit OTP"
                className="w-full bg-slate-900 text-center tracking-widest text-2xl font-black py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 text-emerald-400"
              />

              {otpError && <p className="text-xs text-rose-400 mt-2 font-medium">{otpError}</p>}

              <button
                onClick={verifyOtpAndComplete}
                disabled={otpInput.length < 4}
                className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-sm"
              >
                CONFIRM DELIVERY
              </button>
            </div>
          </div>
        )}

        {/* Delivered Success State */}
        {delivered && (
          <div className="mt-8 text-center p-6 bg-emerald-950/40 border border-emerald-800 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h2 className="text-lg font-black text-white">Order Delivered!</h2>
            <p className="text-xs text-slate-400 mt-1">₹50 credited to your partner wallet.</p>
            <button
              onClick={() => setDelivered(false)}
              className="mt-4 bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-xl text-white"
            >
              Back Online
            </button>
          </div>
        )}

        {!offer && !activeDelivery && !delivered && (
          <div className="mt-20 text-center text-slate-600">
            <Bike className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Waiting for incoming delivery offers...</p>
          </div>
        )}
      </div>
    </div>
  );
}
