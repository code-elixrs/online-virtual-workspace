// Enhanced tab manager with better position persistence
export const tabManager = {
  TAB_ID_KEY: 'virtualOfficeTabId',
  USER_SESSION_KEY: 'virtualOfficeUserSession',
  POSITION_KEY: 'virtualOfficePosition',
  
  // Generate unique tab ID
  generateTabId() {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Check if this is the only active tab
  isOnlyActiveTab() {
    const tabId = sessionStorage.getItem(this.TAB_ID_KEY);
    if (!tabId) {
      // First time opening, create tab ID
      const newTabId = this.generateTabId();
      sessionStorage.setItem(this.TAB_ID_KEY, newTabId);
      return true;
    }
    return true; // Allow for now
  },

  // Save user session to localStorage for persistence
  saveUserSession(user, position, room) {
    const session = {
      user,
      position,
      room,
      timestamp: Date.now()
    };
    localStorage.setItem(this.USER_SESSION_KEY, JSON.stringify(session));
    
    // Also save position separately for quick access
    this.savePosition(position);
    
    console.log('💾 Session saved:', session);
  },

  // Save position separately (called frequently)
  savePosition(position) {
    const positionData = {
      position,
      timestamp: Date.now()
    };
    localStorage.setItem(this.POSITION_KEY, JSON.stringify(positionData));
    console.log('📍 Position saved:', position);
  },

  // Get saved position (quick access)
  getSavedPosition() {
    try {
      const saved = localStorage.getItem(this.POSITION_KEY);
      if (!saved) {
        console.log('📍 No saved position, using default');
        return { x: 50, y: 50 }; // Default position
      }
      
      const data = JSON.parse(saved);
      // Position is always valid regardless of age
      console.log('📍 Position restored from localStorage:', data.position);
      return data.position;
    } catch (error) {
      console.error('Error getting saved position:', error);
      return { x: 50, y: 50 }; // Default position
    }
  },

  // Get saved user session
  getSavedSession() {
    try {
      const saved = localStorage.getItem(this.USER_SESSION_KEY);
      if (!saved) return null;
      
      const session = JSON.parse(saved);
      // Check if session is less than 5 minutes old
      if (Date.now() - session.timestamp < 5 * 60 * 1000) {
        // Always use latest saved position
        session.position = this.getSavedPosition();
        console.log('💾 Session restored:', session);
        return session;
      } else {
        // Session expired, but keep position
        console.log('⏰ Session expired, clearing user data but keeping position');
        this.clearUserSession(); // Only clear user data, keep position
        return null;
      }
    } catch (error) {
      console.error('Error getting saved session:', error);
      return null;
    }
  },

  // Clear user session but keep position
  clearUserSession() {
    localStorage.removeItem(this.USER_SESSION_KEY);
    sessionStorage.removeItem(this.TAB_ID_KEY);
    // Keep position data for UX
    console.log('🗑️ User session cleared (position preserved)');
  },

  // Clear everything including position
  clearSession() {
    localStorage.removeItem(this.USER_SESSION_KEY);
    localStorage.removeItem(this.POSITION_KEY);
    sessionStorage.removeItem(this.TAB_ID_KEY);
    console.log('🗑️ Full session cleared');
  },

  // Update session position/room (called frequently)
  updateSession(position, room) {
    // Always save position
    this.savePosition(position);
    
    // Update full session if it exists
    const saved = this.getSavedSession();
    if (saved) {
      saved.position = position;
      saved.room = room;
      saved.timestamp = Date.now();
      localStorage.setItem(this.USER_SESSION_KEY, JSON.stringify(saved));
    }
  }
};