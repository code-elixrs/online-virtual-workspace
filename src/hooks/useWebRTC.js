// src/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react'
import WebRTCService from '../services/webrtcService'

export const useWebRTC = (user, currentRoom, options = {}) => {
  const { lazyMedia = false } = options
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [isVideoEnabled, setIsVideoEnabled] = useState(false) // Always start disabled
  const [isAudioEnabled, setIsAudioEnabled] = useState(false) // Always start disabled
  const [hasRequestedMedia, setHasRequestedMedia] = useState(false)
  const [error, setError] = useState(null)
  const [connectionStates, setConnectionStates] = useState(new Map()) // Track peer connection states
  const [isConnecting, setIsConnecting] = useState(false)
  
  const webrtcServiceRef = useRef(null)

  console.log('🎥 useWebRTC:', { 
    user: user?.name, 
    room: currentRoom, 
    isInitialized,
    hasRequestedMedia,
    remoteCount: remoteStreams.size,
    isConnecting
  })

  // Initialize WebRTC when entering a room
  useEffect(() => {
    if (!user?.sessionId || !currentRoom) {
      cleanup()
      return
    }

    console.log('🚀 Initializing WebRTC for room:', currentRoom)
    setIsConnecting(true)
    initializeWebRTC()

    return cleanup
  }, [user, currentRoom])

  const initializeWebRTC = async () => {
    try {
      setError(null)
      
      // Create WebRTC service
      const service = new WebRTCService(user, currentRoom, { lazyMedia: true })
      
      // Set up stream callbacks
      service.onStreamAdded = (sessionId, stream) => {
        console.log('➕ Remote stream added:', sessionId.slice(-4))
        setRemoteStreams(prev => new Map(prev.set(sessionId, stream)))
      }
      
      service.onStreamRemoved = (sessionId) => {
        console.log('➖ Remote stream removed:', sessionId.slice(-4))
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          newMap.delete(sessionId)
          return newMap
        })
      }
      
      // Set up connection state tracking
      service.onConnectionStateChange = (sessionId, state) => {
        console.log('🔌 Connection state change:', sessionId.slice(-4), state)
        setConnectionStates(prev => new Map(prev.set(sessionId, state)))
        
        // Update connecting state based on overall connection status
        const summary = service.getConnectionSummary()
        setIsConnecting(summary.connectingPeers > 0)
      }
      
      // Initialize service (signaling only, no media yet)
      const result = await service.initialize()
      
      if (result.success) {
        webrtcServiceRef.current = service
        setIsInitialized(true)
        setIsConnecting(false)
        
        // Join room to announce presence
        await service.joinRoom()
        
        console.log('✅ WebRTC initialized and joined room')
      } else {
        throw result.error
      }
    } catch (error) {
      console.error('❌ WebRTC initialization failed:', error)
      setError(error.message)
      setIsInitialized(false)
      setIsConnecting(false)
    }
  }

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up WebRTC')
    
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.cleanup()
      webrtcServiceRef.current = null
    }
    
    setIsInitialized(false)
    setLocalStream(null)
    setRemoteStreams(new Map())
    setConnectionStates(new Map())
    setIsVideoEnabled(false)
    setIsAudioEnabled(false)
    setHasRequestedMedia(false)
    setIsConnecting(false)
    setError(null)
  }, [])

  // Toggle video - request permissions if needed
  const toggleVideo = useCallback(async () => {
    if (!webrtcServiceRef.current || !isInitialized) {
      console.log('❌ WebRTC not ready for video toggle')
      return false
    }

    try {
      setIsConnecting(true) // Show connecting while requesting permissions
      
      // Request media permissions if first time
      if (!hasRequestedMedia) {
        console.log('📹 Requesting media for first time...')
        const stream = await webrtcServiceRef.current.requestMediaPermissions()
        if (stream) {
          setLocalStream(stream)
          setHasRequestedMedia(true)
          
          // Update audio state based on actual track state
          const audioTrack = stream.getAudioTracks()[0]
          if (audioTrack) {
            setIsAudioEnabled(audioTrack.enabled)
          }
        }
      }

      // Toggle video track
      const enabled = webrtcServiceRef.current.toggleVideo()
      setIsVideoEnabled(enabled)
      setIsConnecting(false)
      
      console.log('📹 Video toggled:', enabled)
      return enabled
    } catch (error) {
      console.error('❌ Video toggle failed:', error)
      setError(error.message)
      setIsConnecting(false)
      return false
    }
  }, [isInitialized, hasRequestedMedia])

  // Toggle audio - request permissions if needed
  const toggleAudio = useCallback(async () => {
    if (!webrtcServiceRef.current || !isInitialized) {
      console.log('❌ WebRTC not ready for audio toggle')
      return false
    }

    try {
      setIsConnecting(true) // Show connecting while requesting permissions
      
      // Request media permissions if first time
      if (!hasRequestedMedia) {
        console.log('🎤 Requesting media for first time...')
        const stream = await webrtcServiceRef.current.requestMediaPermissions()
        if (stream) {
          setLocalStream(stream)
          setHasRequestedMedia(true)
          
          // Update video state based on actual track state
          const videoTrack = stream.getVideoTracks()[0]
          if (videoTrack) {
            setIsVideoEnabled(videoTrack.enabled)
          }
        }
      }

      // Toggle audio track
      const enabled = webrtcServiceRef.current.toggleAudio()
      setIsAudioEnabled(enabled)
      setIsConnecting(false)
      
      console.log('🎤 Audio toggled:', enabled)
      return enabled
    } catch (error) {
      console.error('❌ Audio toggle failed:', error)
      setError(error.message)
      setIsConnecting(false)
      return false
    }
  }, [isInitialized, hasRequestedMedia])

  // Get connection summary for UI
  const getConnectionSummary = useCallback(() => {
    if (!webrtcServiceRef.current) {
      return {
        totalConnections: 0,
        connectedPeers: 0,
        connectingPeers: 0,
        failedPeers: 0,
        remoteStreams: 0
      }
    }
    
    return webrtcServiceRef.current.getConnectionSummary()
  }, [])

  return {
    isInitialized,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    hasRequestedMedia,
    error,
    connectionStates,
    isConnecting,
    toggleVideo,
    toggleAudio,
    getConnectionSummary
  }
}