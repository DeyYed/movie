import React, { useState, useRef, useEffect } from 'react'

const SwipeableCast = ({ cast }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const [itemsPerView, setItemsPerView] = useState(4)
  const containerRef = useRef(null)
  const maxIndex = Math.max(0, Math.ceil(cast.length / itemsPerView) - 1)

  // Update items per view based on screen size
  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth
      if (width < 640) { // sm breakpoint
        setItemsPerView(2)
      } else if (width < 768) { // md breakpoint
        setItemsPerView(3)
      } else {
        setItemsPerView(4)
      }
    }

    updateItemsPerView()
    window.addEventListener('resize', updateItemsPerView)
    return () => window.removeEventListener('resize', updateItemsPerView)
  }, [])

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.pageX - translateX)
    e.preventDefault() // Prevent text selection
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const currentX = e.pageX - startX
    setTranslateX(currentX)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    const threshold = 50 // Minimum distance to trigger swipe
    const itemWidth = containerRef.current?.clientWidth / itemsPerView || 70
    
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(Math.max(0, currentIndex - 1))
      } else if (translateX < 0 && currentIndex < maxIndex) {
        // Swipe left - go to next
        setCurrentIndex(Math.min(maxIndex, currentIndex + 1))
      }
    }
    
    setTranslateX(0)
  }

  // Touch events for mobile
  const handleTouchStart = (e) => {
    setIsDragging(true)
    setStartX(e.touches[0].pageX - translateX)
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const currentX = e.touches[0].pageX - startX
    setTranslateX(currentX)
  }

  const handleTouchEnd = handleMouseUp

  // Navigation buttons
  const goToPrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
  }

  const goToNext = () => {
    setCurrentIndex(Math.min(maxIndex, currentIndex + 1))
  }

  // Calculate transform based on current index and drag offset
  const getTransform = () => {
    const itemWidth = 70 + 16 // 70px width + 16px gap
    const baseTransform = -currentIndex * itemWidth * itemsPerView
    return isDragging ? baseTransform + translateX : baseTransform
  }

  useEffect(() => {
    const handleMouseLeave = () => {
      if (isDragging) {
        handleMouseUp()
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mouseleave', handleMouseLeave)
      return () => container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isDragging])

  if (!cast || cast.length === 0) return null

  return (
    <div className="swipeable-cast">
      <div className="cast-header">
        <p className='text-xs uppercase tracking-wide text-gray-100/70 mb-2'>Top Cast</p>
        <div className="cast-navigation">
          <button 
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="cast-nav-btn cast-nav-prev"
            aria-label="Previous cast members"
          >
            ‹
          </button>
          <button 
            onClick={goToNext}
            disabled={currentIndex >= maxIndex}
            className="cast-nav-btn cast-nav-next"
            aria-label="Next cast members"
          >
            ›
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="cast-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="cast-slider"
          style={{
            transform: `translateX(${getTransform()}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {cast.slice(0, 12).map((actor, index) => (
            <div key={actor.cast_id} className="cast-item">
              <div className='cast-avatar'>
                {actor.profile_path ? (
                  <img 
                    className='cast-image' 
                    src={`https://image.tmdb.org/t/p/w185/${actor.profile_path}`} 
                    alt={actor.name}
                    draggable={false}
                  />
                ) : (
                  <div className='cast-placeholder'>
                    No Img
                  </div>
                )}
              </div>
              <p className='cast-name'>{actor.name}</p>
              <p className='cast-character'>{actor.character}</p>
            </div>
          ))}
        </div>
      </div>
      
      {maxIndex > 0 && (
        <div className="cast-indicators">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              className={`cast-indicator ${currentIndex === index ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to cast page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SwipeableCast