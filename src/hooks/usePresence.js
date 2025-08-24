import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { usernameService } from '../services/usernameService'
import { tabManager } from '../utils/tabManager'

export const usePresence = (user, currentRoom) => {
  const [otherUsers, setOtherUsers] = useState([])
  const [userPosition, setUserPosition] = useState({ x: 50, y: 50 })
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Use refs to track current values for heartbeat
  const currentPositionRef = useRef(userPosition)
  const currentRoomRef = useRef(currentRoom)
  const heartbeatRef = useRef(null)
  const cleanupRef = useRef(null)

  // Update refs when values change
  useEffect(() => {
    currentPositionRef.current = userPosition
  }, [userPosition])

  useEffect(() => {
    currentRoomRef.current = currentRoom
  }, [currentRoom])

  console.log('🔥 usePresence called:', { 
    user: user?.name, 
    sessionId: user?.sessionId,
    currentRoom,
    isInitialized,
    position: userPosition
  })

  // Restore saved position on mount BEFORE user initialization
  useEffect(() => {
    const savedPosition = tabManager.getSavedPosition()
    console.log('📍 Restoring position on mount:', savedPosition)
    setUserPosition(savedPosition)
  }, [])

  // Initialize user presence when user first loads
  useEffect(() => {
    if (!user?.sessionId || isInitialized) return

    const initializePresence = async () => {
      console.log('🚀 Initializing presence for:', user.name, 'at position:', userPosition)
      
      // Create initial presence record with current position
      const result = await usernameService.createUserSession(
        user.name, 
        user.sessionId, 
        userPosition, // Use current position state
        currentRoom
      )
      
      if (result.success) {
        console.log('✅ Presence initialized successfully')
        setIsInitialized(true)
        
        // Save session to localStorage
        tabManager.saveUserSession(user, userPosition, currentRoom)
      } else {
        console.error('❌ Failed to initialize presence:', result.error)
      }
    }

    initializePresence()
  }, [user, userPosition, currentRoom, isInitialized])

  // Load other users and set up real-time subscription - ONLY DEPENDS ON USER
  useEffect(() => {
    if (!user?.sessionId || !isInitialized) return

    console.log('📡 Setting up presence subscription (ONE TIME)')

    const loadOtherUsers = async () => {
      try {
        // Clean up inactive sessions first
        await usernameService.cleanupInactiveSessions()

        // Load all other active users - NO ROOM FILTERING
        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
          .neq('session_id', user.sessionId)

        if (error) {
          console.error('❌ Error loading other users:', error)
          return
        }

        console.log('📥 Loaded other users:', data)

        const users = data.map(row => ({
          id: row.session_id,
          name: row.username,
          room: row.room_name,
          position: { x: row.position_x || 50, y: row.position_y || 50 },
          lastSeen: row.last_seen
        }))

        setOtherUsers(users)
      } catch (error) {
        console.error('❌ Exception loading other users:', error)
      }
    }

    loadOtherUsers()

    // Set up real-time subscription - ONE TIME ONLY
    const channel = supabase
      .channel(`presence-global-${user.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          console.log('🔔 Real-time update:', payload)

          // Skip our own changes
          if (payload.new?.session_id === user.sessionId || 
              payload.old?.session_id === user.sessionId) {
            console.log('⏭️ Skipping own change')
            return
          }

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const userData = payload.new
            const newUser = {
              id: userData.session_id,
              name: userData.username,
              room: userData.room_name,
              position: { x: userData.position_x || 50, y: userData.position_y || 50 },
              lastSeen: userData.last_seen
            }

            console.log('👤 Adding/updating user:', newUser)
            setOtherUsers(prev => {
              const filtered = prev.filter(u => u.id !== userData.session_id)
              const newList = [...filtered, newUser]
              console.log('👥 Updated user list:', newList.map(u => u.name))
              return newList
            })
          } else if (payload.eventType === 'DELETE') {
            const sessionId = payload.old?.session_id
            console.log('👤 Removing user:', sessionId)
            if (sessionId) {
              setOtherUsers(prev => {
                const newList = prev.filter(u => u.id !== sessionId)
                console.log('👥 Updated user list after removal:', newList.map(u => u.name))
                return newList
              })
            }
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Subscription status:', status)
      })

    // Set up periodic cleanup
    cleanupRef.current = setInterval(() => {
      console.log('🧹 Running periodic cleanup')
      usernameService.cleanupInactiveSessions()
    }, 30000)

    return () => {
      console.log('🧹 Cleaning up subscription')
      supabase.removeChannel(channel)
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current)
      }
    }
  }, [user, isInitialized])

  // Heartbeat with proper refs to avoid stale closure
  useEffect(() => {
    if (!user?.sessionId || !isInitialized) return

    console.log('💓 Starting heartbeat with refs')
    
    const heartbeatFunction = async () => {
      const currentPos = currentPositionRef.current
      const currentRm = currentRoomRef.current
      console.log('💓 Heartbeat update:', { position: currentPos, room: currentRm })
      await usernameService.updateUserSession(user.sessionId, currentPos, currentRm)
    }

    heartbeatRef.current = setInterval(heartbeatFunction, 15000)

    return () => {
      if (heartbeatRef.current) {
        console.log('💓 Stopping heartbeat')
        clearInterval(heartbeatRef.current)
      }
    }
  }, [user, isInitialized])

  // Update position function
  const updatePosition = useCallback(async (newPosition) => {
    console.log('📍 Updating position:', newPosition)
    setUserPosition(newPosition)

    // Save to localStorage immediately
    tabManager.savePosition(newPosition)

    if (user?.sessionId && isInitialized) {
      await usernameService.updateUserSession(user.sessionId, newPosition, currentRoom)
      // Update session with new position
      tabManager.updateSession(newPosition, currentRoom)
    }
  }, [user, isInitialized, currentRoom])

  // Update ONLY room when it changes (position stays same)
  useEffect(() => {
    if (user?.sessionId && isInitialized) {
      console.log('🏠 Room changed, updating room only:', currentRoom)
      usernameService.updateUserSession(user.sessionId, userPosition, currentRoom)
      tabManager.updateSession(userPosition, currentRoom)
    }
  }, [currentRoom, user, isInitialized, userPosition])

  // Cleanup on unmount with explicit removal
  useEffect(() => {
    return () => {
      if (user?.sessionId) {
        console.log('🔚 Component unmounting, cleaning up')
        // Clear heartbeat first
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
        }
        if (cleanupRef.current) {
          clearInterval(cleanupRef.current)
        }
        // Remove from database
        usernameService.removeSession(user.sessionId)
      }
    }
  }, [user])

  console.log('🎯 usePresence returning:', { 
    otherUsers: otherUsers.length, 
    initialized: isInitialized,
    position: userPosition,
    usersList: otherUsers.map(u => `${u.name}(${u.room || 'lobby'})`)
  })

  return {
    otherUsers,
    userPosition,
    updatePosition,
    isInitialized
  }
}