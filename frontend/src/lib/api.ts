const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Product {
  _id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  pricePaise: number;
  imageUrl: string;
  stock: number;
  reserved: number;
  availableQuantity: number;
  isOutOfStock: boolean;
}

export interface Store {
  _id: string;
  name: string;
  serviceRadiusKm: number;
  openTime: string;
  closeTime: string;
}

export interface StoreStatus {
  isOpen: boolean;
  canAcceptOrders: boolean;
  reason?: string;
  nextChangeAt: string;
}

export async function fetchNearestStore(lat: number, lng: number) {
  const res = await fetch(`${BASE_URL}/stores/nearest?lat=${lat}&lng=${lng}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "We don't deliver to your area yet.");
  }
  return data.data;
}

export async function fetchStoreProducts(storeId: string): Promise<Product[]> {
  const res = await fetch(`${BASE_URL}/products/store/${storeId}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load products');
  }
  return data.data;
}

export async function createOrder(payload: any, token: string) {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Order placement failed');
  }
  return data;
}

export async function cancelOrder(orderId: string, token: string) {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Cancellation failed');
  }
  return data;
}

export async function getOrderDetails(orderId: string, token: string) {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch order');
  }
  return data;
}