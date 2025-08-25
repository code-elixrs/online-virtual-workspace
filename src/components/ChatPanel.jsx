import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const ChatPanel = ({ roomName, user, isOpen, onClose }) => {
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef(null)

  // Load existing messages
  useEffect(() => {
    if (!isOpen || !roomName) return

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_name', roomName)
          .order('timestamp', { ascending: true })
          .limit(50)
        
        if (error) throw error
        setMessages(data || [])
      } catch (error) {
        console.error('Error loading messages:', error)
      }
    }

    loadMessages()
  }, [roomName, isOpen])

  // Real-time subscription
  useEffect(() => {
    if (!isOpen || !roomName) return

    const channel = supabase
      .channel(`room-chat-${roomName}`)
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
  }, [roomName, isOpen])

  // Auto-scroll
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
          sender_id: user.sessionId, // Use sessionId as sender_id
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

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Chat Header - FIXED: Better spacing */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-white font-semibold">Room Chat</h3>
            <p className="text-gray-400 text-sm">{roomName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close Chat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Messages Area - FIXED: Proper scrolling */}
      <div 
        ref={messagesContainerRef} 
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center text-sm mt-8">
            No messages yet. Start the conversation! 👋
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${
              msg.sender_id === user.sessionId ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                msg.sender_id === user.sessionId 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-200'
              }`}>
                <div className="font-semibold text-xs mb-1 opacity-75">
                  {msg.sender_name}
                  {msg.sender_id === user.sessionId && ' (You)'}
                </div>
                <div className="text-sm break-words">{msg.text}</div>
                <div className="text-xs opacity-50 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Message Input - FIXED: Better responsive design */}
      <div className="flex-shrink-0 border-t border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={isLoading || messageInput.trim() === ''}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.216-.936a1 1 0 01.465 0l5.216.936a1 1 0 001.169-1.409l-7-14z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatPanel