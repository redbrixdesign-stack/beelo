import { useState, useEffect } from 'react'
import { useDexie } from '../../hooks/useDexie'
import { useAuth } from '../../hooks/useAuth'

export function useDashboardStats() {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const [stats, setStats] = useState({ visits: 0, customers: 0, upcoming: 0, pendingOutcomes: 0 })

  useEffect(() => {
    if (!isReady || !advisor) return
    loadStats()
  }, [isReady, advisor])

  const loadStats = async () => {
    if (!advisor) return
    try {
      const [visits, customers] = await Promise.all([
        db.visits.where('advisorId').equals(advisor.id!).toArray(),
        db.customers.where('advisorId').equals(advisor.id!).toArray()
      ])

      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)

      const visitsThisWeek = visits.filter(v => {
        const d = new Date(v.dateTime)
        return d >= weekStart && d < weekEnd
      }).length

      const upcoming = visits.filter(v => new Date(v.dateTime) > now).length

      const pendingOutcomes = visits.filter(v => 
        new Date(v.dateTime) < now && !v.outcome
      ).length

      setStats({
        visits: visitsThisWeek,
        customers: customers.length,
        upcoming,
        pendingOutcomes
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  return stats
}