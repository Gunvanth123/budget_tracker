import { useNavigate } from 'react-router-dom'
import { 
  Plus, Key, Shield, Clapperboard, ChevronRight, 
  ListTodo, Bot, Wallet, Landmark 
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function QuickActions({ onAddTransaction, usage = [] }) {
  const navigate = useNavigate()

  // Master list of all possible quick actions
  const allActions = {
    transaction: {
      label: 'Add Entry',
      icon: Plus,
      color: 'from-emerald-400 to-emerald-600',
      shadow: 'rgba(16, 185, 129, 0.25)',
      action: onAddTransaction,
      desc: 'Log expense'
    },
    passwords: {
      label: 'Passwords',
      icon: Key,
      color: 'from-amber-400 to-amber-500',
      shadow: 'rgba(245, 158, 11, 0.25)',
      action: () => navigate('/passwords'),
      desc: 'View vault'
    },
    vault: {
      label: 'Files',
      icon: Shield,
      color: 'from-indigo-400 to-indigo-600',
      shadow: 'rgba(99, 102, 241, 0.25)',
      action: () => navigate('/vault'),
      desc: 'Secure docs'
    },
    popcorn: {
      label: 'Popcorn',
      icon: Clapperboard,
      color: 'from-rose-400 to-rose-600',
      shadow: 'rgba(244, 63, 94, 0.25)',
      action: () => navigate('/popcorn'),
      desc: 'Watchlist'
    },
    todo: {
      label: 'To-Do',
      icon: ListTodo,
      color: 'from-sky-400 to-sky-600',
      shadow: 'rgba(14, 165, 233, 0.25)',
      action: () => navigate('/todo'),
      desc: 'Tasks'
    },
    ai: {
      label: 'AI Chat',
      icon: Bot,
      color: 'from-purple-400 to-purple-600',
      shadow: 'rgba(168, 85, 247, 0.25)',
      action: () => navigate('/ai'),
      desc: 'Assistant'
    },
    budgets: {
      label: 'Budgets',
      icon: Wallet,
      color: 'from-orange-400 to-orange-600',
      shadow: 'rgba(249, 115, 22, 0.25)',
      action: () => navigate('/budgets'),
      desc: 'Goals'
    },
    accounts: {
      label: 'Accounts',
      icon: Landmark,
      color: 'from-blue-400 to-blue-600',
      shadow: 'rgba(59, 130, 246, 0.25)',
      action: () => navigate('/accounts'),
      desc: 'Wallets'
    }
  }

  // Determine which actions to show
  let displayActionIds = ['todo']

  if (usage && usage.length > 0) {
    const topUsed = usage
      .filter(u => u.feature_id !== 'todo')
      .map(u => u.feature_id)
      .slice(0, 3)
    displayActionIds = [...displayActionIds, ...topUsed]
  }

  const defaults = ['passwords', 'vault', 'popcorn']
  for (const def of defaults) {
    if (displayActionIds.length >= 4) break
    if (!displayActionIds.includes(def)) {
      displayActionIds.push(def)
    }
  }

  const actions = displayActionIds.map(id => ({ id, ...allActions[id] })).filter(a => a.label)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {actions.map((item) => (
        <motion.button
          key={item.id}
          onClick={item.action}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="group relative flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-slate-500/25 transition-all text-left shadow-[var(--glass-shadow)]"
        >
          {/* Subtle Ambient Background Blob */}
          <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
          
          {/* Icon Box */}
          <div 
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform`}
            style={{ boxShadow: `0 8px 16px -4px ${item.shadow}` }}
          >
            <item.icon className="w-5 h-5" />
          </div>
          
          {/* Labels */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs truncate" style={{ color: 'var(--text)' }}>{item.label}</h3>
            <p className="text-[10px] opacity-40 font-semibold truncate mt-0.5">{item.desc}</p>
          </div>

          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0 -translate-x-1 group-hover:translate-x-0 transition-transform" />
        </motion.button>
      ))}
    </div>
  )
}
