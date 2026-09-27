'use client';

import { useEffect, useState } from 'react';
import { fetchNearestStore, fetchStoreProducts, createOrder, cancelOrder, Product, Store, StoreStatus } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { Plus, Minus, AlertCircle, Clock, CheckCircle2, Sparkles, CreditCard } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function HomePage() {
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [orderLoading, setOrderLoading] = useState(false);

  const { items, addToCart, removeFromCart, clearCart, totalPaise, itemCount } = useCart();

  useEffect(() => {
    const lat = 26.8525;
    const lng = 80.9995;

    async function initialize() {
      try {
        setLoading(true);
        const storeData = await fetchNearestStore(lat, lng);
        setStore(storeData.store);
        setStoreStatus(storeData.status);

        const productList = await fetchStoreProducts(storeData.store._id);
        setProducts(productList);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize store');
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    if (!store || items.length === 0) {
      setRecommendations([]);
      return;
    }

    const productIds = items.map((i) => i.product._id);

    fetch('http://localhost:5000/api/recommendations/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: store._id, productIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRecommendations(data.recommendations || []);
        }
      })
      .catch((err) => console.error('Recommendation fetch error:', err));
  }, [items, store]);

  useEffect(() => {
    if (!activeOrder || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeOrder, countdown]);

  const executeOrderBooking = async (token: string) => {
    const orderPayload = {
      storeId: store!._id,
      items: items.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
      idempotencyKey: `ord_${Date.now()}_${Math.random()}`,
      address: {
        addressLine: 'Flat 402, Royal Residency, Gomti Nagar, Lucknow',
        coordinates: [80.9995, 26.8525],
      },
    };

    const result = await createOrder(orderPayload, token);
    setActiveOrder({ ...result.order, token });
    setCountdown(10);
    clearCart();
  };

  const handlePaymentAndOrder = async () => {
    if (!store || items.length === 0) return;
    try {
      setOrderLoading(true);

      const authRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@smartbasket.com', password: 'password123' }),
      });
      const authData = await authRes.json();
      const token = authData.token;

      // Try creating Razorpay Order
      const rzpRes = await fetch('http://localhost:5000/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountPaise: totalPaise }),
      });

      const rzpData = await rzpRes.json();

      if (rzpData.success && window.Razorpay && rzpData.order?.id) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummy',
          amount: totalPaise,
          currency: 'INR',
          name: 'SmartBasket Quick Commerce',
          description: 'Grocery Instant Delivery',
          order_id: rzpData.order.id,
          handler: async function (response: any) {
            await fetch('http://localhost:5000/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(response),
            });
            await executeOrderBooking(token);
          },
          theme: { color: '#059669' },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback for direct simulation or sandbox without active Razorpay account
        await executeOrderBooking(token);
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder) return;
    try {
      await cancelOrder(activeOrder._id, activeOrder.token);
      alert('Order cancelled successfully! Full refund processed to original payment method.');
      setActiveOrder(null);
      setCountdown(0);
      if (store) {
        const productList = await fetchStoreProducts(store._id);
        setProducts(productList);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-slate-500">
        <Clock className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-medium">Connecting to nearest dark store...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800 mb-1">Store Unavailable</h2>
        <p className="text-slate-600 text-sm mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-emerald-600 tracking-tight">SmartBasket</h1>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[240px]">
              {store?.name}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" /> 10 mins
          </div>
        </div>

        {storeStatus && !storeStatus.canAcceptOrders && (
          <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2 rounded-lg">
            {storeStatus.reason}
          </div>
        )}
      </header>

      <main className="flex-1 p-4 overflow-y-auto pb-36">
        {activeOrder && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Order Placed & Paid
              </span>
              <span className="text-xs font-mono font-semibold bg-white px-2 py-0.5 rounded border border-emerald-200">
                OTP: {activeOrder.deliveryOtp}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Total Paid: ₹{(activeOrder.totalPaise / 100).toFixed(2)}
            </p>

            {countdown > 0 ? (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="text-xs text-slate-700 font-medium">
                  Cancel order ({countdown}s left)
                </span>
                <button
                  onClick={handleCancelOrder}
                  className="bg-rose-50 text-rose-600 text-xs font-bold px-3 py-1 rounded hover:bg-rose-100 border border-rose-200"
                >
                  Cancel & Refund
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Orders can't be cancelled 10 seconds after they're placed.
              </p>
            )}
          </div>
        )}

        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          Daily Essentials
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {products.map((product) => {
            const cartItem = items.find((i) => i.product._id === product._id);
            return (
              <div
                key={product._id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  product.isOutOfStock ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {product.brand}
                  </span>
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">
                    ₹{(product.pricePaise / 100).toFixed(2)}
                  </span>

                  {product.isOutOfStock ? (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                      Out of stock
                    </span>
                  ) : cartItem ? (
                    <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 text-xs">
                      <button onClick={() => removeFromCart(product._id)} className="p-0.5">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-bold">{cartItem.quantity}</span>
                      <button onClick={() => addToCart(product)} className="p-0.5">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      disabled={!storeStatus?.canAcceptOrders}
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-lg"
                    >
                      ADD
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {recommendations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Forgot something?
              </h2>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {recommendations.map((rec) => (
                <div
                  key={rec._id}
                  className="min-w-[140px] max-w-[140px] p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      {rec.brand}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 mt-0.5">
                      {rec.name}
                    </h4>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      ₹{(rec.pricePaise / 100).toFixed(2)}
                    </span>
                    <button
                      onClick={() => addToCart(rec)}
                      className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm hover:bg-emerald-700"
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between z-20">
          <div>
            <p className="text-xs font-medium text-emerald-100">{itemCount} items</p>
            <p className="text-sm font-black">₹{(totalPaise / 100).toFixed(2)}</p>
          </div>
          <button
            onClick={handlePaymentAndOrder}
            disabled={orderLoading || !storeStatus?.canAcceptOrders}
            className="flex items-center gap-1.5 bg-white text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-emerald-50 disabled:opacity-50"
          >
            <CreditCard className="w-3.5 h-3.5" />
            {orderLoading ? 'Processing...' : 'Pay & Order'}
          </button>
        </div>
      )}
    </div>
  );
}
