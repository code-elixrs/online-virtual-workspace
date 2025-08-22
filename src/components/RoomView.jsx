import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const RoomView = ({ roomName, onLeaveRoom, user }) => {
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef(null)

  // Load existing messages when entering room
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_name', roomName)
          .order('timestamp', { ascending: true })
          .limit(50) // Last 50 messages
        
        if (error) throw error
        setMessages(data || [])
      } catch (error) {
        console.error('Error loading messages:', error)
      }
    }

    loadMessages()
  }, [roomName])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomName}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_name=eq.${roomName}`
        },
        (payload) => {
          console.log('New message received:', payload.new)
          setMessages(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomName])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (messageInput.trim() === '' || isLoading) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_name: roomName,
          sender_id: user.id,
          sender_name: user.name,
          text: messageInput.trim()
        })

      if (error) throw error
      setMessageInput('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 bg-gray-900 rounded-3xl">
      {/* Room Header */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg shadow-2xl mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-0">
          {roomName}
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 text-sm">
            Welcome, {user.name}!
          </span>
          <button
            onClick={onLeaveRoom}
            className="p-3 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-grow flex flex-col bg-gray-800 rounded-xl shadow-inner overflow-hidden">
        <div ref={messagesContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-gray-400 text-center mt-8">
              No messages yet. Say hello! 👋
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex items-start ${msg.sender_id === user.id ? 'justify-end' : ''}`}>
                <div className={`p-3 rounded-lg max-w-xs md:max-w-md break-words ${
                  msg.sender_id === user.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-200'
                }`}>
                  <div className="font-bold text-sm mb-1">
                    {msg.sender_name}
                    {msg.sender_id === user.id && ' (You)'}
                  </div>
                  <div>{msg.text}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={isLoading || messageInput.trim() === ''}
            className="p-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.216-.936a1 1 0 01.465 0l5.216.936a1 1 0 001.169-1.409l-7-14z"></path>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RoomView