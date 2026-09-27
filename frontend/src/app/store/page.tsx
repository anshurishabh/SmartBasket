'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Package, Clock, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';

export default function StoreDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string>('');

  useEffect(() => {
    // Connect to Gomti Nagar Dark Store
    fetch('http://localhost:5000/api/stores/nearest?lat=26.8525&lng=80.9995')
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.store?._id) {
          const sId = data.data.store._id;
          setStoreId(sId);
          loadOrders(sId);

          const socket = io('http://localhost:5000');
          socket.emit('join_store_room', sId);

          socket.on('new_order', (newOrder) => {
            setOrders((prev) => [newOrder, ...prev]);
          });

          socket.on('store_order_updated', (updated) => {
            setOrders((prev) =>
              prev.map((o) => (o._id === updated._id ? updated : o))
            );
          });

          return () => {
            socket.disconnect();
          };
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function loadOrders(sId: string) {
    try {
      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'store@smartbasket.com', password: 'password123' }),
      });
      const loginData = await loginRes.json();
      const token = loginData.token;

      const res = await fetch(`http://localhost:5000/api/orders/store/${sId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (e) {
      console.error(e);
    }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'store@smartbasket.com', password: 'password123' }),
    });
    const { token } = await loginRes.json();

    await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus, actor: 'store_staff' }),
    });

    if (storeId) loadOrders(storeId);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-xl mx-auto font-sans">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-4">
        <div>
          <h1 className="text-lg font-black text-slate-900">Dark Store Queue</h1>
          <p className="text-xs text-slate-500 font-medium">Gomti Nagar Fulfillment Center</p>
        </div>
        <button
          onClick={() => storeId && loadOrders(storeId)}
          className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200"
        >
          <RefreshCw className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order._id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-500">
                #{order._id.slice(-6).toUpperCase()}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  order.status === 'PLACED'
                    ? 'bg-amber-100 text-amber-800'
                    : order.status === 'PACKING'
                    ? 'bg-blue-100 text-blue-800'
                    : order.status === 'READY_FOR_PICKUP'
                    ? 'bg-purple-100 text-purple-800'
                    : order.status === 'DELIVERED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {order.status}
              </span>
            </div>

            <div className="border-t border-b border-slate-100 py-2.5 my-2 space-y-1">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs text-slate-700">
                  <span>
                    <strong className="text-slate-900">{item.quantity}x</strong> {item.name}
                  </span>
                  <span className="font-semibold">₹{(item.pricePaise / 100).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-900">
                Total: ₹{(order.totalPaise / 100).toFixed(0)}
              </span>

              {order.status === 'PLACED' && (
                <button
                  onClick={() => updateStatus(order._id, 'PACKING')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm"
                >
                  Start Packing
                </button>
              )}

              {order.status === 'PACKING' && (
                <button
                  onClick={() => updateStatus(order._id, 'READY_FOR_PICKUP')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm"
                >
                  Ready for Pickup
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
