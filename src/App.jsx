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

  // 🎥 WebRTC with lazy media initialization
  const { 
    localStream, 
    remoteStreams, 
    isVideoEnabled, 
    isAudioEnabled, 
    toggleVideo, 
    toggleAudio,
    isInitialized,
    hasRequestedMedia,
    error: webrtcError
  } = useWebRTC(user, currentRoom, {
    lazyMedia: true
  });

  // Test connection and restore session on app load
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      
      const isConnected = await testConnection();
      setConnectionStatus(isConnected ? 'connected ✅' : 'failed ❌');

      if (isConnected) {
        const savedSession = tabManager.getSavedSession();
        if (savedSession && savedSession.user) {
          console.log('🔄 Attempting to restore session for:', savedSession.user.name);
          
          const { available } = await usernameService.isUsernameAvailable(savedSession.user.name);
          
          if (available) {
            console.log('✅ Username available, restoring session');
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
    
    tabManager.saveUserSession(newUser, { x: 50, y: 50 }, null);
  };

  const handleJoinRoom = (roomName) => {
    console.log('🏠 Joining room:', roomName);
    setCurrentRoom(roomName);
    setIsChatOpen(true);
    
    const savedPos = tabManager.getSavedPosition();
    tabManager.updateSession(savedPos, roomName);
  };

  const handleLeaveRoom = () => {
    console.log('🚪 Leaving room');
    setCurrentRoom(null);
    setIsChatOpen(false);
    
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
  };

  // 🎬 FIXED: Better VideoGrid visibility logic
  const shouldShowVideoGrid = () => {
    if (!currentRoom) return false;
    
    const hasLocalVideo = localStream && isVideoEnabled;
    const hasRemoteVideo = remoteStreams.size > 0;
    
    console.log('🎬 VideoGrid check:', { 
      hasLocalVideo, 
      hasRemoteVideo, 
      remoteCount: remoteStreams.size 
    });
    
    return hasLocalVideo || hasRemoteVideo;
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
      <div className="bg-gray-800 text-white p-2 text-center text-xs flex-shrink-0">
        <div className="flex justify-center items-center space-x-4">
          <span>Supabase: {connectionStatus}</span>
          <span>User: {user.name}</span>
          <span>Session: {user.sessionId?.slice(-6)}</span>
          {webrtcError && <span className="text-red-400">WebRTC: {webrtcError}</span>}
          {currentRoom && (
            <span className="text-blue-400">
              Room: {currentRoom} | Remote: {remoteStreams.size} | Local: {isVideoEnabled ? '📹' : '❌'}
            </span>
          )}
        </div>
      </div>
      
      {/* Room Controls */}
      {currentRoom && (
        <div className="flex-shrink-0">
          <RoomControls
            roomName={currentRoom}
            onLeaveRoom={handleLeaveRoom}
            onToggleChat={handleToggleChat}
            isChatOpen={isChatOpen}
            user={user}
            isWebRTCInitialized={isInitialized}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            webrtcError={webrtcError}
            hasRequestedMedia={hasRequestedMedia}
          />
        </div>
      )}
      
      {/* 🎨 FIXED: Main Content Area with proper flex layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side: Lobby + Video */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Lobby View */}
          <div className={`${shouldShowVideoGrid() ? 'flex-1' : 'flex-1'} overflow-auto`}>
            <LobbyView 
              onJoinRoom={handleJoinRoom}
              user={user}
              currentRoom={currentRoom}
              onSignout={handleSignout}
            />
          </div>
          
          {/* Video Area - FIXED: Proper sizing and positioning */}
          {shouldShowVideoGrid() && (
            <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700">
              {/* Video Header */}
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-600">
                <div className="flex justify-between items-center">
                  <h3 className="text-white text-sm font-medium">Video Conference</h3>
                  <div className="text-xs text-gray-400">
                    {localStream && isVideoEnabled && '📹 You'} 
                    {remoteStreams.size > 0 && (remoteStreams.size === 1 ? ' + 1 other' : ` + ${remoteStreams.size} others`)}
                  </div>
                </div>
              </div>
              
              {/* Video Grid Container - FIXED: Proper height constraints */}
              <div className="h-64 md:h-80 p-4">
                <VideoGrid
                  localStream={localStream}
                  remoteStreams={remoteStreams}
                  currentUser={user}
                  isVideoEnabled={isVideoEnabled}
                  isAudioEnabled={isAudioEnabled}
                  onToggleVideo={toggleVideo}
                  onToggleAudio={toggleAudio}
                  className="h-full w-full"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Right side: Chat Panel - FIXED: Proper width constraints */}
        {isChatOpen && (
          <div className="flex-shrink-0 w-80 border-l border-gray-700">
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