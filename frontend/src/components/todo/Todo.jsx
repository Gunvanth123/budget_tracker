import { useState, useEffect, useRef, useMemo } from 'react'
import { todoApi, usageApi } from '../../api/client'
import { 
  Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, ListTodo, 
  Filter, ArrowUpDown, Search, Calendar, CheckCircle2, Circle, Clock,
  MoreVertical, LayoutGrid, List, GripVertical
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import toast from 'react-hot-toast'

function TaskItem({ task, listId, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const toggleComplete = async () => {
    try {
      const updated = await todoApi.updateTask(listId, task.id, { completed: !task.completed })
      onUpdated(updated)
      if (!task.completed) toast.success('Task completed!', { icon: '🎉', duration: 1000 })
    } catch { toast.error('Failed to update task') }
  }

  const saveEdit = async () => {
    if (!title.trim()) { setTitle(task.title); setEditing(false); return }
    if (title.trim() === task.title) { setEditing(false); return }
    try {
      const updated = await todoApi.updateTask(listId, task.id, { title: title.trim() })
      onUpdated(updated)
      setEditing(false)
    } catch { toast.error('Failed to rename task') }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') { setTitle(task.title); setEditing(false) }
  }

  const handleDelete = async () => {
    try {
      await todoApi.deleteTask(listId, task.id)
      onDeleted(task.id)
    } catch { toast.error('Failed to delete task') }
  }

  return (
    <Reorder.Item
      value={task}
      id={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 select-none"
      style={{ 
        background: task.completed ? 'rgba(0,161,155,0.04)' : 'transparent',
        border: '1px solid transparent'
      }}
      whileHover={{ 
        backgroundColor: task.completed ? 'rgba(0,161,155,0.08)' : 'var(--border)',
        borderColor: 'rgba(0,161,155,0.1)'
      }}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Checkbox */}
      <button
        onClick={toggleComplete}
        className="flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 relative overflow-hidden"
        style={task.completed
          ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
          : { borderColor: 'var(--border)' }
        }
      >
        <AnimatePresence mode="wait">
          {task.completed ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
            >
              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
            </motion.div>
          ) : (
            <motion.div
              key="circle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </button>

      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm rounded-lg px-2 py-1 focus:outline-none ring-2 ring-primary/20"
          style={{ background: 'var(--card)', border: '1px solid var(--primary)', color: 'var(--text)' }}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-sm cursor-default transition-all duration-300 relative"
          style={{ 
            color: task.completed ? 'var(--text-muted)' : 'var(--text)',
            opacity: task.completed ? 0.6 : 1
          }}
        >
          {task.title}
          {task.completed && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="absolute left-0 top-1/2 h-[1px] bg-current opacity-30"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-slate-400"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-slate-400"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Reorder.Item>
  )
}

function TodoListCard({ list, onListUpdated, onListDeleted, globalSearchQuery = '' }) {
  const [tasks, setTasks] = useState(list.tasks || [])
  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [listTitle, setListTitle] = useState(list.title)
  const [newTask, setNewTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [taskSort, setTaskSort] = useState('manual') // manual, status, alpha
  const [taskFilter, setTaskFilter] = useState('all') // all, active, completed
  
  const addInputRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    if (addingTask) addInputRef.current?.focus()
  }, [addingTask])

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks]
    
    // Global search filter
    if (globalSearchQuery.trim()) {
      const query = globalSearchQuery.toLowerCase();
      // Only show tasks that match the query
      result = result.filter(t => t.title.toLowerCase().includes(query))
    }

    // Filter
    if (taskFilter === 'active') result = result.filter(t => !t.completed)
    if (taskFilter === 'completed') result = result.filter(t => t.completed)
    
    // Sort
    if (taskSort === 'status') {
      result.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1)
    } else if (taskSort === 'alpha') {
      result.sort((a, b) => a.title.localeCompare(b.title))
    }
    
    return result
  }, [tasks, taskSort, taskFilter, globalSearchQuery])

  const addTask = async (e) => {
    e?.preventDefault()
    if (!newTask.trim()) return
    try {
      const task = await todoApi.createTask(list.id, newTask.trim())
      setTasks(prev => [...prev, task])
      setNewTask('')
    } catch { toast.error('Failed to add task') }
  }

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') addTask()
    if (e.key === 'Escape') { setNewTask(''); setAddingTask(false) }
  }

  const saveListTitle = async () => {
    if (!listTitle.trim()) { setListTitle(list.title); setEditingTitle(false); return }
    if (listTitle.trim() === list.title) { setEditingTitle(false); return }
    try {
      const updated = await todoApi.updateList(list.id, listTitle.trim())
      onListUpdated(updated)
      setEditingTitle(false)
    } catch { toast.error('Failed to rename list') }
  }

  const deleteList = async () => {
    if (!confirm(`Delete "${list.title}" and all its tasks?`)) return
    try {
      await todoApi.deleteList(list.id)
      onListDeleted(list.id)
      toast.success('List deleted')
    } catch { toast.error('Failed to delete list') }
  }

  return (
    <motion.div 
      layout
      className="card overflow-hidden transition-all duration-300 break-inside-avoid mb-5"
      style={{ 
        border: '1px solid var(--border)',
        boxShadow: collapsed ? 'none' : '0 10px 30px -15px rgba(0,0,0,0.1)'
      }}
    >
      {/* List Header */}
      <div
        className="flex items-center gap-2 p-4"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border)', background: 'var(--card)' }}
      >
        <button onClick={() => setCollapsed(p => !p)}
          className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 transition-colors flex-shrink-0">
          <motion.div animate={{ rotate: collapsed ? 0 : 90 }}>
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </button>

        {editingTitle ? (
          <input
            ref={titleRef}
            value={listTitle}
            onChange={e => setListTitle(e.target.value)}
            onBlur={saveListTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveListTitle(); if (e.key === 'Escape') { setListTitle(list.title); setEditingTitle(false) } }}
            className="flex-1 font-bold rounded-lg px-2 py-1 focus:outline-none text-base ring-2 ring-primary/20"
            style={{ background: 'var(--card)', border: '1px solid var(--primary)', color: 'var(--text)' }}
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingTitle(true)}
            className="flex-1 font-bold cursor-default select-none group flex items-center gap-2"
            style={{ color: 'var(--text)' }}
          >
            {list.title}
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
          </h3>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {totalCount > 0 && (
            <div className="flex items-center rounded-lg p-0.5 border mr-2" style={{ background: 'rgba(0,0,0,0.05)', borderColor: 'var(--border)' }}>
              <button 
                onClick={() => setTaskFilter(p => p === 'all' ? 'active' : p === 'active' ? 'completed' : 'all')}
                className="p-1 rounded hover:shadow-sm transition-all"
                style={{ background: taskFilter !== 'all' ? 'var(--card)' : 'transparent' }}
                title={`Filter: ${taskFilter}`}
              >
                <Filter className={`w-3.5 h-3.5 ${taskFilter !== 'all' ? 'text-primary' : 'text-slate-400'}`} />
              </button>
              <button 
                onClick={() => setTaskSort(p => p === 'manual' ? 'status' : p === 'status' ? 'alpha' : 'manual')}
                className="p-1 rounded hover:shadow-sm transition-all"
                style={{ background: taskSort !== 'manual' ? 'var(--card)' : 'transparent' }}
                title={`Sort: ${taskSort}`}
              >
                <ArrowUpDown className={`w-3.5 h-3.5 ${taskSort !== 'manual' ? 'text-primary' : 'text-slate-400'}`} />
              </button>
            </div>
          )}
          
          <button
            onClick={deleteList}
            className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-slate-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && !collapsed && (
        <div className="h-1.5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalCount) * 100}%` }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #4FD1C5, var(--primary))' }}
          />
        </div>
      )}

      {/* Tasks */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3"
          >
            {filteredAndSortedTasks.length === 0 && !addingTask ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {taskFilter !== 'all' ? `No ${taskFilter} tasks found` : 'No tasks yet. Add one below!'}
                </p>
              </div>
            ) : (
              <Reorder.Group 
                axis="y" 
                values={tasks} 
                onReorder={(newTasks) => {
                  setTasks(newTasks)
                  todoApi.reorderTasks(list.id, newTasks.map(t => t.id))
                    .catch(() => toast.error('Failed to save task order'))
                }}
                className="space-y-1 mb-2"
              >
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      listId={list.id}
                      onUpdated={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                      onDeleted={id => setTasks(prev => prev.filter(t => t.id !== id))}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}

            {/* Add task input */}
            {addingTask ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl ring-2 ring-primary/30"
                style={{ background: 'rgba(0,161,155,0.05)', border: '1px solid var(--primary)' }}
              >
                <div className="w-5 h-5 rounded-lg border-2 border-dashed flex-shrink-0" style={{ borderColor: 'var(--border)' }} />
                <input
                  ref={addInputRef}
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="What needs to be done?"
                  className="flex-1 text-sm bg-transparent focus:outline-none"
                  style={{ color: 'var(--text)' }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={addTask}
                    className="p-1 rounded-lg text-white transition-colors bg-primary shadow-sm shadow-primary/30 hover:scale-105 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <button
                    onClick={() => { setNewTask(''); setAddingTask(false) }}
                    className="p-1 rounded-lg hover:bg-slate-500/10 transition-colors text-slate-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all duration-300 group"
                style={{ color: 'var(--text-muted)' }}
              >
                <div className="w-5 h-5 rounded-lg border-2 border-dashed flex items-center justify-center group-hover:border-primary/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <Plus className="w-3 h-3 group-hover:text-primary" />
                </div>
                <span className="group-hover:text-primary transition-colors font-medium">Add task</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Todo() {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListTitle, setNewListTitle] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [listSort, setListSort] = useState('newest') // newest, alpha, tasks, progress
  const [viewMode, setViewMode] = useState('list') // list, grid

  const newListRef = useRef(null)

  useEffect(() => {
    todoApi.getLists()
      .then(setLists)
      .catch(() => toast.error('Failed to load todo lists'))
      .finally(() => setLoading(false))
    usageApi.track('todo')
  }, [])

  useEffect(() => {
    if (creatingList) newListRef.current?.focus()
  }, [creatingList])

  const createList = async (e) => {
    e?.preventDefault()
    if (!newListTitle.trim()) return
    try {
      const list = await todoApi.createList(newListTitle.trim())
      setLists(prev => [...prev, list])
      setNewListTitle('')
      setCreatingList(false)
      toast.success('List created!', { icon: '✨' })
    } catch { toast.error('Failed to create list') }
  }

  const filteredAndSortedLists = useMemo(() => {
    let result = lists.filter(l => {
      const query = searchQuery.toLowerCase();
      const matchesTitle = l.title.toLowerCase().includes(query);
      const matchesTasks = l.tasks?.some(t => t.title.toLowerCase().includes(query));
      return matchesTitle || matchesTasks;
    })

    if (listSort === 'alpha') {
      result.sort((a, b) => a.title.localeCompare(b.title))
    } else if (listSort === 'tasks') {
      result.sort((a, b) => (b.tasks?.length || 0) - (a.tasks?.length || 0))
    } else if (listSort === 'progress') {
      result.sort((a, b) => {
        const getProgress = l => (l.tasks?.length ? l.tasks.filter(t => t.completed).length / l.tasks.length : 0)
        return getProgress(b) - getProgress(a)
      })
    } else {
      // Default: newest (assuming ID or creation order)
      result.sort((a, b) => b.id - a.id)
    }

    return result
  }, [lists, searchQuery, listSort])

  const totalTasks = lists.reduce((s, l) => s + (l.tasks?.length || 0), 0)
  const completedTasks = lists.reduce((s, l) => s + (l.tasks?.filter(t => t.completed).length || 0), 0)
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Stats strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ListTodo className="w-12 h-12" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Active Lists</p>
          <p className="font-bold text-3xl" style={{ color: 'var(--text)' }}>{lists.length}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-12 h-12" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Total Tasks</p>
          <p className="font-bold text-3xl" style={{ color: 'var(--text)' }}>{totalTasks}</p>
        </motion.div>
        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-none"
          style={{ background: 'linear-gradient(135deg, var(--card) 0%, rgba(0,161,155,0.05) 100%)', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)' }}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Completion</p>
          <div className="flex items-end gap-2">
            <p className="font-bold text-3xl" style={{ color: 'var(--primary)' }}>{Math.round(progress)}%</p>
            <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>{completedTasks}/{totalTasks}</p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "circOut" }}
              className="h-full rounded-full shadow-[0_0_10px_rgba(0,161,155,0.3)]"
              style={{ background: 'linear-gradient(90deg, #4FD1C5, var(--primary))' }}
            />
          </div>
        </motion.div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-500/5 p-2 rounded-2xl border border-slate-500/10 backdrop-blur-sm">
        <div className="relative w-full sm:w-64 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Search lists..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-sm transition-all shadow-sm"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center border rounded-xl p-1 shadow-inner" style={{ background: 'rgba(0,0,0,0.1)', borderColor: 'var(--border)' }}>
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'alpha', label: 'A-Z' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'progress', label: 'Done' }
            ].map(btn => (
              <button 
                key={btn.id}
                onClick={() => setListSort(btn.id)}
                className={`relative px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 z-10 ${listSort === btn.id ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {listSort === btn.id && (
                  <motion.div 
                    layoutId="activeSort"
                    className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-lg shadow-primary/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {btn.label}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] mx-1 hidden sm:block opacity-20" style={{ background: 'var(--text-muted)' }} />

          <button 
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className="p-2.5 rounded-xl border transition-all text-slate-400 hover:text-primary hover:border-primary active:scale-95 shadow-sm"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {viewMode === 'list' ? <LayoutGrid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* New list button / input */}
      {creatingList ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 border-2 border-primary/30 border-dashed bg-primary/[0.02]"
        >
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Create New List</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              ref={newListRef}
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') { setNewListTitle(''); setCreatingList(false) } }}
              placeholder="List name (e.g. Weekend Trip, Grocery, Work...)"
              className="flex-1 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <div className="flex gap-2">
              <button onClick={createList} className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Create List
              </button>
              <button onClick={() => { setNewListTitle(''); setCreatingList(false) }} className="px-6 py-2.5 border text-slate-600 font-bold rounded-xl hover:bg-slate-500/10 transition-all" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setCreatingList(true)}
          className="flex items-center gap-3 w-full p-5 rounded-2xl border-2 border-dashed transition-all duration-300 group"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-500/10 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="font-bold text-sm block group-hover:text-primary transition-colors">Add new list</span>
            <span className="text-xs opacity-60">Create a new category for your tasks</span>
          </div>
        </button>
      )}

      {/* Lists */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 h-48 animate-pulse" style={{ background: 'var(--card)', opacity: 0.5 }} />
          ))}
        </div>
      ) : filteredAndSortedLists.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card py-20 text-center backdrop-blur-sm shadow-sm"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="w-20 h-20 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <ListTodo className="w-10 h-10" />
          </div>
          <p className="font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>
            {searchQuery ? 'No results found' : 'Ready to organize?'}
          </p>
          <p className="text-sm max-w-xs mx-auto mb-8" style={{ color: 'var(--text-muted)' }}>
            {searchQuery ? `We couldn't find any lists matching "${searchQuery}"` : 'Create your first todo list to keep track of your goals and daily tasks.'}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => setCreatingList(true)}
              className="px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            >
              Get Started
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div 
          layout
          className={viewMode === 'grid' ? "columns-1 md:columns-2 gap-5 space-y-5" : "space-y-5"}
        >
          <AnimatePresence mode="popLayout">
            {filteredAndSortedLists.map(list => (
              <TodoListCard
                key={list.id}
                list={list}
                globalSearchQuery={searchQuery}
                onListUpdated={updated => setLists(prev => prev.map(l => l.id === updated.id ? { ...l, title: updated.title } : l))}
                onListDeleted={id => setLists(prev => prev.filter(l => l.id !== id))}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
