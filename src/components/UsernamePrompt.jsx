import React, { useState } from 'react'
import { usernameService } from '../services/usernameService'

const UsernamePrompt = ({ onUsernameSet }) => {
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      // Check if username is available
      const { available, existingSession } = await usernameService.isUsernameAvailable(username.trim())
      
      if (!available && existingSession) {
        setError(`Username "${username}" is already taken by an active user. Please choose another name.`)
        setIsLoading(false)
        return
      }
      
      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Claim the username
      const result = await usernameService.claimUsername(username.trim(), sessionId)
      
      if (result.success) {
        await onUsernameSet(username.trim(), sessionId)
      } else {
        setError('Failed to join. Please try again.')
      }
    } catch (error) {
      console.error('Error setting username:', error)
      setError('Failed to join. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-950 min-h-screen flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          Welcome to Virtual Office
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Choose your username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('') // Clear error when typing
              }}
              placeholder="Enter your username..."
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              maxLength={20}
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || username.trim().length < 2}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Checking availability...' : 'Enter Virtual Office'}
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-400 text-center">
          Note: Only one session per username is allowed
        </div>
      </div>
    </div>
  )
}

export default UsernamePrompt;