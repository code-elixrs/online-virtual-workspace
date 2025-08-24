import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from './supabaseClient';
import UsernamePrompt from './components/UsernamePrompt';
import ChatPanel from './components/ChatPanel';
import RoomControls from './components/RoomControls';
import LobbyView from './components/LobbyView';
import { tabManager } from './utils/tabManager';
import { usernameService } from './services/usernameService';

import VideoGrid from './components/VideoGrid';
import { useWebRTC } from './hooks/useWebRTC';

const App = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing...');
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // 🔧 FIXED: Move useWebRTC hook to TOP with other hooks
  // This MUST be called unconditionally on every render
  const { 
    localStream, 
    remoteStreams, 
    isVideoEnabled, 
    isAudioEnabled, 
    toggleVideo, 
    toggleAudio 
  } = useWebRTC(user, currentRoom);

  // Test connection and restore session on app load
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      
      // Test connection
      const isConnected = await testConnection();
      setConnectionStatus(isConnected ? 'connected ✅' : 'failed ❌');

      if (isConnected) {
        // Try to restore saved session
        const savedSession = tabManager.getSavedSession();
        if (savedSession && savedSession.user) {
          console.log('🔄 Attempting to restore session for:', savedSession.user.name);
          
          // Check if username is still available (no active session)
          const { available } = await usernameService.isUsernameAvailable(savedSession.user.name);
          
          if (available) {
            console.log('✅ Username available, restoring session');
            
            // Restore user immediately (usePresence will handle database insertion)
            setUser(savedSession.user);
            setCurrentRoom(savedSession.room);
            
            console.log('✅ Session restored successfully');
          } else {
            console.log('❌ Username no longer available, clearing session');
            tabManager.clearUserSession();
          }
        } else {
          console.log('ℹ️ No saved session found');
        }
      }
      
      setIsRestoring(false);
    };

    initializeApp();
  }, []);

  const handleUsernameSet = async (username, sessionId) => {
    console.log('👤 Setting username:', username, sessionId);
    
    const newUser = { name: username, sessionId: sessionId };
    setUser(newUser);
    
    // Save to localStorage for persistence (position will be saved by usePresence)
    tabManager.saveUserSession(newUser, { x: 50, y: 50 }, null);
  };

  const handleJoinRoom = (roomName) => {
    console.log('🏠 Joining room:', roomName);
    setCurrentRoom(roomName);
    setIsChatOpen(true);
    
    // Update saved session
    const savedPos = tabManager.getSavedPosition();
    tabManager.updateSession(savedPos, roomName);
  };

  const handleLeaveRoom = () => {
    console.log('🚪 Leaving room');
    setCurrentRoom(null);
    setIsChatOpen(false);
    
    // Update saved session
    const savedPos = tabManager.getSavedPosition();
    tabManager.updateSession(savedPos, null);
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleSignout = () => {
    console.log('🚪 Signing out from App.jsx');
    setUser(null);
    setCurrentRoom(null);
    setIsChatOpen(false);
    // tabManager.clearSession() is called by SignoutButton
  };

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-center">
            <div>Connecting to Virtual Office...</div>
            <div className="text-sm text-gray-400 mt-2">Supabase: {connectionStatus}</div>
          </div>
        </div>
      </div>
    );
  }

  // Show username prompt if no user
  if (!user) {
    return <UsernamePrompt onUsernameSet={handleUsernameSet} />;
  }

  return (
    <div className="bg-gray-950 min-h-screen flex flex-col">
      {/* Connection status */}
      <div className="bg-gray-800 text-white p-1 text-center text-xs flex-shrink-0">
        Supabase: {connectionStatus} • User: {user.name} • Session: {user.sessionId?.slice(-6)}
      </div>
      
      {/* Room Controls (only show when in a room) */}
      {currentRoom && (
        <div className="flex-shrink-0">
          <RoomControls
            roomName={currentRoom}
            onLeaveRoom={handleLeaveRoom}
            onToggleChat={handleToggleChat}
            isChatOpen={isChatOpen}
            user={user}
          />
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Lobby View */}
        <div className="flex-1 min-w-0 flex flex-col">
          <LobbyView 
            onJoinRoom={handleJoinRoom}
            user={user}
            currentRoom={currentRoom}
            onSignout={handleSignout}
          />
          
          {/* Video Area - Show when in a room */}
          {currentRoom && (
            <div className="h-80 p-4 bg-gray-950">
              <VideoGrid
                localStream={localStream}
                remoteStreams={remoteStreams}
                currentUser={user}
                isVideoEnabled={isVideoEnabled}
                isAudioEnabled={isAudioEnabled}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                className="h-full"
              />
            </div>
          )}
        </div>
        
        {/* Chat Panel */}
        {isChatOpen && (
          <div className="flex-shrink-0">
            <ChatPanel
              roomName={currentRoom}
              user={user}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;