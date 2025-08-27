import { supabase } from '../supabaseClient'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers for better connectivity
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export class WebRTCService {
  constructor(user, roomName, options = {}) {
    this.user = user
    this.roomName = roomName
    this.options = options
    this.localStream = null
    this.peerConnections = new Map()
    this.remoteStreams = new Map()
    this.signalChannel = null
    this.onStreamAdded = null
    this.onStreamRemoved = null
    this.onConnectionStateChange = null
    this.mediaRequested = false
    this.isCleaningUp = false
    
    // Debug logging
    this.debug = true
    this.log = (message, ...args) => {
      if (this.debug) {
        console.log(`[WebRTC-${this.user.sessionId?.slice(-4)}] ${message}`, ...args)
      }
    }
  }

  async initialize() {
    this.log('Initializing WebRTC service for:', this.user.name, 'in', this.roomName)
    
    try {
      await this.setupSignaling()
      
      if (!this.options.lazyMedia) {
        this.localStream = await this.requestMediaPermissions()
        this.mediaRequested = true
      }
      
      this.log('WebRTC service initialized successfully')
      return { success: true, localStream: this.localStream }
    } catch (error) {
      this.log('Failed to initialize WebRTC:', error)
      return { success: false, error }
    }
  }

  async requestMediaPermissions() {
    if (this.mediaRequested && this.localStream) {
      this.log('Media already available')
      return this.localStream
    }

    try {
      this.log('Requesting camera and microphone permissions...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      
      this.log('Got media stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`))
      
      // Start with tracks disabled in lazy mode
      stream.getTracks().forEach(track => {
        track.enabled = false
        this.log('Track disabled by default:', track.kind)
      })
      
      this.localStream = stream
      this.mediaRequested = true
      
      // Add to all existing peer connections
      await this.addStreamToAllConnections()
      
      return stream
    } catch (error) {
      this.log('Failed to get media permissions:', error)
      throw error
    }
  }

  async addStreamToAllConnections() {
    if (!this.localStream || this.peerConnections.size === 0) {
      this.log('No stream or connections to update')
      return
    }

    this.log('Adding local stream to', this.peerConnections.size, 'existing connections')
    
    for (const [sessionId, pc] of this.peerConnections) {
      try {
        // Remove existing tracks
        const existingSenders = pc.getSenders()
        for (const sender of existingSenders) {
          if (sender.track) {
            pc.removeTrack(sender)
            this.log('Removed old track from:', sessionId?.slice(-4))
          }
        }
        
        // Add new tracks
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream)
          this.log('Added track to', sessionId?.slice(-4), ':', track.kind, 'enabled:', track.enabled)
        })
        
        // Force renegotiation
        if (pc.signalingState === 'stable') {
          this.log('Creating new offer for:', sessionId?.slice(-4))
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          })
          await pc.setLocalDescription(offer)
          await this.sendSignal('offer', offer, sessionId)
          this.log('Offer sent to:', sessionId?.slice(-4))
        }
        
      } catch (error) {
        this.log('Error adding stream to connection:', sessionId?.slice(-4), error)
      }
    }
  }

  async setupSignaling() {
    this.log('Setting up signaling for room:', this.roomName)
    
    // Test database connection first
    const { data, error } = await supabase.from('webrtc_signals').select('count').limit(1)
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
    this.log('Database connection verified')
    
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
            this.log('Received signal:', payload.new.signal_type, 'from:', payload.new.from_session_id?.slice(-4))
            this.handleSignal(payload.new)
          }
        }
      )
      .subscribe((status) => {
        this.log('Signaling channel status:', status)
        if (status === 'SUBSCRIBED') {
          this.log('Signaling channel ready')
        }
      })
      
    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  async handleSignal(signal) {
    if (this.isCleaningUp) return
    
    if (signal.from_session_id === this.user.sessionId) {
      return // Skip our own signals
    }
    
    if (signal.to_session_id && signal.to_session_id !== this.user.sessionId) {
      return // Skip signals not for us
    }

    const fromSessionId = signal.from_session_id
    this.log('Processing:', signal.signal_type, 'from:', fromSessionId?.slice(-4))
    
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
      this.log('Error handling signal:', error)
    }
  }

  createPeerConnection(sessionId) {
    if (this.peerConnections.has(sessionId)) {
      this.log('Reusing existing connection for:', sessionId?.slice(-4))
      return this.peerConnections.get(sessionId)
    }
    
    this.log('Creating NEW peer connection for:', sessionId?.slice(-4))
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    })
    
    // Add local stream if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream)
        this.log('Added local track to new connection:', track.kind, 'enabled:', track.enabled)
      })
    }
    
    // Handle remote stream - CRITICAL FIX
    pc.ontrack = (event) => {
      this.log('Remote track received from:', sessionId?.slice(-4), 'kind:', event.track.kind, 'enabled:', event.track.enabled)
      const [remoteStream] = event.streams
      
      if (remoteStream) {
        this.log('Remote stream received with', remoteStream.getTracks().length, 'tracks')
        
        // Store the stream
        this.remoteStreams.set(sessionId, remoteStream)
        
        // Notify UI
        if (this.onStreamAdded) {
          this.log('Notifying UI about new remote stream:', sessionId?.slice(-4))
          this.onStreamAdded(sessionId, remoteStream)
        }
        
        // Log track details
        remoteStream.getTracks().forEach(track => {
          this.log(`Remote ${track.kind} track:`, track.enabled, track.readyState)
        })
      }
    }
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.log('Sending ICE candidate to:', sessionId?.slice(-4))
        this.sendSignal('ice-candidate', event.candidate, sessionId)
      } else {
        this.log('ICE gathering complete for:', sessionId?.slice(-4))
      }
    }
    
    pc.onconnectionstatechange = () => {
      this.log(sessionId?.slice(-4), 'connection state:', pc.connectionState)
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(sessionId, pc.connectionState)
      }
      
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        this.log('Connection failed/closed:', sessionId?.slice(-4))
        setTimeout(() => this.removePeerConnection(sessionId), 1000)
      }
    }
    
    pc.oniceconnectionstatechange = () => {
      this.log(sessionId?.slice(-4), 'ICE state:', pc.iceConnectionState)
    }
    
    pc.onsignalingstatechange = () => {
      this.log(sessionId?.slice(-4), 'Signaling state:', pc.signalingState)
    }
    
    this.peerConnections.set(sessionId, pc)
    return pc
  }

  async handleOffer(fromSessionId, offerData) {
    this.log('Handling offer from:', fromSessionId?.slice(-4))
    
    try {
      const pc = this.createPeerConnection(fromSessionId)
      
      await pc.setRemoteDescription(new RTCSessionDescription(offerData))
      this.log('Set remote description (offer) from:', fromSessionId?.slice(-4))
      
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      await this.sendSignal('answer', answer, fromSessionId)
      this.log('Answer sent to:', fromSessionId?.slice(-4))
      
    } catch (error) {
      this.log('Error handling offer from:', fromSessionId?.slice(-4), error)
    }
  }

  async handleAnswer(fromSessionId, answerData) {
    this.log('Handling answer from:', fromSessionId?.slice(-4))
    
    const pc = this.peerConnections.get(fromSessionId)
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answerData))
        this.log('Answer processed for:', fromSessionId?.slice(-4))
      } catch (error) {
        this.log('Error handling answer from:', fromSessionId?.slice(-4), error)
      }
    } else {
      this.log('No pending offer for answer from:', fromSessionId?.slice(-4), 'signaling state:', pc?.signalingState)
    }
  }

  async handleIceCandidate(fromSessionId, candidateData) {
    const pc = this.peerConnections.get(fromSessionId)
    if (pc && pc.remoteDescription && candidateData) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData))
        this.log('ICE candidate added for:', fromSessionId?.slice(-4))
      } catch (error) {
        this.log('Error adding ICE candidate from:', fromSessionId?.slice(-4), error)
      }
    } else {
      this.log('Cannot add ICE candidate from:', fromSessionId?.slice(-4), 'PC exists:', !!pc, 'Remote desc:', !!pc?.remoteDescription)
    }
  }

  async handleUserJoined(sessionId, signalData) {
    this.log('User joined:', signalData?.userName, '(' + sessionId?.slice(-4) + ')')
    
    // Add delay to prevent race conditions
    setTimeout(async () => {
      if (!this.peerConnections.has(sessionId) && !this.isCleaningUp) {
        try {
          const pc = this.createPeerConnection(sessionId)
          
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          })
          
          await pc.setLocalDescription(offer)
          this.log('Sending offer to new user:', sessionId?.slice(-4))
          
          await this.sendSignal('offer', offer, sessionId)
        } catch (error) {
          this.log('Error creating offer for new user:', sessionId?.slice(-4), error)
        }
      }
    }, Math.random() * 1000 + 1000) // 1-2 second delay
  }

  async handleUserLeft(sessionId) {
    this.log('User left:', sessionId?.slice(-4))
    this.removePeerConnection(sessionId)
  }

  async sendSignal(type, data, toSessionId = null) {
    if (this.isCleaningUp) return
    
    try {
      const signalData = {
        room_name: this.roomName,
        from_session_id: this.user.sessionId,
        to_session_id: toSessionId,
        signal_type: type,
        signal_data: data,
        created_at: new Date().toISOString()
      }
      
      this.log('Sending signal:', type, 'to:', toSessionId?.slice(-4) || 'all')
      
      const { data: result, error } = await supabase
        .from('webrtc_signals')
        .insert(signalData)
        .select()
      
      if (error) {
        this.log('Signal send failed:', error)
        throw error
      } else {
        this.log('Signal sent successfully:', type)
      }
    } catch (error) {
      this.log('Exception sending signal:', error)
      throw error
    }
  }

  async joinRoom() {
    this.log('Joining WebRTC room:', this.roomName)
    await this.sendSignal('user-joined', { 
      timestamp: Date.now(),
      userName: this.user.name 
    })
  }

  async leaveRoom() {
    this.log('Leaving WebRTC room')
    await this.sendSignal('user-left', { timestamp: Date.now() })
  }

  toggleVideo() {
    if (!this.localStream) {
      this.log('No local stream for video toggle')
      return false
    }

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      this.log('Video track enabled:', videoTrack.enabled)
      return videoTrack.enabled
    }
    return false
  }

  toggleAudio() {
    if (!this.localStream) {
      this.log('No local stream for audio toggle')
      return false
    }

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      this.log('Audio enabled:', audioTrack.enabled)
      return audioTrack.enabled
    }
    return false
  }

  getConnectionSummary() {
    const totalConnections = this.peerConnections.size
    let connectedPeers = 0
    let connectingPeers = 0
    let failedPeers = 0
    
    this.peerConnections.forEach((pc) => {
      switch (pc.connectionState) {
        case 'connected':
          connectedPeers++
          break
        case 'connecting':
        case 'new':
          connectingPeers++
          break
        case 'failed':
        case 'disconnected':
        case 'closed':
          failedPeers++
          break
      }
    })
    
    return {
      totalConnections,
      connectedPeers,
      connectingPeers,
      failedPeers,
      remoteStreams: this.remoteStreams.size
    }
  }

  // Debug method
  logDebugInfo() {
    this.log('=== DEBUG INFO ===')
    this.log('Local stream tracks:', this.localStream?.getTracks().map(t => `${t.kind}:${t.enabled}`) || 'None')
    this.log('Peer connections:', this.peerConnections.size)
    this.log('Remote streams:', this.remoteStreams.size)
    
    this.peerConnections.forEach((pc, sessionId) => {
      this.log(`${sessionId?.slice(-4)}: ${pc.connectionState} | ICE: ${pc.iceConnectionState} | Signaling: ${pc.signalingState}`)
    })
    
    this.remoteStreams.forEach((stream, sessionId) => {
      this.log(`Remote ${sessionId?.slice(-4)}:`, stream.getTracks().map(t => `${t.kind}:${t.enabled}`))
    })
    this.log('==================')
  }

  removePeerConnection(sessionId) {
    const pc = this.peerConnections.get(sessionId)
    if (pc) {
      this.log('Removing peer connection:', sessionId?.slice(-4))
      pc.close()
      this.peerConnections.delete(sessionId)
    }
    
    if (this.remoteStreams.has(sessionId)) {
      this.log('Removing remote stream:', sessionId?.slice(-4))
      this.remoteStreams.delete(sessionId)
      
      if (this.onStreamRemoved) {
        this.onStreamRemoved(sessionId)
      }
    }
  }

  cleanup() {
    this.log('Cleaning up WebRTC service')
    this.isCleaningUp = true
    
    this.peerConnections.forEach((pc, sessionId) => {
      this.log('Closing connection:', sessionId?.slice(-4))
      pc.close()
    })
    this.peerConnections.clear()
    this.remoteStreams.clear()
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.log('Stopping track:', track.kind)
        track.stop()
      })
      this.localStream = null
    }
    
    if (this.signalChannel) {
      this.log('Closing signaling channel')
      supabase.removeChannel(this.signalChannel)
      this.signalChannel = null
    }
    
    this.mediaRequested = false
  }
}

export default WebRTCService