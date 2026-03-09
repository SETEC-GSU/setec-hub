import { resend } from "@/lib/resend"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  try {

    const { email } = await req.json()

    await resend.emails.send({
      from: "SETEC Hub <onboarding@resend.dev>",
      to: email,
      subject: "Teste do sistema SETEC Hub",

      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>SETEC Hub</h2>
          <p>Se você recebeu este email, o sistema está funcionando.</p>
        </div>
      `
    })

    return NextResponse.json({ ok: true })

  } catch (error) {

    return NextResponse.json({ error })

  }

}