// src/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react'
import WebRTCService from '../services/webrtcService'

export const useWebRTC = (user, currentRoom, options = {}) => {
  const { lazyMedia = false } = options
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [isVideoEnabled, setIsVideoEnabled] = useState(false) // 🔇 Always start disabled
  const [isAudioEnabled, setIsAudioEnabled] = useState(false) // 🔇 Always start disabled
  const [hasRequestedMedia, setHasRequestedMedia] = useState(false) // 📹 Track if we've requested permissions
  const [error, setError] = useState(null)
  
  const webrtcServiceRef = useRef(null)

  console.log('🎥 useWebRTC hook:', { 
    user: user?.name, 
    room: currentRoom, 
    lazyMedia,
    hasRequestedMedia,
    remoteStreamsCount: remoteStreams.size 
  })

  // Initialize WebRTC when entering a room
  useEffect(() => {
    if (!user?.sessionId || !currentRoom) {
      cleanup()
      return
    }

    console.log('🚀 Initializing WebRTC for room:', currentRoom, 'lazyMedia:', lazyMedia)
    initializeWebRTC()

    return () => {
      cleanup()
    }
  }, [user, currentRoom])

  const initializeWebRTC = async () => {
    try {
      setError(null)
      
      // Create WebRTC service with lazy media option
      const service = new WebRTCService(user, currentRoom, { lazyMedia })
      
      // Set up callbacks for remote streams
      service.onStreamAdded = (sessionId, stream) => {
        console.log('➕ Remote stream added:', sessionId)
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          newMap.set(sessionId, stream)
          console.log('📊 Total remote streams after add:', newMap.size)
          return newMap
        })
      }
      
      service.onStreamRemoved = (sessionId) => {
        console.log('➖ Remote stream removed:', sessionId)
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          newMap.delete(sessionId)
          console.log('📊 Total remote streams after remove:', newMap.size)
          return newMap
        })
      }
      
      // Initialize service (without requesting media if lazyMedia = true)
      const result = await service.initialize()
      
      if (result.success) {
        webrtcServiceRef.current = service
        setIsInitialized(true)
        
        // Only set local stream if we got one (when lazyMedia = false)
        if (result.localStream) {
          setLocalStream(result.localStream)
          setHasRequestedMedia(true)
        }
        
        // Join the room to announce presence
        await service.joinRoom()
        
        console.log('✅ WebRTC initialized successfully', { hasLocalStream: !!result.localStream })
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
    setIsVideoEnabled(false)
    setIsAudioEnabled(false)
    setHasRequestedMedia(false)
    setError(null)
  }, [])

  // Toggle video - request media if needed
  const toggleVideo = useCallback(async () => {
    if (!webrtcServiceRef.current) return false

    try {
      // If we haven't requested media yet, request it now
      if (!hasRequestedMedia) {
        console.log('📹 Requesting media permissions for first time...')
        const stream = await webrtcServiceRef.current.requestMediaPermissions()
        if (stream) {
          setLocalStream(stream)
          setHasRequestedMedia(true)
        } else {
          throw new Error('Failed to get media permissions')
        }
      }

      // Toggle the video
      const enabled = webrtcServiceRef.current.toggleVideo()
      setIsVideoEnabled(enabled)
      console.log('📹 Video toggled:', enabled)
      return enabled
    } catch (error) {
      console.error('❌ Error toggling video:', error)
      setError(error.message)
      return false
    }
  }, [hasRequestedMedia])

  // Toggle audio - request media if needed  
  const toggleAudio = useCallback(async () => {
    if (!webrtcServiceRef.current) return false

    try {
      // If we haven't requested media yet, request it now
      if (!hasRequestedMedia) {
        console.log('🎤 Requesting media permissions for first time...')
        const stream = await webrtcServiceRef.current.requestMediaPermissions()
        if (stream) {
          setLocalStream(stream)
          setHasRequestedMedia(true)
        } else {
          throw new Error('Failed to get media permissions')
        }
      }

      // Toggle the audio
      const enabled = webrtcServiceRef.current.toggleAudio()
      setIsAudioEnabled(enabled)
      console.log('🎤 Audio toggled:', enabled)
      return enabled
    } catch (error) {
      console.error('❌ Error toggling audio:', error)
      setError(error.message)
      return false
    }
  }, [hasRequestedMedia])

  return {
    isInitialized,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    hasRequestedMedia,
    error,
    toggleVideo,
    toggleAudio
  }
}