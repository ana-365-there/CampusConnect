'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import { CampusEvent } from '@/data/events'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function EventDetailPage({
  params,
}: {
  params?: { id?: string }
}) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [eventData, setEventData] = useState<{
    event: CampusEvent
    isRegistered: boolean
    isPast: boolean
    isFull: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const eventId = params?.id

  const fetchServerData = useCallback(async () => {
    if (!eventId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    try {
      const studentId = currentUser?.id || ''
      const res = await fetch(`/api/events/${eventId}?studentId=${studentId}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setNotFound(true)
      } else {
        const data = await res.json()
        if (!data.event) {
          setNotFound(true)
        } else {
          setEventData(data)
          setNotFound(false)
        }
      }
    } catch (err) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [eventId, currentUser?.id])

  useEffect(() => {
    fetchServerData()
  }, [fetchServerData])

  if (loading) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <p>Loading event details...</p>
      </section>
    )
  }

  if (notFound || !eventData || !eventData.event) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This event isn't on the board"
          description="It may have been removed, or the link might be wrong. Head back to the full listing to find what you're looking for."
          action={
            <Link href="/events" className="btn btn-primary">
              Back to events
            </Link>
          }
        />
      </section>
    )
  }

  const { event, isRegistered, isPast, isFull } = eventData
  const isStudent = currentUser?.role === 'student'

  const status = event.cancelled
    ? 'cancelled'
    : isPast
      ? 'past'
      : isFull
        ? 'full'
        : 'open'

  const canRegister =
    isStudent &&
    !isPast &&
    !isFull &&
    !event.cancelled &&
    !isRegistered &&
    !submitting

  async function handleRegister() {
    setMessage(null)

    if (!isStudent) {
      setMessage({
        type: 'error',
        text: 'Must be logged in as a student to register for events.',
      })
      return
    }

    if (event.cancelled) {
      setMessage({
        type: 'error',
        text: 'Registration is closed because this event has been cancelled.',
      })
      return
    }

    if (isPast) {
      setMessage({
        type: 'error',
        text: 'Registration is closed because this event has already passed.',
      })
      return
    }

    if (isFull) {
      setMessage({
        type: 'error',
        text: 'Registration is closed because this event is full.',
      })
      return
    }

    if (isRegistered) {
      setMessage({
        type: 'error',
        text: 'You are already registered for this event.',
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser.id,
          eventId: event.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to register.',
        })
      } else {
        setMessage({
          type: 'success',
          text: 'Successfully registered for this event!',
        })
        await fetchServerData()
        router.refresh()
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <Link
        href="/events"
        style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
      >
        ← All events
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 32,
          marginTop: 20,
        }}
        className="hero-grid"
      >
        <div>
          <span className="eyebrow-tag">{event.category}</span>
          <h1 style={{ fontSize: 32, marginTop: 12 }}>{event.name}</h1>
          <p style={{ marginTop: 16, fontSize: 15.5 }}>{event.description}</p>
        </div>

        <aside
          className="card-surface"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: 'fit-content',
          }}
        >
          <StatusBadge status={status} />
          <Detail label="Date" value={formatDate(event.date)} />
          <Detail label="Time" value={formatTime(event.date)} />
          <Detail label="Venue" value={event.venue} />
          <Detail
            label="Seats"
            value={`${event.seatsAvailable} of ${event.capacity} available`}
          />

          {!isStudent && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--rust)',
                background: 'var(--rust-bg)',
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
              }}
            >
              Must be logged in as a student to register for events.
            </div>
          )}

          {isRegistered && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--green)',
                background: 'var(--green-bg)',
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
              }}
            >
              You are registered for this event.
            </div>
          )}

          {message && (
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color:
                  message.type === 'error'
                    ? 'var(--rust)'
                    : 'var(--green)',
                background:
                  message.type === 'error'
                    ? 'var(--rust-bg)'
                    : 'var(--green-bg)',
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
              }}
            >
              {message.text}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleRegister}
            disabled={!canRegister}
            style={{ marginTop: 4 }}
          >
            {submitting
              ? 'Registering...'
              : isRegistered
                ? 'Already registered'
                : canRegister
                  ? 'Register'
                  : status === 'full'
                    ? 'Event full'
                    : !isStudent
                      ? 'Register (Student required)'
                      : 'Registration closed'}
          </button>
        </aside>
      </div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
