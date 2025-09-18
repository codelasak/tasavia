'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'

interface CustomerLogo {
  src: string
  alt: string
  name: string
}

interface CustomerSliderProps {
  customers: CustomerLogo[]
  slidesToShow?: number
  autoPlay?: boolean
  autoPlayInterval?: number
}

const CustomerSlider = ({
  customers,
  slidesToShow = 5,
  autoPlay = true,
  autoPlayInterval = 3000
}: CustomerSliderProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: true,
      dragFree: true, // allow free dragging while auto scroll runs
      containScroll: false,
      slidesToScroll: 1,
      skipSnaps: false,
      dragThreshold: 5,
      inViewThreshold: 0.7
    },
    autoPlay
      ? [
          AutoScroll({
            speed: 2.5, // pixels/frame – tune for “water-like” flow
            startDelay: 500,
            stopOnInteraction: false,
            stopOnMouseEnter: false,
            playOnInit: false, // we’ll start after images preload
            // Ensure the hover/interaction area is the slider wrapper
            rootNode: (emblaRoot) => emblaRoot.parentElement as HTMLElement | null
          })
        ]
      : []
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState<{[key: string]: boolean}>({})
  const [allImagesPreloaded, setAllImagesPreloaded] = useState(false)

  // Preload all images
  useEffect(() => {
    const preloadImages = async () => {
      const imagePromises = customers.map((customer) => {
        return new Promise<void>((resolve) => {
          const img = new window.Image()
          img.onload = () => {
            setImagesLoaded(prev => ({ ...prev, [customer.src]: true }))
            resolve()
          }
          img.onerror = () => {
            setImagesLoaded(prev => ({ ...prev, [customer.src]: true }))
            resolve()
          }
          img.src = customer.src
        })
      })

      await Promise.all(imagePromises)
      setAllImagesPreloaded(true)
    }

    preloadImages()
  }, [customers])

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev()
    }
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext()
    }
  }, [emblaApi])

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index)
    }
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])


  useEffect(() => {
    if (!emblaApi) return

    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)

    // Only start auto scroll after images are preloaded for smoothness
    if (allImagesPreloaded && autoPlay) {
      const autoScroll = (emblaApi.plugins() as any).autoScroll
      if (autoScroll && typeof autoScroll.play === 'function') {
        autoScroll.play(300) // optional override start delay
      }
    }

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect, autoPlay, autoPlayInterval, allImagesPreloaded])

  // Responsive slidesToShow
  const getResponsiveSlides = () => {
    if (typeof window === 'undefined') return slidesToShow
    if (window.innerWidth < 640) return 1
    if (window.innerWidth < 768) return 2
    if (window.innerWidth < 1024) return 3
    return slidesToShow
  }

  const responsiveSlides = getResponsiveSlides()

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Navigation Buttons */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-2 lg:-translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 group"
        aria-label="Previous customers"
      >
        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      </button>

      <button
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-2 lg:translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 group"
        aria-label="Next customers"
      >
        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      </button>

      {/* Carousel Container */}
      <div
        ref={emblaRef}
        className="overflow-hidden"
      >
        <div className="flex -ml-2 -mr-2">
          {customers.map((customer, index) => (
            <motion.div
              key={`${customer.src}-${index}`}
              className="flex-shrink-0 pl-2 pr-2"
              style={{ width: `${100 / responsiveSlides}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.1) }}
            >
              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-150 hover:-translate-y-1 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 h-full flex items-center justify-center group">
                <div className="relative w-full h-32 flex items-center justify-center">
                  {!imagesLoaded[customer.src] && (
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse flex items-center justify-center">
                      <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                    </div>
                  )}
                  <Image
                    src={customer.src}
                    alt={customer.alt}
                    fill
                    className={`object-contain filter grayscale group-hover:grayscale-0 transition-all duration-200 opacity-80 group-hover:opacity-100 group-hover:scale-110 ${
                      imagesLoaded[customer.src] ? 'opacity-80' : 'opacity-0'
                    }`}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
                    priority={index < responsiveSlides}
                    quality={85}
                    onLoad={() => setImagesLoaded(prev => ({ ...prev, [customer.src]: true }))}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {customers.map((_, index) => {
          const dotIndex = Math.floor(index / responsiveSlides)

          if (index % responsiveSlides !== 0) return null

          return (
            <button
              key={dotIndex}
              onClick={() => scrollTo(dotIndex * responsiveSlides)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                selectedIndex >= dotIndex * responsiveSlides &&
                selectedIndex < (dotIndex + 1) * responsiveSlides
                  ? 'bg-blue-600 dark:bg-blue-400 w-8'
                  : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
              }`}
              aria-label={`Go to slide ${dotIndex + 1}`}
            />
          )
        })}
      </div>

          </div>
  )
}

export default CustomerSlider