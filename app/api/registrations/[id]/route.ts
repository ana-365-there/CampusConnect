import { NextResponse } from 'next/server'
import { cancelRegistration } from '@/data/registrations'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const registrationId = params.id
    const result = cancelRegistration(registrationId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('DELETE /api/registrations/[id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel registration.' },
      { status: 500 },
    )
  }
}
