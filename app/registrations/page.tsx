'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import { CampusEvent } from '@/data/events'
import { RegistrationStatus } from '@/data/registrations'

interface EnrichedRegistration {
  id: string
  eventId: string
  studentId: string
  status: RegistrationStatus
  registeredAt: string
  event: (CampusEvent & { isPast: boolean }) | null
}

export default function RegistrationsPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [registrationsList, setRegistrationsList] = useState<EnrichedRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const fetchRegistrations = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'student') {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/registrations?studentId=${currentUser.id}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setRegistrationsList(data.registrations || [])
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  if (currentUser.role !== 'student') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This page is for students"
          description="Switch to a student account from the top-right menu to see registered events."
        />
      </section>
    )
  }

  if (loading) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <p>Loading your registrations...</p>
      </section>
    )
  }

  const upcomingRegistrations = registrationsList.filter((reg) => {
    if (!reg.event) return false
    return (
      reg.status === 'confirmed' && !reg.event.cancelled && !reg.event.isPast
    )
  })

  const pastOrCancelledRegistrations = registrationsList.filter((reg) => {
    if (!reg.event) return true
    return (
      reg.status === 'cancelled' || reg.event.cancelled || reg.event.isPast
    )
  })

  async function handleCancel(regId: string) {
    setFeedback(null)
    setCancellingId(regId)
    try {
      const res = await fetch(`/api/registrations/${regId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to cancel registration.',
        })
      } else {
        setFeedback({
          type: 'success',
          text: data.message || 'Registration cancelled successfully.',
        })
        await fetchRegistrations()
        router.refresh()
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: 'An unexpected error occurred while cancelling.',
      })
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">signed up as {currentUser.name}</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>My registrations</h1>
        <p style={{ marginTop: 8 }}>
          Everything you've registered for, organized by upcoming and past events.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            marginBottom: 20,
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            fontWeight: 500,
            color:
              feedback.type === 'error' ? 'var(--rust)' : 'var(--green)',
            background:
              feedback.type === 'error'
                ? 'var(--rust-bg)'
                : 'var(--green-bg)',
          }}
        >
          {feedback.text}
        </div>
      )}

      {registrationsList.length === 0 ? (
        <EmptyState
          title="No registrations yet"
          description="Once you register for an event, it'll show up here."
          action={
            <Link href="/events" className="btn btn-primary">
              Browse events
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {/* Upcoming Section */}
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 14 }}>
              Upcoming Registrations ({upcomingRegistrations.length})
            </h2>
            {upcomingRegistrations.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
                No active upcoming registrations.
              </p>
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingRegistrations.map((reg) => (
                  <RegistrationCard
                    key={reg.id}
                    registration={reg}
                    onCancel={handleCancel}
                    isUpcoming={true}
                    isCancelling={cancellingId === reg.id}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Past & Cancelled Section */}
          {pastOrCancelledRegistrations.length > 0 && (
            <div>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>
                Past & Cancelled Registrations ({pastOrCancelledRegistrations.length})
              </h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pastOrCancelledRegistrations.map((reg) => (
                  <RegistrationCard
                    key={reg.id}
                    registration={reg}
                    onCancel={handleCancel}
                    isUpcoming={false}
                    isCancelling={false}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function RegistrationCard({
  registration,
  onCancel,
  isUpcoming,
  isCancelling,
}: {
  registration: EnrichedRegistration
  onCancel: (id: string) => void
  isUpcoming: boolean
  isCancelling: boolean
}) {
  const event = registration.event
  if (!event) return null

  const isCancelled = registration.status === 'cancelled' || event.cancelled
  const isPast = event.isPast

  const statusBadgeType = isCancelled
    ? 'cancelled'
    : isPast
      ? 'past'
      : 'open'

  return (
    <li
      className="card-surface"
      style={{
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        opacity: isCancelled ? 0.75 : 1,
      }}
    >
      <div>
        <Link
          href={`/events/${event.id}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 17,
            textDecoration: 'none',
          }}
        >
          {event.name}
        </Link>
        <div
          style={{
            fontSize: 13.5,
            color: 'var(--ink-soft)',
            marginTop: 4,
          }}
        >
          {new Date(event.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}{' '}
          · {event.venue}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <StatusBadge status={statusBadgeType} />
        {isUpcoming ? (
          <button
            className="btn btn-secondary"
            onClick={() => onCancel(registration.id)}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        ) : (
          <button
            className="btn btn-secondary"
            disabled
            title={
              isCancelled
                ? 'Registration is cancelled'
                : 'Cannot cancel past events'
            }
          >
            {isCancelled ? 'Cancelled' : 'Past'}
          </button>
        )}
      </div>
    </li>
  )
}
