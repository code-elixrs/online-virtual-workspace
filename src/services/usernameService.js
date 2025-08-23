import { supabase } from '../supabaseClient'

export const usernameService = {
  // Check if username is available (no active session)
  async isUsernameAvailable(username) {
    try {
      // First cleanup stale sessions
      await this.cleanupStaleSessions()
      
      // Check if username exists with recent activity (last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
      const { data, error } = await supabase
        .from('user_presence')
        .select('username, last_seen, session_id')
        .eq('username', username)
        .gte('last_seen', thirtySecondsAgo)
        .limit(1)

      if (error) throw error
      
      const isAvailable = data.length === 0
      console.log(`Username "${username}" availability:`, isAvailable, data)
      
      return {
        available: isAvailable,
        existingSession: data[0] || null
      }
    } catch (error) {
      console.error('Error checking username availability:', error)
      return { available: false, error }
    }
  },

  // Claim a username (replace any existing session)
  async claimUsername(username, sessionId, position = { x: 50, y: 50 }, room = null) {
    try {
      console.log(`Claiming username "${username}" for session ${sessionId}`)
      
      // First cleanup stale sessions
      await this.cleanupStaleSessions()
      
      // Remove any existing session for this username
      await supabase
        .from('user_presence')
        .delete()
        .eq('username', username)
      
      // Create new session
      const { data, error } = await supabase
        .from('user_presence')
        .insert({
          username,
          session_id: sessionId,
          room_name: room,
          position_x: position.x,
          position_y: position.y,
          last_seen: new Date().toISOString()
        })
        .select()
      
      if (error) throw error
      
      console.log(`✅ Username "${username}" claimed successfully`)
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error claiming username:', error)
      return { success: false, error }
    }
  },

  // Cleanup stale sessions
  async cleanupStaleSessions() {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
      const { error } = await supabase
        .from('user_presence')
        .delete()
        .lt('last_seen', thirtySecondsAgo)
      
      if (error) throw error
      console.log('🧹 Cleaned up stale sessions')
    } catch (error) {
      console.error('Error cleaning up stale sessions:', error)
    }
  },

  // Remove session by session ID
  async removeSession(sessionId) {
    try {
      const { error } = await supabase
        .from('user_presence')
        .delete()
        .eq('session_id', sessionId)
      
      if (error) throw error
      console.log(`Removed session: ${sessionId}`)
    } catch (error) {
      console.error('Error removing session:', error)
    }
  }
}