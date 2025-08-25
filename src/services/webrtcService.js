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
    this.isCleaningUp = false
  }

  // Initialize WebRTC service
  async initialize() {
    console.log('🚀 Initializing WebRTC service for:', this.user.name, 'in', this.roomName)
    
    try {
      // Set up signaling first (always needed for receiving remote streams)
      await this.setupSignaling()
      
      // In lazy mode, don't request media immediately
      if (!this.options.lazyMedia) {
        this.localStream = await this.requestMediaPermissions()
        this.mediaRequested = true
      }
      
      console.log('✅ WebRTC service initialized')
      return { success: true, localStream: this.localStream }
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error)
      return { success: false, error }
    }
  }

  // Request media permissions
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
      
      console.log('✅ Got media stream with tracks:', stream.getTracks().map(t => `${t.kind}`))
      
      // Start with tracks disabled in lazy mode
      stream.getTracks().forEach(track => {
        track.enabled = false
        console.log('🔇 Track disabled by default:', track.kind)
      })
      
      this.localStream = stream
      this.mediaRequested = true
      
      // Add to all existing peer connections
      await this.addStreamToAllConnections()
      
      return stream
    } catch (error) {
      console.error('❌ Failed to get media permissions:', error)
      throw error
    }
  }

  // Add local stream to all existing peer connections
  async addStreamToAllConnections() {
    if (!this.localStream || this.peerConnections.size === 0) {
      console.log('⏳ No stream or connections to update')
      return
    }

    console.log('➕ Adding local stream to', this.peerConnections.size, 'existing connections')
    
    for (const [sessionId, pc] of this.peerConnections) {
      try {
        // Remove existing tracks from this connection
        const existingSenders = pc.getSenders()
        for (const sender of existingSenders) {
          if (sender.track) {
            pc.removeTrack(sender)
            console.log('➖ Removed old track from:', sessionId)
          }
        }
        
        // Add new tracks
        this.localStream.getTracks().forEach(track => {
          const sender = pc.addTrack(track, this.localStream)
          console.log('➕ Added track to', sessionId, ':', track.kind, 'enabled:', track.enabled)
        })
        
        // Renegotiate the connection
        if (pc.signalingState === 'stable') {
          console.log('🔄 Renegotiating connection with:', sessionId)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          this.sendSignal('offer', offer, sessionId)
        }
        
      } catch (error) {
        console.error('❌ Error adding stream to connection:', sessionId, error)
      }
    }
  }

  // Set up Supabase signaling channel
  async setupSignaling() {
    console.log('📡 Setting up signaling for room:', this.roomName)
    
    // Create unique channel name to avoid conflicts
    const channelName = `webrtc-${this.roomName}-${Date.now()}`
    
    this.signalChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `room_name=eq.${this.roomName}`
        },
        (payload) => {
          if (!this.isCleaningUp) {
            console.log('📨 Received signal:', payload.new.signal_type, 'from:', payload.new.from_session_id?.slice(-4))
            this.handleSignal(payload.new)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Signaling channel status:', status)
      })
      
    // Wait a moment for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Handle incoming WebRTC signals
  async handleSignal(signal) {
    if (this.isCleaningUp) return
    
    // Skip our own signals
    if (signal.from_session_id === this.user.sessionId) {
      return
    }
    
    // Skip signals not for us
    if (signal.to_session_id && signal.to_session_id !== this.user.sessionId) {
      return
    }

    const fromSessionId = signal.from_session_id
    console.log('🔧 Processing:', signal.signal_type, 'from:', fromSessionId?.slice(-4))
    
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
          await this.handleUserJoined(fromSessionId, signal.signal_data)
          break
        case 'user-left':
          await this.handleUserLeft(fromSessionId)
          break
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error)
    }
  }

  // Create peer connection
  createPeerConnection(sessionId) {
    if (this.peerConnections.has(sessionId)) {
      console.log('♻️ Reusing existing connection for:', sessionId?.slice(-4))
      return this.peerConnections.get(sessionId)
    }
    
    console.log('🔗 Creating NEW peer connection for:', sessionId?.slice(-4))
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    })
    
    // Add local stream if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, this.localStream)
        console.log('➕ Added local track:', track.kind, 'enabled:', track.enabled)
      })
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎬 Remote track received from:', sessionId?.slice(-4), 'kind:', event.track.kind)
      const [remoteStream] = event.streams
      
      if (remoteStream && remoteStream.getTracks().length > 0) {
        console.log('📺 Remote stream has', remoteStream.getTracks().length, 'tracks')
        this.remoteStreams.set(sessionId, remoteStream)
        
        if (this.onStreamAdded) {
          console.log('📢 Notifying about new remote stream:', sessionId?.slice(-4))
          this.onStreamAdded(sessionId, remoteStream)
        }
      }
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate for:', sessionId?.slice(-4))
        this.sendSignal('ice-candidate', event.candidate, sessionId)
      } else {
        console.log('🧊 ICE gathering complete for:', sessionId?.slice(-4))
      }
    }
    
    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('🔌', sessionId?.slice(-4), 'connection:', pc.connectionState)
      
      if (pc.connectionState === 'connected') {
        console.log('✅ Connected to:', sessionId?.slice(-4))
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        console.log('💔 Connection failed/closed:', sessionId?.slice(-4))
        setTimeout(() => this.removePeerConnection(sessionId), 1000)
      }
    }
    
    pc.oniceconnectionstatechange = () => {
      console.log('🧊', sessionId?.slice(-4), 'ICE:', pc.iceConnectionState)
    }
    
    this.peerConnections.set(sessionId, pc)
    return pc
  }

  // Handle offer
  async handleOffer(fromSessionId, offerData) {
    console.log('📞 Handling offer from:', fromSessionId?.slice(-4))
    
    try {
      const pc = this.createPeerConnection(fromSessionId)
      
      await pc.setRemoteDescription(new RTCSessionDescription(offerData))
      console.log('📥 Set remote description (offer)')
      
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.log('📤 Sending answer to:', fromSessionId?.slice(-4))
      
      this.sendSignal('answer', answer, fromSessionId)
    } catch (error) {
      console.error('❌ Error handling offer:', error)
    }
  }

  // Handle answer
  async handleAnswer(fromSessionId, answerData) {
    console.log('📞 Handling answer from:', fromSessionId?.slice(-4))
    
    const pc = this.peerConnections.get(fromSessionId)
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answerData))
        console.log('✅ Answer processed for:', fromSessionId?.slice(-4))
      } catch (error) {
        console.error('❌ Error handling answer:', error)
      }
    } else {
      console.warn('⚠️ No pending offer for answer from:', fromSessionId?.slice(-4))
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(fromSessionId, candidateData) {
    const pc = this.peerConnections.get(fromSessionId)
    if (pc && candidateData) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData))
        console.log('✅ ICE candidate added for:', fromSessionId?.slice(-4))
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    }
  }

  // Handle user joined
  async handleUserJoined(sessionId, signalData) {
    console.log('👋 User joined:', signalData?.userName, '(' + sessionId?.slice(-4) + ')')
    
    // Small delay to ensure both sides are ready
    setTimeout(async () => {
      if (!this.peerConnections.has(sessionId) && !this.isCleaningUp) {
        try {
          const pc = this.createPeerConnection(sessionId)
          
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          })
          
          await pc.setLocalDescription(offer)
          console.log('📤 Sending offer to new user:', sessionId?.slice(-4))
          
          this.sendSignal('offer', offer, sessionId)
        } catch (error) {
          console.error('❌ Error creating offer for new user:', error)
        }
      }
    }, Math.random() * 1000 + 500) // Random delay 500-1500ms to prevent race conditions
  }

  // Handle user left
  async handleUserLeft(sessionId) {
    console.log('👋 User left:', sessionId?.slice(-4))
    this.removePeerConnection(sessionId)
  }

  // Send signal
  async sendSignal(type, data, toSessionId = null) {
    if (this.isCleaningUp) return
    
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
        console.error('❌ Signal send failed:', error)
      } else {
        console.log('📤 Signal sent:', type, 'to:', toSessionId?.slice(-4) || 'all')
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
  }

  // Toggle video - FIXED camera control
  toggleVideo() {
    if (!this.localStream) {
      console.log('❌ No local stream for video toggle')
      return false
    }

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      console.log('📹 Video track enabled:', videoTrack.enabled)
      
      // 🔧 FIXED: Stop/start track properly instead of just disabling
      if (!videoTrack.enabled) {
        // When disabling, actually stop the track to turn off camera light
        videoTrack.stop()
        console.log('🛑 Video track stopped (camera off)')
        
        // Create a new disabled video track
        this.requestNewVideoTrack(false)
      }
      
      return videoTrack.enabled
    }
    return false
  }

  // Request new video track (for proper camera control)
  async requestNewVideoTrack(enabled = true) {
    try {
      if (!enabled) return // Don't request new track when disabling
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const newVideoTrack = stream.getVideoTracks()[0]
      
      if (newVideoTrack && this.localStream) {
        // Replace the old video track
        const oldVideoTrack = this.localStream.getVideoTracks()[0]
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack)
        }
        
        this.localStream.addTrack(newVideoTrack)
        newVideoTrack.enabled = enabled
        
        // Update all peer connections
        this.peerConnections.forEach(async (pc, sessionId) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
          if (sender) {
            await sender.replaceTrack(newVideoTrack)
            console.log('🔄 Video track replaced for:', sessionId?.slice(-4))
          }
        })
        
        console.log('✅ New video track created and enabled:', enabled)
      }
    } catch (error) {
      console.error('❌ Error creating new video track:', error)
    }
  }

  // Toggle audio
  toggleAudio() {
    if (!this.localStream) {
      console.log('❌ No local stream for audio toggle')
      return false
    }

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      console.log('🎤 Audio enabled:', audioTrack.enabled)
      return audioTrack.enabled
    }
    return false
  }

  // Remove peer connection
  removePeerConnection(sessionId) {
    const pc = this.peerConnections.get(sessionId)
    if (pc) {
      console.log('🗑️ Removing peer connection:', sessionId?.slice(-4))
      pc.close()
      this.peerConnections.delete(sessionId)
    }
    
    if (this.remoteStreams.has(sessionId)) {
      console.log('📺 Removing remote stream:', sessionId?.slice(-4))
      this.remoteStreams.delete(sessionId)
      
      if (this.onStreamRemoved) {
        this.onStreamRemoved(sessionId)
      }
    }
  }

  // Cleanup
  cleanup() {
    console.log('🧹 Cleaning up WebRTC service')
    this.isCleaningUp = true
    
    // Close all peer connections
    this.peerConnections.forEach((pc, sessionId) => {
      console.log('🔌 Closing connection:', sessionId?.slice(-4))
      pc.close()
    })
    this.peerConnections.clear()
    this.remoteStreams.clear()
    
    // Stop and clean up local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('🛑 Stopping track:', track.kind)
        track.stop()
      })
      this.localStream = null
    }
    
    // Close signaling
    if (this.signalChannel) {
      console.log('📡 Closing signaling channel')
      supabase.removeChannel(this.signalChannel)
      this.signalChannel = null
    }
    
    this.mediaRequested = false
  }
}

export default WebRTCService