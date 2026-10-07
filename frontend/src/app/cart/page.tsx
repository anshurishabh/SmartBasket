'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { 
  ArrowLeft, Plus, Minus, MapPin, 
  CreditCard, Banknote, QrCode, ShieldCheck, Sparkles, 
  BellOff, DoorOpen, PhoneOff, HeartHandshake 
} from 'lucide-react';

export default function DedicatedCartPage() {
  const router = useRouter();
  const { items, addToCart, removeFromCart, clearCart, totalPaise, itemCount } = useCart();

  const [token, setToken] = useState<string | null>(null);
  const [store, setStore] = useState<any | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const savedAddresses = [
    { id: '1', title: 'Home', line: 'Flat 402, Royal Residency, Vibhuti Khand, Gomti Nagar, Lucknow', tag: 'DEFAULT' },
    { id: '2', title: 'Work', line: 'Plot 18, Cyber Tower B, Vibhuti Khand, Lucknow', tag: 'OFFICE' },
    { id: '3', title: 'Other', line: 'House 12/B, Patrakarpuram Crossing, Gomti Nagar', tag: 'OTHER' },
  ];
  const [selectedAddressId, setSelectedAddressId] = useState('1');
  const [customAddress, setCustomAddress] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([]);
  const instructionOptions = [
    { id: 'nobell', label: 'Avoid doorbell', icon: BellOff },
    { id: 'door', label: 'Leave at the door', icon: DoorOpen },
    { id: 'guard', label: 'Leave with security guard', icon: ShieldCheck },
    { id: 'nocall', label: 'Do not call', icon: PhoneOff },
  ];

  const [riderTip, setRiderTip] = useState<number>(0);
  const tipOptions = [10, 20, 30, 50];

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');

  useEffect(() => {
    const t = localStorage.getItem('sb_customer_token') || localStorage.getItem('sb_token');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);

    fetch('http://localhost:5000/api/stores/nearest?lat=26.8525&lng=80.9995')
      .then((res) => res.json())
      .then((d) => setStore(d.data.store))
      .catch((e) => console.error(e));
  }, []);

  const toggleInstruction = (id: string) => {
    setSelectedInstructions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const itemTotalRupees = totalPaise / 100;
  const handlingFeeRupees = 4;
  const deliveryFeeRupees = itemTotalRupees >= 199 ? 0 : 25;
  const grandTotalRupees = itemTotalRupees + handlingFeeRupees + deliveryFeeRupees + riderTip;

  const currentAddressText =
    selectedAddressId === 'custom'
      ? customAddress || 'Custom Address'
      : savedAddresses.find((a) => a.id === selectedAddressId)?.line;

  const handleCheckoutAndPlaceOrder = async () => {
    if (!store || items.length === 0 || !token) return;
    try {
      setLoadingOrder(true);
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storeId: store._id,
          items: items.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
          idempotencyKey: `ord_${Date.now()}_${Math.random()}`,
          address: { addressLine: currentAddressText },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Checkout failed');

      // Save active order ID to persistent storage so OTP and Map load on Home screen
      localStorage.setItem('sb_active_order_id', data.order._id);
      clearCart();
      router.push('/');
    } catch (e: any) {
      alert(e.message || 'Order failed');
    } finally {
      setLoadingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-4xl mb-4">
          🛒
        </div>
        <h2 className="text-lg font-black">Your Cart is Empty</h2>
        <p className="text-xs text-slate-400 max-w-xs mt-1 mb-6">
          Add fresh groceries and daily essentials from the catalog to build your basket.
        </p>
        <Link
          href="/"
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl shadow-lg transition-all"
        >
          BROWSE CATALOG
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white max-w-lg mx-auto pb-36">
      <header className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 z-20 flex items-center gap-3">
        <Link href="/" className="p-2 hover:bg-slate-800 rounded-xl text-slate-300">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-sm font-black tracking-tight">Checkout Basket</h1>
          <p className="text-[11px] text-slate-400">
            {itemCount} items • Delivery in ~10 mins
          </p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* ADDRESS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5 tracking-wider">
              <MapPin className="w-4 h-4 text-rose-500" /> Delivery Address
            </span>
            <button
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="text-xs text-emerald-400 font-bold hover:underline"
            >
              {isEditingAddress ? 'Done' : 'Change'}
            </button>
          </div>

          {!isEditingAddress ? (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white">
                  {savedAddresses.find((a) => a.id === selectedAddressId)?.title || 'Custom Location'}
                </span>
                <span className="text-[9px] bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                  SELECTED
                </span>
              </div>
              <p className="text-xs text-slate-300">{currentAddressText}</p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => { setSelectedAddressId(addr.id); setIsEditingAddress(false); }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedAddressId === addr.id
                      ? 'bg-emerald-950/30 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{addr.title}</span>
                    <span className="text-[9px] uppercase font-mono text-slate-400">{addr.tag}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{addr.line}</p>
                </div>
              ))}

              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Or enter custom delivery address..."
                  value={customAddress}
                  onChange={(e) => {
                    setCustomAddress(e.target.value);
                    setSelectedAddressId('custom');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* ITEMS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Items in Cart</h2>
          <div className="divide-y divide-slate-800">
            {items.map(({ product, quantity }) => (
              <div key={product._id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{product.brand}</span>
                  <h3 className="text-xs font-bold text-white line-clamp-1">{product.name}</h3>
                  <span className="text-xs font-extrabold text-emerald-400 font-mono">
                    ₹{(product.pricePaise / 100).toFixed(0)}
                  </span>
                </div>

                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 gap-2">
                  <button onClick={() => removeFromCart(product._id)} className="text-slate-400 hover:text-white">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black px-1.5">{quantity}</span>
                  <button onClick={() => addToCart(product)} className="text-emerald-400 hover:text-emerald-300">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-xs font-black text-white font-mono w-14 text-right">
                  ₹{((product.pricePaise * quantity) / 100).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* INSTRUCTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Delivery Instructions</h2>
          <div className="grid grid-cols-2 gap-2">
            {instructionOptions.map(({ id, label, icon: Icon }) => {
              const active = selectedInstructions.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleInstruction(id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-semibold line-clamp-1">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TIP */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-pink-400" /> Delivery Partner Tip
            </span>
            {riderTip > 0 && (
              <button onClick={() => setRiderTip(0)} className="text-[11px] text-rose-400 font-bold hover:underline">
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mb-3">100% of your tip goes directly to your delivery partner.</p>
          <div className="flex gap-2">
            {tipOptions.map((amount) => (
              <button
                key={amount}
                onClick={() => setRiderTip(amount === riderTip ? 0 : amount)}
                className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                  riderTip === amount
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                ₹{amount}
              </button>
            ))}
          </div>
        </div>

        {/* PAYMENT METHODS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Select Payment Method</h2>
          <div className="space-y-2">
            <label
              onClick={() => setPaymentMethod('upi')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paymentMethod === 'upi' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">UPI (Google Pay / PhonePe / Paytm)</h4>
                  <p className="text-[10px] text-slate-400">Instant approval & zero fees</p>
                </div>
              </div>
              <input type="radio" checked={paymentMethod === 'upi'} onChange={() => {}} className="accent-emerald-500" />
            </label>

            <label
              onClick={() => setPaymentMethod('card')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paymentMethod === 'card' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Credit / Debit Card / NetBanking</h4>
                  <p className="text-[10px] text-slate-400">Visa, Mastercard, RuPay</p>
                </div>
              </div>
              <input type="radio" checked={paymentMethod === 'card'} onChange={() => {}} className="accent-emerald-500" />
            </label>

            <label
              onClick={() => setPaymentMethod('cod')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paymentMethod === 'cod' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Banknote className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Cash / Pay on Delivery</h4>
                  <p className="text-[10px] text-slate-400">Pay cash or UPI scan when rider arrives</p>
                </div>
              </div>
              <input type="radio" checked={paymentMethod === 'cod'} onChange={() => {}} className="accent-emerald-500" />
            </label>
          </div>
        </div>

        {/* BILL BREAKDOWN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Bill Summary</h2>

          <div className="flex justify-between text-xs text-slate-300">
            <span>Item Total</span>
            <span className="font-mono">₹{itemTotalRupees.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-xs text-slate-300">
            <span>Handling Charge</span>
            <span className="font-mono">₹{handlingFeeRupees.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-xs text-slate-300">
            <span>Delivery Fee</span>
            {deliveryFeeRupees === 0 ? (
              <span className="font-bold text-emerald-400">FREE</span>
            ) : (
              <span className="font-mono">₹{deliveryFeeRupees.toFixed(2)}</span>
            )}
          </div>

          {riderTip > 0 && (
            <div className="flex justify-between text-xs text-pink-300">
              <span>Delivery Partner Tip</span>
              <span className="font-mono">₹{riderTip.toFixed(2)}</span>
            </div>
          )}

          {itemTotalRupees < 199 && (
            <div className="text-[10px] bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-2 rounded-xl flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Add ₹{(199 - itemTotalRupees).toFixed(0)} more items for <strong>FREE Delivery</strong>!
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
            <span className="font-black text-white">Grand Total</span>
            <span className="font-black text-emerald-400 text-base font-mono">
              ₹{grandTotalRupees.toFixed(2)}
            </span>
          </div>
        </div>
      </main>

      {/* STICKY CHECKOUT BAR */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-slate-900 border-t border-slate-800 p-4 shadow-2xl flex items-center justify-between z-30">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">TO PAY</span>
          <span className="text-lg font-black text-white font-mono">₹{grandTotalRupees.toFixed(2)}</span>
        </div>

        <button
          onClick={handleCheckoutAndPlaceOrder}
          disabled={loadingOrder}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 transition-all"
        >
          {loadingOrder ? (
            'Processing...'
          ) : (
            <>
              <span>Place Order</span>
              <span className="text-xs bg-emerald-600 px-2 py-0.5 rounded-lg">
                {paymentMethod.toUpperCase()}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
