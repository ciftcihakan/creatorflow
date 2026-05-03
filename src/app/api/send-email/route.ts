import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, fromName } = await req.json()

    const { data, error } = await resend.emails.send({
      from: `${fromName || 'Creatorflow'} <onboarding@resend.dev>`,
      to: [to],
      subject: subject,
      text: body,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}