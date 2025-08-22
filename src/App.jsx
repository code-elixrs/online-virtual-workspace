import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from './supabaseClient';
import UsernamePrompt from './components/UsernamePrompt';
import ChatPanel from './components/ChatPanel';
import RoomControls from './components/RoomControls';
import LobbyView from './components/LobbyView';






const App = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing...');
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Test connection on app load
  useEffect(() => {
    const checkConnection = async () => {
      console.log('Testing Supabase connection...');
      const isConnected = await testConnection();
      setConnectionStatus(isConnected ? 'connected ✅' : 'failed ❌');
    };
    
    checkConnection();
  }, []);

  const handleUsernameSet = async (username, userId) => {
    setUser({ id: userId, name: username });
  };

  const handleJoinRoom = (roomName) => {
    setCurrentRoom(roomName);
    setIsChatOpen(true); // Auto-open chat when joining room
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setIsChatOpen(false);
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Show username prompt if no user
  if (!user) {
    return <UsernamePrompt onUsernameSet={handleUsernameSet} />;
  }

  return (
    <div className="bg-gray-950 min-h-screen flex flex-col">
      {/* Connection status (temporary) */}
      <div className="bg-gray-800 text-white p-1 text-center text-xs flex-shrink-0">
        Supabase: {connectionStatus}
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
      
      {/* Main Content Area - This is the key change */}
      <div className="flex-1 flex min-h-0">
        {/* Lobby View */}
        <div className="flex-1 min-w-0">
          <LobbyView 
            onJoinRoom={handleJoinRoom}
            user={user}
            currentRoom={currentRoom}
          />
        </div>
        
        {/* Chat Panel - Now properly constrained */}
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