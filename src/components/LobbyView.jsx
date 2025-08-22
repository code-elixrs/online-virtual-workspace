import React, { useState, useEffect } from 'react';
import Room from './Room';
import UserAvatar from './UserAvatar.jsx';
import { usePresence } from '../hooks/usePresence.js';

const LobbyView = ({ onJoinRoom, user, currentRoom }) => {
  const { otherUsers, userPosition, updatePosition } = usePresence(user, currentRoom)

  console.log('LobbyView with presence:', { user, currentRoom, otherUsers, userPosition })

  const handleMapClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    console.log('Map clicked, updating position:', { x, y })
    updatePosition({ x, y });
  };

  return (
    <div className="h-full flex flex-col p-8 md:p-16">
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg shadow-2xl mb-8 flex-shrink-0">
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
            Welcome, {user.name}! ({otherUsers.length} others online)
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div
        className="relative bg-gray-900 border-4 border-gray-700 w-full flex-1 rounded-3xl shadow-inner flex items-center justify-center text-gray-400 p-8 md:p-12 overflow-hidden"
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
        
        {/* Current User Avatar */}
        <UserAvatar
          name={user.name}
          style={{ 
            top: `${userPosition.y}%`, 
            left: `${userPosition.x}%`, 
            transform: 'translate(-50%, -50%)' 
          }}
        />
        
        {/* Other Users Avatars - Simple version first */}
        {otherUsers.map((otherUser) => (
          <UserAvatar 
            key={otherUser.id}
            name={otherUser.name}
            style={{ 
              top: `${otherUser.position.y}%`, 
              left: `${otherUser.position.x}%`, 
              transform: 'translate(-50%, -50%)' 
            }}
          />
        ))}
        
        <div className="absolute bottom-4 left-4 text-gray-500 text-sm">
          Click anywhere to move • {otherUsers.length} users online • Position: {userPosition.x.toFixed(1)}, {userPosition.y.toFixed(1)}
        </div>
      </div>
    </div>
  );
};

export default LobbyView