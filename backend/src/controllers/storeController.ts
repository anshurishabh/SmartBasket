import { Request, Response } from 'express';
import { Store } from '../models/Store';
import { evaluateStoreHours } from '../utils/storeHours';

export async function getNearestStore(req: Request, res: Response): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({
        code: 'INVALID_COORDINATES',
        message: 'Valid latitude (lat) and longitude (lng) query parameters are required.',
      });
      return;
    }

    // Find the nearest store inside its service radius
    const store = await Store.findOne({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      },
    });

    if (!store) {
      res.status(404).json({
        code: 'OUT_OF_SERVICE_AREA',
        message: "We don't deliver to your area yet.",
      });
      return;
    }

    // Calculate distance in KM using Haversine formula
    const earthRadiusKm = 6371;
    const dLat = ((lat - store.location.coordinates[1]) * Math.PI) / 180;
    const dLng = ((lng - store.location.coordinates[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((store.location.coordinates[1] * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = earthRadiusKm * c;

    if (distanceKm > store.serviceRadiusKm) {
      res.status(404).json({
        code: 'OUT_OF_SERVICE_AREA',
        message: "We don't deliver to your area yet.",
      });
      return;
    }

    const operationalStatus = evaluateStoreHours(store);

    res.status(200).json({
      success: true,
      data: {
        store,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        status: operationalStatus,
      },
    });
  } catch (error) {
    console.error('Error finding nearest store:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Unable to resolve store location.' });
  }
}