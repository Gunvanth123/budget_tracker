import { useState, useEffect, useRef } from 'react'
import { todoApi } from '../../api/client'
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, ListTodo } from 'lucide-react'
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
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
      style={{ background: task.completed ? 'rgba(0,161,155,0.08)' : 'transparent' }}
      onMouseEnter={e => { if (!task.completed) e.currentTarget.style.background = 'var(--border)' }}
      onMouseLeave={e => { if (!task.completed) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Checkbox */}
      <button
        onClick={toggleComplete}
        className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200"
        style={task.completed
          ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
          : { borderColor: 'var(--border)' }
        }
      >
        {task.completed && <Check className="w-3 h-3 text-white stroke-[3]" />}
      </button>

      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm rounded-lg px-2 py-1 focus:outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--primary)', color: 'var(--text)' }}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-sm select-none cursor-default transition-all duration-200"
          style={{ color: task.completed ? 'var(--text-muted)' : 'var(--text)', textDecoration: task.completed ? 'line-through' : 'none' }}
        >
          {task.title}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function TodoListCard({ list, onListUpdated, onListDeleted }) {
  const [tasks, setTasks] = useState(list.tasks || [])
  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [listTitle, setListTitle] = useState(list.title)
  const [newTask, setNewTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)
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
    <div className="card overflow-hidden">
      {/* List Header */}
      <div
        className="flex items-center gap-2 p-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
      >
        <button onClick={() => setCollapsed(p => !p)}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors flex-shrink-0">
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </button>

        {editingTitle ? (
          <input
            ref={titleRef}
            value={listTitle}
            onChange={e => setListTitle(e.target.value)}
            onBlur={saveListTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveListTitle(); if (e.key === 'Escape') { setListTitle(list.title); setEditingTitle(false) } }}
            className="flex-1 font-bold rounded-lg px-2 py-1 focus:outline-none text-base"
            style={{ background: 'var(--card)', border: '1px solid var(--primary)', color: 'var(--text)' }}
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingTitle(true)}
            className="flex-1 font-bold cursor-default select-none"
            style={{ color: 'var(--text)' }}
          >
            {list.title}
          </h3>
        )}

        {/* Progress badge */}
        {totalCount > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={completedCount === totalCount
              ? { background: 'rgba(0,161,155,0.15)', color: 'var(--primary)' }
              : { background: 'var(--border)', color: 'var(--text-muted)' }
            }
          >
            {completedCount}/{totalCount}
          </span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setEditingTitle(true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={deleteList}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%`, background: 'var(--primary)' }}
          />
        </div>
      )}

      {/* Tasks */}
      {!collapsed && (
        <div className="p-3">
          {tasks.length === 0 && !addingTask ? (
            <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>No tasks yet. Add one below!</p>
          ) : (
            <div className="space-y-0.5 mb-2">
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  listId={list.id}
                  onUpdated={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                  onDeleted={id => setTasks(prev => prev.filter(t => t.id !== id))}
                />
              ))}
            </div>
          )}

          {/* Add task input */}
          {addingTask ? (
            <div
              className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(0,161,155,0.08)', border: '1px solid var(--primary)' }}
            >
              <div className="w-5 h-5 rounded-md border-2 flex-shrink-0" style={{ borderColor: 'var(--border)' }} />
              <input
                ref={addInputRef}
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Task name…"
                className="flex-1 text-sm bg-transparent focus:outline-none"
                style={{ color: 'var(--text)' }}
              />
              <div className="flex gap-1">
                <button
                  onClick={addTask}
                  className="p-1 rounded-lg text-white transition-colors"
                  style={{ background: 'var(--primary)' }}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setNewTask(''); setAddingTask(false) }}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,161,155,0.08)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Plus className="w-4 h-4" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Todo() {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListTitle, setNewListTitle] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const newListRef = useRef(null)

  useEffect(() => {
    todoApi.getLists()
      .then(setLists)
      .catch(() => toast.error('Failed to load todo lists'))
      .finally(() => setLoading(false))
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
      toast.success('List created!')
    } catch { toast.error('Failed to create list') }
  }

  const totalTasks = lists.reduce((s, l) => s + (l.tasks?.length || 0), 0)
  const completedTasks = lists.reduce((s, l) => s + (l.tasks?.filter(t => t.completed).length || 0), 0)

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Lists</p>
          <p className="font-bold text-xl" style={{ color: 'var(--text)' }}>{lists.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Tasks</p>
          <p className="font-bold text-xl" style={{ color: 'var(--text)' }}>{totalTasks}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Completed</p>
          <p className="font-bold text-xl" style={{ color: 'var(--primary)' }}>{completedTasks}</p>
        </div>
      </div>

      {/* New list button / input */}
      {creatingList ? (
        <div className="card p-4 border-2 border-brand-200 border-dashed">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">New List</p>
          <div className="flex gap-2">
            <input
              ref={newListRef}
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') { setNewListTitle(''); setCreatingList(false) } }}
              placeholder="e.g. Work Tasks, Shopping, Goals…"
              className="input flex-1"
            />
            <button onClick={createList} className="btn-primary px-4">Create</button>
            <button onClick={() => { setNewListTitle(''); setCreatingList(false) }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreatingList(true)}
          className="flex items-center gap-2 w-full p-4 rounded-2xl border-2 border-dashed transition-all duration-200"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--primary)'
            e.currentTarget.style.color = 'var(--primary)'
            e.currentTarget.style.background = 'rgba(0,161,155,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'var(--border)' }}>
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">Add new list</span>
        </button>
      )}

      {/* Lists */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="card p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="card p-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <ListTodo className="w-14 h-14 mx-auto mb-4 opacity-25" />
          <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>No lists yet</p>
          <p className="text-sm mt-1">Create your first list to start organizing your tasks</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => (
            <TodoListCard
              key={list.id}
              list={list}
              onListUpdated={updated => setLists(prev => prev.map(l => l.id === updated.id ? { ...l, title: updated.title } : l))}
              onListDeleted={id => setLists(prev => prev.filter(l => l.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
