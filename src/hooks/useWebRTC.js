// src/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react'
import WebRTCService from '../services/webrtcService'

export const useWebRTC = (user, currentRoom) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [error, setError] = useState(null)
  
  const webrtcServiceRef = useRef(null)

  console.log('🎥 useWebRTC hook:', { user: user?.name, room: currentRoom })

  // Initialize WebRTC when entering a room
  useEffect(() => {
    if (!user?.sessionId || !currentRoom) {
      cleanup()
      return
    }

    console.log('🚀 Initializing WebRTC for room:', currentRoom)
    initializeWebRTC()

    return () => {
      cleanup()
    }
  }, [user, currentRoom])

  const initializeWebRTC = async () => {
    try {
      setError(null)
      
      // Create WebRTC service
      const service = new WebRTCService(user, currentRoom)
      
      // Set up callbacks
      service.onStreamAdded = (sessionId, stream) => {
        console.log('➕ Adding remote stream:', sessionId)
        setRemoteStreams(prev => new Map(prev.set(sessionId, stream)))
      }
      
      service.onStreamRemoved = (sessionId) => {
        console.log('➖ Removing remote stream:', sessionId)
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          newMap.delete(sessionId)
          return newMap
        })
      }
      
      // Initialize
      const result = await service.initialize()
      
      if (result.success) {
        webrtcServiceRef.current = service
        setLocalStream(result.localStream)
        setIsInitialized(true)
        
        // Join the room
        await service.joinRoom()
        
        console.log('✅ WebRTC initialized successfully')
      } else {
        throw result.error
      }
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error)
      setError(error.message)
    }
  }

  const cleanup = useCallback(() => {
    if (webrtcServiceRef.current) {
      console.log('🧹 Cleaning up WebRTC')
      webrtcServiceRef.current.leaveRoom()
      webrtcServiceRef.current.cleanup()
      webrtcServiceRef.current = null
    }
    
    setIsInitialized(false)
    setLocalStream(null)
    setRemoteStreams(new Map())
    setError(null)
  }, [])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (webrtcServiceRef.current) {
      const enabled = webrtcServiceRef.current.toggleVideo()
      setIsVideoEnabled(enabled)
      return enabled
    }
    return false
  }, [])

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (webrtcServiceRef.current) {
      const enabled = webrtcServiceRef.current.toggleAudio()
      setIsAudioEnabled(enabled)
      return enabled
    }
    return false
  }, [])

  return {
    isInitialized,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    error,
    toggleVideo,
    toggleAudio
  }
}