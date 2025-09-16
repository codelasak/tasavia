'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

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
      dragFree: true,
      containScroll: 'trimSnaps'
    },
    autoPlay ? [Autoplay({ delay: autoPlayInterval, stopOnInteraction: false })] : []
  )

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false)
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index)
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setPrevBtnEnabled(emblaApi.canScrollPrev())
    setNextBtnEnabled(emblaApi.canScrollNext())
  }, [emblaApi])

  
  useEffect(() => {
    if (!emblaApi) return

    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect, autoPlay, autoPlayInterval])

  // Responsive slidesToShow
  const getResponsiveSlides = () => {
    if (typeof window === 'undefined') return slidesToShow
    if (window.innerWidth < 640) return 2
    if (window.innerWidth < 1024) return 3
    return slidesToShow
  }

  const responsiveSlides = getResponsiveSlides()

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Navigation Buttons */}
      <button
        onClick={scrollPrev}
        disabled={!prevBtnEnabled}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-2 lg:-translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
        aria-label="Previous customers"
      >
        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      </button>

      <button
        onClick={scrollNext}
        disabled={!nextBtnEnabled}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-2 lg:translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
        aria-label="Next customers"
      >
        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      </button>

      {/* Carousel Container */}
      <div
        ref={emblaRef}
        className="overflow-hidden"
      >
        <div className="flex">
          {customers.map((customer, index) => (
            <motion.div
              key={index}
              className="flex-shrink-0 px-3"
              style={{ width: `${100 / responsiveSlides}%` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 h-full flex items-center justify-center group">
                <div className="relative w-full h-24 flex items-center justify-center">
                  <Image
                    src={customer.src}
                    alt={customer.alt}
                    fill
                    className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 opacity-70 group-hover:opacity-100 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
                  />
                </div>
                <div className="mt-3 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                    {customer.name}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {customers.map((_, index) => {
          const dotsLength = Math.ceil(customers.length / responsiveSlides)
          const dotIndex = Math.floor(index / responsiveSlides)

          if (index % responsiveSlides !== 0) return null

          return (
            <button
              key={dotIndex}
              onClick={() => scrollTo(dotIndex * responsiveSlides)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
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