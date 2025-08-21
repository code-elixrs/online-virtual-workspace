import React from 'react';
import './index.css';

// This is the LobbyView component. It will contain the virtual office map and all users.
// For now, it's a simple placeholder.
const LobbyView = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-semibold mb-4 text-white">The Virtual Office Lobby</h2>
      <div className="bg-gray-800 border border-gray-700 w-full max-w-4xl h-96 rounded-lg shadow-inner flex items-center justify-center text-gray-400">
        <p>Office Map will be displayed here.</p>
      </div>
    </div>
  );
};

// The main App component will handle which view is displayed (Lobby, Room, etc.).
// For now, we will just render the LobbyView.
const App = () => {
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center">
      <LobbyView />
    </div>
  );
};

export default App;
