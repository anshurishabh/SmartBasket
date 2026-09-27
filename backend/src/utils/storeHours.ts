import { IStore } from '../models/Store';

export interface StoreOperationalStatus {
  isOpen: boolean;
  canAcceptOrders: boolean;
  reason?: string;
  nextChangeAt: string;
  serverNow: string;
}

export function evaluateStoreHours(store: IStore, now: Date = new Date()): StoreOperationalStatus {
  const nowUtc = now.toISOString();

  if (store.manualStatus === 'CLOSED_TEMPORARILY') {
    return {
      isOpen: false,
      canAcceptOrders: false,
      reason: 'Store is temporarily closed for maintenance or weather conditions.',
      nextChangeAt: 'Unknown',
      serverNow: nowUtc,
    };
  }

  // Convert current time to Asia/Kolkata time (HH:mm)
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: store.timezone || 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const [currentHourStr, currentMinStr] = formatter.format(now).split(':');
  const currentMinutes = parseInt(currentHourStr, 10) * 60 + parseInt(currentMinStr, 10);

  const [openH, openM] = store.openTime.split(':').map((v) => parseInt(v, 10));
  const [closeH, closeM] = store.closeTime.split(':').map((v) => parseInt(v, 10));

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const lastOrderCutoffMinutes = closeMinutes - (store.lastOrderBeforeCloseMin || 15);

  let isOpen = false;
  let canAcceptOrders = false;

  // Handle stores operating across midnight
  if (closeMinutes < openMinutes) {
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  } else {
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  if (isOpen) {
    canAcceptOrders = currentMinutes < lastOrderCutoffMinutes;
  }

  return {
    isOpen,
    canAcceptOrders,
    reason: !isOpen
      ? `The store is closed right now. It opens at ${store.openTime}.`
      : !canAcceptOrders
      ? 'Store is closing soon. New orders are temporarily paused.'
      : undefined,
    nextChangeAt: !isOpen ? store.openTime : store.closeTime,
    serverNow: nowUtc,
  };
}