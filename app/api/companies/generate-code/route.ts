import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createSupabaseServer } from '@/lib/supabase/server'

const requestSchema = z.object({
  companyName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}))
    const { companyName } = requestSchema.parse(json)

    const supabase = createSupabaseServer()

    const { data, error } = await supabase.rpc('generate_external_company_code', {
      p_company_name: companyName?.trim() || undefined,
    })

    if (error) {
      console.error('Error generating external company code:', error)
      return NextResponse.json(
        { error: 'Failed to generate company code' },
        { status: 500 }
      )
    }

    return NextResponse.json({ code: data })
  } catch (error) {
    console.error('Invalid payload for company code generation:', error)
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 }
    )
  }
}
