import React, { useState } from 'react';
import './index.css';

// A simple component to represent a room on the map.
const Room = ({ name, onClick, isSelected, isLocked }) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center p-2 rounded-lg border shadow-md cursor-pointer transition-transform duration-200 hover:scale-105
        ${isSelected ? 'bg-green-700 border-green-600' : 'bg-gray-700 border-gray-600'}`}
      onClick={onClick}
    >
      <svg className="w-8 h-8 text-gray-300 mb-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2zM4 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
      </svg>
      {isLocked && (
        <svg className="absolute top-1 right-1 w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
        </svg>
      )}
      <span className="text-sm font-medium text-center">{name}</span>
    </div>
  );
};

// A component to represent a user's avatar on the map.
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

// This is the updated LobbyView component that also handles room state and controls.
const LobbyView = () => {
  const [userPosition, setUserPosition] = useState({ x: 0, y: 0 });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isRoomLocked, setIsRoomLocked] = useState(false);

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
  
  const handleJoinRoom = (roomName) => {
    setSelectedRoom(roomName);
    setIsRoomLocked(false); // Reset lock state when joining a new room
  };
  
  const handleLeaveRoom = () => {
    setSelectedRoom(null);
    setIsRoomLocked(false); // Reset lock state when leaving the room
  };
  
  const handleToggleVideo = () => {
    // This function will eventually toggle the user's video feed.
    // For now, it's a simple alert to show it's working.
    alert("Toggling video!");
  };
  
  const handleToggleAudio = () => {
    // This function will eventually toggle the user's audio.
    alert("Toggling audio!");
  };

  const handleToggleLock = () => {
    // This function toggles the lock state of the current room.
    setIsRoomLocked(!isRoomLocked);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4">
      {/* Header with video/audio controls */}
      <div className="w-full flex justify-between items-center p-4 bg-gray-800 rounded-lg shadow-lg mb-4">
        <h2 className="text-2xl font-semibold text-white">The Virtual Office Lobby</h2>
        {selectedRoom && (
          <div className="flex space-x-2">
            <button onClick={handleToggleVideo} className="p-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-12-3v5a2 2 0 002 2h8a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </button>
            <button onClick={handleToggleAudio} className="p-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7 4a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3zm2 14v-2.111a1 1 0 00-.323-.746A1.5 1.5 0 017 14.5v-1a1.5 1.5 0 011.677-1.472A1 1 0 009 11.5V10h1v1.5a1 1 0 00.323.746A1.5 1.5 0 0112 13.5v1a1.5 1.5 0 01-1.677 1.472A1 1 0 0010 17.889V20H9z" clipRule="evenodd"></path>
              </svg>
            </button>
            <button onClick={handleToggleLock} className="p-2 bg-purple-600 text-white rounded-full shadow-md hover:bg-purple-700 transition-colors">
              {isRoomLocked ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2V7a3 3 0 00-6 0v2h6z" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm-5 5a5 5 0 0110 0v2h-10V7zm-2 4v5h14v-5H7z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleLeaveRoom}
              className="p-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Main Map Area */}
      <div
        className="relative bg-gray-800 border border-gray-700 w-full max-w-4xl h-96 rounded-lg shadow-inner flex items-center justify-center text-gray-400 p-8 overflow-hidden"
        onClick={handleMapClick}
      >
        <div className="grid grid-cols-4 gap-6 w-full h-full">
          <Room name="Lobby" onClick={() => handleJoinRoom("Lobby")} isSelected={selectedRoom === "Lobby"} isLocked={isRoomLocked && selectedRoom === "Lobby"} />
          <Room name="Meeting Room A" onClick={() => handleJoinRoom("Meeting Room A")} isSelected={selectedRoom === "Meeting Room A"} isLocked={isRoomLocked && selectedRoom === "Meeting Room A"} />
          <Room name="Breakout Room B" onClick={() => handleJoinRoom("Breakout Room B")} isSelected={selectedRoom === "Breakout Room B"} isLocked={isRoomLocked && selectedRoom === "Breakout Room B"} />
          <Room name="Conference Hall" onClick={() => handleJoinRoom("Conference Hall")} isSelected={selectedRoom === "Conference Hall"} isLocked={isRoomLocked && selectedRoom === "Conference Hall"} />
          <Room name="Creative Lab" onClick={() => handleJoinRoom("Creative Lab")} isSelected={selectedRoom === "Creative Lab"} isLocked={isRoomLocked && selectedRoom === "Creative Lab"} />
          <Room name="Dev Space" onClick={() => handleJoinRoom("Dev Space")} isSelected={selectedRoom === "Dev Space"} isLocked={isRoomLocked && selectedRoom === "Dev Space"} />
          <Room name="Quiet Zone" onClick={() => handleJoinRoom("Quiet Zone")} isSelected={selectedRoom === "Quiet Zone"} isLocked={isRoomLocked && selectedRoom === "Quiet Zone"} />
          <Room name="Support Desk" onClick={() => handleJoinRoom("Support Desk")} isSelected={selectedRoom === "Support Desk"} isLocked={isRoomLocked && selectedRoom === "Support Desk"} />
        </div>
        <UserAvatar
          name="You"
          style={{ top: `${userPosition.y}%`, left: `${userPosition.x}%`, transform: 'translate(-50%, -50%)' }}
        />
        {otherUsers.map((user, index) => (
          <UserAvatar key={index} name={user.name} style={user.style} />
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-400">Click a room to join! Current Room: {selectedRoom || "None"}</p>
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
