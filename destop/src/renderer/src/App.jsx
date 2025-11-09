import { useState } from 'react'
import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

import { useEffect, useRef } from 'react'
import './assets/main.css'

function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState('')
  const send = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
        <strong>Assistant</strong>
      </div>
      <div style={{ padding: 12, overflow: 'auto', flex: 1, background: '#fafafa' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#666' }}>{m.role}</div>
            <div style={{ background: '#fff', padding: 8, borderRadius: 6 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 8, borderTop: '1px solid #eee' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1, padding: '8px 10px' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Message the assistant"
          />
          <button onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [address, setAddress] = useState('https://example.com')
  const webviewRef = useRef(null)
  const [messages, setMessages] = useState([
    { role: 'system', text: 'You are a helpful assistant.' },
    { role: 'assistant', text: 'Hello — ask me anything about the page or browse to a URL.' }
  ])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    const onDomReady = () => {
      // Optionally inject CSS or JS into the webview
    }
    wv.addEventListener('dom-ready', onDomReady)
    return () => wv.removeEventListener('dom-ready', onDomReady)
  }, [])

  const navigate = (url) => {
    try {
      const parsed = new URL(url)
      webviewRef.current && (webviewRef.current.src = parsed.toString())
    } catch (err) {
      // try to prepend https if user omitted scheme
      try {
        const parsed = new URL('https://' + url)
        setAddress(parsed.toString())
        webviewRef.current && (webviewRef.current.src = parsed.toString())
      } catch (e) {
        console.error('Invalid URL', url)
      }
    }
  }

  const handleSend = (text) => {
    setMessages((m) => [...m, { role: 'user', text }])
    // Simple local echo assistant — replace with real AI call later
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', text: `Echo: ${text}` }])
    }, 600)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', fontFamily: 'system-ui, sans-serif' }}>
      {/* Left: browser area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: 8,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            borderBottom: '1px solid #eee'
          }}
        >
          <button
            onClick={() =>
              webviewRef.current && webviewRef.current.goBack && webviewRef.current.goBack()
            }
          >
            {'<-'}
          </button>
          <button
            onClick={() =>
              webviewRef.current && webviewRef.current.goForward && webviewRef.current.goForward()
            }
          >
            {'->'}
          </button>
          <input
            style={{ flex: 1, padding: '8px 10px' }}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(address)}
          />
          <button onClick={() => navigate(address)}>Go</button>
        </div>

        <div style={{ flex: 1 }}>
          {/* webview requires `webviewTag: true` in BrowserWindow webPreferences */}
          <webview
            ref={webviewRef}
            src={address}
            style={{ width: '100%', height: '100%' }}
            partition={`persist:default`}
            allowpopups
          />
        </div>
      </div>

      {/* Right: chat panel */}
      <div
        style={{
          width: 360,
          borderLeft: '1px solid #eee',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ChatPanel messages={messages} onSend={handleSend} />
      </div>
    </div>
  )
}
