import { supabase } from '../supabaseClient'

export const usernameService = {
  // Check if username is available
  async isUsernameAvailable(username) {
    try {
      console.log('🔍 Checking availability for username:', username)
      
      // Look for any recent activity (last 2 minutes for safety)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('username', username)
        .gte('last_seen', twoMinutesAgo)

      if (error) {
        console.error('❌ Error checking availability:', error)
        return { available: false, error }
      }
      
      const isAvailable = data.length === 0
      console.log(`✅ Username "${username}" available:`, isAvailable, 'Existing sessions:', data.length)
      
      return { available: isAvailable, existingSession: data[0] }
    } catch (error) {
      console.error('❌ Exception checking availability:', error)
      return { available: false, error }
    }
  },

  // Create new user session (replaces any existing session for this username)
  async createUserSession(username, sessionId, position = { x: 50, y: 50 }, room = null) {
    try {
      console.log('🎯 Creating user session:', { username, sessionId, position, room })
      
      // First, remove any existing sessions for this username
      await this.cleanupUserSessions(username)
      
      // Insert new session
      const userData = {
        username: username,
        session_id: sessionId,
        room_name: room,
        position_x: position.x,
        position_y: position.y,
        last_seen: new Date().toISOString()
      }
      
      console.log('📝 Inserting user data:', userData)
      
      const { data, error } = await supabase
        .from('user_presence')
        .insert(userData)
        .select()
      
      if (error) {
        console.error('❌ Error creating session:', error)
        return { success: false, error }
      }
      
      console.log('✅ User session created successfully:', data[0])
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('❌ Exception creating session:', error)
      return { success: false, error }
    }
  },

  // Update existing user session
  async updateUserSession(sessionId, position, room = null) {
    try {
      console.log('📍 Updating session:', { sessionId, position, room })
      
      const { data, error } = await supabase
        .from('user_presence')
        .update({
          room_name: room,
          position_x: position.x,
          position_y: position.y,
          last_seen: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
      
      if (error) {
        console.error('❌ Error updating session:', error)
        return { success: false, error }
      }
      
      console.log('✅ Session updated:', data)
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('❌ Exception updating session:', error)
      return { success: false, error }
    }
  },

  // Clean up sessions for a specific username
  async cleanupUserSessions(username) {
    try {
      console.log('🗑️ Cleaning up sessions for username:', username)
      
      const { data, error } = await supabase
        .from('user_presence')
        .delete()
        .eq('username', username)
        .select()
      
      if (error) {
        console.error('❌ Error cleaning up user sessions:', error)
      } else if (data.length > 0) {
        console.log('✅ Cleaned up sessions:', data)
      } else {
        console.log('✅ No sessions to clean up')
      }
    } catch (error) {
      console.error('❌ Exception cleaning up sessions:', error)
    }
  },

  // Remove specific session
  async removeSession(sessionId) {
    try {
      console.log('🗑️ Removing session:', sessionId)
      
      const { data, error } = await supabase
        .from('user_presence')
        .delete()
        .eq('session_id', sessionId)
        .select()
      
      if (error) {
        console.error('❌ Error removing session:', error)
      } else {
        console.log('✅ Session removed:', data)
      }
    } catch (error) {
      console.error('❌ Exception removing session:', error)
    }
  },

  // Clean up old inactive sessions (older than 1 minute)
  async cleanupInactiveSessions() {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      console.log('🧹 Cleaning up inactive sessions older than:', oneMinuteAgo)
      
      const { data, error } = await supabase
        .from('user_presence')
        .delete()
        .lt('last_seen', oneMinuteAgo)
        .select()
      
      if (error) {
        console.error('❌ Error cleaning up inactive sessions:', error)
      } else if (data.length > 0) {
        console.log(`✅ Cleaned up ${data.length} inactive sessions`)
      }
    } catch (error) {
      console.error('❌ Exception cleaning up inactive sessions:', error)
    }
  }
}