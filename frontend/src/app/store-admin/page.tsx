'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { 
  Building2, Package, Plus, Minus, Save, RefreshCw, 
  MapPin, Phone, LogOut, CheckCircle2, ShoppingBag, Bike, User, Clock
} from 'lucide-react';

export default function StoreAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'settings'>('orders');
  const [store, setStore] = useState<any | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('23:30');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Product state
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Daily Essentials');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('50');

  const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();

    const socket = io('http://localhost:5000');
    const storeData = localStorage.getItem('sb_store');
    if (storeData) {
      const parsed = JSON.parse(storeData);
      socket.emit('join_store_room', parsed.id);

      socket.on('new_order', (newOrder) => {
        setOrders((prev) => [newOrder, ...prev]);
      });

      socket.on('store_order_updated', (updated) => {
        setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      });

      socket.on('stock_updated', () => {
        loadInventory(parsed.id);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const resProfile = await fetch('http://localhost:5000/api/store-admin/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataProfile = await resProfile.json();
      if (!resProfile.ok) throw new Error(dataProfile.message);

      setStore(dataProfile.store);
      setName(dataProfile.store.name);
      setPhone(dataProfile.store.phone);
      setAddressLine(dataProfile.store.addressLine);
      setOpenTime(dataProfile.store.openTime);
      setCloseTime(dataProfile.store.closeTime);

      await Promise.all([
        loadInventory(dataProfile.store._id),
        loadOrders(dataProfile.store._id),
      ]);
    } catch (e) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function loadInventory(sId: string) {
    const res = await fetch('http://localhost:5000/api/store-admin/inventory', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setInventory(data.inventory || []);
  }

  async function loadOrders(sId: string) {
    const res = await fetch(`http://localhost:5000/api/orders/store/${sId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setOrders(data.orders || []);
  }

  async function handleUpdateOrderStatus(orderId: string, nextStatus: string) {
    await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: nextStatus, actor: 'store_admin' }),
    });
    if (store?._id) loadOrders(store._id);
  }

  async function handleUpdateStock(productId: string, currentStock: number, delta: number) {
    const newStock = Math.max(0, currentStock + delta);
    const res = await fetch('http://localhost:5000/api/store-admin/inventory/stock', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId, newStock }),
    });
    if (res.ok) {
      setInventory((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, stock: newStock, available: newStock - i.reserved } : i))
      );
    }
  }

  async function handleAddNewProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/store-admin/inventory/new-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newProdName,
        brand: newProdBrand,
        category: newProdCategory,
        pricePaise: Number(newProdPrice) * 100,
        stock: Number(newProdStock),
      }),
    });
    if (res.ok) {
      alert('Product created and stocked!');
      setNewProdName('');
      setNewProdBrand('');
      setNewProdPrice('');
      if (store?._id) loadInventory(store._id);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/store-admin/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, phone, addressLine, openTime, closeTime }),
    });
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Store Admin...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
            {store?.storeCode?.slice(-2) || 'ST'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black">{store?.name}</h1>
              <span className="bg-blue-950 border border-blue-700 text-blue-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                Store ID: {store?.storeCode}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{store?.addressLine} • 📞 {store?.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold px-4 py-2.5 rounded-xl"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Live Orders Queue ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> Catalog & Stock ({inventory.length} SKUs)
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Store Details & Hours
        </button>
      </div>

      {/* TAB 1: LIVE ORDERS QUEUE */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-24 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <h3 className="text-sm font-bold text-slate-400">No active orders right now</h3>
              <p className="text-xs mt-1">Place an order from customer account to test live packing lifecycle.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((ord) => (
                <div key={ord._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{ord._id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        ord.status === 'PLACED' ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse' :
                        ord.status === 'PACKING' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        ord.status === 'READY_FOR_PICKUP' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        ord.status === 'OUT_FOR_DELIVERY' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                        ord.status === 'DELIVERED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {ord.status}
                      </span>
                    </div>

                    {/* Customer Info Card */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-400" /> Customer Details
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{ord.customerDetails?.name || 'Customer'}</span>
                        <a href={`tel:${ord.customerDetails?.phone}`} className="text-emerald-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {ord.customerDetails?.phone}
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-start gap-1 pt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                        {ord.customerDetails?.deliveryAddress}
                      </p>
                    </div>

                    {/* Assigned Rider Info Card */}
                    {ord.riderDetails?.name && (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30 mb-3 text-xs">
                        <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                          <Bike className="w-3 h-3" /> Delivery Partner
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-white">{ord.riderDetails.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Bike: {ord.riderDetails.vehicleNo}</span>
                        </div>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="border-t border-b border-slate-800/60 py-2.5 my-2 space-y-1 text-xs">
                      {ord.items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-300">
                          <span><strong>{it.quantity}x</strong> {it.name}</span>
                          <span className="font-mono">₹{(it.pricePaise / 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Price */}
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Bill</span>
                      <span className="text-sm font-black text-white">₹{(ord.totalPaise / 100).toFixed(2)}</span>
                    </div>

                    {ord.status === 'PLACED' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord._id, 'PACKING')}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg"
                      >
                        Start Packing
                      </button>
                    )}

                    {ord.status === 'PACKING' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord._id, 'READY_FOR_PICKUP')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow-lg"
                      >
                        Ready for Pickup
                      </button>
                    )}

                    {ord.status === 'READY_FOR_PICKUP' && (
                      <span className="text-xs text-purple-400 font-semibold italic">Waiting for Rider...</span>
                    )}

                    {ord.status === 'OUT_FOR_DELIVERY' && (
                      <span className="text-xs text-indigo-400 font-semibold italic">Rider in transit...</span>
                    )}

                    {ord.status === 'DELIVERED' && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVENTORY & STOCK */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit shadow-xl">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
              <Package className="w-4 h-4" /> Add New Item to Catalog
            </h3>
            <form onSubmit={handleAddNewProduct} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Product Name (e.g. Organic Milk 1L)"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Brand (e.g. Amul)"
                  value={newProdBrand}
                  onChange={(e) => setNewProdBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  required
                  placeholder="Price in ₹"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <input
                type="number"
                required
                placeholder="Initial Stock Units"
                value={newProdStock}
                onChange={(e) => setNewProdStock(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-lg"
              >
                + Add Product & Stock
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-white mb-4">Live Inventory Items</h3>
            <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Price</th>
                    <th className="p-3 text-center">In Stock</th>
                    <th className="p-3 text-center">Available</th>
                    <th className="p-3 text-right">Quick Stock Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {inventory.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <span className="font-bold text-white block">{item.name}</span>
                        <span className="text-[10px] text-slate-400">{item.brand} • {item.category}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        ₹{(item.pricePaise / 100).toFixed(0)}
                      </td>
                      <td className="p-3 text-center font-bold text-white">{item.stock}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-black text-xs ${
                          item.available > 5 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {item.available}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateStock(item.productId, item.stock, -5)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-[11px] font-bold"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleUpdateStock(item.productId, item.stock, 5)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-[11px] font-bold text-emerald-400"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleUpdateStock(item.productId, item.stock, 25)}
                            className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 px-2.5 py-1 rounded text-[11px] font-black text-emerald-300"
                          >
                            +25
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STORE CONFIGURATION & HOURS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Store Configurations
          </h2>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Store details updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">Dark Store Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">Contact Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase">Fulfillment Facility Address</label>
              <textarea
                rows={2}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Opening Time</label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Closing Time</label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs mt-1"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg mt-2 flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
