// TripTracking - Start/stop trip tracking with GPS
// Single large touch target for one-handed operation

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { useToast } from '@components/ui/Toast'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Play, PauseCircle, MapPin, Clock, Map, X } from 'lucide-react'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { TripDexie } from '@lib/dexie'

const fmtDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function TripTracking() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const [trip, setTrip] = useState<TripDexie | null>(null)
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const [distanceMiles, setDistanceMiles] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [locationSupported, setLocationSupported] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastCoordsRef = useRef<GeolocationCoordinates | null>(null)

  const visitId = id ? parseInt(id) : 0

  const fmtDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  const calculateDistance = (coords1: GeolocationCoordinates, coords2: GeolocationCoordinates): number => {
    const R = 3958.8 // Earth radius in miles
    const dLat = (coords2.latitude - coords1.latitude) * Math.PI / 180
    const dLon = (coords2.longitude - coords1.longitude) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + 
      Math.cos(coords1.latitude * Math.PI / 180) * Math.cos(coords2.latitude * Math.PI / 180) * 
      Math.sin((coords2.longitude - coords1.longitude) * Math.PI / 180 / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const handleStartTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    try {
      setError(null)
      
      // Request high accuracy location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      const now = new Date()
      const startCoords: GeolocationCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? undefined,
        altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
        heading: position.coords.heading ?? undefined,
        speed: position.coords.speed ?? undefined
      }

      const sourceEnv = (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live'
      
      // Create trip in Dexie
      const localId = await db.trips.add({
        visitId: visitId,
        startedAt: now,
        pathPoints: [{
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: now.toISOString()
        }],
        status: 'active',
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
        createdAt: now,
        updatedAt: now,
      } as any)

      // Start watching position
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = new Date()
          const newCoords: GeolocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined
          }

          // Update distance
          if (lastCoordsRef.current) {
            const distance = calculateDistance(lastCoordsRef.current, position.coords)
            setDistanceMiles(prev => prev + distance)
          }
          lastCoordsRef.current = position.coords

          // Update path points
          db.trips.update(tripId!, {
            pathPoints: (prev: any[]) => [...prev, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: now.toISOString()
            }]
          })
        },
        (err) => {
          console.error('Geolocation watch error:', err)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )

      watchIdRef.current = watchId
      setTracking(true)
      startTimeRef.current = Date.now()
      
      // Start duration timer
      intervalRef.current = window.setInterval(() => {
        setDurationMs(Date.now() - (startTimeRef.current || Date.now()))
      }, 1000)

      setTracking(true)
    } catch (err) {
      console.error('Failed to start trip tracking:', err)
      setError('Failed to start trip tracking')
    }
  }, [])

  const handleStopTracking = useCallback(async () => {
    if (!tracking) return

    try {
      // Stop geolocation watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      const endedAt = new Date()
      const finalDurationMs = Date.now() - (startTimeRef.current || Date.now())
      
      // Final position
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          })
        })

        db.trips.update(tripId!, {
          endedAt: new Date(),
          distanceMiles,
          pathPoints: (prev: any[]) => [...prev, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          }],
          status: 'completed',
          updatedAt: new Date(),
        })
      } catch (err) {
        // Even if final GPS fails, mark as completed
        await db.trips.update(tripId!, {
          endedAt: new Date(),
          distanceMiles,
          status: 'completed',
          updatedAt: new Date(),
        })
      }

      // Sync to Supabase
      try {
        await enqueueSync('trips', tripId!, 'update', {
          ended_at: new Date().toISOString(),
          distance_miles: distanceMiles,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('Failed to enqueue trip sync:', err)
      }

      setTracking(false)
      setDurationMs(0)
      startTimeRef.current = null
      lastCoordsRef.current = null
      
      // Navigate back after short delay
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      console.error('Failed to stop trip tracking:', err)
      setError('Failed to stop trip tracking')
    }
  }, [])

  useEffect(() => {
    // Check geolocation support
    setLocationSupported('geolocation' in navigator)
  }, [])

  useEffect(() => {
    if (!isReady || !advisor) return
    // Load existing active trip for this visit
    db.trips.where('visitId').equals(visitId).and(t => t.status === 'active').first().then(t => {
      if (t) {
        setTrip(t)
      }
    })
  }, [isReady, advisor])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  if (!isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  if (!advisor) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Not authenticated</div>
  }

  // Styles for minimum 48x48dp touch targets
  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--spacing-lg)',
    paddingBottom: 'calc(var(--spacing-xl) + env(safe-area-inset-bottom, 0))'
  }

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-xl)'
  }

  const headerTitleStyle = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600
  }

  const mainStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }

  // Main action button - minimum 88x88px for one-handed use
  const mainButtonStyle = {
    width: '100%',
    maxWidth: '280px',
    height: '88px',
    borderRadius: 'var(--radius-xl)',
    background: tracking ? 'var(--color-error)' : 'var(--color-primary)',
    border: 'none',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    boxShadow: '0 4px 16px var(--color-primary-muted)',
    animation: 'pulse 1.5s ease-in-out infinite',
    transition: 'all var(--transition-normal)',
    fontSize: '1.25rem',
    fontWeight: 700
  }

  const statusStyle = {
    marginTop: 'var(--spacing-lg)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '1rem'
  }

  const durationStyle = {
    fontSize: '3rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-primary)',
    fontVariantNumeric: 'tabular-nums',
    marginBottom: 'var(--spacing-xs)'
  }

  const distanceStyle = {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: 'var(--color-primary)'
  }

  const offlineStyle = {
    marginBottom: 'var(--spacing-lg)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    background: 'var(--color-warning-muted)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    color: '#1a1a2e',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)'
  }

  if (!isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  if (!advisor) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Not authenticated</div>
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={headerTitleStyle}>Trip Tracking</h1>
        <div style={{ width: '44px' }} />
      </header>

      <div style={mainStyle}>
        {!navigator.geolocation && (
          <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-warning-muted)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: '#1a1a2e', display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <span>📍</span> Geolocation not supported
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-error-muted)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-error)' }}>
            <span>{error}</span>
          </div>
        )}

        {!tracking ? (
          <>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
              <MapPin size={48} style={{ color: 'var(--color-primary)', margin: '0 auto var(--spacing-md)' }} />
              <h2 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '1.5rem', fontWeight: 600, textAlign: 'center' }}>
                Start Trip Tracking
              </h2>
              <p style={{ margin: '0 0 var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
                Tap the button below to start tracking your trip. GPS will record your route and distance automatically.
              </p>
            </div>

            <button
              onClick={handleStartTracking}
              style={mainButtonStyle}
              aria-label="Start trip tracking"
              disabled={!navigator.geolocation}
            >
              <MapPin size={28} style={{ marginBottom: 'var(--spacing-xs)' }} />
              <span style={{ fontSize: '1.125rem' }}>Start Tracking</span>
            </button>
          </>
        ) : (
          <>
            <div style={durationStyle}>{fmtDuration(Date.now() - (startTimeRef.current || Date.now()))}</div>
            <div style={statusStyle}>Tracking active</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Distance</div>
                <div style={distanceStyle}>{distanceMiles.toFixed(2)} mi</div>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--color-border)' }} />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Duration</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>{fmtDuration(Date.now() - (startTimeRef.current || Date.now()))}</div>
              </div>
            </div>

            {!navigator.onLine && (
              <div style={offlineStyle}>
                <span>📴</span> Offline — tracking locally
              </div>
            )}

            <button
              onClick={handleStopTracking}
              style={{
                ...mainButtonStyle,
                background: 'var(--color-error)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
              aria-label="Stop trip tracking"
            >
              <PauseCircle size={28} style={{ marginBottom: 'var(--spacing-xs)' }} />
              <span style={{ fontSize: '1.125rem' }}>Stop Tracking</span>
            </button>
          </>
        )}

        <div style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '400px' }}>
          <h3 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '0.875rem', fontWeight: 600 }}>
            How it works
          </h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            <li>Tap <strong>Start Tracking</strong> to begin GPS recording</li>
            <li>Phone must stay unlocked with this app open</li>
            <li>Works offline — data syncs when back online</li>
            <li>Tap <strong>Stop Tracking</strong> to end and save trip</li>
          </ul>
        </div>
      </div>
    </div>
  )
}