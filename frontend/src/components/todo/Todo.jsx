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
    <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
      task.completed ? 'bg-blue-50/60' : 'hover:bg-slate-50'
    }`}>
      {/* Checkbox */}
      <button
        onClick={toggleComplete}
        className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
          task.completed
            ? 'bg-blue-500 border-blue-500 shadow-sm'
            : 'border-slate-300 hover:border-blue-400'
        }`}
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
          className="flex-1 text-sm bg-white border border-brand-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={`flex-1 text-sm select-none cursor-default transition-all duration-200 ${
            task.completed
              ? 'line-through text-blue-400 font-normal'
              : 'text-slate-700'
          }`}
        >
          {task.title}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-brand-600 transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
        )}
        <button onClick={handleDelete}
          className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
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
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
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
            className="flex-1 font-display font-bold text-slate-800 bg-white border border-brand-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-200 text-base"
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingTitle(true)}
            className="flex-1 font-display font-bold text-slate-800 cursor-default select-none"
          >
            {list.title}
          </h3>
        )}

        {/* Progress badge */}
        {totalCount > 0 && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            completedCount === totalCount
              ? 'bg-blue-100 text-blue-600'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {completedCount}/{totalCount}
          </span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setEditingTitle(true)}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-brand-600 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={deleteList}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-blue-400 transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Tasks */}
      {!collapsed && (
        <div className="p-3">
          {tasks.length === 0 && !addingTask ? (
            <p className="text-center text-xs text-slate-400 py-4">No tasks yet. Add one below!</p>
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
            <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-brand-50 rounded-xl border border-brand-200">
              <div className="w-5 h-5 rounded-md border-2 border-slate-300 flex-shrink-0" />
              <input
                ref={addInputRef}
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Task name…"
                className="flex-1 text-sm bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
              />
              <div className="flex gap-1">
                <button onClick={addTask}
                  className="p-1 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setNewTask(''); setAddingTask(false) }}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all duration-150 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
          <p className="text-xs text-slate-400 mb-0.5">Lists</p>
          <p className="font-display font-bold text-slate-700 text-xl">{lists.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-0.5">Total Tasks</p>
          <p className="font-display font-bold text-slate-700 text-xl">{totalTasks}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-0.5">Completed</p>
          <p className="font-display font-bold text-blue-600 text-xl">{completedTasks}</p>
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
          className="flex items-center gap-2 w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/40 transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
        <div className="card p-16 text-center text-slate-400">
          <ListTodo className="w-14 h-14 mx-auto mb-4 opacity-25" />
          <p className="font-display font-bold text-slate-600 text-lg">No lists yet</p>
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
