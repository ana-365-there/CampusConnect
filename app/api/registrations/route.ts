import { NextResponse } from 'next/server'
import { getEventById, isPastEvent, isFullEvent } from '@/data/events'
import {
  registrations,
  getRegistrationsForStudent,
  isStudentRegisteredForEvent,
  Registration,
} from '@/data/registrations'
import { getUserById } from '@/data/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json(
      { error: 'Missing studentId parameter' },
      { status: 400 },
    )
  }

  const studentRegistrations = getRegistrationsForStudent(studentId)

  const enriched = studentRegistrations.map((reg) => {
    const event = getEventById(reg.eventId)
    return {
      ...reg,
      event: event ? { ...event, isPast: isPastEvent(event) } : null,
    }
  })

  return NextResponse.json({ registrations: enriched })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { studentId, eventId } = body

    if (!studentId || !eventId) {
      return NextResponse.json(
        { error: 'Missing studentId or eventId' },
        { status: 400 },
      )
    }

    const user = getUserById(studentId)
    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { error: 'Must be logged in as a student to register for events.' },
        { status: 400 },
      )
    }

    const event = getEventById(eventId)
    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }

    if (event.cancelled) {
      return NextResponse.json(
        { error: 'Registration is closed because this event has been cancelled.' },
        { status: 400 },
      )
    }

    if (isPastEvent(event)) {
      return NextResponse.json(
        { error: 'Registration is closed because this event has already passed.' },
        { status: 400 },
      )
    }

    if (isFullEvent(event)) {
      return NextResponse.json(
        { error: 'Registration is closed because this event is full.' },
        { status: 400 },
      )
    }

    if (isStudentRegisteredForEvent(studentId, eventId)) {
      return NextResponse.json(
        { error: 'You are already registered for this event.' },
        { status: 400 },
      )
    }

    const newRegistration: Registration = {
      id: `reg-${Date.now()}`,
      eventId,
      studentId,
      status: 'confirmed',
      registeredAt: new Date().toISOString(),
    }

    registrations.push(newRegistration)
    event.seatsAvailable -= 1

    return NextResponse.json(
      { success: true, registration: newRegistration },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process registration.' },
      { status: 500 },
    )
  }
}
