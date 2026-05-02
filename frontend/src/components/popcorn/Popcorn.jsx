import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Edit3, Loader2, Image as ImageIcon, Sparkles, X, Search, Popcorn as PopcornIcon, ExternalLink, ChevronRight } from 'lucide-react'
import { popcornApi, vaultApi, usageApi, API_URL } from '../../api/client'
import toast from 'react-hot-toast'
import { clsx } from '../../utils/helpers'

const CATEGORIES = [
  "Anime movie", "Anime series", "TV show", "Movies", "Shows", "Short films", "Learning"
]

const GENRES = [
  "Action", "Adventure", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", 
  "Mystery", "Romance", "Sci-Fi", "Thriller", "Western", "Psychological", "Slice of Life", "Supernatural"
]

const PopcornRating = ({ rating, interactive = false }) => {
  const stars = [1, 2, 3, 4, 5]
  
  return (
    <div className="flex gap-1.5 items-center">
      {stars.map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)))
        return (
          <div key={i} className="relative">
            <PopcornIcon className="w-5 h-5 text-gray-700 opacity-30" />
            <div 
              className="absolute inset-0 overflow-hidden text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]"
              style={{ width: `${fill * 100}%` }}
            >
              <PopcornIcon className="w-5 h-5" />
            </div>
          </div>
        )
      })}
      {interactive && <span className="text-xs font-bold text-yellow-500 ml-2">{Number(rating).toFixed(1)}</span>}
    </div>
  )
}

const PopcornPoster = ({ url, title, category }) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className="w-32 sm:w-48 h-full sm:h-auto relative overflow-hidden bg-slate-800 flex-shrink-0">
      {url && !loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-white/20" />
        </div>
      )}
      {url ? (
        <img 
          src={url} 
          alt={title} 
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true); }}
          className={clsx(
            "w-full h-full object-cover group-hover:scale-105 transition-all duration-700",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
          )}
        />
      ) : (
        <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 border-r border-white/5">
          <PopcornIcon className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--primary)] opacity-20 mb-4" />
          <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/40 px-2 line-clamp-4 leading-relaxed">
            {title}
          </h4>
          <div className="mt-4 w-6 h-0.5 bg-[var(--primary)]/30 rounded-full" />
        </div>
      )}
      <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[9px] font-bold uppercase tracking-widest text-white border border-white/10">
        {category}
      </div>
    </div>
  )
}

export default function Popcorn() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [isGDriveConnected, setIsGDriveConnected] = useState(false)
  const token = localStorage.getItem('bt_token')
  
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
    poster: null,
    posterUrl: ''
  })
  const [posterPreview, setPosterPreview] = useState(null)
  const [isGeneratingSynopsis, setIsGeneratingSynopsis] = useState(false)
  const [isFetchingPoster, setIsFetchingPoster] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchEntries()
    checkGDriveStatus()
    usageApi.track('popcorn')
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

  const fetchPosterFromUrl = async () => {
    if (!formData.posterUrl) {
      toast.error('Please enter a URL first')
      return
    }
    
    setIsFetchingPoster(true)
    try {
      // Check if it's a direct image URL
      if (formData.posterUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) {
        setPosterPreview(formData.posterUrl)
        toast.success('Image link detected!')
      } else {
        // Try to extract from page
        const res = await popcornApi.extractPoster(formData.posterUrl)
        setPosterPreview(res.poster_url)
        toast.success('Poster found on page!')
      }
    } catch (error) {
      toast.error('Could not find a poster at that URL')
    } finally {
      setIsFetchingPoster(false)
    }
  }

  const handleEditClick = (entry) => {
    setEditingEntry(entry)
    setFormData({
      title: entry.title,
      category: CATEGORIES.includes(entry.category) ? entry.category : 'Other',
      customCategory: CATEGORIES.includes(entry.category) ? '' : entry.category,
      language: entry.language || '',
      rating: entry.rating || 0,
      synopsis: entry.synopsis || '',
      reasons_for_liking: entry.reasons_for_liking || '',
      genres: entry.genres ? entry.genres.split(', ').filter(g => GENRES.includes(g)) : [],
      customGenre: '',
      poster: null,
      posterUrl: ''
    })
    setPosterPreview(entry.poster_url ? `${API_URL}${entry.poster_url}?token=${token}` : null)
    setShowModal(true)
  }

  const handleViewClick = (entry) => {
    setSelectedEntry(entry)
    setShowViewModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.category) {
      toast.error('Title and Category are required')
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
      if (formData.poster) {
        data.append('poster', formData.poster)
      } else if (posterPreview && posterPreview.startsWith('http')) {
        // If we have a remote preview and no manual file upload, pass it as remote_poster_url
        data.append('remote_poster_url', posterPreview)
      }

      if (editingEntry) {
        await popcornApi.update(editingEntry.id, data)
        toast.success('Updated successfully!')
      } else {
        await popcornApi.create(data)
        toast.success('Added to your watchlist!')
      }
      
      setShowModal(false)
      resetForm()
      fetchEntries()
    } catch (error) {
      toast.error(editingEntry ? 'Failed to update' : 'Failed to add')
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
      poster: null,
      posterUrl: ''
    })
    setPosterPreview(null)
    setEditingEntry(null)
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

  // Pagination logic
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, categoryFilter])

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
          onClick={() => { resetForm(); setShowModal(true); }}
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
        <div className="md:col-span-2 flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
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

      {/* CONTENT GRID (HORIZONTAL GRID LAYOUT) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
          <p className="opacity-60">Loading your collection...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-3xl border border-dashed border-[var(--border)]">
          <PopcornIcon className="w-16 h-16 mx-auto opacity-10 mb-4" />
          <h3 className="text-xl font-semibold opacity-60">No movies found</h3>
          <p className="opacity-40 max-w-xs mx-auto mt-2">Start building your collection!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {paginatedEntries.map((entry) => (
            <div 
              key={entry.id} 
              className="group flex flex-row bg-[var(--card)] rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all duration-300 shadow-sm hover:shadow-xl h-[210px] sm:h-auto"
            >
              {/* Left: Poster */}
              <PopcornPoster 
                url={entry.poster_url ? `${API_URL}${entry.poster_url}?token=${token}&width=400` : null}
                title={entry.title}
                category={entry.category}
              />

              {/* Right: Info */}
              <div className="flex-1 p-3.5 sm:p-5 flex flex-col justify-between min-w-0">
                <div className="space-y-1.5 sm:space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base sm:text-xl truncate text-[var(--text)]">{entry.title}</h3>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-1.5">
                        <div className="scale-[0.85] sm:scale-100 origin-left">
                          <PopcornRating rating={entry.rating} />
                        </div>
                        {entry.language && <span className="text-[10px] sm:text-[10px] opacity-40 uppercase font-bold tracking-widest truncate">• {entry.language}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                       <button 
                        onClick={() => handleViewClick(entry)}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all shadow-sm"
                        title="View Full Details"
                       >
                         <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </button>
                       <button 
                        onClick={() => handleEditClick(entry)}
                        className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                       >
                         <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </button>
                       <button 
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                       >
                         <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {entry.genres?.split(', ').slice(0, 3).map(g => (
                      <span key={g} className="text-[10px] sm:text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 opacity-70">
                        {g.trim()}
                      </span>
                    ))}
                  </div>

                  {entry.synopsis && (
                    <p className="text-xs sm:text-sm opacity-60 line-clamp-3 sm:line-clamp-3 italic leading-relaxed">
                      "{entry.synopsis}"
                    </p>
                  )}
                </div>

                {entry.reasons_for_liking && (
                  <div className="hidden sm:block pt-4 border-t border-[var(--border)]">
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-30 mb-1">Personal Note</p>
                    <p className="text-xs opacity-50 line-clamp-2">{entry.reasons_for_liking}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 pt-6 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => prev - 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] disabled:opacity-30 hover:bg-white/5 transition-all rotate-180"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <div className="flex gap-1.5 px-4">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentPage(i + 1)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={clsx(
                    "w-10 h-10 rounded-xl font-bold text-sm transition-all border",
                    currentPage === i + 1
                      ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20"
                      : "bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage(prev => prev + 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] disabled:opacity-30 hover:bg-white/5 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-xs font-bold opacity-30 uppercase tracking-widest">
            Page {currentPage} of {totalPages} • Showing {paginatedEntries.length} items
          </p>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedEntry && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[5px]" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-[var(--card)] w-full max-w-4xl rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex flex-col md:flex-row max-h-[90vh]">
              {/* Left: Big Poster */}
              <div className="w-full md:w-2/5 h-64 md:h-auto relative bg-slate-800">
                {selectedEntry.poster_url ? (
                  <img 
                    src={`${API_URL}${selectedEntry.poster_url}?token=${token}&width=1000`} 
                    className="w-full h-full object-cover" 
                    alt={selectedEntry.title} 
                  />
                ) : (
                  <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 border-r border-white/5">
                    <PopcornIcon className="w-24 h-24 sm:w-32 sm:h-32 text-[var(--primary)] opacity-20 mb-8" />
                    <h2 className="text-xl font-black uppercase tracking-wider text-white/40 leading-relaxed">
                      {selectedEntry.title}
                    </h2>
                    <div className="mt-8 w-10 h-1 bg-[var(--primary)]/30 rounded-full" />
                  </div>
                )}
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full md:hidden"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Right: Detailed Info */}
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-[var(--text)]">{selectedEntry.title}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <PopcornRating rating={selectedEntry.rating} />
                      <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold uppercase tracking-widest">
                        {selectedEntry.category}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setShowViewModal(false)} className="hidden md:block p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border)]">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-1">Language</p>
                    <p className="font-medium">{selectedEntry.language || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-1">Added On</p>
                    <p className="font-medium">{new Date(selectedEntry.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase font-bold tracking-widest text-[var(--primary)]">Synopsis</p>
                  <p className="text-[var(--text)] leading-relaxed text-lg italic opacity-80">
                    "{selectedEntry.synopsis || 'No synopsis provided.'}"
                  </p>
                </div>

                {selectedEntry.genres && (
                  <div className="space-y-3">
                    <p className="text-xs uppercase font-bold tracking-widest text-[var(--primary)]">Genres</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.genres.split(', ').map(g => (
                        <span key={g} className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-sm opacity-90">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntry.reasons_for_liking && (
                  <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                    <p className="text-xs uppercase font-bold tracking-widest text-indigo-400">Why I Liked It</p>
                    <p className="text-[var(--text)] opacity-90 leading-relaxed">{selectedEntry.reasons_for_liking}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => { setShowViewModal(false); handleEditClick(selectedEntry); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-[var(--border)] hover:bg-white/10 transition-all font-bold"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Details
                  </button>
                  <button
                    onClick={() => { setShowViewModal(false); handleDelete(selectedEntry.id); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL (ADD / EDIT) */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[5px]" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--card)] w-full max-w-3xl rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  {editingEntry ? 'Edit Entry' : 'Add to Watchlist'}
                </h2>
                <p className="text-sm opacity-60">{editingEntry ? 'Update your movie details' : 'Save your favorite movies and shows'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Poster Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold opacity-70">Poster Art</label>
                  <div className="relative aspect-[2/3] rounded-2xl bg-slate-800 border-2 border-dashed border-[var(--border)] group overflow-hidden flex flex-col items-center justify-center gap-3 transition-all hover:border-[var(--primary)]/50">
                    {posterPreview ? (
                      <>
                        <img src={posterPreview} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <label className="px-4 py-2 bg-white text-black rounded-full font-bold cursor-pointer hover:scale-105 transition-transform">
                            {editingEntry ? 'Replace Poster' : 'Change'}
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
                            <p className="text-xs opacity-40">Click to upload poster</p>
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

                  {/* URL Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest opacity-40">Or Fetch from URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="posterUrl"
                        value={formData.posterUrl}
                        onChange={handleInputChange}
                        placeholder="Paste link here..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-[var(--border)] text-xs outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                      <button
                        type="button"
                        onClick={fetchPosterFromUrl}
                        disabled={isFetchingPoster || !isGDriveConnected}
                        className="px-3 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 disabled:opacity-30 transition-all border border-indigo-500/20"
                      >
                        {isFetchingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {!isGDriveConnected && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 rounded-lg text-xs text-yellow-500 border border-yellow-500/20">
                      <ExternalLink className="w-3 h-3" />
                      <span>Connect Google Drive in <b>Vault</b></span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold opacity-70">Title *</label>
                    <input
                      required
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Your Name"
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
                      <option value="">Select Category</option>
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
                        className="w-full mt-2 px-4 py-2 rounded-lg bg-white/5 border border-[var(--border)] outline-none"
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
                      placeholder="e.g. Japanese"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none"
                    />
                  </div>

                  {/* Rating Slider */}
                  <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-[var(--border)]">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold opacity-70">Rating</label>
                      <span className="text-lg font-black text-yellow-500">{Number(formData.rating).toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                    <div className="flex justify-center">
                      <PopcornRating rating={formData.rating} />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Synopsis */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold opacity-70">Synopsis</label>
                  <button
                    type="button"
                    onClick={generateSynopsis}
                    disabled={isGeneratingSynopsis || !formData.title || !formData.category}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-30 transition-all border border-indigo-500/20"
                  >
                    {isGeneratingSynopsis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI Generate
                  </button>
                </div>
                <textarea
                  name="synopsis"
                  value={formData.synopsis}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none resize-none text-sm leading-relaxed"
                  placeholder="Tell the story..."
                />
              </div>

              {/* Reasons */}
              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-70">Reasons for liking</label>
                <textarea
                  name="reasons_for_liking"
                  value={formData.reasons_for_liking}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]/50 outline-none resize-none text-sm"
                  placeholder="What made it special for you?"
                />
              </div>

              {/* Genres */}
              <div className="space-y-3">
                <label className="text-sm font-semibold opacity-70">Genres</label>
                <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-white/5 border border-[var(--border)]">
                  {GENRES.map(genre => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                        formData.genres.includes(genre)
                          ? "bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]"
                          : "border-[var(--border)] hover:bg-white/5"
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                  <div className="flex-1 min-w-[120px]">
                    <input
                      type="text"
                      name="customGenre"
                      value={formData.customGenre}
                      onChange={handleInputChange}
                      placeholder="+ Add custom genre"
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-transparent border border-dashed border-[var(--border)] focus:border-[var(--primary)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3.5 rounded-xl font-semibold border border-[var(--border)] hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] px-6 py-3.5 rounded-xl font-semibold bg-[var(--primary)] text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingEntry ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingEntry ? 'Save Changes' : 'Submit Entry'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
