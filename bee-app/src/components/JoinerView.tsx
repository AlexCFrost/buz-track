'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SharedUser } from '../types';
import Button from './Button';
import Spinner from './Spinner';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { sessionExists, addUserToSession, getCurrentUser } from '../services/firebaseService';

interface JoinerViewProps {
    onLocationShared: (user: SharedUser) => void;
    onReset: () => void;
}

const LOCATION_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds

const JoinerView: React.FC<JoinerViewProps> = ({ onLocationShared, onReset }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCodeRef = useRef<string>('');
  const userIdRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  const updateLocation = async (position: GeolocationPosition) => {
    const currentUser = getCurrentUser();
    const expirationTime = Date.now() + LOCATION_EXPIRATION_MS;
    
    const updatedUser: SharedUser = {
      id: userIdRef.current || currentUser?.uid || Math.random().toString(36).substring(2, 9),
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      expiresAt: expirationTime,
      profilePic: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.email || 'User'}&background=0ea5e9&color=fff`,
      displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
      email: currentUser?.email || undefined,
    };
    
    // Update user location in Firebase session
    await addUserToSession(sessionCodeRef.current, updatedUser);
    onLocationShared(updatedUser);
  };

  const startLiveTracking = async () => {
    // Validate session exists in Firebase
    const exists = await sessionExists(code.toUpperCase());
    if (!exists) {
      setError('Invalid code. Please check and try again.');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    sessionCodeRef.current = code.toUpperCase();

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentUser = getCurrentUser();
        const userId = currentUser?.uid || Math.random().toString(36).substring(2, 9);
        userIdRef.current = userId;
        
        const expirationTime = Date.now() + LOCATION_EXPIRATION_MS;
        
        const newUser: SharedUser = {
          id: userId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          expiresAt: expirationTime,
          profilePic: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.email || 'User'}&background=0ea5e9&color=fff`,
          displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
          email: currentUser?.email || undefined,
        };
        
        // Add user to Firebase session
        await addUserToSession(sessionCodeRef.current, newUser);

        onLocationShared(newUser);
        setIsShared(true);
        setExpiresAt(expirationTime);
        setIsLoading(false);
        setIsTracking(true);

        // Start watching position changes and update every 5 seconds
        watchIdRef.current = navigator.geolocation.watchPosition(
          () => {}, // We'll use interval instead for updates
          (error) => {
            console.error('Location tracking error:', error);
          },
          { 
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );

        // Update location every 5 seconds
        updateIntervalRef.current = setInterval(async () => {
          navigator.geolocation.getCurrentPosition(
            updateLocation,
            (error) => {
              console.error('Location update error:', error);
            },
            { enableHighAccuracy: true, maximumAge: 0 }
          );
        }, LOCATION_UPDATE_INTERVAL);
      },
      (geoError) => {
        setError(`Location error: ${geoError.message}`);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleShareLocation = () => {
    startLiveTracking();
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    setIsTracking(false);
    onReset();
  };
  
  if (isShared) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 p-4 text-center">
            <CheckCircle className="h-24 w-24 text-green-400 mb-4" />
            <h2 className="text-3xl font-bold mb-2">
              {isTracking ? 'Sharing Live Location' : 'Location Shared!'}
            </h2>
            <p className="text-gray-300">The creator can now see your location on their map.</p>
            {isTracking && (
              <p className="text-teal-400 mt-2">📍 Updating every 5 seconds</p>
            )}
            {expiresAt && <p className="text-gray-400 mt-2">Your location will automatically disappear in about {Math.round((expiresAt - Date.now()) / 60000)} minutes.</p>}
             <Button onClick={stopTracking} className="mt-8">
                Stop Sharing
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        <button onClick={onReset} className="absolute top-4 left-4 flex items-center text-gray-300 hover:text-white">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
        </button>
        <h2 className="text-3xl font-bold text-center mb-6">Join a Session</h2>
        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter Share Code"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-center text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
            maxLength={6}
          />
          <Button onClick={handleShareLocation} disabled={isLoading || code.length < 6} className="w-full">
            {isLoading ? <Spinner /> : 'Share My Location'}
          </Button>
        </div>
        {error && 
            <div className="mt-4 flex items-center justify-center text-red-400 bg-red-900/50 p-3 rounded-md">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span>{error}</span>
            </div>
        }
      </div>
    </div>
  );
};

export default JoinerView;
