import { useRef, useState, useEffect, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './SlideRow.css'

interface SlideRowProps {
  title: string
  titleStyle?: React.CSSProperties
  count?: number
  children: ReactNode
}

export function SlideRow({ title, titleStyle, count, children }: SlideRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  // Reset scroll to start when children change (e.g. filter toggled)
  useEffect(() => {
    const el = trackRef.current
    if (el) el.scrollTo({ left: 0 })
  }, [children])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [children])

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current
    if (!el) return
    const cardWidth = 214
    const amount = cardWidth * 3
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <div className="slide-row-section">
      <div className="slide-row-header">
        <div>
          <span className="slide-row-title" style={titleStyle}>{title}</span>
          {count !== undefined && <span className="slide-row-count">· {count} événements</span>}
        </div>
      </div>
      <div className="slide-row-container">
        <button
          className={`slide-row-arrow left ${!canScrollLeft ? 'hidden' : ''}`}
          onClick={() => scroll('left')}
        >
          <ChevronLeft strokeWidth={1.5} />
        </button>
        <div ref={trackRef} className="slide-row-track">
          {children}
        </div>
        <button
          className={`slide-row-arrow right ${!canScrollRight ? 'hidden' : ''}`}
          onClick={() => scroll('right')}
        >
          <ChevronRight strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
