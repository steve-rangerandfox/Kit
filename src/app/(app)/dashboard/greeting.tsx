'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface GreetingProps {
  firstName: string
}

export function Greeting({ firstName }: GreetingProps) {
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [formattedDate, setFormattedDate] = useState('')

  useEffect(() => {
    const now = new Date()

    // Determine time of day
    const hour = now.getHours()
    if (hour < 12) {
      setTimeOfDay('morning')
    } else if (hour < 18) {
      setTimeOfDay('afternoon')
    } else {
      setTimeOfDay('evening')
    }

    // Format date
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
    setFormattedDate(now.toLocaleDateString('en-US', options))
  }, [])

  const greeting = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-2"
    >
      <h1 className="text-4xl md:text-5xl font-bold text-white">
        {greeting[timeOfDay]}, <span className="text-[#6366F1]">{firstName}</span>
      </h1>
      <p className="text-base text-[#b4b8c3]">{formattedDate}</p>
    </motion.div>
  )
}
