import React, { useState } from 'react';
import './index.css';

// A simple component to represent a room on the map.
// We'll use a placeholder icon for now.
const Room = ({ name }) => {
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-gray-700 text-white rounded-lg border border-gray-600 shadow-md">
      <svg className="w-8 h-8 text-gray-300 mb-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2zM4 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
      </svg>
      <span className="text-sm font-medium text-center">{name}</span>
    </div>
  );
};

// A component to represent a user's avatar on the map.
// The position is now controlled by props.
const UserAvatar = ({ name, style }) => {
  return (
    <div
      className="flex flex-col items-center justify-center p-1 bg-blue-500 text-white rounded-full w-12 h-12 border-2 border-blue-400 shadow-lg cursor-pointer absolute transition-all duration-500 ease-in-out"
      style={style}
    >
      <span className="text-xs font-semibold">{name}</span>
    </div>
  );
};

// This is the LobbyView component. It will contain the virtual office map and all users.
const LobbyView = () => {
  // Use a state variable to manage the current user's position.
  const [userPosition, setUserPosition] = useState({ x: 0, y: 0 });

  // A dummy list of other users to display.
  const otherUsers = [
    { name: 'Bob', style: { top: '25%', left: '75%' } },
    { name: 'Charlie', style: { top: '75%', left: '33%' } },
  ];

  // This handler will update the user's position when the map is clicked.
  const handleMapClick = (event) => {
    // Get the bounding box of the map container.
    const rect = event.currentTarget.getBoundingClientRect();
    // Calculate the click position relative to the container.
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setUserPosition({ x, y });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-semibold mb-4 text-white">The Virtual Office Lobby</h2>
      <div
        className="relative bg-gray-800 border border-gray-700 w-full max-w-4xl h-96 rounded-lg shadow-inner flex items-center justify-center text-gray-400 p-8 overflow-hidden"
        onClick={handleMapClick}
      >
        <div className="grid grid-cols-4 gap-6 w-full h-full">
          <Room name="Lobby" />
          <Room name="Meeting Room A" />
          <Room name="Breakout Room B" />
          <Room name="Conference Hall" />
          <Room name="Creative Lab" />
          <Room name="Dev Space" />
          <Room name="Quiet Zone" />
          <Room name="Support Desk" />
        </div>
        {/* Render the current user's avatar with dynamic position */}
        <UserAvatar
          name="You"
          style={{ top: `${userPosition.y}%`, left: `${userPosition.x}%`, transform: 'translate(-50%, -50%)' }}
        />
        {/* Render other users' avatars */}
        {otherUsers.map((user, index) => (
          <UserAvatar key={index} name={user.name} style={user.style} />
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-400">Click anywhere on the map to move your avatar!</p>
    </div>
  );
};

// The main App component will handle which view is displayed (Lobby, Room, etc.).
const App = () => {
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center">
      <LobbyView />
    </div>
  );
};

export default App;
