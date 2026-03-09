import { resend } from "./resend"

export async function enviarEmail(
  destino: string,
  assunto: string,
  mensagem: string
) {

  try {

    await resend.emails.send({
      from: "SETEC Hub <onboarding@resend.dev>",
      to: destino,
      subject: assunto,

      html: `
      <div style="font-family:Arial;padding:20px">
        <h2>SETEC Hub</h2>
        <p>${mensagem}</p>
      </div>
      `

    })

  } catch (error) {

    console.error("Erro ao enviar email:", error)

  }

}