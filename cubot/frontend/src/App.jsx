import React, { useState, useEffect, useRef } from 'react'
import { Search, ArrowUp, Plus, ArrowUpRight, Globe, Cpu, Sparkles, Code2, Users } from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChatting, setIsChatting] = useState(false)
  
  // Ref for scrolling
  const messagesEndRef = useRef(null)
  
  // Simulated streaming/typewriter effect state
  const [streamingText, setStreamingText] = useState('')
  const [activeStreamingIndex, setActiveStreamingIndex] = useState(null)

  // Scroll to bottom on new messages or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Context pill suggestions to display in Row 2 of the floating pill
  const suggestions = [
    { label: "What is Cubemoons?", icon: <Globe size={13} />, text: "Who are you and what exactly does Cubemoons do?" },
    { label: "Plan a startup MVP", icon: <Sparkles size={13} />, text: "I have a startup idea. Can you help me plan a scalable MVP and choose the tech stack?" },
    { label: "AI automation ideas", icon: <Cpu size={13} />, text: "What kind of AI and automation solutions can Cubemoons build to optimize my business?" },
    { label: "Build a web/mobile app", icon: <Code2 size={13} />, text: "I want to build a custom web and mobile app. How does Cubemoons approach web/app development?" }
  ]

  // Handler for sending a message
  const handleSend = async (textToSend) => {
    const text = textToSend || input
    if (!text.trim() || isLoading) return

    // Set transition state to active chat
    if (!isChatting) {
      setIsChatting(true)
    }

    const newUserMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, newUserMessage]
    
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)
    setStreamingText('')
    setActiveStreamingIndex(null)

    try {
      // Send chat history to backend
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!response.ok) {
        throw new Error('Network error')
      }

      const data = await response.json()
      
      // Simulate real-time word-by-word streaming stream for superior UI feel
      const words = data.content.split(' ')
      let currentWordIndex = 0
      let currentText = ''
      
      const assistantMessageIndex = updatedMessages.length
      setActiveStreamingIndex(assistantMessageIndex)
      
      setIsLoading(false) // turn off loader as stream starts

      const timer = setInterval(() => {
        if (currentWordIndex < words.length) {
          currentText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex]
          setStreamingText(currentText)
          currentWordIndex++
        } else {
          clearInterval(timer)
          // Add finalized message to list
          setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
          setStreamingText('')
          setActiveStreamingIndex(null)
        }
      }, 35) // High speed snappy stream (approx 30 words per sec)

    } catch (error) {
      console.error(error)
      setIsLoading(false)
      
      // Fallback CubeAI response if backend is offline
      const errorMessage = `Honestly, I had a slight connection hiccup trying to reach my backend brain. Make sure the backend service is running and accessible at ${API_URL}! Let's get that up and try again.`
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
    }
  }

  // Handle enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Simple Markdown Parser (processes bold **text** and bullet lists)
  const renderMessageContent = (content, showCursor = false) => {
    if (!content) return null

    // Split content by lines
    const lines = content.split('\n')
    
    return lines.map((line, lineIndex) => {
      const isLastLine = lineIndex === lines.length - 1
      
      // Check if line is a list item
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const textContent = line.replace(/^[\-\*]\s+/, '')
        return (
          <ul key={lineIndex}>
            <li>
              {parseInlineStyles(textContent)}
              {isLastLine && showCursor && <span className="streaming-cursor"></span>}
            </li>
          </ul>
        )
      }
      
      // Regular paragraph
      return (
        <p key={lineIndex}>
          {parseInlineStyles(line)}
          {isLastLine && showCursor && <span className="streaming-cursor"></span>}
        </p>
      )
    })
  }

  // Parse sub-segments of text to extract clickable phone numbers, emails, and URLs
  const parseTextSegment = (text) => {
    if (typeof text !== 'string') return text

    // Combined regex to capture URLs, emails, and Indian/Raipur phone numbers (supporting 10-digit mobile numbers natively)
    const regex = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\b[6-9]\d{9}\b|\b\d{4}-\d{7}\b)/g

    const parts = text.split(regex)
    return parts.map((part, index) => {
      if (regex.test(part)) {
        // 1. Email Link
        if (part.includes('@')) {
          return (
            <a key={index} href={`mailto:${part}`} className="interactive-link email">
              {part}
            </a>
          )
        }
        // 2. URL Website Link
        if (part.startsWith('http') || part.startsWith('www') || part.includes('.com')) {
          const href = part.startsWith('http') ? part : `https://${part}`
          return (
            <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="interactive-link url">
              {part}
            </a>
          )
        }
        // 3. Phone Contact Link (Initiates direct dial)
        if (part.startsWith('+') || part.startsWith('0') || /^\d/.test(part)) {
          const telNumber = part.replace(/[^\d+]/g, '')
          const dialNumber = telNumber.length === 10 ? `+91${telNumber}` : telNumber
          return (
            <a key={index} href={`tel:${dialNumber}`} className="interactive-link phone">
              {part}
            </a>
          )
        }
      }
      return part
    })
  }

  // Parse inline bold syntax **bold text** along with sub-segment interactive links
  const parseInlineStyles = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/)
    return parts.flatMap((part, index) => {
      // Every odd part is captured between **
      if (index % 2 === 1) {
        return <strong key={index}>{parseTextSegment(part)}</strong>
      }
      return parseTextSegment(part)
    })
  }

  return (
    <div className={`app-container ${isChatting ? 'chat-mode' : 'hero-mode'}`}>
      {/* Top Ambient glow element */}
      <div className="ambient-glow-top"></div>

      {/* ==========================================================================
         HEADER (Fades in when in active chat mode)
         ========================================================================== */}
      {isChatting && (
        <header className="active-header">
          <a href="#" className="header-brand" onClick={() => {
            setMessages([])
            setIsChatting(false)
          }}>
            <div className="header-brand-logo">C</div>
            <span>CubeAI</span>
          </a>
          <a href="https://cubemoons.com/" target="_blank" rel="noopener noreferrer" className="visit-website-link">
            <span>cubemoons.com</span>
            <ArrowUpRight size={14} />
          </a>
        </header>
      )}

      {/* ==========================================================================
         HERO SECTION (Initial centered search landing layout)
         ========================================================================== */}
      {!isChatting && (
        <section className="hero-section">
          <div className="hero-logo-wrapper">
            <div className="hero-logo">
              <svg className="logo-icon" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>CubeAI</span>
            </div>
          </div>
          
          <h1 className="hero-title">
            What are we building<br />today?
          </h1>

          <div className="early-access-pill">
            <a href="https://cubemoons.com/" target="_blank" rel="noopener noreferrer" className="btn-dark">
              Cubemoons
            </a>
            <span>Official digital strategist and AI copilot</span>
          </div>
        </section>
      )}

      {/* ==========================================================================
         CHAT CONVERSATION THREAD VIEW
         ========================================================================== */}
      {isChatting && (
        <div className="chat-thread-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="avatar assistant">
                  <svg className="logo-icon-svg" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
              )}
              <div className="message-bubble">
                {renderMessageContent(msg.content)}
              </div>
              {msg.role === 'user' && (
                <div className="avatar user">
                  <Users size={14} />
                </div>
              )}
            </div>
          ))}

          {/* Active Streaming Message Bubble */}
          {activeStreamingIndex !== null && streamingText && (
            <div className="message-row assistant streaming">
              <div className="avatar assistant">
                <svg className="logo-icon-svg" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <div className="message-bubble">
                {renderMessageContent(streamingText, true)}
              </div>
            </div>
          )}

          {/* Typing Loading Indicator */}
          {isLoading && (
            <div className="message-row assistant loading">
              <div className="avatar assistant">
                <svg className="logo-icon-svg" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <div className="message-bubble">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ==========================================================================
         FLOATING CARD CHAT PILL (Matches Arc Dia visual layout)
         ========================================================================== */}
      <div className={isChatting ? 'chatting-input-container' : 'hero-input-container'}>
        <div className="chat-pill-card">
          {/* Row 1: Search icon, main textfield, and send button circle */}
          <div className="pill-row-top">
            <Search className="search-icon-gray" />
            <input 
              type="text" 
              className="chat-input-field" 
              placeholder="Hey CubeAI..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading && activeStreamingIndex === null}
            />
            <button 
              className="send-btn-circle" 
              onClick={() => handleSend()}
              disabled={(isLoading && activeStreamingIndex === null) || !input.trim()}
            >
              <ArrowUp size={16} />
            </button>
          </div>
          
          {/* Row 2: Context options tags (clickable to quick trigger) */}
          <div className="pill-row-bottom">
            {suggestions.map((sug, idx) => (
              <button 
                key={idx} 
                className="context-pill-option"
                onClick={() => handleSend(sug.text)}
                disabled={isLoading}
              >
                {sug.icon}
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==========================================================================
         FOOTER PLAY VIDEO / SHOWREEL LINK (Matches watch trailer bottom button)
         ========================================================================== */}
      {!isChatting && (
        <div className="hero-subtext">
          <a 
            href="https://cubemoons.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="watch-trailer-btn"
          >
            <img 
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=100&auto=format&fit=crop&q=60" 
              alt="Cubemoons showreel thumbnail" 
            />
            <span>Explore Cubemoons website</span>
            <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
          </a>
          <div style={{ marginTop: '16px' }}>
            Not ready to build? <a href="https://cubemoons.com/" target="_blank" rel="noopener noreferrer">Let's talk scale →</a>
          </div>
        </div>
      )}
    </div>
  )
}
