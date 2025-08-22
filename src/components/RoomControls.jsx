import React, { useState } from 'react'

const RoomControls = ({ roomName, onLeaveRoom, onToggleChat, isChatOpen, user }) => {
  const [isMicOn, setIsMicOn] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(false)

  const handleToggleMic = () => {
    setIsMicOn(!isMicOn)
    // TODO: Implement actual mic control in Task 3.3
    console.log(`Microphone ${!isMicOn ? 'enabled' : 'disabled'}`)
  }

  const handleToggleVideo = () => {
    setIsVideoOn(!isVideoOn)
    // TODO: Implement actual video control in Task 3.3
    console.log(`Video ${!isVideoOn ? 'enabled' : 'disabled'}`)
  }

  return (
    <div className="bg-gray-800 border-b-4 border-blue-600 p-4 shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        {/* Room Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-xl font-bold text-white">{roomName}</h2>
              <p className="text-sm text-gray-400">Welcome, {user.name}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Microphone */}
          <button
            onClick={handleToggleMic}
            className={`p-3 rounded-full transition-all duration-200 ${
              isMicOn 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isMicOn ? 'Disable Microphone' : 'Enable Microphone'}
          >
            {isMicOn ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3zm-1 9a1 1 0 01-1-1V9a1 1 0 112 0v3a1 1 0 01-1 1zm8-1a1 1 0 10-2 0v1a3 3 0 01-3 3h-1a1 1 0 100 2h1a5 5 0 005-5v-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.293 2.293a1 1 0 011.414 0l14 14a1 1 0 01-1.414 1.414L14 15.414A5.002 5.002 0 015 16h-1a1 1 0 100 2h1a7.003 7.003 0 006.929-6.071L9.586 9.586A3 3 0 017 7V4a3 3 0 015.686-1.314L10 5.414V7a1 1 0 102 0V4a5 5 0 00-9.757-1.757L2.293 2.293z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Video */}
          <button
            onClick={handleToggleVideo}
            className={`p-3 rounded-full transition-all duration-200 ${
              isVideoOn 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoOn ? 'Disable Video' : 'Enable Video'}
          >
            {isVideoOn ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-12-3v5a2 2 0 002 2h8a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 21l-4.243-4.243" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9v6a2 2 0 002 2h2m4-6V9a2 2 0 00-2-2H9" />
              </svg>
            )}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={onToggleChat}
            className={`p-3 rounded-full transition-all duration-200 ${
              isChatOpen 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title={isChatOpen ? 'Close Chat' : 'Open Chat'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Leave Room */}
          <button
            onClick={onLeaveRoom}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-200"
            title="Leave Room"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomControls