"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Stethoscope, Calendar, MessageSquare } from "lucide-react"

interface Particle {
  id: number
  icon: React.ComponentType<{ className?: string }>
  x: number
  delay: number
}

export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    const icons = [Stethoscope, Calendar, MessageSquare]
    const newParticles: Particle[] = []

    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: i,
        icon: icons[i % icons.length],
        x: Math.random() * 100,
        delay: Math.random() * 8,
      })
    }

    setParticles(newParticles)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {particles.map((particle) => {
        const Icon = particle.icon
        return (
          <div
            key={particle.id}
            className="absolute h-6 w-6 text-teal-400/30 particle-float"
            style={{
              left: `${particle.x}%`,
              animationDelay: `${particle.delay}s`,
            }}
          >
            <Icon className="h-full w-full" strokeWidth={2} />
          </div>
        )
      })}
    </div>
  )
}
