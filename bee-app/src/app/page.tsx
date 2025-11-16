'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { View, SharedUser } from '../types';
import { MapPin, Users, Link } from 'lucide-react';
import dynamic from 'next/dynamic';
import Button from '../components/Button';
import Login from '../components/Login';
import { createSession, onAuthStateChange, signOutUser } from '../services/firebaseService';

// Dynamically import view components with no SSR
const CreatorView = dynamic(() => import('../components/CreatorView'), { ssr: false });
const JoinerView = dynamic(() => import('../components/JoinerView'), { ssr: false });

export default function Home() {
  const [view, setView] = useState<View>(View.Home);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Simulate a persistent backend using localStorage
  useEffect(() => {
    const savedCode = localStorage.getItem('geo-share-code');
    const savedUsers = localStorage.getItem('geo-share-users');
    const savedView = localStorage.getItem('geo-share-view');

    if (savedCode && savedView) {
      setShareCode(savedCode);
      setView(savedView as View);
      if (savedUsers) {
        const users: SharedUser[] = JSON.parse(savedUsers);
        // Filter out expired users on load
        const validUsers = users.filter(u => u.expiresAt > Date.now());
        setSharedUsers(validUsers);
        localStorage.setItem('geo-share-users', JSON.stringify(validUsers));
      }
    }
  }, []);

  const handleCreateSession = async () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create session in Firebase
    await createSession(newCode);
    
    setShareCode(newCode);
    setView(View.Creator);
    localStorage.setItem('geo-share-code', newCode);
    localStorage.setItem('geo-share-view', View.Creator);
    setSharedUsers([]);
  };

  const handleJoinSession = () => {
    setView(View.Joiner);
    localStorage.setItem('geo-share-view', View.Joiner);
  };
  
  const resetApp = () => {
    setView(View.Home);
    setShareCode(null);
    setSharedUsers([]);
    localStorage.clear();
  };

  const addSharedUser = useCallback((user: SharedUser) => {
    setSharedUsers(prevUsers => {
      const updatedUsers = [...prevUsers.filter(u => u.id !== user.id), user];
      localStorage.setItem('geo-share-users', JSON.stringify(updatedUsers));
      return updatedUsers;
    });
  }, []);

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 p-4">
      <button 
        onClick={async () => {
          await signOutUser();
          resetApp();
        }}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm"
      >
        Sign Out
      </button>
      <div className="text-center">
        <MapPin className="mx-auto h-24 w-24 text-teal-400" />
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">
          BuzTrack
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-300">
          Share your location instantly with a private code.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={handleCreateSession} className="w-full sm:w-auto">
            <Users className="mr-2 h-5 w-5" />
            Create a Share Code
          </Button>
          <Button onClick={handleJoinSession} variant="secondary" className="w-full sm:w-auto">
            <Link className="mr-2 h-5 w-5" />
            Join with Code
          </Button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case View.Creator:
        return <CreatorView shareCode={shareCode!} sharedUsers={sharedUsers} setSharedUsers={setSharedUsers} onReset={resetApp} />;
      case View.Joiner:
        return <JoinerView onLocationShared={addSharedUser} onReset={resetApp}/>;
      case View.Home:
      default:
        return renderHome();
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <div className="min-h-screen bg-gray-900">{renderContent()}</div>;
}
