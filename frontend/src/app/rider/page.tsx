'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { 
  Bike, Navigation, MapPin, Building2, Phone, 
  ShieldCheck, CheckCircle2, User, LogOut 
} from 'lucide-react';

export default function RiderPartnerApp() {
  const router = useRouter();
  const [offer, setOffer] = useState<any | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<any | null>(null);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);
  const [rider, setRider] = useState<any | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('sb_user');
    const token = localStorage.getItem('sb_token');
    if (!storedUser || !token) {
      router.push('/login');
      return;
    }
    setRider(JSON.parse(storedUser));

    const socket = io('http://localhost:5000');

    socket.on('rider_offer', (order) => {
      if (!activeDelivery) setOffer(order);
    });

    return () => {
      socket.disconnect();
    };
  }, [activeDelivery]);

  const handleAcceptOffer = async () => {
    if (!offer) return;
    const token = localStorage.getItem('sb_token');
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${offer._id}/accept-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setActiveDelivery({ ...data.order, token });
      setOffer(null);
    } catch (e) {
      alert('Failed to accept delivery offer');
    }
  };

  const handleVerifyOtp = async () => {
    if (!activeDelivery || !otpInput) return;
    setOtpError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${activeDelivery._id}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeDelivery.token}` },
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
      setOtpError('Failed to confirm OTP');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white max-w-md mx-auto p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bike className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-sm font-black">{rider?.name}</h1>
              <p className="text-[10px] text-amber-400 font-mono">Bike: {rider?.vehicleNo || 'UP-32-SB-2026'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {offer && !activeDelivery && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-500 shadow-2xl animate-pulse">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">New Order Ready for Pickup!</span>
            <h2 className="text-base font-black mt-1">₹50 Earning • 10-Min Target</h2>
            <div className="my-3 space-y-1 text-xs text-slate-300">
              <p><Building2 className="w-3.5 h-3.5 inline mr-1 text-blue-400" /> <strong>Pickup:</strong> {offer.storeDetails?.name}</p>
              <p><MapPin className="w-3.5 h-3.5 inline mr-1 text-rose-400" /> <strong>Drop:</strong> {offer.customerDetails?.deliveryAddress}</p>
            </div>
            <button
              onClick={handleAcceptOffer}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2.5 rounded-xl text-xs"
            >
              ACCEPT DELIVERY OFFER
            </button>
          </div>
        )}

        {activeDelivery && (
          <div className="mt-5 space-y-4">
            {/* Customer Contact Box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Customer & Delivery Details
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeDelivery.customerDetails?.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{activeDelivery.customerDetails?.phone}</p>
                </div>
                <a
                  href={`tel:${activeDelivery.customerDetails?.phone}`}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Customer
                </a>
              </div>
              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-rose-400" />
                {activeDelivery.customerDetails?.deliveryAddress}
              </p>
            </div>

            {/* Store Contact Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Store Dispatch Information
              </span>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{activeDelivery.storeDetails?.name}</p>
                  <p className="text-slate-400 text-[11px]">{activeDelivery.storeDetails?.addressLine}</p>
                </div>
                <a
                  href={`tel:${activeDelivery.storeDetails?.phone}`}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" /> Store
                </a>
              </div>
            </div>

            {/* OTP Verification */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold">Ask Customer for 4-Digit OTP</h4>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Customer screen par display ho raha code enter karein.</p>

              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="4-digit OTP"
                className="w-full bg-slate-950 text-center tracking-widest text-2xl font-black font-mono py-2.5 rounded-xl border border-slate-700 text-emerald-400 focus:outline-none focus:border-emerald-500"
              />

              {otpError && <p className="text-xs text-rose-400 mt-1">{otpError}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={otpInput.length < 4}
                className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-2.5 rounded-xl text-xs"
              >
                CONFIRM & COMPLETE DELIVERY
              </button>
            </div>
          </div>
        )}

        {delivered && (
          <div className="mt-8 text-center p-6 bg-emerald-950/40 border border-emerald-700 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-base font-black">Delivery Completed!</h3>
            <p className="text-xs text-slate-400 mt-1">₹50 credited. Inventory updated.</p>
            <button
              onClick={() => setDelivered(false)}
              className="mt-4 bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-xl"
            >
              Look for Next Order
            </button>
          </div>
        )}

        {!offer && !activeDelivery && !delivered && (
          <div className="mt-24 text-center text-slate-600 text-xs">
            <Bike className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Waiting for store orders to become ready for pickup...
          </div>
        )}
      </div>
    </div>
  );
}
