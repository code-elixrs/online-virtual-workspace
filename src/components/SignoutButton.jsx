import React, { useState } from 'react';
import { usernameService } from '../services/usernameService';
import { tabManager } from '../utils/tabManager';

const SignoutButton = ({ user, onSignout }) => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignout = async () => {
    if (!user?.sessionId) return;
    
    setIsSigningOut(true);
    try {
      console.log('Signing out user:', user.name);
      
      // Remove from database
      await usernameService.removeSession(user.sessionId);
      
      // Clear local storage
      tabManager.clearSession();
      
      // Notify parent component
      onSignout();
      
      console.log('✅ Signout complete');
    } catch (error) {
      console.error('Error during signout:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      onClick={handleSignout}
      disabled={isSigningOut}
      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:bg-gray-600"
      title="Sign out"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
      </svg>
      <span className="text-sm">
        {isSigningOut ? 'Signing out...' : 'Sign out'}
      </span>
    </button>
  );
};

export default SignoutButton;