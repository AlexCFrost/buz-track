'use client';

import React, { useState, useEffect } from 'react';
import { SharedUser } from '../types';
import dynamic from 'next/dynamic';
import GeminiChat from './GeminiChat';
import { Clipboard, RefreshCw, LogOut } from 'lucide-react';
import Button from './Button';
import { listenToSessionUsers, cleanupExpiredUsers, deleteSession } from '../services/firebaseService';

// Dynamically import Map component with no SSR
const Map = dynamic(() => import('./Map'), { ssr: false });

interface CreatorViewProps {
  shareCode: string;
  sharedUsers: SharedUser[];
  setSharedUsers: React.Dispatch<React.SetStateAction<SharedUser[]>>;
  onReset: () => void;
}

const CreatorView: React.FC<CreatorViewProps> = ({ shareCode, sharedUsers, setSharedUsers, onReset }) => {
  const [copied, setCopied] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    // Listen to real-time updates from Firebase
    const unsubscribe = listenToSessionUsers(shareCode, (users) => {
      setSharedUsers(users);
    });

    // Cleanup expired users periodically
    const cleanupInterval = setInterval(() => {
      cleanupExpiredUsers(shareCode);
    }, 60000); // Every minute

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [shareCode, setSharedUsers]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndSession = async () => {
    await deleteSession(shareCode);
    onReset();
  };

  return (
    <div className="relative flex flex-col h-screen bg-gray-800">
      <header className="bg-gray-900/80 backdrop-blur-sm p-4 flex justify-between items-center shadow-lg z-10">
        <div className="flex flex-col">
          <span className="text-sm text-gray-400">Share Code</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-teal-400 tracking-widest">{shareCode}</span>
            <button onClick={handleCopyCode} className="p-1 text-gray-300 hover:text-white transition">
              {copied ? <Clipboard className="h-5 w-5 text-green-400" /> : <Clipboard className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-300 text-lg font-medium">{sharedUsers.length} active</span>
           <Button onClick={handleEndSession} variant="secondary" size="sm">
             <LogOut className="h-4 w-4 mr-2" />
            End Session
          </Button>
        </div>
      </header>
      
      <main className="flex-grow relative">
        <Map users={sharedUsers} />
        {sharedUsers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="text-center p-4 rounded-lg bg-gray-900/80">
              <h2 className="text-xl font-semibold">Waiting for users...</h2>
              <p className="text-gray-400 mt-2">Share the code above to see locations appear here.</p>
            </div>
          </div>
        )}
      </main>

      <div className={`fixed bottom-0 left-0 right-0 z-20 transition-transform duration-300 ease-in-out ${isChatVisible ? 'translate-y-0' : 'translate-y-[calc(100%-4rem)]'}`}>
        <button 
          onClick={() => setIsChatVisible(!isChatVisible)}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white p-4 text-lg font-semibold flex justify-between items-center"
        >
          <span>Ask Gemini about nearby places</span>
          <RefreshCw className={`h-6 w-6 transition-transform ${isChatVisible ? 'rotate-180' : ''}`} />
        </button>
        <div className="bg-gray-800 h-[70vh] max-h-[70vh]">
          <GeminiChat />
        </div>
      </div>
    </div>
  );
};

export default CreatorView;
