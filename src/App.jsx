// import React, { useState, useEffect } from 'react';
// import { supabase, testConnection } from './supabaseClient';
// import UsernamePrompt from './components/UsernamePrompt';
// import ChatPanel from './components/ChatPanel';
// import RoomControls from './components/RoomControls';
// import LobbyView from './components/LobbyView';






// const App = () => {
//   const [connectionStatus, setConnectionStatus] = useState('testing...');
//   const [user, setUser] = useState(null);
//   const [currentRoom, setCurrentRoom] = useState(null);
//   const [isChatOpen, setIsChatOpen] = useState(false);

//   // Test connection on app load
//   useEffect(() => {
//     const checkConnection = async () => {
//       console.log('Testing Supabase connection...');
//       const isConnected = await testConnection();
//       setConnectionStatus(isConnected ? 'connected ✅' : 'failed ❌');
//     };
    
//     checkConnection();
//   }, []);

//   // const handleUsernameSet = async (username, userId) => {
//   //   setUser({ id: userId, name: username });
//   // };
//   const handleUsernameSet = async (username, sessionId) => {
//     setUser({ name: username, sessionId: sessionId });
//   };

//   const handleJoinRoom = (roomName) => {
//     setCurrentRoom(roomName);
//     setIsChatOpen(true); // Auto-open chat when joining room
//   };

//   const handleLeaveRoom = () => {
//     setCurrentRoom(null);
//     setIsChatOpen(false);
//   };

//   const handleToggleChat = () => {
//     setIsChatOpen(!isChatOpen);
//   };

//   // Show username prompt if no user
//   if (!user) {
//     return <UsernamePrompt onUsernameSet={handleUsernameSet} />;
//   }

//   return (
//     <div className="bg-gray-950 min-h-screen flex flex-col">
//       {/* Connection status (temporary) */}
//       <div className="bg-gray-800 text-white p-1 text-center text-xs flex-shrink-0">
//         Supabase: {connectionStatus}
//       </div>
      
//       {/* Room Controls (only show when in a room) */}
//       {currentRoom && (
//         <div className="flex-shrink-0">
//           <RoomControls
//             roomName={currentRoom}
//             onLeaveRoom={handleLeaveRoom}
//             onToggleChat={handleToggleChat}
//             isChatOpen={isChatOpen}
//             user={user}
//           />
//         </div>
//       )}
      
//       {/* Main Content Area - This is the key change */}
//       <div className="flex-1 flex min-h-0">
//         {/* Lobby View */}
//         <div className="flex-1 min-w-0">
//           <LobbyView 
//             onJoinRoom={handleJoinRoom}
//             user={user}
//             currentRoom={currentRoom}
//           />
//         </div>
        
//         {/* Chat Panel - Now properly constrained */}
//         {isChatOpen && (
//           <div className="flex-shrink-0">
//             <ChatPanel
//               roomName={currentRoom}
//               user={user}
//               isOpen={isChatOpen}
//               onClose={() => setIsChatOpen(false)}
//             />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default App;

import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from './supabaseClient';
import UsernamePrompt from './components/UsernamePrompt';
import ChatPanel from './components/ChatPanel';
import RoomControls from './components/RoomControls';
import LobbyView from './components/LobbyView';
import { tabManager } from './utils/tabManager';
import { usernameService } from './services/usernameService';

const App = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing...');
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Test connection and restore session on app load
  useEffect(() => {
    const initializeApp = async () => {
      console.log('Initializing app...');
      
      // Test connection
      const isConnected = await testConnection();
      setConnectionStatus(isConnected ? 'connected ✅' : 'failed ❌');

      if (isConnected) {
        // Try to restore saved session
        const savedSession = tabManager.getSavedSession();
        if (savedSession) {
          console.log('Attempting to restore session:', savedSession);
          
          // Check if username is still available (no active session)
          const { available } = await usernameService.isUsernameAvailable(savedSession.user.name);
          
          if (available) {
            // Reclaim the username
            const result = await usernameService.claimUsername(
              savedSession.user.name, 
              savedSession.user.sessionId,
              savedSession.position,
              savedSession.room
            );
            
            if (result.success) {
              setUser(savedSession.user);
              setCurrentRoom(savedSession.room);
              console.log('✅ Session restored successfully');
            } else {
              console.log('Failed to reclaim username, clearing session');
              tabManager.clearSession();
            }
          } else {
            console.log('Username no longer available, clearing session');
            tabManager.clearSession();
          }
        }
      }
      
      setIsRestoring(false);
    };

    initializeApp();
  }, []);

  const handleUsernameSet = async (username, sessionId) => {
    const newUser = { name: username, sessionId: sessionId };
    setUser(newUser);
    
    // Save to localStorage for persistence
    tabManager.saveUserSession(newUser, { x: 50, y: 50 }, null);
  };

  const handleJoinRoom = (roomName) => {
    setCurrentRoom(roomName);
    setIsChatOpen(true);
    
    // Update saved session
    tabManager.updateSession({ x: 50, y: 50 }, roomName);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setIsChatOpen(false);
    
    // Update saved session
    tabManager.updateSession({ x: 50, y: 50 }, null);
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleSignout = () => {
    setUser(null);
    setCurrentRoom(null);
    setIsChatOpen(false);
  };

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          Restoring session...
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
      
      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Lobby View */}
        <div className="flex-1 min-w-0">
          <LobbyView 
            onJoinRoom={handleJoinRoom}
            user={user}
            currentRoom={currentRoom}
            onSignout={handleSignout}
          />
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