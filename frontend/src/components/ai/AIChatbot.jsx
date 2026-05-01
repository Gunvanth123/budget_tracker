import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Trash2, Mic, MicOff, Volume2 } from 'lucide-react'
import { dashboardApi, budgetsApi, aiApi, categoriesApi, accountsApi, transactionsApi } from '../../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  
  const endRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [selectedMonth, isOpen])

  const fetchHistory = async () => {
    try {
      const history = await aiApi.getHistory(selectedMonth)
      setMessages(history)
    } catch (err) {
      console.error("Failed to fetch history:", err)
    }
  }

  const clearChat = async () => {
    if (window.confirm(`Clear chat history for ${selectedMonth}?`)) {
      try {
        await aiApi.clearHistory(selectedMonth)
        setMessages([])
        toast.success("Chat history cleared")
      } catch (err) {
        toast.error("Failed to clear chat")
      }
    }
  }

  const fetchContext = async () => {
    try {
      const [dashboard, budgets, categories, accounts] = await Promise.all([
        dashboardApi.get(),
        budgetsApi.getAll(selectedMonth),
        categoriesApi.getAll(),
        accountsApi.getAll()
      ])
      
      const summary = dashboard.summary
      
      return JSON.stringify({
        current_month: selectedMonth,
        total_income: summary.total_income,
        total_expense: summary.total_expense,
        balance: summary.total_balance,
        expense_breakdown: dashboard.expense_by_category,
        budget_limits: budgets,
        available_categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
        available_accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type, is_default: a.is_default })),
        context: "The user uses this app to track budget. Help them cut costs. You can also add transactions automatically if requested."
      })
    } catch {
      return "{ error: 'No financial context available right now' }"
    }
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error("Voice recognition not supported in this browser.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      // Auto-send if it's a clear command
      setTimeout(() => handleSend(null, transcript), 500)
    }

    recognition.start()
  }

  const speak = (text) => {
    const cleanText = text.replace(/\[ACTION\].*?\[\/ACTION\]/gs, '').replace(/[*#`_~]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const handleSend = async (e, directInput = null) => {
    if (e) e.preventDefault()
    const content = directInput || input
    if (!content.trim() || isTyping) return

    const userMsg = { role: 'user', content: content }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const context = await fetchContext()
      const prompt = `You are a friendly AI financial advisor. 
      CONTEXT: ${context}
      USER SAYS: "${userMsg.content}"
      
      TASK: Provide a VERY CONCISE response (MAX 2 SENTENCES). 
      Format numbers in Indian Rupees (INR / ₹). Do not use US Dollars. Use markdown.`

      const response = await aiApi.chat(prompt, selectedMonth)
      let aiContent = response.content

      const actionMatch = aiContent.match(/\[ACTION\](.*?)\[\/ACTION\]/s)
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1])
          if (action.type === 'add_transaction') {
            await transactionsApi.create(action.data)
            toast.success(`Transaction Added: ₹${action.data.amount}`)
          }
        } catch (err) {
          console.error("Action Parsing Failed:", err)
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiContent }])
      speak(aiContent)
    } catch (err) {
      console.error("AI Proxy Error:", err)
      const errorDetail = err.response?.data?.detail || 'AI Advisor is temporarily offline.'
      toast.error(errorDetail)
    } finally {
      setIsTyping(false)
    }
  }

  const months = []
  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform ${isOpen ? 'hidden' : 'block'} z-50`}
        style={{ background: 'var(--primary)', color: '#ffffff' }}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-100" style={{ backgroundColor: 'var(--card)' }}>
          {/* Header */}
          <div className="p-4 text-white flex justify-between items-center" style={{ background: 'var(--primary)' }}>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h3 className="font-bold">AI Financial Advisor</h3>
              </div>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white/10 text-[10px] rounded px-1 mt-1 outline-none border border-white/20"
              >
                {months.map(m => (
                  <option key={m} value={m} style={{ color: '#000' }}>
                    {new Date(m).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={clearChat} className="p-1 hover:bg-white/20 rounded text-xs" title="Clear Chat">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50" style={{ backgroundColor: 'var(--bg)' }}>
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-500 mt-10">
                <p>👋 Hi! I'm your AI financial coach for {new Date(selectedMonth).toLocaleString('default', { month: 'long' })}.</p>
                <p className="mt-2 text-xs">Ask me how to lower your grocery spending, or analyze your budget limits!</p>
              </div>
            )}
            
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-indigo-500 text-white rounded-br-none' 
                    : 'text-gray-800 rounded-bl-none border border-gray-100'
                }`}
                style={m.role === 'assistant' ? { backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' } : {}}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <div className="prose prose-sm prose-p:my-1 prose-ul:my-1 prose-indigo" style={{ color: 'inherit' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-none p-3 shadow-sm border border-gray-100 flex gap-1"
                     style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100" style={{ backgroundColor: 'var(--card)' }}>
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your budget..."
                className="flex-1 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500"
                style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              />
              <button 
                type="button"
                onClick={isListening ? () => {} : startListening}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title="Voice Input"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button 
                type="submit" 
                disabled={isTyping || !input.trim()} 
                className="bg-indigo-500 text-white rounded-full p-2 hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
