import { supabase } from '../supabaseClient'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers here for production
]

export class WebRTCService {
  constructor(user, roomName) {
    this.user = user
    this.roomName = roomName
    this.localStream = null
    this.peerConnections = new Map() // sessionId -> RTCPeerConnection
    this.remoteStreams = new Map() // sessionId -> MediaStream
    this.signalChannel = null
    this.onStreamAdded = null
    this.onStreamRemoved = null
  }

  // Initialize WebRTC service
  async initialize() {
    console.log('🚀 Initializing WebRTC service for:', this.user.name, 'in', this.roomName)
    
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      
      // Set up signaling
      await this.setupSignaling()
      
      console.log('✅ WebRTC service initialized')
      return { success: true, localStream: this.localStream }
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error)
      return { success: false, error }
    }
  }

  // Set up Supabase signaling channel
  async setupSignaling() {
    console.log('📡 Setting up signaling channel')
    
    // Subscribe to WebRTC signals for this room
    this.signalChannel = supabase
      .channel(`webrtc-${this.roomName}-${this.user.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `room_name=eq.${this.roomName}`
        },
        (payload) => this.handleSignal(payload.new)
      )
      .subscribe()
  }

  // Handle incoming WebRTC signals
  async handleSignal(signal) {
    console.log('📨 Received signal:', signal.signal_type, 'from:', signal.from_session_id)
    
    // Skip our own signals
    if (signal.from_session_id === this.user.sessionId) return
    
    // Skip signals not for us (broadcast or direct)
    if (signal.to_session_id && signal.to_session_id !== this.user.sessionId) return

    const fromSessionId = signal.from_session_id
    
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
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream)
      })
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('📹 Received remote stream from:', sessionId)
      const [remoteStream] = event.streams
      this.remoteStreams.set(sessionId, remoteStream)
      
      if (this.onStreamAdded) {
        this.onStreamAdded(sessionId, remoteStream)
      }
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to:', sessionId)
        this.sendSignal('ice-candidate', event.candidate, sessionId)
      }
    }
    
    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state with', sessionId, ':', pc.connectionState)
      
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
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
    
    await pc.setRemoteDescription(new RTCSessionDescription(offerData))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    this.sendSignal('answer', answer, fromSessionId)
  }

  // Handle answer from remote peer
  async handleAnswer(fromSessionId, answerData) {
    console.log('✅ Handling answer from:', fromSessionId)
    
    const pc = this.peerConnections.get(fromSessionId)
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answerData))
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(fromSessionId, candidateData) {
    console.log('🧊 Handling ICE candidate from:', fromSessionId)
    
    const pc = this.peerConnections.get(fromSessionId)
    if (pc && candidateData) {
      await pc.addIceCandidate(new RTCIceCandidate(candidateData))
    }
  }

  // Handle new user joining the room
  async handleUserJoined(sessionId) {
    console.log('👋 User joined, creating offer for:', sessionId)
    
    const pc = this.createPeerConnection(sessionId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    this.sendSignal('offer', offer, sessionId)
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
      
      console.log('📤 Sending signal:', type, 'to:', toSessionId || 'broadcast')
      
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

  // Join room (announce presence)
  async joinRoom() {
    console.log('🚪 Joining WebRTC room:', this.roomName)
    await this.sendSignal('user-joined', { timestamp: Date.now() })
  }

  // Leave room
  async leaveRoom() {
    console.log('🚪 Leaving WebRTC room')
    
    // Notify others
    await this.sendSignal('user-left', { timestamp: Date.now() })
    
    // Clean up connections
    this.cleanup()
  }

  // Toggle local video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        console.log('📹 Video', videoTrack.enabled ? 'enabled' : 'disabled')
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
        console.log('🎤 Audio', audioTrack.enabled ? 'enabled' : 'disabled')
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
    
    // Close all peer connections
    this.peerConnections.forEach((pc, sessionId) => {
      pc.close()
    })
    this.peerConnections.clear()
    this.remoteStreams.clear()
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    // Close signaling channel
    if (this.signalChannel) {
      supabase.removeChannel(this.signalChannel)
      this.signalChannel = null
    }
  }

  // Get current state
  getState() {
    return {
      isInitialized: !!this.localStream,
      connectedPeers: Array.from(this.peerConnections.keys()),
      hasVideo: this.localStream?.getVideoTracks()[0]?.enabled ?? false,
      hasAudio: this.localStream?.getAudioTracks()[0]?.enabled ?? false
    }
  }
}

export default WebRTCService