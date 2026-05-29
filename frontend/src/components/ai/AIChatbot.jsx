import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Trash2 } from 'lucide-react'
import { dashboardApi, budgetsApi, aiApi, categoriesApi, accountsApi, transactionsApi, usageApi } from '../../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import MonthYearPicker from '../MonthYearPicker'
import { useAuth } from '../../context/AuthContext'

const getCleanUserMessage = (content) => {
  if (!content) return "";
  const index = content.indexOf("USER SAYS:");
  if (index !== -1) {
    let sub = content.substring(index + "USER SAYS:".length).trim();
    if (sub.startsWith('"')) {
      const nextQuote = sub.indexOf('"', 1);
      if (nextQuote !== -1) {
        return sub.substring(1, nextQuote).trim();
      }
    }
    const taskIndex = sub.indexOf("TASK:");
    if (taskIndex !== -1) {
      sub = sub.substring(0, taskIndex).trim();
    }
    return sub.replace(/^"|"$/g, '').trim();
  }
  return content;
}

export default function AIChatbot() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
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
      usageApi.track('ai')
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
        context: "The user uses this app to track budget. Help them cut costs."
      })
    } catch {
      return "{ error: 'No financial context available right now' }"
    }
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
      const prompt = `You are Jav, the user's empathetic, responsive, and highly intelligent AI Financial Advisor.
The user's name is ${user?.name || 'User'}. Address them by name when appropriate.
Speak naturally, warm, and conversationally with human-like responsiveness. Offer helpful, practical budget analysis and insights based on their data. Keep responses to a friendly, natural length (around 2-3 sentences). Format numbers in Indian Rupees (INR / ₹) with markdown.

CONTEXT: ${context}
USER SAYS: "${userMsg.content}"`

      const response = await aiApi.chat(prompt, selectedMonth, userMsg.content)
      setMessages(prev => [...prev, { role: 'assistant', content: response.content }])
    } catch (err) {
      console.error("AI Proxy Error:", err)
      const errorDetail = err.response?.data?.detail || 'Jav is temporarily offline.'
      toast.error(errorDetail)
    } finally {
      setIsTyping(false)
    }
  }

  const months = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}`)
  }

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 lg:bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform ${isOpen ? 'hidden' : 'block'} z-[35]`}
        style={{ background: 'var(--primary)', color: '#ffffff' }}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 lg:bottom-6 right-6 left-6 lg:left-auto w-auto lg:w-96 h-[32rem] bg-[var(--card)] rounded-2xl shadow-2xl flex flex-col z-[35] overflow-hidden border border-[var(--border)]">
          {/* Header */}
          <div className="p-4 text-white flex justify-between items-center bg-[var(--primary)]" style={{ background: 'var(--primary)' }}>
            <div className="flex flex-col flex-1 mr-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <h3 className="font-bold">Jav</h3>
                </div>
                <span className="text-xs opacity-75 font-semibold bg-white/10 px-2 py-0.5 rounded-full">💼 Finance Advisor</span>
              </div>
              
              <div className="mt-2 shrink-0 animate-in slide-in-from-top-1 duration-200">
                <MonthYearPicker 
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  months={months}
                />
              </div>
            </div>
            <div className="flex gap-2 self-start mt-0.5">
              <button onClick={clearChat} className="p-1 hover:bg-white/20 rounded text-xs" title="Clear Chat">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[var(--bg)]">
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-500 mt-6 space-y-4 animate-in fade-in duration-300">
                <div>
                  <p className="font-bold text-[var(--text)]">👋 Hi {user?.name || 'there'}!</p>
                  <p className="text-xs mt-1">I'm Jav, your financial assistant. Let me help you analyze your budget, track limits, or suggest savings tips!</p>
                  
                  <div className="pt-4">
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-2">Quick Actions</p>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <button 
                        onClick={() => handleSend(null, "Analyze my spending this month")}
                        className="px-4 py-2 text-xs rounded-xl bg-white/5 border border-[var(--border)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 text-left flex items-center gap-2 text-[var(--text)] transition-all hover:scale-[1.02]"
                      >
                        <span>💼 Analyze my spending</span>
                      </button>
                      <button 
                        onClick={() => handleSend(null, "Suggest ways to save money")}
                        className="px-4 py-2 text-xs rounded-xl bg-white/5 border border-[var(--border)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 text-left flex items-center gap-2 text-[var(--text)] transition-all hover:scale-[1.02]"
                      >
                        <span>💡 Suggest ways to save money</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((m, idx) => (
              <div key={idx} className="space-y-2">
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-[var(--primary)] text-white rounded-br-none' 
                      : 'rounded-bl-none border border-[var(--border)]'
                  }`}
                  style={m.role === 'assistant' ? { backgroundColor: 'var(--card)', color: 'var(--text)' } : {}}
                  >
                    {m.role === 'user' ? (
                      getCleanUserMessage(m.content)
                    ) : (
                      <div className="prose prose-sm prose-p:my-1 prose-ul:my-1 dark:prose-invert" style={{ color: 'inherit' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-none p-3 shadow-sm border border-[var(--border)] flex gap-1"
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
          <div className="p-3 bg-[var(--card)] border-t border-[var(--border)]">
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
