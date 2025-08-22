import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export const usePresence = (user, currentRoom) => {
  const [otherUsers, setOtherUsers] = useState([])
  const [userPosition, setUserPosition] = useState({ x: 50, y: 50 })

  // Update user's presence in database
  const updatePresence = async (position, room = currentRoom) => {
    if (!user) return

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
        console.log('Presence updated:', position)
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }

  // Subscribe to other users' presence
  useEffect(() => {
    if (!user) return

    // Load existing users
    const loadPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
          .neq('user_id', user.id) // Exclude current user
          .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Active in last 5 minutes

        if (error) throw error
        
        const activeUsers = data.map(presence => ({
          id: presence.user_id,
          name: presence.username,
          room: presence.room_name,
          position: {
            x: presence.position_x,
            y: presence.position_y
          },
          lastSeen: presence.last_seen
        }))
        
        setOtherUsers(activeUsers)
      } catch (error) {
        console.error('Error loading presence:', error)
      }
    }

    loadPresence()

    // Set up real-time subscription
    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=neq.${user.id}` // Exclude current user
        },
        (payload) => {
          console.log('Presence change:', payload)
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const presence = payload.new
            const newUser = {
              id: presence.user_id,
              name: presence.username,
              room: presence.room_name,
              position: {
                x: presence.position_x,
                y: presence.position_y
              },
              lastSeen: presence.last_seen
            }

            setOtherUsers(prev => {
              const filtered = prev.filter(u => u.id !== presence.user_id)
              return [...filtered, newUser]
            })
          } else if (payload.eventType === 'DELETE') {
            setOtherUsers(prev => prev.filter(u => u.id !== payload.old.user_id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Update presence when position changes
  const updatePosition = (newPosition) => {
    setUserPosition(newPosition)
    updatePresence(newPosition, currentRoom)
  }

  // Update presence when room changes
  useEffect(() => {
    if (user) {
      updatePresence(userPosition, currentRoom)
    }
  }, [currentRoom, user])

  // Update presence every 30 seconds (heartbeat)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      updatePresence(userPosition, currentRoom)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [user, userPosition, currentRoom])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (user) {
        // Remove user from presence when they leave
        supabase
          .from('user_presence')
          .delete()
          .eq('user_id', user.id)
          .then(() => console.log('Presence cleaned up'))
      }
    }
  }, [user])

  return {
    otherUsers,
    userPosition,
    updatePosition
  }
}