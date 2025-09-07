"use client"

import { useEffect, useRef } from "react"

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      video.pause()
      return
    }

    video.play().catch(() => {
      // Fallback if video fails to play
      console.log("Video autoplay failed")
    })
  }, [])

  return (
    <div className="absolute inset-0 z-0">
      <video
        ref={videoRef}
        className="h-full w-full object-cover opacity-20"
        autoPlay
        muted
        loop
        playsInline
        poster="/placeholder-kaf2t.png"
      >
        <source src="/placeholder-9kbwd.png" type="video/mp4" />
        {/* Fallback image */}
        <img
          src="/placeholder-kaf2t.png"
          alt="Medical facility background"
          className="h-full w-full object-cover"
        />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/30 to-slate-950/80" />
    </div>
  )
}
