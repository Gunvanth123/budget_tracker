import { useState, useEffect, useRef, useMemo } from 'react'
import { todoApi, usageApi } from '../../api/client'
import { 
  Plus, Trash2, Pencil, Check, X, ChevronRight, ListTodo, 
  Filter, ArrowUpDown, Search, Calendar, CheckCircle2, Circle, Clock,
  LayoutGrid, List, GripVertical
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
    } catch { 
      toast.error('Failed to update task') 
    }
  }

  const saveEdit = async () => {
    if (!title.trim()) { setTitle(task.title); setEditing(false); return }
    if (title.trim() === task.title) { setEditing(false); return }
    try {
      const updated = await todoApi.updateTask(listId, task.id, { title: title.trim() })
      onUpdated(updated)
      setEditing(false)
    } catch { 
      toast.error('Failed to rename task') 
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') { setTitle(task.title); setEditing(false) }
  }

  const handleDelete = async () => {
    try {
      await todoApi.deleteTask(listId, task.id)
      onDeleted(task.id)
    } catch { 
      toast.error('Failed to delete task') 
    }
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
        background: task.completed ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
        border: '1px solid transparent'
      }}
      whileHover={{ 
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderColor: 'var(--border)'
      }}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-[var(--text-muted)] opacity-0 group-hover:opacity-60 transition-opacity">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Checkbox (Round, iOS style) */}
      <button
        onClick={toggleComplete}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative overflow-hidden active:scale-90"
        style={task.completed
          ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
          : { borderColor: 'var(--border)', background: 'rgba(255,255,255,0.03)' }
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
              <Check className="w-3 text-white stroke-[3.5]" />
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
          className="flex-1 text-sm rounded-xl px-3 py-1 bg-[var(--bg)] border border-[var(--primary)] text-[var(--text)] focus:outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-sm cursor-default transition-all duration-300 relative font-medium"
          style={{ 
            color: task.completed ? 'var(--text-muted)' : 'var(--text)',
            opacity: task.completed ? 0.5 : 1
          }}
        >
          {task.title}
          {task.completed && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="absolute left-0 top-1/2 h-[1px] bg-[var(--text-muted)] opacity-40"
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
            className="p-1.5 rounded-lg hover:bg-[var(--bg)] hover:text-[var(--primary)] transition-colors text-[var(--text-muted)]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-muted)]"
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
    
    if (globalSearchQuery.trim()) {
      const query = globalSearchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(query))
    }

    if (taskFilter === 'active') result = result.filter(t => !t.completed)
    if (taskFilter === 'completed') result = result.filter(t => t.completed)
    
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
    } catch { 
      toast.error('Failed to add task') 
    }
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
    } catch { 
      toast.error('Failed to rename list') 
    }
  }

  const deleteList = async () => {
    if (!confirm(`Delete "${list.title}" and all its tasks?`)) return
    try {
      await todoApi.deleteList(list.id)
      onListDeleted(list.id)
      toast.success('List deleted')
    } catch { 
      toast.error('Failed to delete list') 
    }
  }

  return (
    <motion.div 
      layout
      className="card overflow-hidden transition-all duration-300 break-inside-avoid mb-5 shadow-sm border-[var(--border)] bg-[var(--card)]"
    >
      {/* List Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[var(--border)]/35">
        <button 
          onClick={() => setCollapsed(p => !p)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex-shrink-0"
        >
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
            className="flex-1 font-bold rounded-xl px-3 py-1 bg-[var(--bg)] border border-[var(--primary)] text-sm focus:outline-none"
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingTitle(true)}
            className="flex-1 font-bold cursor-default select-none group flex items-center gap-2 text-sm text-[var(--text)]"
          >
            {list.title}
            <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity text-[var(--text-muted)]" />
          </h3>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {totalCount > 0 && (
            <div className="flex items-center rounded-xl p-0.5 border border-[var(--border)] bg-black/10">
              <button 
                onClick={() => setTaskFilter(p => p === 'all' ? 'active' : p === 'active' ? 'completed' : 'all')}
                className="p-1.5 rounded-lg hover:bg-[var(--bg)] transition-all"
                title={`Filter: ${taskFilter}`}
              >
                <Filter className={`w-3.5 h-3.5 ${taskFilter !== 'all' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
              </button>
              <button 
                onClick={() => setTaskSort(p => p === 'manual' ? 'status' : p === 'status' ? 'alpha' : 'manual')}
                className="p-1.5 rounded-lg hover:bg-[var(--bg)] transition-all"
                title={`Sort: ${taskSort}`}
              >
                <ArrowUpDown className={`w-3.5 h-3.5 ${taskSort !== 'manual' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
              </button>
            </div>
          )}
          
          <button
            onClick={deleteList}
            className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-muted)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && !collapsed && (
        <div className="h-1 bg-black/15 relative overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalCount) * 100}%` }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="h-full rounded-full bg-[var(--primary)]"
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
              <div className="text-center py-6">
                <p className="text-xs text-[var(--text-muted)] font-medium">
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
                className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/5"
              >
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-[var(--border)] flex-shrink-0" />
                <input
                  ref={addInputRef}
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="What needs to be done?"
                  className="flex-1 text-sm bg-transparent focus:outline-none text-[var(--text)] placeholder-[var(--text-muted)]/60 font-semibold"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={addTask}
                    className="p-1.5 rounded-lg text-white bg-[var(--primary)] shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <button
                    onClick={() => { setNewTask(''); setAddingTask(false) }}
                    className="p-1.5 rounded-lg hover:bg-slate-500/10 text-[var(--text-muted)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all duration-200 group text-[var(--text-muted)] hover:bg-[var(--bg)]/40"
              >
                <div className="w-5 h-5 rounded-full border border-dashed border-[var(--border)] flex items-center justify-center group-hover:border-[var(--primary)] transition-colors">
                  <Plus className="w-3 h-3 group-hover:text-[var(--primary)]" />
                </div>
                <span className="group-hover:text-[var(--primary)] transition-colors text-xs font-bold uppercase tracking-wider">Add task</span>
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
    } catch { 
      toast.error('Failed to create list') 
    }
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
          className="card p-5 relative overflow-hidden group border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ListTodo className="w-12 h-12" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Active Lists</p>
          <p className="font-extrabold text-3xl text-[var(--text)]">{lists.length}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-12 h-12" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Total Tasks</p>
          <p className="font-extrabold text-3xl text-[var(--text)]">{totalTasks}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="card p-5 relative overflow-hidden group border-none bg-gradient-to-br from-indigo-500/20 to-[var(--primary)]/10 shadow-sm"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--text-muted)]">Completion</p>
          <div className="flex items-end gap-2">
            <p className="font-extrabold text-3xl text-[var(--primary)]">{Math.round(progress)}%</p>
            <p className="text-xs mb-1.5 font-bold text-[var(--text-muted)]">{completedTasks}/{totalTasks}</p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-[var(--bg)]/50 overflow-hidden border border-[var(--border)]/20 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "circOut" }}
              className="h-full rounded-full bg-[var(--primary)]"
            />
          </div>
        </motion.div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between card p-3 border-[var(--border)] shadow-sm">
        <div className="relative w-full sm:w-64 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50 group-focus-within:text-[var(--primary)] transition-colors" />
          <input 
            type="text"
            placeholder="Search lists..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-11 h-10 text-sm font-semibold"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center border border-[var(--border)] rounded-2xl p-1 bg-black/10">
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'alpha', label: 'A-Z' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'progress', label: 'Done' }
            ].map(btn => (
              <button 
                key={btn.id}
                onClick={() => setListSort(btn.id)}
                className={`relative px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 z-10 ${listSort === btn.id ? 'text-white' : 'text-[var(--text-muted)]'}`}
              >
                {listSort === btn.id && (
                  <motion.div 
                    layoutId="activeSort"
                    className="absolute inset-0 bg-[var(--primary)] rounded-lg -z-10 shadow-md"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {btn.label}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] mx-1 hidden sm:block bg-[var(--border)]" />

          <button 
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className="p-2 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] active:scale-95 transition-all bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--primary)]"
          >
            {viewMode === 'list' ? <LayoutGrid className="w-4.5 h-4.5" /> : <List className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* New list button / input */}
      {creatingList ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 border border-dashed border-[var(--primary)]/50 bg-[var(--primary)]/5"
        >
          <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider mb-3">Create New List</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              ref={newListRef}
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') { setNewListTitle(''); setCreatingList(false) } }}
              placeholder="List name (e.g. Weekend Trip, Grocery, Work...)"
              className="input flex-1 text-sm font-semibold h-11"
            />
            <div className="flex gap-2">
              <button onClick={createList} className="btn-primary text-xs uppercase tracking-wider px-5 py-3 flex-1 sm:flex-none">
                Create List
              </button>
              <button onClick={() => { setNewListTitle(''); setCreatingList(false) }} className="btn-secondary text-xs uppercase tracking-wider px-5 py-3">
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setCreatingList(true)}
          className="flex items-center gap-3 w-full p-5 rounded-2xl border-2 border-dashed transition-all duration-300 group border-[var(--border)] text-[var(--text-muted)] bg-[var(--card)] hover:border-[var(--primary)]"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-500/10 group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)] transition-all">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="font-bold text-xs uppercase tracking-wider block group-hover:text-[var(--primary)] transition-colors">Add new list</span>
            <span className="text-[10px] opacity-60">Create a new category for your tasks</span>
          </div>
        </button>
      )}

      {/* Lists */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 h-48 animate-pulse border-[var(--border)] opacity-50" />
          ))}
        </div>
      ) : filteredAndSortedLists.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card py-20 text-center border-[var(--border)] shadow-sm"
        >
          <div className="w-20 h-20 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
            <ListTodo className="w-10 h-10" />
          </div>
          <p className="font-bold text-xl mb-2 text-[var(--text)]">
            {searchQuery ? 'No results found' : 'Ready to organize?'}
          </p>
          <p className="text-sm max-w-xs mx-auto mb-8 text-[var(--text-muted)]">
            {searchQuery ? `We couldn't find any lists matching "${searchQuery}"` : 'Create your first todo list to keep track of your goals and daily tasks.'}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => setCreatingList(true)}
              className="btn-primary text-xs uppercase tracking-wider px-6 py-3"
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
