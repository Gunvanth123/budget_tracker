import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Trash2 } from 'lucide-react'
import { dashboardApi, budgetsApi, aiApi } from '../../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  const endRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const clearChat = () => setMessages([])

  const fetchContext = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    try {
      const [dashboard, budgets] = await Promise.all([
        dashboardApi.get(),
        budgetsApi.getAll(currentMonth)
      ])
      
      const summary = dashboard.summary
      
      return JSON.stringify({
        current_month: currentMonth,
        total_income: summary.total_income,
        total_expense: summary.total_expense,
        balance: summary.total_balance,
        expense_breakdown: dashboard.expense_by_category,
        budget_limits: budgets,
        context: "The user uses this app to track budget. Help them cut costs based strictly on these provided generic aggregates."
      })
    } catch {
      return "{ error: 'No financial context available right now' }"
    }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const context = await fetchContext()
      const prompt = `You are an expert, friendly AI financial advisor inside a Budget Tracker app. 
      You MUST NOT ask for explicit user details or passwords. 
      Here is the user's aggregated tracking data for this month: 
      \n\n${context}\n\n
      The user says: "${userMsg.content}".
      Give a concise, actionable, and encouraging response, formatting numbers clearly. Use markdown.`

      const response = await aiApi.chat(prompt)
      setMessages(prev => [...prev, { role: 'assistant', content: response.content }])
    } catch (err) {
      console.error("AI Proxy Error:", err)
      const errorDetail = err.response?.data?.detail || 'AI Advisor is temporarily offline.'
      toast.error(errorDetail)
    } finally {
      setIsTyping(false)
    }
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
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-bold">AI Financial Advisor</h3>
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
                <p>👋 Hi! I'm your strictly-confidential AI coach.</p>
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
