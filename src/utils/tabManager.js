// Prevent multiple tabs from opening simultaneously
export const tabManager = {
  TAB_ID_KEY: 'virtualOfficeTabId',
  USER_SESSION_KEY: 'virtualOfficeUserSession',
  
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
    return true; // Allow for now, we'll implement proper checking if needed
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
    console.log('Session saved:', session);
  },

  // Get saved user session
  getSavedSession() {
    try {
      const saved = localStorage.getItem(this.USER_SESSION_KEY);
      if (!saved) return null;
      
      const session = JSON.parse(saved);
      // Check if session is less than 5 minutes old
      if (Date.now() - session.timestamp < 5 * 60 * 1000) {
        console.log('Restored session:', session);
        return session;
      } else {
        // Session expired, clear it
        this.clearSession();
        return null;
      }
    } catch (error) {
      console.error('Error getting saved session:', error);
      return null;
    }
  },

  // Clear saved session
  clearSession() {
    localStorage.removeItem(this.USER_SESSION_KEY);
    sessionStorage.removeItem(this.TAB_ID_KEY);
    console.log('Session cleared');
  },

  // Update session position/room
  updateSession(position, room) {
    const saved = this.getSavedSession();
    if (saved) {
      this.saveUserSession(saved.user, position, room);
    }
  }
};