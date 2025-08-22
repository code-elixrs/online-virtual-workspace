import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from './supabaseClient';
import UsernamePrompt from './components/UsernamePrompt';
import ChatPanel from './components/ChatPanel';
import RoomControls from './components/RoomControls';

// A simple component to represent a room on the map.
const Room = ({ name, onClick, isSelected, isLocked }) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl shadow-md cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-2xl
        ${isSelected ? 'border-4 border-blue-400 transform scale-110 bg-blue-600' : 'border border-gray-600 bg-gray-700'}
      `}
      onClick={onClick}
    >
      <svg className="w-12 h-12 text-white mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2zM4 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
      </svg>
      {isLocked && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 00-6 0v2h6z" clipRule="evenodd"></path>
          </svg>
        </div>
      )}
      <span className="text-md font-bold text-white text-center">{name}</span>
    </div>
  );
};

// A component to represent a user's avatar on the map.
const UserAvatar = ({ name, style }) => {
  return (
    <div
      className="flex flex-col items-center justify-center p-1 bg-purple-600 text-white rounded-full w-16 h-16 border-4 border-purple-400 shadow-xl cursor-pointer absolute transition-all duration-500 ease-in-out z-10"
      style={style}
    >
      <span className="text-sm font-semibold">{name}</span>
    </div>
  );
};



const LobbyView = ({ onJoinRoom, user, currentRoom }) => {
  const [userPosition, setUserPosition] = useState({ x: 50, y: 50 });

  const otherUsers = [
    { name: 'Bob', style: { top: '25%', left: '75%' } },
    { name: 'Charlie', style: { top: '75%', left: '33%' } },
  ];

  const handleMapClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setUserPosition({ x, y });
  };

  return (
    <div className="flex-1 flex flex-col p-8 md:p-16">
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg shadow-2xl mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-0">
          Virtual Office Lobby
        </h2>
        <div className="flex items-center space-x-4">
          {currentRoom && (
            <div className="flex items-center space-x-2 bg-blue-600 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">In {currentRoom}</span>
            </div>
          )}
          <div className="text-gray-300 text-sm">
            Welcome, {user.name}!
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div
        className="relative bg-gray-900 border-4 border-gray-700 w-full h-full rounded-3xl shadow-inner flex items-center justify-center text-gray-400 p-8 md:p-12 overflow-hidden"
        onClick={handleMapClick}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-8 w-full h-full">
          {['Lobby', 'Meeting Room A', 'Breakout Room B', 'Conference Hall', 'Creative Lab', 'Dev Space', 'Quiet Zone', 'Support Desk'].map((roomName) => (
            <Room 
              key={roomName}
              name={roomName} 
              onClick={() => onJoinRoom(roomName)} 
              isSelected={currentRoom === roomName}
              isLocked={false}
            />
          ))}
        </div>
        <UserAvatar
          name="You"
          style={{ 
            top: `${userPosition.y}%`, 
            left: `${userPosition.x}%`, 
            transform: 'translate(-50%, -50%)' 
          }}
        />
        {otherUsers.map((user, index) => (
          <UserAvatar key={index} name={user.name} style={user.style} />
        ))}
      </div>
    </div>
  );
};

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