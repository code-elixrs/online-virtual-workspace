import React, { useState } from 'react'

const UsernamePrompt = ({ onUsernameSet }) => {
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (username.trim().length < 2) {
      alert('Username must be at least 2 characters')
      return
    }
    
    setIsLoading(true)
    // Generate a unique user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      await onUsernameSet(username.trim(), userId)
    } catch (error) {
      console.error('Error setting username:', error)
      alert('Failed to set username. Please try again.')
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
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username..."
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              maxLength={20}
              disabled={isLoading}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || username.trim().length < 2}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Connecting...' : 'Enter Virtual Office'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UsernamePrompt