// Seed data for registrations, so the "My Registrations" and Organizer
// pages have something real to display before participants build the
// actual registration flow (Task 2 and Task 3).

import { getEventById } from './events'

export type RegistrationStatus = 'confirmed' | 'cancelled'

export interface Registration {
  id: string
  eventId: string
  studentId: string
  status: RegistrationStatus
  registeredAt: string // ISO date string
}

// NOTE FOR PARTICIPANTS: this array is the "database" of registrations.
// Task 2 (Registration) means pushing new items into this array when a
// student registers. Task 3 (Cancellation) means updating an item's
// status here. Keep using this same array — don't create a second store.
export const registrations: Registration[] = [
  {
    id: 'reg-01',
    eventId: 'evt-01',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-10T10:15:00',
  },
  {
    id: 'reg-02',
    eventId: 'evt-04',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-08-20T09:00:00',
  },
  {
    id: 'reg-03',
    eventId: 'evt-09',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-12T18:40:00',
  },
]

/** Simple lookup used by the placeholder "My Registrations" page. */
export function getRegistrationsForStudent(studentId: string): Registration[] {
  return registrations.filter((reg) => reg.studentId === studentId)
}

/** Check if a student is already actively (confirmed) registered for an event. */
export function isStudentRegisteredForEvent(
  studentId: string,
  eventId: string,
): boolean {
  return registrations.some(
    (reg) =>
      reg.studentId === studentId &&
      reg.eventId === eventId &&
      reg.status === 'confirmed',
  )
}

/** Cancel a student's active registration and increase available seats by 1. */
export function cancelRegistration(registrationId: string): {
  success: boolean
  message: string
} {
  const reg = registrations.find((r) => r.id === registrationId)
  if (!reg) {
    return { success: false, message: 'Registration record not found.' }
  }
  if (reg.status === 'cancelled') {
    return { success: false, message: 'Registration is already cancelled.' }
  }

  const event = getEventById(reg.eventId)
  if (!event) {
    return { success: false, message: 'Associated event not found.' }
  }

  reg.status = 'cancelled'
  event.seatsAvailable += 1

  return { success: true, message: 'Registration cancelled successfully.' }
}
