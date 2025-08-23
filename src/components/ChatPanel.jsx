import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const ChatPanel = ({ roomName, user, isOpen, onClose }) => {
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesContainerRef = useRef(null)

  console.log('💬 ChatPanel rendered:', { roomName, user, isOpen })

  // Load existing messages when entering room
  useEffect(() => {
    if (!roomName || !isOpen || !user?.sessionId) return

    console.log('📥 Loading messages for room:', roomName)

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_name', roomName)
          .order('timestamp', { ascending: true })
          .limit(50)
        
        if (error) {
          console.error('❌ Error loading messages:', error)
          return
        }
        
        console.log('📥 Messages loaded:', data)
        setMessages(data || [])
      } catch (error) {
        console.error('❌ Exception loading messages:', error)
      }
    }

    loadMessages()
  }, [roomName, isOpen, user])

  // Set up real-time subscription
  useEffect(() => {
    if (!roomName || !isOpen || !user?.sessionId) return

    console.log('📡 Setting up chat subscription for room:', roomName)

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
          console.log('💬 New message received:', payload.new)
          setMessages(prev => [...prev, payload.new])
        }
      )
      .subscribe((status) => {
        console.log('📡 Chat subscription status:', status)
      })

    return () => {
      console.log('🧹 Cleaning up chat subscription')
      supabase.removeChannel(channel)
    }
  }, [roomName, isOpen, user])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && !isMinimized) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, isMinimized])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (messageInput.trim() === '' || isLoading || !user?.sessionId) return

    console.log('📤 Sending message:', {
      text: messageInput.trim(),
      room: roomName,
      user: user.name,
      sessionId: user.sessionId
    })

    setIsLoading(true)
    try {
      const messageData = {
        room_name: roomName,
        sender_id: user.sessionId, // Use sessionId instead of user.id
        sender_name: user.name,
        text: messageInput.trim()
      }

      console.log('📤 Message data:', messageData)

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()

      if (error) {
        console.error('❌ Error sending message:', error)
        alert(`Failed to send message: ${error.message}`)
      } else {
        console.log('✅ Message sent successfully:', data)
        setMessageInput('')
      }
    } catch (error) {
      console.error('❌ Exception sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`h-full bg-gray-800 border-l border-gray-600 shadow-2xl flex flex-col ${
      isMinimized ? 'w-80' : 'w-96'
    }`}>
      {/* Chat Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-600 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <h3 className="font-semibold text-white">{roomName}</h3>
            <p className="text-xs text-gray-400">Room Chat</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isMinimized ? (
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5zM4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
              )}
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Close Chat"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Content - Full Height */}
      {!isMinimized ? (
        <>
          {/* Chat Messages - Takes all available space and scrolls */}
          <div 
            ref={messagesContainerRef} 
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {messages.length === 0 ? (
              <div className="text-gray-400 text-center mt-8 text-sm">
                No messages yet. Start the conversation! 💬
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.sessionId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender_id === user.sessionId 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-200'
                  }`}>
                    <div className="font-semibold text-xs mb-1 opacity-80">
                      {msg.sender_id === user.sessionId ? 'You' : msg.sender_name}
                    </div>
                    <div className="text-sm break-words">{msg.text}</div>
                    <div className="text-xs opacity-60 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input - Fixed at bottom */}
          <div className="p-4 border-t border-gray-600 flex-shrink-0 bg-gray-800">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow p-3 text-sm rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={isLoading || messageInput.trim() === '' || !user?.sessionId}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.216-.936a1 1 0 01.465 0l5.216.936a1 1 0 001.169-1.409l-7-14z"></path>
                  </svg>
                )}
              </button>
            </form>
          </div>
        </>
      ) : (
        /* Minimized View */
        <div className="flex-1 p-4 flex flex-col justify-center items-center">
          <div className="text-gray-400 text-sm mb-2">Chat minimized</div>
          <div className="text-xs text-gray-500">{messages.length} messages</div>
          <div className="mt-4">
            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatPanel