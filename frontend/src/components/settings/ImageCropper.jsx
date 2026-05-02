import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Crop, Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'

export default function ImageCropper({ image, onCrop, onCancel }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  const containerRef = useRef(null)
  const imageRef = useRef(null)

  // Handle Mouse/Touch Events for dragging
  const handleStart = (e) => {
    setIsDragging(true)
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY
    setDragStart({ x: clientX - position.x, y: clientY - position.y })
  }

  const handleMove = (e) => {
    if (!isDragging) return
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    })
  }

  const handleEnd = () => setIsDragging(false)

  const handleDone = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = imageRef.current
    
    const cropSize = 300 // Output size
    canvas.width = cropSize
    canvas.height = cropSize
    
    // Calculate scaling
    const scale = zoom
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    
    // Move to center, rotate, then apply user position and zoom
    ctx.translate(centerX, centerY)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale, scale)
    
    // Draw the image centered at its own center, then offset by user drag
    // We need to account for the image's original dimensions
    const imgWidth = img.naturalWidth
    const imgHeight = img.naturalHeight
    const aspect = imgWidth / imgHeight
    
    let drawWidth, drawHeight
    if (aspect > 1) {
        drawHeight = 300
        drawWidth = 300 * aspect
    } else {
        drawWidth = 300
        drawHeight = 300 / aspect
    }

    ctx.drawImage(
      img, 
      -drawWidth / 2 + (position.x / scale), 
      -drawHeight / 2 + (position.y / scale), 
      drawWidth, 
      drawHeight
    )
    
    ctx.restore()
    onCrop(canvas.toDataURL('image/jpeg', 0.9))
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-[var(--card)] w-full max-w-lg rounded-3xl border border-[var(--border)] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-indigo-500/5">
          <h3 className="font-bold flex items-center gap-2">
            <Crop className="w-4 h-4 text-indigo-500" />
            Adjust Profile Picture
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div 
          ref={containerRef}
          className="relative aspect-square bg-black overflow-hidden cursor-move touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          {/* Circular Mask Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none border-[40px] border-black/60 rounded-full" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }} />
          <div className="absolute inset-0 z-10 pointer-events-none border border-white/20 rounded-full m-[40px]" />

          <img
            ref={imageRef}
            src={image}
            alt="To crop"
            className="absolute max-w-none transition-transform duration-75 select-none pointer-events-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
              top: '50%',
              left: '50%',
              marginTop: '-150px',
              marginLeft: '-150px',
              width: '300px'
            }}
          />
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 opacity-40" />
            <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.01" 
                value={zoom} 
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500"
            />
            <ZoomIn className="w-4 h-4 opacity-40" />
          </div>

          <div className="flex justify-between gap-4">
            <button 
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3"
            >
                <RotateCw className="w-4 h-4" />
                Rotate
            </button>
            <button 
                onClick={handleDone}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 shadow-xl shadow-indigo-500/20"
            >
                <Check className="w-4 h-4" />
                Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
