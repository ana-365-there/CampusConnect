import { NextResponse } from 'next/server'
import { getEventById, isPastEvent, isFullEvent } from '@/data/events'
import { isStudentRegisteredForEvent } from '@/data/registrations'

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const event = getEventById(params.id)
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')

  const isRegistered = studentId
    ? isStudentRegisteredForEvent(studentId, event.id)
    : false

  return NextResponse.json({
    event: { ...event },
    isRegistered,
    isPast: isPastEvent(event),
    isFull: isFullEvent(event),
  })
}
