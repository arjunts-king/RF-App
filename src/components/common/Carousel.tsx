import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  ReactNode
} from 'react';
import { useLiquidGlass } from '../../context/LiquidGlassContext';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ArrowRight,
  Inbox
} from 'lucide-react';

export type CarouselStyle = 'peeking' | 'centered' | 'coverflow' | 'stacked';
export type CarouselDepthEffect = 'none' | 'subtle' | 'coverflow';

export interface CarouselViewAll {
  label?: string;
  onClick: () => void;
  showEndCard?: boolean;
  endCardTitle?: string;
  endCardDescription?: string;
}

export interface CarouselProps<T = any> {
  // Data items or direct children
  items?: T[];
  renderItem?: (item: T, index: number, isFocused: boolean) => ReactNode;
  children?: ReactNode;

  // Header / Title metadata
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: ReactNode;
  headerAction?: ReactNode;

  // View All requirement (Constraint 3)
  viewAllLink?: CarouselViewAll;

  // Sizing & Appearance
  style?: CarouselStyle;
  depthEffect?: CarouselDepthEffect;
  cardWidthClass?: string;
  gapClass?: string;
  className?: string;
  trackClassName?: string;
  slideClassName?: string;

  // Controls & Indicators
  showArrows?: boolean;
  showIndicators?: boolean;
  indicatorType?: 'dots' | 'progress' | 'both';
  showCount?: boolean;

  // Auto-advance
  autoPlay?: boolean;
  autoPlayInterval?: number; // ms, default 5500

  // States
  isLoading?: boolean;
  skeletonCount?: number;
  emptyState?: ReactNode;
  emptyMessage?: string;
  emptyStateMessage?: string;

  // Accessibility & ID
  ariaLabel?: string;
  id?: string;

  // Optional chart expand handler
  onExpandSlide?: (index: number) => void;
}

export function Carousel<T = any>({
  items,
  renderItem,
  children,
  title,
  subtitle,
  icon: Icon,
  badge,
  headerAction,
  viewAllLink,
  style = 'peeking',
  depthEffect = 'subtle',
  cardWidthClass,
  gapClass = 'gap-4',
  className = '',
  trackClassName = '',
  slideClassName = '',
  showArrows = true,
  showIndicators = true,
  indicatorType = 'dots',
  showCount = false,
  autoPlay = false,
  autoPlayInterval = 6000,
  isLoading = false,
  skeletonCount = 4,
  emptyState,
  emptyMessage = 'No items available at this time.',
  emptyStateMessage,
  ariaLabel,
  id
}: CarouselProps<T>) {
  const generatedId = useId();
  const carouselId = id || `carousel-${generatedId}`;
  const { reduceMotion, reduceTransparency } = useLiquidGlass();
  const finalEmptyMessage = emptyStateMessage || emptyMessage;
  const arrowGlassClass = reduceTransparency
    ? 'bg-white border-gray-200'
    : 'glass-surface-regular border-white/95';

  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  // Mouse drag-to-scroll state
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

  // Convert children to array if direct children used
  const childrenArray = React.Children.toArray(children);
  const totalItemCount = items ? items.length : childrenArray.length;
  const includeEndCard = Boolean(viewAllLink?.showEndCard && totalItemCount > 0);
  const totalSlides = totalItemCount + (includeEndCard ? 1 : 0);

  // Default responsive card widths depending on carousel style
  const defaultWidthClass =
    cardWidthClass ||
    (style === 'centered'
      ? 'w-[88%] sm:w-[60%] md:w-[45%] lg:w-[32%]'
      : 'w-[85%] sm:w-[48%] md:w-[32%] lg:w-[24%]');

  // Viewport entrance observer for gentle staggered slide-in (runs only once)
  useEffect(() => {
    if (reduceMotion) {
      setHasEnteredViewport(true);
      return;
    }
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasEnteredViewport(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(track);
    return () => observer.disconnect();
  }, [reduceMotion]);

  // Update scroll capabilities (prev/next availability)
  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollPrev(scrollLeft > 6);
    setCanScrollNext(scrollLeft < scrollWidth - clientWidth - 6);

    // Compute active index based on scroll position and child slide positions
    const slides = Array.from(track.children) as HTMLElement[];
    if (slides.length === 0) return;

    const trackCenter = scrollLeft + clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    slides.forEach((slide, idx) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(trackCenter - slideCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  // Listen to track scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateScrollState();
          ticking = false;
        });
        ticking = true;
      }
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollState();

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, totalSlides]);

  // Programmatic scroll to index
  const scrollToSlide = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const slides = Array.from(track.children) as HTMLElement[];
      const targetIndex = Math.max(0, Math.min(index, slides.length - 1));
      const targetSlide = slides[targetIndex];
      if (!targetSlide) return;

      let targetLeft = targetSlide.offsetLeft;
      if (style === 'centered') {
        targetLeft = targetSlide.offsetLeft - (track.clientWidth - targetSlide.offsetWidth) / 2;
      } else {
        // Leave a slight peek margin on the left if not first slide
        targetLeft = Math.max(0, targetSlide.offsetLeft - (targetIndex > 0 ? 16 : 0));
      }

      track.scrollTo({
        left: targetLeft,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
      setActiveIndex(targetIndex);
    },
    [style, reduceMotion]
  );

  const handlePrev = useCallback(() => {
    scrollToSlide(activeIndex - 1);
  }, [activeIndex, scrollToSlide]);

  const handleNext = useCallback(() => {
    scrollToSlide(activeIndex + 1);
  }, [activeIndex, scrollToSlide]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || reduceMotion || totalSlides <= 1) return;
    if (isPaused || isHovered || isFocused || isTouching) return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      scrollToSlide((activeIndex + 1) % totalSlides);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [
    autoPlay,
    reduceMotion,
    totalSlides,
    isPaused,
    isHovered,
    isFocused,
    isTouching,
    autoPlayInterval,
    activeIndex,
    scrollToSlide
  ]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scrollToSlide(totalSlides - 1);
    }
  };

  // Mouse Drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.pageX - track.offsetLeft;
    dragScrollLeftRef.current = track.scrollLeft;
    dragDistanceRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.25;
    dragDistanceRef.current = Math.abs(walk);
    track.scrollLeft = dragScrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Intercept click on children if dragging
  const handleCaptureClick = (e: React.MouseEvent) => {
    if (dragDistanceRef.current > 6) {
      e.preventDefault();
      e.stopPropagation();
      dragDistanceRef.current = 0;
    }
  };

  // Skeleton Loading State
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header Skeleton */}
        {(title || subtitle) && (
          <div className="flex items-center justify-between">
            <div className="space-y-1.5 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 rounded-lg" />
              <div className="h-3 w-64 bg-gray-100 rounded-md" />
            </div>
            <div className="h-8 w-24 bg-gray-100 rounded-full animate-pulse" />
          </div>
        )}

        {/* Track Skeletons */}
        <div className="flex gap-4 overflow-hidden py-2">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className={`shrink-0 ${defaultWidthClass} h-44 rounded-2xl glass-surface-regular border border-white/80 p-5 space-y-3 animate-pulse`}
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="w-8 h-8 rounded-xl bg-gray-200" />
              </div>
              <div className="h-8 w-36 bg-gray-300 rounded-lg mt-3" />
              <div className="h-3 w-full bg-gray-100 rounded mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Friendly Empty State
  if (totalSlides === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {title && (
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-rose-600" />}
              <h3 className="text-base font-bold text-ink-900">{title}</h3>
            </div>
            {viewAllLink && (
              <button
                type="button"
                onClick={viewAllLink.onClick}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
              >
                <span>{viewAllLink.label || 'View all'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {emptyState || (
          <div className="glass-surface-regular rounded-2xl p-8 border border-white/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center shadow-2xs">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">{finalEmptyMessage}</p>
              <p className="text-xs text-ink-500 mt-0.5">
                New records entered into this module will automatically glide into this carousel.
              </p>
            </div>
            {viewAllLink && (
              <button
                type="button"
                onClick={viewAllLink.onClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold btn-liquid"
              >
                <span>{viewAllLink.label || 'Open Full Register'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      id={carouselId}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel || (typeof title === 'string' ? title : 'Carousel')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUpOrLeave();
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => setIsTouching(false)}
      className={`relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 rounded-3xl ${className}`}
    >
      {/* 1. CAROUSEL HEADER / ACTION BAR */}
      {(title || subtitle || viewAllLink || headerAction || showCount || autoPlay) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          {/* Title & Metadata */}
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {title && (
                  <h3 className="text-sm sm:text-base font-extrabold text-ink-900 tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {badge}
                {showCount && totalSlides > 0 && (
                  <span className="text-[11px] font-mono font-bold text-ink-500 bg-gray-100/80 px-2 py-0.5 rounded-full border border-gray-200">
                    {activeIndex + 1} / {totalSlides}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-ink-500 font-medium truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Controls: Pause/Play, Custom Header Action, View All, and Desktop Arrows */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-play pause/resume toggle */}
            {autoPlay && !reduceMotion && (
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="w-8 h-8 rounded-xl glass-surface-thin hover:border-rose-200 text-ink-700 flex items-center justify-center transition shadow-2xs min-h-[36px] min-w-[36px]"
                aria-label={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
                title={isPaused ? 'Resume carousel' : 'Pause carousel'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-rose-600" /> : <Pause className="w-3.5 h-3.5 text-ink-600" />}
              </button>
            )}

            {headerAction}

            {/* View All link (Strict Constraint 3) */}
            {viewAllLink && (
              <button
                type="button"
                onClick={viewAllLink.onClick}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 transition"
                title="View full list/report"
              >
                <span>{viewAllLink.label || 'View all'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Desktop Navigation Arrows in Header */}
            {showArrows && (
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canScrollPrev && activeIndex === 0}
                  className={`w-9 h-9 rounded-xl glass-surface-thin border border-white/90 text-ink-800 flex items-center justify-center shadow-2xs transition-all min-h-[44px] min-w-[44px] ${
                    !canScrollPrev && activeIndex === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-rose-300 hover:bg-white hover:text-rose-700 active:scale-95'
                  }`}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canScrollNext && activeIndex === totalSlides - 1}
                  className={`w-9 h-9 rounded-xl glass-surface-thin border border-white/90 text-ink-800 flex items-center justify-center shadow-2xs transition-all min-h-[44px] min-w-[44px] ${
                    !canScrollNext && activeIndex === totalSlides - 1
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-rose-300 hover:bg-white hover:text-rose-700 active:scale-95'
                  }`}
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. LIVE ANNOUNCEMENT FOR SCREEN READERS */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {activeIndex + 1} of {totalSlides}
      </div>

      {/* 3. SCROLLING TRACK CONTAINER */}
      <div className="relative">
        {/* Floating Side Arrow: Left (desktop hover/focus) */}
        {showArrows && canScrollPrev && (
          <button
            type="button"
            onClick={handlePrev}
            className={`hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full ${arrowGlassClass} text-ink-900 shadow-md items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 transition-all min-h-[44px] min-w-[44px]`}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 text-rose-700" />
          </button>
        )}

        {/* Floating Side Arrow: Right (desktop hover/focus) */}
        {showArrows && canScrollNext && (
          <button
            type="button"
            onClick={handleNext}
            className={`hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full ${arrowGlassClass} text-ink-900 shadow-md items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 transition-all min-h-[44px] min-w-[44px]`}
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 text-rose-700" />
          </button>
        )}

        {/* Native scroll-snap track */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onClickCapture={handleCaptureClick}
          className={`flex overflow-x-auto ${gapClass} py-3 px-1 scroll-smooth select-none cursor-grab active:cursor-grabbing no-scrollbar ${
            style === 'centered' ? 'snap-x snap-mandatory' : 'snap-x snap-mandatory'
          } ${trackClassName}`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            perspective: style === 'coverflow' && !reduceMotion ? '1200px' : undefined
          }}
        >
          {/* Render Items */}
          {items && renderItem
            ? items.map((item, idx) => {
                const isFocused = idx === activeIndex;
                const distance = Math.abs(idx - activeIndex);

                // Depth effects calculation (disabled if reduceMotion)
                let slideStyle: React.CSSProperties = {};
                if (!reduceMotion) {
                  if (hasEnteredViewport) {
                    slideStyle.animation = `liquid-slide-up 320ms cubic-bezier(0.16, 1, 0.3, 1) ${idx * 45}ms both`;
                  }
                  if (depthEffect === 'subtle') {
                    if (!isFocused && distance === 1) {
                      slideStyle.transform = 'scale(0.97)';
                      slideStyle.opacity = 0.92;
                    } else if (!isFocused && distance > 1) {
                      slideStyle.transform = 'scale(0.95)';
                      slideStyle.opacity = 0.82;
                    }
                  } else if (depthEffect === 'coverflow') {
                    if (idx < activeIndex) {
                      slideStyle.transform = `rotateY(12deg) scale(${Math.max(0.85, 1 - distance * 0.06)})`;
                      slideStyle.opacity = Math.max(0.65, 1 - distance * 0.15);
                    } else if (idx > activeIndex) {
                      slideStyle.transform = `rotateY(-12deg) scale(${Math.max(0.85, 1 - distance * 0.06)})`;
                      slideStyle.opacity = Math.max(0.65, 1 - distance * 0.15);
                    }
                  }
                }

                return (
                  <div
                    key={idx}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Slide ${idx + 1} of ${totalSlides}`}
                    className={`shrink-0 ${defaultWidthClass} snap-start ${
                      style === 'centered' ? 'snap-center' : ''
                    } transition-all duration-300 card-liquid-hover ${slideClassName}`}
                    style={slideStyle}
                  >
                    {renderItem(item, idx, isFocused)}
                  </div>
                );
              })
            : childrenArray.map((child, idx) => {
                const isFocused = idx === activeIndex;
                const distance = Math.abs(idx - activeIndex);

                let slideStyle: React.CSSProperties = {};
                if (!reduceMotion) {
                  if (hasEnteredViewport) {
                    slideStyle.animation = `liquid-slide-up 320ms cubic-bezier(0.16, 1, 0.3, 1) ${idx * 45}ms both`;
                  }
                  if (depthEffect === 'subtle') {
                    if (!isFocused && distance === 1) {
                      slideStyle.transform = 'scale(0.97)';
                      slideStyle.opacity = 0.92;
                    } else if (!isFocused && distance > 1) {
                      slideStyle.transform = 'scale(0.95)';
                      slideStyle.opacity = 0.82;
                    }
                  } else if (depthEffect === 'coverflow') {
                    if (idx < activeIndex) {
                      slideStyle.transform = `rotateY(12deg) scale(${Math.max(0.85, 1 - distance * 0.06)})`;
                      slideStyle.opacity = Math.max(0.65, 1 - distance * 0.15);
                    } else if (idx > activeIndex) {
                      slideStyle.transform = `rotateY(-12deg) scale(${Math.max(0.85, 1 - distance * 0.06)})`;
                      slideStyle.opacity = Math.max(0.65, 1 - distance * 0.15);
                    }
                  }
                }

                return (
                  <div
                    key={idx}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Slide ${idx + 1} of ${totalSlides}`}
                    className={`shrink-0 ${defaultWidthClass} snap-start ${
                      style === 'centered' ? 'snap-center' : ''
                    } transition-all duration-300 card-liquid-hover ${slideClassName}`}
                    style={slideStyle}
                  >
                    {child}
                  </div>
                );
              })}

          {/* Dedicated Trailing "View All" Slide at the End of the Row */}
          {includeEndCard && viewAllLink && (
            <div
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${totalSlides} of ${totalSlides}: ${viewAllLink.label || 'View All'}`}
              className={`shrink-0 ${defaultWidthClass} snap-start transition-all duration-300`}
            >
              <div
                onClick={viewAllLink.onClick}
                className="h-full min-h-[160px] p-6 rounded-3xl glass-surface-blush border border-rose-200/90 hover:border-rose-400 card-liquid-hover cursor-pointer flex flex-col justify-between group/end text-left shadow-xs"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs group-hover/end:scale-105 transition-transform">
                    <ArrowRight className="w-5 h-5 group-hover/end:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="text-base font-extrabold text-ink-900 group-hover/end:text-rose-900 transition">
                    {viewAllLink.endCardTitle || viewAllLink.label || 'View Complete Register'}
                  </h4>
                  <p className="text-xs text-ink-500 line-clamp-2">
                    {viewAllLink.endCardDescription ||
                      'Scan, filter, sort, and export the entire dataset in the master table view.'}
                  </p>
                </div>

                <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-rose-700 group-hover/end:text-rose-950">
                  <span>Open full view</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/end:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. PAGINATION INDICATORS (Dots or Thin Progress Bar) */}
      {showIndicators && totalSlides > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {/* Thin Progress Bar */}
          {(indicatorType === 'progress' || indicatorType === 'both') && (
            <div className="w-32 sm:w-48 h-1 bg-gray-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-600 rounded-full transition-all duration-300"
                style={{
                  width: `${((activeIndex + 1) / totalSlides) * 100}%`
                }}
              />
            </div>
          )}

          {/* Dots Indicator */}
          {(indicatorType === 'dots' || indicatorType === 'both') && (
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide indicators">
              {Array.from({ length: totalSlides }).map((_, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Go to slide ${idx + 1}`}
                    onClick={() => scrollToSlide(idx)}
                    className={`rounded-full transition-all duration-300 min-h-[16px] min-w-[16px] flex items-center justify-center p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500`}
                  >
                    <span
                      className={`block rounded-full transition-all duration-300 ${
                        isActive
                          ? 'w-6 h-2 bg-rose-600 shadow-2xs'
                          : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
