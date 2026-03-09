import nodemailer from "nodemailer"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  try {

    const { email, assunto, mensagem } = await req.json()

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS
}
    })

    await transporter.sendMail({
      from: "SETEC HUB <csm.setec@educacao.sp.gov.br>",
      to: email,
      subject: assunto,
      html: `
        <div style="font-family:Arial;padding:20px">
          <h2>SETEC HUB</h2>
          <p>${mensagem}</p>
        </div>
      `
    })

    return NextResponse.json({ ok: true })

  } catch (error) {

    console.error("Erro envio email:", error)

    return NextResponse.json({ error: true })

  }

}