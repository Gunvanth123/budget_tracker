import { useNavigate } from 'react-router-dom'
import { 
  Plus, Key, Shield, Clapperboard, ChevronRight, 
  ListTodo, Bot, Wallet, Landmark 
} from 'lucide-react'

export default function QuickActions({ onAddTransaction, usage = [] }) {
  const navigate = useNavigate()

  // Master list of all possible quick actions
  const allActions = {
    transaction: {
      label: 'Add Entry',
      icon: Plus,
      color: 'bg-emerald-500',
      action: onAddTransaction,
      desc: 'Log expense'
    },
    passwords: {
      label: 'Passwords',
      icon: Key,
      color: 'bg-amber-500',
      action: () => navigate('/passwords'),
      desc: 'View vault'
    },
    vault: {
      label: 'Files',
      icon: Shield,
      color: 'bg-indigo-500',
      action: () => navigate('/vault'),
      desc: 'Secure docs'
    },
    popcorn: {
      label: 'Popcorn',
      icon: Clapperboard,
      color: 'bg-rose-500',
      action: () => navigate('/popcorn'),
      desc: 'Watchlist'
    },
    todo: {
      label: 'To-Do',
      icon: ListTodo,
      color: 'bg-sky-500',
      action: () => navigate('/todo'),
      desc: 'Tasks'
    },
    ai: {
      label: 'AI Chat',
      icon: Bot,
      color: 'bg-purple-500',
      action: () => navigate('/ai'),
      desc: 'Financial assistant'
    },
    budgets: {
      label: 'Budgets',
      icon: Wallet,
      color: 'bg-orange-500',
      action: () => navigate('/budgets'),
      desc: 'Goals'
    },
    accounts: {
      label: 'Accounts',
      icon: Landmark,
      color: 'bg-blue-500',
      action: () => navigate('/accounts'),
      desc: 'Wallets'
    }
  }

  // Determine which actions to show
  // Always show 'transaction' first
  let displayActionIds = ['transaction']

  if (usage && usage.length > 0) {
    // Get top 3 from usage that are NOT transaction
    const topUsed = usage
      .filter(u => u.feature_id !== 'transaction')
      .map(u => u.feature_id)
      .slice(0, 3)
    
    displayActionIds = [...displayActionIds, ...topUsed]
  }

  // Fill up to 4 if we have fewer than 4 (defaults)
  const defaults = ['passwords', 'vault', 'popcorn']
  for (const def of defaults) {
    if (displayActionIds.length >= 4) break
    if (!displayActionIds.includes(def)) {
      displayActionIds.push(def)
    }
  }

  // Final actions list
  const actions = displayActionIds.map(id => ({ id, ...allActions[id] })).filter(a => a.label)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((item) => (
        <button
          key={item.id}
          onClick={item.action}
          className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all hover:shadow-xl hover:shadow-[var(--primary)]/5 overflow-hidden text-left"
        >
          {/* Subtle Background Glow */}
          <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${item.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
          
          <div className={`w-12 h-12 rounded-xl ${item.color} text-white flex items-center justify-center shrink-0 shadow-lg shadow-${item.color?.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
            <item.icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{item.label}</h3>
            <p className="text-[10px] opacity-50 truncate">{item.desc}</p>
          </div>

          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-30 transition-opacity" />
        </button>
      ))}
    </div>
  )
}
