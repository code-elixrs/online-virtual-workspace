import React from 'react'
import { useWebRTC } from '../hooks/useWebRTC'

const RoomControls = ({ roomName, onLeaveRoom, onToggleChat, isChatOpen, user }) => {
  const {
    isInitialized,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    error
  } = useWebRTC(user, roomName)

  const handleToggleMic = () => {
    const enabled = toggleAudio()
    console.log(`🎤 Microphone ${enabled ? 'enabled' : 'disabled'}`)
  }

  const handleToggleVideo = () => {
    const enabled = toggleVideo()
    console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`)
  }

  return (
    <div className="bg-gray-800 border-b-4 border-blue-600 p-4 shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        {/* Room Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              isInitialized ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <div>
              <h2 className="text-xl font-bold text-white">{roomName}</h2>
              <p className="text-sm text-gray-400">
                Welcome, {user.name}
                {error && <span className="text-red-400 ml-2">• {error}</span>}
                {!isInitialized && !error && <span className="text-yellow-400 ml-2">• Connecting...</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Microphone */}
          <button
            onClick={handleToggleMic}
            disabled={!isInitialized}
            className={`p-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isAudioEnabled 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Disable Microphone' : 'Enable Microphone'}
          >
            {isAudioEnabled ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 616 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.293 2.293a1 1 0 011.414 0L7 5.586V4a3 3 0 116 0v4c0 .657-.19 1.269-.515 1.786l1.48 1.48A7.001 7.001 0 0017 8a1 1 0 10-2 0 5.002 5.002 0 01-3.515 4.786L9.707 10.707A3.001 3.001 0 0113 8V4a1 1 0 00-2 0v4a1 1 0 01-1 1 .999.999 0 01-.707-.293L2.293 2.293a1 1 0 000 1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Video */}
          <button
            onClick={handleToggleVideo}
            disabled={!isInitialized}
            className={`p-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isVideoEnabled 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoEnabled ? 'Disable Video' : 'Enable Video'}
          >
            {isVideoEnabled ? (
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