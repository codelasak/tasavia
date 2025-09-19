'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    
    const tryPlay = async () => {
      try {
        await v.play()
      } catch (err) {
        console.warn('Hero video play() was prevented by the browser:', err)
      }
    }
    
    // Attempt to play on mount and when it can play
    tryPlay()
    const canPlay = () => tryPlay()
    v.addEventListener('canplay', canPlay)
    return () => v.removeEventListener('canplay', canPlay)
  }, [])

  return (
    <section 
      id="home" 
      className="relative min-h-screen flex items-center overflow-hidden"
      role="banner" 
      aria-label="Welcome to TASAVIA"
    >
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          preload="metadata"
          onLoadedData={() => console.debug('Hero video loaded')}
          onError={(e) => console.error('Hero video failed to load', e)}
        >
          <source src="/video/tasavia-hero-background-video.mp4" type="video/mp4" />
        </video>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen py-20">
            
            {/* Left Side - Content */}
            <motion.div 
              className="flex flex-col justify-center space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Title */}
              <div className="space-y-6">
                <motion.h1 
                  className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <span className="block mb-2">YOUR PARTNER TO</span>
                  <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    KEEP AIRCRAFTS FLYING
                  </span>
                </motion.h1>
                
                {/* Subtitle */}
                <motion.p 
                  className="text-lg sm:text-xl lg:text-2xl text-slate-200 max-w-2xl leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  Your trusted partner for comprehensive aviation solutions. We deliver excellence in every flight with cutting-edge technology and unparalleled service.
                </motion.p>
              </div>

              {/* CTA Button */}
              <motion.div
                className="flex"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <Link href="#contact" className="inline-block">
                  <Button
                    size="lg"
                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl hover:scale-105"
                  >
                    Contact Us
                    <svg 
                      className="ml-2 w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Side - Empty Space */}
            <div className="hidden lg:block">
              {/* Reserved for future content */}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <motion.div 
          className="flex flex-col items-center space-y-2 text-white/70"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-sm font-medium">Scroll Down</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}