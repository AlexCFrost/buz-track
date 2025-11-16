'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Image from 'next/image';
import { SharedUser } from '../types';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  users: SharedUser[];
}

// Component to fit map bounds when users change
function MapUpdater({ users }: { users: SharedUser[] }) {
  const map = useMap();

  useEffect(() => {
    if (users.length > 0) {
      const bounds = L.latLngBounds(users.map(u => [u.lat, u.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [users, map]);

  return null;
}

const Map: React.FC<MapProps> = ({ users }) => {
  // Default center (will be updated when users join)
  const center: [number, number] = useMemo(() => {
    if (users.length > 0) {
      const avgLat = users.reduce((sum, u) => sum + u.lat, 0) / users.length;
      const avgLng = users.reduce((sum, u) => sum + u.lng, 0) / users.length;
      return [avgLat, avgLng];
    }
    return [51.505, -0.09]; // London default
  }, [users]);

  // Create custom icon for each user
  const createCustomIcon = (user: SharedUser) => {
    const iconHtml = `
      <div style="position: relative; width: 48px; height: 48px;">
        <svg style="position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg);" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
          <circle cx="24" cy="24" r="22" fill="none" stroke="#14b8a6" stroke-width="4" 
            stroke-dasharray="${2 * Math.PI * 22}" 
            stroke-dashoffset="${2 * Math.PI * 22 * (1 - Math.min((user.expiresAt - Date.now()) / (15 * 60 * 1000), 1))}"
            stroke-linecap="round"/>
        </svg>
        <img src="${user.profilePic}" 
          style="width: 40px; height: 40px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 2px solid #1f2937;"
          alt="User"/>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48],
    });
  };

  return (
    <div className="absolute inset-0" style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater users={users} />

        {users.map((user) => (
          <Marker
            key={user.id}
            position={[user.lat, user.lng]}
            icon={createCustomIcon(user)}
          >
            <Popup>
              <div className="text-center">
                <Image 
                  src={user.profilePic} 
                  alt={user.displayName || 'User'} 
                  width={48}
                  height={48}
                  className="rounded-full mx-auto mb-2"
                />
                {user.displayName && (
                  <div className="font-semibold text-gray-800">{user.displayName}</div>
                )}
                <div className="text-xs text-gray-600">
                  Expires in: {Math.ceil((user.expiresAt - Date.now()) / 60000)} min
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
