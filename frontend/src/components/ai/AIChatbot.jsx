import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Trash2, Plus, Check, Star, Globe, Film, Tv, Sparkles, Popcorn } from 'lucide-react'
import { dashboardApi, budgetsApi, aiApi, categoriesApi, accountsApi, transactionsApi, usageApi, recommendationApi, popcornApi } from '../../api/client'
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
  const [addedTitles, setAddedTitles] = useState([])
  const [mode, setMode] = useState('finance')
  
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
  }, [selectedMonth, mode, isOpen])

  const fetchHistory = async () => {
    try {
      const historyId = mode === 'finance' ? selectedMonth : 'movie'
      const history = await aiApi.getHistory(historyId)
      setMessages(history)
    } catch (err) {
      console.error("Failed to fetch history:", err)
    }
  }

  const clearChat = async () => {
    const historyId = mode === 'finance' ? selectedMonth : 'movie'
    const displayName = mode === 'finance' ? selectedMonth : 'Movie Recommender'
    if (window.confirm(`Clear chat history for ${displayName}?`)) {
      try {
        await aiApi.clearHistory(historyId)
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


  const handleAddToWatchlist = async (item) => {
    try {
      let category = "Movies"
      if (item.media_type === "tv") {
        category = "TV show"
      }
      const isAnimation = item.genres?.includes("Animation") || item.genres?.includes("Anime")
      if (isAnimation) {
        category = item.media_type === "movie" ? "Anime movie" : "Anime series"
      }

      const scaledRating = Math.round(Math.min(5.0, Math.max(0.0, item.imdb_rating / 2.0)) * 10) / 10

      const data = new FormData()
      data.append('title', item.title)
      data.append('category', category)
      data.append('language', item.language || 'English')
      data.append('rating', scaledRating)
      data.append('synopsis', item.overview || '')
      data.append('reasons_for_liking', 'Recommended by AI Advisor')
      data.append('genres', (item.genres || []).join(', '))
      if (item.poster_path) {
        data.append('remote_poster_url', item.poster_path)
      }

      await popcornApi.create(data)
      setAddedTitles(prev => [...prev, item.title])
      toast.success(`"${item.title}" added to your watchlist!`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to add to watchlist")
    }
  }

  const parseActionJSON = (jsonStr) => {
    let cleaned = jsonStr.trim();
    cleaned = cleaned.replace(/^```json|```$/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      try {
        let fixed = cleaned.replace(/'/g, '"');
        fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        return JSON.parse(fixed);
      } catch (e2) {
        console.error("JSON repair failed:", e2);
        throw e;
      }
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
      const historyId = mode === 'finance' ? selectedMonth : 'movie'
      let prompt = ''
      
      if (mode === 'finance') {
        const context = await fetchContext()
        prompt = `You are Jav, the user's empathetic, responsive, and highly intelligent AI Financial Advisor.
The user's name is ${user?.name || 'User'}. Address them by name when appropriate.
Speak naturally, warm, and conversationally with human-like responsiveness. Offer helpful, practical budget analysis and insights based on their data. Keep responses to a friendly, natural length (around 2-3 sentences). Format numbers in Indian Rupees (INR / ₹) with markdown.

CONTEXT: ${context}
USER SAYS: "${userMsg.content}"`
      } else {
        prompt = `You are Jav, the user's movie, anime, and TV show recommender expert.
The user's name is ${user?.name || 'User'}.
You MUST return a very short, friendly response (MAX 2 SENTENCES) saying you are fetching recommendations.
You MUST also append an action block at the end of your response so the tool can load the cards.
Format: [ACTION]{"type": "recommend", "query": "clean search keyword/title/genre", "media_type": "movie"|"tv"|"anime"}[/ACTION]

USER SAYS: "${userMsg.content}"`
      }

      const response = await aiApi.chat(prompt, historyId, userMsg.content)
      let aiContent = response.content

      let recommendations = null
      let action = null
      
      const actionMatch = aiContent.match(/\[ACTION\](.*?)\[\/ACTION\]/s)
      if (actionMatch) {
        try {
          action = parseActionJSON(actionMatch[1])
        } catch (err) {
          console.error("Action Parsing Failed:", err)
        }
      }

      // Fallback: If in movie mode and no action block was generated, fallback to using user input as search query
      if (!action && mode === 'movie') {
        action = {
          type: 'recommend',
          query: userMsg.content,
          media_type: 'movie'
        }
      }

      if (action && action.type === 'recommend') {
        setIsTyping(true)
        try {
          let mediaType = action.media_type || 'movie'
          if (userMsg.content.toLowerCase().includes('anime')) {
            mediaType = 'anime'
          } else if (userMsg.content.toLowerCase().includes('tv') || userMsg.content.toLowerCase().includes('show') || userMsg.content.toLowerCase().includes('series')) {
            mediaType = 'tv'
          }
          recommendations = await recommendationApi.get(action.query, mediaType)
        } catch (err) {
          console.error("Failed to fetch recommendations:", err)
          toast.error("Failed to load TMDB recommendations")
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiContent, recommendations }])
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
          <div className="p-4 text-white flex justify-between items-center" style={{ background: 'var(--primary)' }}>
            <div className="flex flex-col flex-1 mr-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <h3 className="font-bold">Jav</h3>
                </div>
                {/* Mode Selector */}
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer"
                >
                  <option value="finance" className="bg-slate-900 text-white">💼 Finance Advisor</option>
                  <option value="movie" className="bg-slate-900 text-white">🎬 Movie Recommender</option>
                </select>
              </div>
              
              {mode === 'finance' && (
                <div className="mt-2 shrink-0 animate-in slide-in-from-top-1 duration-200">
                  <MonthYearPicker 
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    months={months}
                  />
                </div>
              )}
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
                {mode === 'finance' ? (
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
                ) : (
                  <div>
                    <p className="font-bold text-[var(--text)]">🎬 Movie Time!</p>
                    <p className="text-xs mt-1">I'm Jav, your recommendation assistant. Tell me what genres or titles you enjoy, and I'll find something great to watch!</p>
                    
                    <div className="pt-4">
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-2">Popular Quick Actions</p>
                      <div className="flex flex-col gap-2 max-w-xs mx-auto">
                        <button 
                          onClick={() => handleSend(null, "Recommend some popular sci-fi movies")}
                          className="px-4 py-2 text-xs rounded-xl bg-white/5 border border-[var(--border)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 text-left flex items-center gap-2 text-[var(--text)] transition-all hover:scale-[1.02]"
                        >
                          <Film className="w-4 h-4 text-indigo-400" />
                          <span>Recommend some sci-fi movies</span>
                        </button>
                        <button 
                          onClick={() => handleSend(null, "Recommend some good action anime")}
                          className="px-4 py-2 text-xs rounded-xl bg-white/5 border border-[var(--border)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 text-left flex items-center gap-2 text-[var(--text)] transition-all hover:scale-[1.02]"
                        >
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span>Recommend some action anime</span>
                        </button>
                        <button 
                          onClick={() => handleSend(null, "Suggest trending TV shows")}
                          className="px-4 py-2 text-xs rounded-xl bg-white/5 border border-[var(--border)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 text-left flex items-center gap-2 text-[var(--text)] transition-all hover:scale-[1.02]"
                        >
                          <Tv className="w-4 h-4 text-blue-400" />
                          <span>Recommend trending TV shows</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                          {m.content.replace(/\[ACTION\].*?\[\/ACTION\]/gs, '').trim()}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>

                {m.role === 'assistant' && m.recommendations && m.recommendations.length > 0 && (
                  <div className="w-full overflow-hidden py-1">
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin scrollbar-thumb-indigo-500/30 scroll-smooth snap-x snap-mandatory">
                      {m.recommendations.map((item, recIdx) => {
                        const isAdded = addedTitles.includes(item.title);
                        return (
                          <div 
                            key={recIdx} 
                            className="w-[260px] flex-shrink-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:scale-102 hover:border-indigo-500/50 shadow-md hover:shadow-lg transition-all duration-300 snap-start flex flex-col"
                          >
                            <div className="h-[140px] bg-slate-800 relative overflow-hidden flex-shrink-0">
                              {item.poster_path ? (
                                <img 
                                  src={item.poster_path} 
                                  alt={item.title} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-indigo-950">
                                  <Popcorn className="w-8 h-8 opacity-25 text-indigo-400 mb-2" />
                                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest text-center px-4 line-clamp-2">
                                    {item.title}
                                  </span>
                                </div>
                              )}
                              {item.imdb_rating > 0 && (
                                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-yellow-400 flex items-center gap-1 border border-white/10">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span>{item.imdb_rating.toFixed(1)}</span>
                                </div>
                              )}
                              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-white border border-white/10 flex items-center gap-1">
                                {item.media_type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
                                <span>{item.media_type === 'movie' ? 'Movie' : 'TV Show'}</span>
                              </div>
                            </div>

                            <div className="p-3 flex-1 flex flex-col justify-between min-h-0">
                              <div>
                                <h4 className="font-extrabold text-sm text-[var(--text)] line-clamp-1 mb-1" title={item.title}>
                                  {item.title}
                                </h4>
                                <div className="flex flex-wrap gap-1.5 items-center mb-2">
                                  {item.language && (
                                    <span className="text-[9px] font-semibold opacity-60 uppercase tracking-widest flex items-center gap-0.5 text-[var(--text)]">
                                      <Globe className="w-2.5 h-2.5 opacity-55" />
                                      {item.language}
                                    </span>
                                  )}
                                  <div className="flex flex-wrap gap-1">
                                    {item.genres?.map((g, gIdx) => (
                                      <span key={gIdx} className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/10">
                                        {g}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-[11px] opacity-60 line-clamp-3 leading-relaxed mb-3 text-[var(--text)]">
                                  {item.overview || 'No synopsis available.'}
                                </p>
                              </div>

                              <button
                                onClick={() => handleAddToWatchlist(item)}
                                disabled={isAdded}
                                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  isAdded 
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                                    : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:scale-[1.02] shadow-sm'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Added to Watchlist</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add to Watchlist</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
