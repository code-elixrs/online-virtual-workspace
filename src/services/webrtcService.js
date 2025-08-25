import { supabase } from '../supabaseClient'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export class WebRTCService {
  constructor(user, roomName, options = {}) {
    this.user = user
    this.roomName = roomName
    this.options = options
    this.localStream = null
    this.peerConnections = new Map() // sessionId -> RTCPeerConnection
    this.remoteStreams = new Map() // sessionId -> MediaStream
    this.signalChannel = null
    this.onStreamAdded = null
    this.onStreamRemoved = null
    this.mediaRequested = false
  }

  // Initialize WebRTC service
  async initialize() {
    console.log('🚀 Initializing WebRTC service for:', this.user.name, 'in', this.roomName, 'options:', this.options)
    
    try {
      // Set up signaling first (always needed)
      await this.setupSignaling()
      
      // Only request media if not using lazy initialization
      if (!this.options.lazyMedia) {
        console.log('📹 Requesting media immediately (non-lazy mode)')
        this.localStream = await this.requestMediaPermissions()
        this.mediaRequested = true
      } else {
        console.log('⏳ Lazy media mode - will request permissions when user enables video/audio')
      }
      
      console.log('✅ WebRTC service initialized')
      return { success: true, localStream: this.localStream }
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error)
      return { success: false, error }
    }
  }

  // Request media permissions (can be called later in lazy mode)
  async requestMediaPermissions() {
    if (this.mediaRequested && this.localStream) {
      console.log('📹 Media already available')
      return this.localStream
    }

    try {
      console.log('📹 Requesting camera and microphone permissions...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      
      console.log('✅ Got media stream:', stream.getTracks().map(t => `${t.kind}: enabled`))
      
      // Start with tracks disabled in lazy mode
      if (this.options.lazyMedia) {
        stream.getTracks().forEach(track => {
          track.enabled = false
          console.log('🔇 Disabled track:', track.kind)
        })
      }
      
      this.localStream = stream
      this.mediaRequested = true
      
      // Add to all existing peer connections
      this.addStreamToAllConnections()
      
      return stream
    } catch (error) {
      console.error('❌ Failed to get media permissions:', error)
      throw error
    }
  }

  // Add local stream to all existing peer connections
  addStreamToAllConnections() {
    if (!this.localStream) return

    console.log('➕ Adding local stream to', this.peerConnections.size, 'existing connections')
    
    this.peerConnections.forEach((pc, sessionId) => {
      console.log('➕ Adding stream to connection:', sessionId)
      
      // Remove old tracks first
      pc.getSenders().forEach(sender => {
        if (sender.track && this.localStream.getTracks().includes(sender.track)) {
          pc.removeTrack(sender)
        }
      })
      
      // Add new tracks
      this.localStream.getTracks().forEach(track => {
        console.log('➕ Adding track to peer connection:', track.kind, 'enabled:', track.enabled)
        pc.addTrack(track, this.localStream)
      })
    })
  }

  // Set up Supabase signaling channel  
  async setupSignaling() {
    console.log('📡 Setting up signaling channel for room:', this.roomName)
    
    // Subscribe to WebRTC signals for this room
    this.signalChannel = supabase
      .channel(`webrtc-${this.roomName}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `room_name=eq.${this.roomName}`
        },
        (payload) => {
          console.log('📨 Signal received:', payload.new.signal_type, 'from:', payload.new.from_session_id)
          this.handleSignal(payload.new)
        }
      )
      .subscribe((status) => {
        console.log('📡 Signaling channel status:', status)
      })
  }

  // Handle incoming WebRTC signals
  async handleSignal(signal) {
    // Skip our own signals
    if (signal.from_session_id === this.user.sessionId) {
      return
    }
    
    // Skip signals not for us (if targeted)
    if (signal.to_session_id && signal.to_session_id !== this.user.sessionId) {
      return
    }

    const fromSessionId = signal.from_session_id
    console.log('🔧 Processing signal:', signal.signal_type, 'from:', fromSessionId)
    
    try {
      switch (signal.signal_type) {
        case 'offer':
          await this.handleOffer(fromSessionId, signal.signal_data)
          break
        case 'answer':
          await this.handleAnswer(fromSessionId, signal.signal_data)
          break
        case 'ice-candidate':
          await this.handleIceCandidate(fromSessionId, signal.signal_data)
          break
        case 'user-joined':
          await this.handleUserJoined(fromSessionId)
          break
        case 'user-left':
          await this.handleUserLeft(fromSessionId)
          break
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error)
    }
  }

  // Create peer connection for a user
  createPeerConnection(sessionId) {
    console.log('🔗 Creating peer connection for:', sessionId)
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    
    // Add local stream tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('➕ Adding local track to peer connection:', track.kind, 'enabled:', track.enabled)
        pc.addTrack(track, this.localStream)
      })
    } else {
      console.log('⏳ No local stream yet - will add when available')
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎬 Received remote track from:', sessionId, 'kind:', event.track.kind, 'enabled:', event.track.enabled)
      const [remoteStream] = event.streams
      
      if (remoteStream) {
        console.log('📺 Setting remote stream for:', sessionId, 'tracks:', remoteStream.getTracks().length)
        this.remoteStreams.set(sessionId, remoteStream)
        
        // Track when remote tracks are enabled/disabled
        remoteStream.getTracks().forEach(track => {
          track.onended = () => {
            console.log('🛑 Remote track ended:', sessionId, track.kind)
          }
        })
        
        if (this.onStreamAdded) {
          this.onStreamAdded(sessionId, remoteStream)
        }
      }
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('ice-candidate', event.candidate, sessionId)
      }
    }
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state with', sessionId, ':', pc.connectionState)
      
      if (pc.connectionState === 'connected') {
        console.log('✅ Connected to:', sessionId)
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        console.log('💔 Connection lost with:', sessionId)
        this.removePeerConnection(sessionId)
      }
    }
    
    this.peerConnections.set(sessionId, pc)
    return pc
  }

  // Handle offer from remote peer
  async handleOffer(fromSessionId, offerData) {
    console.log('📞 Handling offer from:', fromSessionId)
    
    const pc = this.createPeerConnection(fromSessionId)
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerData))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      console.log('📤 Sending answer to:', fromSessionId)
      this.sendSignal('answer', answer, fromSessionId)
    } catch (error) {
      console.error('❌ Error handling offer:', error)
    }
  }

  // Handle answer from remote peer
  async handleAnswer(fromSessionId, answerData) {
    const pc = this.peerConnections.get(fromSessionId)
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answerData))
        console.log('✅ Answer processed for:', fromSessionId)
      } catch (error) {
        console.error('❌ Error handling answer:', error)
      }
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(fromSessionId, candidateData) {
    const pc = this.peerConnections.get(fromSessionId)
    if (pc && candidateData) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData))
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    }
  }

  // Handle new user joining
  async handleUserJoined(sessionId) {
    console.log('👋 User joined, creating offer for:', sessionId)
    
    if (!this.peerConnections.has(sessionId)) {
      const pc = this.createPeerConnection(sessionId)
      
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        
        console.log('📤 Sending offer to:', sessionId)
        this.sendSignal('offer', offer, sessionId)
      } catch (error) {
        console.error('❌ Error creating offer:', error)
      }
    }
  }

  // Handle user leaving
  async handleUserLeft(sessionId) {
    console.log('👋 User left:', sessionId)
    this.removePeerConnection(sessionId)
  }

  // Send signal through Supabase
  async sendSignal(type, data, toSessionId = null) {
    try {
      const signalData = {
        room_name: this.roomName,
        from_session_id: this.user.sessionId,
        to_session_id: toSessionId,
        signal_type: type,
        signal_data: data
      }
      
      const { error } = await supabase
        .from('webrtc_signals')
        .insert(signalData)
      
      if (error) {
        console.error('❌ Failed to send signal:', error)
      }
    } catch (error) {
      console.error('❌ Exception sending signal:', error)
    }
  }

  // Join room
  async joinRoom() {
    console.log('🚪 Joining WebRTC room:', this.roomName)
    await this.sendSignal('user-joined', { 
      timestamp: Date.now(),
      userName: this.user.name 
    })
  }

  // Leave room
  async leaveRoom() {
    console.log('🚪 Leaving WebRTC room')
    await this.sendSignal('user-left', { timestamp: Date.now() })
    this.cleanup()
  }

  // Toggle local video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        console.log('📹 Video toggled:', videoTrack.enabled)
        return videoTrack.enabled
      }
    }
    return false
  }

  // Toggle local audio
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        console.log('🎤 Audio toggled:', audioTrack.enabled)
        return audioTrack.enabled
      }
    }
    return false
  }

  // Remove peer connection
  removePeerConnection(sessionId) {
    const pc = this.peerConnections.get(sessionId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(sessionId)
    }
    
    if (this.remoteStreams.has(sessionId)) {
      this.remoteStreams.delete(sessionId)
      
      if (this.onStreamRemoved) {
        this.onStreamRemoved(sessionId)
      }
    }
  }

  // Clean up all connections
  cleanup() {
    console.log('🧹 Cleaning up WebRTC service')
    
    this.peerConnections.forEach(pc => pc.close())
    this.peerConnections.clear()
    this.remoteStreams.clear()
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    if (this.signalChannel) {
      supabase.removeChannel(this.signalChannel)
      this.signalChannel = null
    }
    
    this.mediaRequested = false
  }
}

export default WebRTCService