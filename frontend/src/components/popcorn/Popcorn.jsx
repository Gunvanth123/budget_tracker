import { useState, useEffect } from 'react'
import { Plus, Trash2, Star, Loader2, Image as ImageIcon, Sparkles, X, Filter, Search, Popcorn as PopcornIcon, ExternalLink } from 'lucide-react'
import { popcornApi, vaultApi } from '../../api/client'
import toast from 'react-hot-toast'
import { clsx } from '../../utils/helpers'

const CATEGORIES = [
  "Anime movie", "Anime series", "TV show", "Movies", "Shows", "Short films", "Learning"
]

const GENRES = [
  "Action", "Adventure", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", 
  "Mystery", "Romance", "Sci-Fi", "Thriller", "Western", "Psychological", "Slice of Life", "Supernatural"
]

const PopcornRating = ({ rating, setRating, interactive = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && setRating(i)}
          className={clsx(
            "transition-all duration-300",
            interactive ? "hover:scale-125 cursor-pointer" : "cursor-default",
            i <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-400 opacity-30"
          )}
        >
          <PopcornIcon className={clsx("w-6 h-6", i <= rating && "drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]")} />
        </button>
      ))}
    </div>
  )
}

export default function Popcorn() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isGDriveConnected, setIsGDriveConnected] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    customCategory: '',
    language: '',
    rating: 0,
    synopsis: '',
    reasons_for_liking: '',
    genres: [],
    customGenre: '',
    poster: null
  })
  const [posterPreview, setPosterPreview] = useState(null)
  const [isGeneratingSynopsis, setIsGeneratingSynopsis] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => {
    fetchEntries()
    checkGDriveStatus()
  }, [])

  const fetchEntries = async () => {
    try {
      const data = await popcornApi.getAll()
      setEntries(data)
    } catch (error) {
      toast.error('Failed to load entries')
    } finally {
      setLoading(false)
    }
  }

  const checkGDriveStatus = async () => {
    try {
      const status = await vaultApi.status()
      setIsGDriveConnected(status.is_gdrive_connected)
    } catch (error) {
      console.error('Failed to check GDrive status')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleGenreToggle = (genre) => {
    setFormData(prev => {
      const genres = prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
      return { ...prev, genres }
    })
  }

  const handlePosterChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, poster: file }))
      setPosterPreview(URL.createObjectURL(file))
    }
  }

  const generateSynopsis = async () => {
    if (!formData.title || !formData.category) {
      toast.error('Please enter title and category first')
      return
    }
    
    setIsGeneratingSynopsis(true)
    try {
      const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category
      const res = await popcornApi.getSynopsis(formData.title, finalCategory)
      setFormData(prev => ({ ...prev, synopsis: res.synopsis }))
      toast.success('Synopsis generated!')
    } catch (error) {
      toast.error('AI could not generate synopsis')
    } finally {
      setIsGeneratingSynopsis(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.category) {
      toast.error('Title and Category are required')
      return
    }

    if (!isGDriveConnected && formData.poster) {
      toast.error('Connect Google Drive to upload posters')
      return
    }

    setIsSubmitting(true)
    try {
      const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category
      const finalGenres = [...formData.genres]
      if (formData.customGenre) finalGenres.push(formData.customGenre)

      const data = new FormData()
      data.append('title', formData.title)
      data.append('category', finalCategory)
      data.append('language', formData.language)
      data.append('rating', formData.rating)
      data.append('synopsis', formData.synopsis)
      data.append('reasons_for_liking', formData.reasons_for_liking)
      data.append('genres', finalGenres.join(', '))
      if (formData.poster) data.append('poster', formData.poster)

      await popcornApi.create(data)
      toast.success('Added to your watchlist!')
      setShowAddModal(false)
      resetForm()
      fetchEntries()
    } catch (error) {
      toast.error('Failed to add entry')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      customCategory: '',
      language: '',
      rating: 0,
      synopsis: '',
      reasons_for_liking: '',
      genres: [],
      customGenre: '',
      poster: null
    })
    setPosterPreview(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this?')) return
    try {
      await popcornApi.delete(id)
      setEntries(entries.filter(e => e.id !== id))
      toast.success('Removed')
    } catch (error) {
      toast.error('Failed to remove')
    }
  }

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PopcornIcon className="w-8 h-8 text-yellow-500" />
            Popcorn Time
          </h1>
          <p className="opacity-60 mt-1">Your personal movie and show vault</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add to List
        </button>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input
            type="text"
            placeholder="Search titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                categoryFilter === cat 
                  ? "bg-[var(--primary)] text-white" 
                  : "bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-white/5"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
          <p className="opacity-60">Loading your collection...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-3xl border border-dashed border-[var(--border)]">
          <PopcornIcon className="w-16 h-16 mx-auto opacity-10 mb-4" />
          <h3 className="text-xl font-semibold opacity-60">No movies found</h3>
          <p className="opacity-40 max-w-xs mx-auto mt-2">Start building your collection by adding your first movie or show!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 text-[var(--primary)] font-medium hover:underline"
          >
            Add one now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEntries.map((entry) => (
            <div 
              key={entry.id} 
              className="group relative bg-[var(--card)] rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl"
            >
              {/* Poster Container */}
              <div className="aspect-[2/3] relative overflow-hidden bg-slate-800">
                {entry.poster_url ? (
                  <img 
                    src={entry.poster_url} 
                    alt={entry.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/logo.png';
                      e.target.classList.add('p-10', 'opacity-20');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-20">
                    <PopcornIcon className="w-16 h-16" />
                    <span className="text-xs uppercase tracking-widest">No Poster</span>
                  </div>
                )}
                
                {/* Overlays */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                    {entry.category}
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                   <button 
                    onClick={() => handleDelete(entry.id)}
                    className="absolute top-3 left-3 p-2 rounded-full bg-red-500/20 text-red-500 backdrop-blur-md border border-red-500/30 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {/* Info Container */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-lg leading-tight line-clamp-1">{entry.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <PopcornRating rating={entry.rating} />
                    {entry.language && <span className="text-[10px] opacity-40 uppercase font-bold tracking-widest">• {entry.language}</span>}
                  </div>
                </div>

                {entry.genres && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.genres.split(',').slice(0, 3).map(g => (
                      <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 opacity-70">
                        {g.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {entry.synopsis && (
                  <p className="text-sm opacity-60 line-clamp-2 italic">
                    "{entry.synopsis}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[var(--card)] w-full max-w-2xl rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  Add to Watchlist
                </h2>
                <p className="text-sm opacity-60">Save your favorite movies and shows</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Poster Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-70">Movie Poster</label>
                  <div className="relative aspect-[2/3] rounded-2xl bg-slate-800 border-2 border-dashed border-[var(--border)] group overflow-hidden flex flex-col items-center justify-center gap-3 transition-all hover:border-[var(--primary)]/50">
                    {posterPreview ? (
                      <>
                        <img src={posterPreview} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <label className="px-4 py-2 bg-white text-black rounded-full font-bold cursor-pointer hover:scale-105 transition-transform">
                            Change
                            <input type="file" className="hidden" accept="image/*" onChange={handlePosterChange} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-12 h-12 opacity-10 group-hover:opacity-20 transition-opacity" />
                        <div className="text-center px-4">
                          {!isGDriveConnected ? (
                            <p className="text-xs text-yellow-500 font-medium">Connect GDrive to upload</p>
                          ) : (
                            <p className="text-xs opacity-40">Drag & drop or click to upload</p>
                          )}
                        </div>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                          accept="image/*" 
                          onChange={handlePosterChange}
                          disabled={!isGDriveConnected}
                        />
                      </>
                    )}
                  </div>
                  {!isGDriveConnected && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 rounded-lg text-xs text-yellow-500 border border-yellow-500/20">
                      <ExternalLink className="w-3 h-3" />
                      <span>Connect Google Drive in <b>Secure Vault</b> first</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold opacity-70">Title *</label>
                    <input
                      required
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Inception"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none transition-all"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold opacity-70">Category *</label>
                    <select
                      required
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none appearance-none"
                    >
                      <option value="">Select Type</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="Other">Other...</option>
                    </select>
                    {formData.category === 'Other' && (
                      <input
                        type="text"
                        name="customCategory"
                        value={formData.customCategory}
                        onChange={handleInputChange}
                        placeholder="Enter custom category"
                        className="w-full mt-2 px-4 py-2 rounded-lg bg-white/5 border border-[var(--border)] focus:outline-none"
                      />
                    )}
                  </div>

                   {/* Language */}
                   <div className="space-y-2">
                    <label className="text-sm font-semibold opacity-70">Language</label>
                    <input
                      type="text"
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      placeholder="e.g. Japanese / English"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none"
                    />
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold opacity-70">Popcorn Rating</label>
                    <PopcornRating rating={formData.rating} setRating={(r) => setFormData(prev => ({ ...prev, rating: r }))} interactive={true} />
                  </div>
                </div>
              </div>

              {/* AI Synopsis */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold opacity-70">Synopsis</label>
                  <button
                    type="button"
                    onClick={generateSynopsis}
                    disabled={isGeneratingSynopsis || !formData.title || !formData.category}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {isGeneratingSynopsis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generate with AI
                  </button>
                </div>
                <textarea
                  name="synopsis"
                  value={formData.synopsis}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none resize-none"
                  placeholder="The AI will add a synopsis here, or you can write your own..."
                />
              </div>

              {/* Reasons */}
              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-70">Why I liked it?</label>
                <textarea
                  name="reasons_for_liking"
                  value={formData.reasons_for_liking}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none resize-none"
                  placeholder="Storytelling, Animation, Acting..."
                />
              </div>

              {/* Genres (Multi-select) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-70">Genres</label>
                <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-white/5 border border-[var(--border)]">
                  {GENRES.map(genre => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      className={clsx(
                        "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                        formData.genres.includes(genre)
                          ? "bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]"
                          : "border-[var(--border)] hover:bg-white/5"
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                  <input
                    type="text"
                    name="customGenre"
                    value={formData.customGenre}
                    onChange={handleInputChange}
                    placeholder="+ Add custom"
                    className="px-3 py-1 rounded-lg text-xs bg-transparent border border-dashed border-[var(--border)] focus:border-[var(--primary)] outline-none min-w-[100px]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold border border-[var(--border)] hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] px-6 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Submit to Vault
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
