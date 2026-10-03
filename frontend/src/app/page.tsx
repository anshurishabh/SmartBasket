'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  ShoppingBag, Plus, Minus, Clock, CheckCircle2, 
  Sparkles, Bike, Phone, MapPin, Building2, LogOut, User 
} from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CustomerStorefront() {
  const router = useRouter();
  const [store, setStore] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  const { items, addToCart, removeFromCart, clearCart, totalPaise, itemCount } = useCart();
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [cancelCountdown, setCancelCountdown] = useState<number>(0);
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('sb_user');
    const storedToken = localStorage.getItem('sb_token');
    if (!storedUser || !storedToken) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));

    const socket: Socket = io('http://localhost:5000');

    fetch('http://localhost:5000/api/stores/nearest?lat=26.8525&lng=80.9995')
      .then((res) => res.json())
      .then((data) => {
        const s = data.data.store;
        setStore(s);
        reloadProducts(s._id);
        socket.emit('join_store_room', s._id);
      })
      .finally(() => setLoading(false));

    socket.on('stock_updated', () => {
      if (store) reloadProducts(store._id);
    });

    socket.on('status_changed', ({ orderId, status, order }) => {
      setActiveOrder((prev: any) => {
        if (prev?._id === orderId) {
          return order ? { ...order, token: prev.token } : { ...prev, status };
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function reloadProducts(sId: string) {
    const res = await fetch(`http://localhost:5000/api/products/store/${sId}`);
    const data = await res.json();
    setProducts(data.data || []);
  }

  useEffect(() => {
    if (!store || items.length === 0) {
      setRecommendations([]);
      return;
    }
    fetch('http://localhost:5000/api/recommendations/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: store._id, productIds: items.map((i) => i.product._id) }),
    })
      .then((res) => res.json())
      .then((data) => setRecommendations(data.recommendations || []))
      .catch((err) => console.error(err));
  }, [items, store]);

  useEffect(() => {
    if (!activeOrder || cancelCountdown <= 0) return;
    const timer = setInterval(() => setCancelCountdown((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(timer);
  }, [activeOrder, cancelCountdown]);

  const handlePlaceOrder = async () => {
    const token = localStorage.getItem('sb_token');
    if (!store || items.length === 0 || !token) return;
    try {
      setOrderLoading(true);
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storeId: store._id,
          items: items.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
          idempotencyKey: `ord_${Date.now()}_${Math.random()}`,
          address: { addressLine: 'Flat 402, Royal Residency, Gomti Nagar, Lucknow' },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order failed');

      setActiveOrder({ ...data.order, token });
      setCancelCountdown(10);
      clearCart();
      reloadProducts(store._id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    try {
      await fetch(`http://localhost:5000/api/orders/${activeOrder._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeOrder.token}` },
      });
      alert('Order cancelled! 100% refund credited.');
      setActiveOrder(null);
      setCancelCountdown(0);
      if (store) reloadProducts(store._id);
    } catch (e) {
      alert('Failed to cancel');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Connecting to Store...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col max-w-md mx-auto shadow-2xl">
      <header className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 z-20 flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-emerald-400">SmartBasket</h1>
          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{store?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-200 block">{user?.name}</span>
            <span className="text-[9px] text-slate-400 font-mono">{user?.phone}</span>
          </div>
          <button onClick={handleLogout} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto pb-32">
        {activeOrder && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Status: {activeOrder.status}
              </span>
              <span className="text-xs font-mono font-black bg-emerald-950 border border-emerald-700 px-2.5 py-1 rounded text-emerald-300">
                OTP: {activeOrder.deliveryOtp}
              </span>
            </div>

            {activeOrder.riderDetails?.name && (
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" /> Assigned Delivery Partner
                  </span>
                  <h4 className="text-xs font-bold text-white mt-0.5">{activeOrder.riderDetails.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Bike: {activeOrder.riderDetails.vehicleNo}</p>
                </div>
                <a
                  href={`tel:${activeOrder.riderDetails.phone}`}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Rider
                </a>
              </div>
            )}

            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <p><Building2 className="w-3 h-3 inline mr-1 text-blue-400" /> <strong>Pickup Facility:</strong> {activeOrder.storeDetails?.name}</p>
              <p><MapPin className="w-3 h-3 inline mr-1 text-rose-400" /> <strong>Delivery To:</strong> {activeOrder.customerDetails?.deliveryAddress}</p>
            </div>

            {cancelCountdown > 0 && (
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-xs text-amber-400 font-bold">{cancelCountdown}s cancel window</span>
                <button
                  onClick={handleCancelOrder}
                  className="bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-bold px-3 py-1 rounded"
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        )}

        <h2 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">Daily Essentials</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {products.map((p) => {
            const inCart = items.find((i) => i.product._id === p._id);
            return (
              <div key={p._id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{p.brand}</span>
                  <h3 className="text-xs font-bold text-white line-clamp-1 mt-0.5">{p.name}</h3>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400">₹{(p.pricePaise / 100).toFixed(0)}</span>
                  {p.isOutOfStock ? (
                    <span className="text-[9px] font-bold bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Sold Out</span>
                  ) : inCart ? (
                    <div className="flex items-center bg-emerald-600 rounded-lg px-1.5 py-0.5 text-white text-xs font-bold">
                      <button onClick={() => removeFromCart(p._id)} className="p-0.5"><Minus className="w-3 h-3" /></button>
                      <span className="px-2">{inCart.quantity}</span>
                      <button onClick={() => addToCart(p)} className="p-0.5"><Plus className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(p)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-lg"
                    >
                      + ADD
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {recommendations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase text-slate-300">Forgot something?</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {recommendations.map((rec) => (
                <div key={rec._id} className="min-w-[130px] p-2.5 rounded-xl bg-slate-900 border border-emerald-900/50 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-white line-clamp-1">{rec.name}</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">₹{(rec.pricePaise / 100).toFixed(0)}</span>
                    <button
                      onClick={() => addToCart(rec)}
                      className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded"
                    >
                      + ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {itemCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-emerald-500 text-slate-950 p-3 rounded-2xl shadow-2xl flex items-center justify-between z-30">
          <div>
            <p className="text-[11px] font-bold text-emerald-950">{itemCount} items</p>
            <p className="text-sm font-black">₹{(totalPaise / 100).toFixed(2)}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={orderLoading}
            className="bg-slate-950 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow"
          >
            {orderLoading ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}
