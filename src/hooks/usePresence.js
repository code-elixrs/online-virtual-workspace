import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export const usePresence = (user, currentRoom) => {
  const [otherUsers, setOtherUsers] = useState([])
  const [userPosition, setUserPosition] = useState({ x: 50, y: 50 })

  console.log('usePresence hook called', { user, currentRoom })

  // Update user's presence in database
  const updatePresence = async (position, room = currentRoom) => {
    if (!user) return

    console.log('Updating presence in database:', { user: user.name, position, room })

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          username: user.name,
          room_name: room,
          position_x: position.x,
          position_y: position.y,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

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
    if (!user) return

    console.log('Setting up presence subscription for user:', user.name)

    // Load existing users
    const loadPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
          .neq('user_id', user.id) // Exclude current user
          .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Active in last 5 minutes

        if (error) throw error
        
        console.log('Loaded existing presence data:', data)
        
        const activeUsers = data.map(presence => ({
          id: presence.user_id,
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

    // Set up real-time subscription
    const channel = supabase
      .channel('user-presence-changes')
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
          if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
            console.log('Skipping own presence change')
            return
          }
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const presence = payload.new
            const newUser = {
              id: presence.user_id,
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
              const filtered = prev.filter(u => u.id !== presence.user_id)
              return [...filtered, newUser]
            })
          } else if (payload.eventType === 'DELETE') {
            console.log('Removing user:', payload.old.user_id)
            setOtherUsers(prev => prev.filter(u => u.id !== payload.old.user_id))
          }
        }
      )
      .subscribe((status) => {
        console.log('Presence subscription status:', status)
      })

    return () => {
      console.log('Cleaning up presence subscription')
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
    if (user) {
      console.log('Room changed, updating presence:', { room: currentRoom, position: userPosition })
      updatePresence(userPosition, currentRoom)
    }
  }, [currentRoom, user])

  // Initial presence update when user first loads
  useEffect(() => {
    if (user) {
      console.log('Initial presence update for user:', user.name)
      updatePresence(userPosition, currentRoom)
    }
  }, [user])

  // Heartbeat - update presence every 30 seconds
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      console.log('Heartbeat: updating presence')
      updatePresence(userPosition, currentRoom)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [user, userPosition, currentRoom])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (user) {
        console.log('Component unmounting, cleaning up presence for:', user.name)
        supabase
          .from('user_presence')
          .delete()
          .eq('user_id', user.id)
          .then(() => console.log('Presence cleaned up'))
      }
    }
  }, [user])

  // Filter users by current room
  const visibleUsers = otherUsers.filter(otherUser => {
    if (!currentRoom) return true // Show all users in lobby
    return otherUser.room === currentRoom // Show only users in same room
  })

  console.log('usePresence returning:', { 
    otherUsers: visibleUsers, 
    userPosition, 
    totalUsers: otherUsers.length,
    visibleUsers: visibleUsers.length 
  })

  return {
    otherUsers: visibleUsers,
    userPosition,
    updatePosition
  }
}