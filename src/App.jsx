import React from 'react';
import './index.css';

// The main App component will be our root for the entire application.
// For now, it's just a placeholder to show everything is working.
const App = () => {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
      <div className="text-center p-8 rounded-lg shadow-lg bg-gray-800 border border-gray-700">
        <h1 className="text-3xl font-bold mb-4">Online Virtual Workplace</h1>
        <p className="text-lg">Project setup complete. Let's start building!</p>
        <p className="text-sm mt-2 text-gray-400">Next Task: Implement the Lobby View.</p>
      </div>
    </div>
  );
};

export default App;
