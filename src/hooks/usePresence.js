import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { usernameService } from '../services/usernameService'
import { tabManager } from '../utils/tabManager'

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

  // Restore saved position on mount
  useEffect(() => {
    const savedSession = tabManager.getSavedSession()
    if (savedSession && savedSession.position) {
      console.log('📍 Restoring saved position:', savedSession.position)
      setUserPosition(savedSession.position)
    }
  }, [])

  // Initialize user presence when user first loads - NO ROOM DEPENDENCY
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
  }, [user, isInitialized]) // REMOVED currentRoom dependency

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
      .channel(`presence-global-${user.sessionId}`) // Unique channel name
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
    }, 30000) // Every 30 seconds

    return () => {
      console.log('🧹 Cleaning up subscription')
      supabase.removeChannel(channel)
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current)
      }
    }
  }, [user, isInitialized]) // REMOVED currentRoom dependency - subscription stays stable

  // Update position in database and localStorage
  const updatePosition = async (newPosition) => {
    console.log('📍 Updating position:', newPosition)
    setUserPosition(newPosition)

    // Save to localStorage immediately
    tabManager.updateSession(newPosition, currentRoom)

    if (user?.sessionId && isInitialized) {
      await usernameService.updateUserSession(user.sessionId, newPosition, currentRoom)
    }
  }

  // Update ONLY room when it changes (position stays same)
  useEffect(() => {
    if (user?.sessionId && isInitialized) {
      console.log('🏠 Room changed, updating room only:', currentRoom)
      // Update room but keep current position
      usernameService.updateUserSession(user.sessionId, userPosition, currentRoom)
      tabManager.updateSession(userPosition, currentRoom)
    }
  }, [currentRoom]) // SEPARATE effect for room changes only

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
  }, [user, isInitialized]) // REMOVED userPosition and currentRoom to prevent restarts

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
    usersList: otherUsers.map(u => `${u.name}(${u.room || 'lobby'})`)
  })

  return {
    otherUsers,
    userPosition,
    updatePosition,
    isInitialized
  }
}