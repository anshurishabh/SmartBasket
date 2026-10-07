'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const storeIcon = L.divIcon({
  html: `<div style="background:#2563eb;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(37,99,235,0.8);border:2px solid white;font-size:16px;">🏬</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const customerIcon = L.divIcon({
  html: `<div style="background:#e11d48;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(225,29,72,0.8);border:2px solid white;font-size:16px;">🏠</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const bikeIcon = L.divIcon({
  html: `<div style="background:#10b981;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(16,185,129,0.9);border:2px solid white;font-size:18px;">🛵</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function RecenterAuto({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords.map((c) => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
}

interface LiveRouteMapProps {
  storeCoords?: [number, number];
  customerCoords?: [number, number];
  riderName?: string;
  isRiderView?: boolean;
}

export default function LiveRouteMap({
  storeCoords = [26.8525, 80.9995],
  customerCoords = [26.8480, 81.0080],
  riderName = 'Speed Rider',
  isRiderView = false,
}: LiveRouteMapProps) {
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [currentRiderPos, setCurrentRiderPos] = useState<[number, number]>(storeCoords);
  const [etaMins, setEtaMins] = useState<number>(7);
  const [distanceKm, setDistanceKm] = useState<string>('2.1');
  const animationIndexRef = useRef<number>(0);

  useEffect(() => {
    async function fetchRoadRoute() {
      try {
        const start = `${storeCoords[1]},${storeCoords[0]}`;
        const end = `${customerCoords[1]},${customerCoords[0]}`;
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          setRoutePolyline(coords);
          setDistanceKm((data.routes[0].distance / 1000).toFixed(1));
          setEtaMins(Math.max(3, Math.ceil(data.routes[0].duration / 60)));
        } else {
          setRoutePolyline([storeCoords, customerCoords]);
        }
      } catch (err) {
        setRoutePolyline([storeCoords, customerCoords]);
      }
    }
    fetchRoadRoute();
  }, [storeCoords, customerCoords]);

  useEffect(() => {
    if (routePolyline.length === 0) return;

    const interval = setInterval(() => {
      animationIndexRef.current = (animationIndexRef.current + 1) % routePolyline.length;
      setCurrentRiderPos(routePolyline[animationIndexRef.current]);
    }, 1200);

    return () => clearInterval(interval);
  }, [routePolyline]);

  return (
    <div className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-md flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="text-[11px] font-bold text-white">
          {isRiderView ? 'GPS Navigation Active' : `Rider Arriving in ~${etaMins} mins (${distanceKm} km)`}
        </span>
      </div>

      <MapContainer
        center={storeCoords}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routePolyline.length > 0 && <RecenterAuto coords={routePolyline} />}

        <Marker position={storeCoords} icon={storeIcon}>
          <Popup>
            <div className="text-xs font-bold text-slate-900">Dark Store Dispatch Center</div>
          </Popup>
        </Marker>

        <Marker position={customerCoords} icon={customerIcon}>
          <Popup>
            <div className="text-xs font-bold text-slate-900">Customer Delivery Address</div>
          </Popup>
        </Marker>

        <Marker position={currentRiderPos} icon={bikeIcon}>
          <Popup>
            <div className="text-xs font-bold text-slate-900">
              🛵 {riderName} in-transit
            </div>
          </Popup>
        </Marker>

        {routePolyline.length > 0 && (
          <Polyline
            positions={routePolyline}
            pathOptions={{ color: '#10b981', weight: 5, opacity: 0.85, dashArray: '8, 8' }}
          />
        )}
      </MapContainer>
    </div>
  );
}
