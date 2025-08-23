import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { usernameService } from '../services/usernameService'

export const usePresence = (user, currentRoom) => {
  const [otherUsers, setOtherUsers] = useState([])
  const [userPosition, setUserPosition] = useState({ x: 50, y: 50 })
  const [isInitialized, setIsInitialized] = useState(false)
  const heartbeatRef = useRef(null)
  const cleanupRef = useRef(null)

  console.log('🔥 usePresence called:', { 
    user: user?.name, 
    sessionId: user?.sessionId,
    currentRoom,
    isInitialized 
  })

  // Initialize user presence when user first loads
  useEffect(() => {
    if (!user?.sessionId || isInitialized) return

    const initializePresence = async () => {
      console.log('🚀 Initializing presence for:', user.name)
      
      // Create initial presence record
      const result = await usernameService.createUserSession(
        user.name, 
        user.sessionId, 
        userPosition, 
        currentRoom
      )
      
      if (result.success) {
        console.log('✅ Presence initialized successfully')
        setIsInitialized(true)
      } else {
        console.error('❌ Failed to initialize presence:', result.error)
      }
    }

    initializePresence()
  }, [user, isInitialized])

  // Load other users and set up real-time subscription
  useEffect(() => {
    if (!user?.sessionId || !isInitialized) return

    console.log('📡 Setting up presence subscription')

    const loadOtherUsers = async () => {
      try {
        // Clean up inactive sessions first
        await usernameService.cleanupInactiveSessions()

        // Load all other active users
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

    // Set up real-time subscription
    const channel = supabase
      .channel('presence-updates')
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
              return [...filtered, newUser]
            })
          } else if (payload.eventType === 'DELETE') {
            const sessionId = payload.old.session_id
            console.log('👤 Removing user:', sessionId)
            setOtherUsers(prev => prev.filter(u => u.id !== sessionId))
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Subscription status:', status)
      })

    // Set up periodic cleanup
    cleanupRef.current = setInterval(() => {
      usernameService.cleanupInactiveSessions()
    }, 30000) // Every 30 seconds

    return () => {
      console.log('🧹 Cleaning up subscription')
      supabase.removeChannel(channel)
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current)
      }
    }
  }, [user, isInitialized])

  // Update position in database
  const updatePosition = async (newPosition) => {
    console.log('📍 Updating position:', newPosition)
    setUserPosition(newPosition)

    if (user?.sessionId && isInitialized) {
      await usernameService.updateUserSession(user.sessionId, newPosition, currentRoom)
    }
  }

  // Update room when it changes
  useEffect(() => {
    if (user?.sessionId && isInitialized) {
      console.log('🏠 Room changed, updating:', currentRoom)
      usernameService.updateUserSession(user.sessionId, userPosition, currentRoom)
    }
  }, [currentRoom, user, isInitialized])

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!user?.sessionId || !isInitialized) return

    console.log('💓 Starting heartbeat')
    heartbeatRef.current = setInterval(() => {
      console.log('💓 Heartbeat update')
      usernameService.updateUserSession(user.sessionId, userPosition, currentRoom)
    }, 15000) // Every 15 seconds

    return () => {
      if (heartbeatRef.current) {
        console.log('💓 Stopping heartbeat')
        clearInterval(heartbeatRef.current)
      }
    }
  }, [user, isInitialized, userPosition, currentRoom])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (user?.sessionId) {
        console.log('🔚 Component unmounting, cleaning up')
        usernameService.removeSession(user.sessionId)
      }
    }
  }, [user])

  console.log('🎯 usePresence returning:', { 
    otherUsers: otherUsers.length, 
    initialized: isInitialized,
    usersList: otherUsers.map(u => u.name)
  })

  return {
    otherUsers,
    userPosition,
    updatePosition,
    isInitialized
  }
}