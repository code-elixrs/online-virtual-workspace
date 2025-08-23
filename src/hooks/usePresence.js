import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { usernameService } from '../services/usernameService'

export const usePresence = (user, currentRoom) => {
  const [otherUsers, setOtherUsers] = useState([])
  const [userPosition, setUserPosition] = useState({ x: 50, y: 50 })
  const heartbeatIntervalRef = useRef(null)
  const cleanupIntervalRef = useRef(null)

  console.log('usePresence hook called', { user, currentRoom })

  // Update user's presence in database
  const updatePresence = async (position, room = currentRoom) => {
    if (!user?.sessionId) return

    try {
      const { error } = await supabase
        .from('user_presence')
        .update({
          room_name: room,
          position_x: position.x,
          position_y: position.y,
          last_seen: new Date().toISOString()
        })
        .eq('session_id', user.sessionId)

      if (error) {
        console.error('Error updating presence:', error)
      } else {
        console.log('✅ Presence updated successfully')
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }

  // Load existing users and subscribe to changes
  useEffect(() => {
    if (!user?.sessionId) return

    console.log('Setting up presence subscription for user:', user.name)

    // Load existing users
    const loadPresence = async () => {
      try {
        // Cleanup stale sessions first
        await usernameService.cleanupStaleSessions()

        // Load all active users except current user
        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
          .neq('session_id', user.sessionId)

        if (error) throw error
        
        console.log('Loaded existing presence data:', data)
        
        const activeUsers = data.map(presence => ({
          id: presence.session_id,
          name: presence.username,
          room: presence.room_name,
          position: {
            x: presence.position_x || 50,
            y: presence.position_y || 50
          },
          lastSeen: presence.last_seen
        }))
        
        console.log('Setting other users:', activeUsers)
        setOtherUsers(activeUsers)
      } catch (error) {
        console.error('Error loading presence:', error)
      }
    }

    loadPresence()

    // Set up cleanup interval (every 10 seconds)
    cleanupIntervalRef.current = setInterval(async () => {
      await usernameService.cleanupStaleSessions()
    }, 10000)

    // Set up real-time subscription
    const channel = supabase
      .channel('user-presence-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          console.log('🔔 Presence change received:', payload)
          
          // Skip changes from current user
          if (payload.new?.session_id === user.sessionId || payload.old?.session_id === user.sessionId) {
            console.log('Skipping own presence change')
            return
          }
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const presence = payload.new
            const newUser = {
              id: presence.session_id,
              name: presence.username,
              room: presence.room_name,
              position: {
                x: presence.position_x || 50,
                y: presence.position_y || 50
              },
              lastSeen: presence.last_seen
            }

            console.log('Adding/updating user:', newUser)
            setOtherUsers(prev => {
              const filtered = prev.filter(u => u.id !== presence.session_id)
              return [...filtered, newUser]
            })
          } else if (payload.eventType === 'DELETE') {
            console.log('Removing user:', payload.old.session_id)
            setOtherUsers(prev => prev.filter(u => u.id !== payload.old.session_id))
          }
        }
      )
      .subscribe((status) => {
        console.log('Presence subscription status:', status)
      })

    return () => {
      console.log('Cleaning up presence subscription')
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [user])

  // Update position locally and in database
  const updatePosition = (newPosition) => {
    console.log('Position update requested:', newPosition)
    setUserPosition(newPosition)
    updatePresence(newPosition, currentRoom)
  }

  // Update presence when room changes
  useEffect(() => {
    if (user?.sessionId) {
      console.log('Room changed, updating presence:', { room: currentRoom, position: userPosition })
      updatePresence(userPosition, currentRoom)
    }
  }, [currentRoom, user])

  // Heartbeat - update presence every 10 seconds
  useEffect(() => {
    if (!user?.sessionId) return

    heartbeatIntervalRef.current = setInterval(() => {
      console.log('Heartbeat: updating presence')
      updatePresence(userPosition, currentRoom)
    }, 10000) // 10 seconds

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [user, userPosition, currentRoom])

  // Cleanup on page unload/refresh
  useEffect(() => {
    const cleanup = async () => {
      if (user?.sessionId) {
        console.log('Page unloading, cleaning up session:', user.sessionId)
        await usernameService.removeSession(user.sessionId)
      }
    }

    window.addEventListener('beforeunload', cleanup)
    window.addEventListener('unload', cleanup)

    return () => {
      window.removeEventListener('beforeunload', cleanup)
      window.removeEventListener('unload', cleanup)
      cleanup()
    }
  }, [user])

  return {
    otherUsers,
    userPosition,
    updatePosition
  }
}