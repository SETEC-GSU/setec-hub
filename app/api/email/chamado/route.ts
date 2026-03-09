import nodemailer from "nodemailer"
import { NextResponse } from "next/server"

export async function POST(req: Request){

  try{

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

      from: process.env.SMTP_USER,
      to: email,
      subject: assunto,
      text: mensagem

    })

    return NextResponse.json({ok:true})

  }catch(error){

    console.error("Erro envio email:",error)

    return NextResponse.json({error})

  }

}