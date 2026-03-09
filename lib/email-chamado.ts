export async function enviarEmailChamado(
email:string,
assunto:string,
mensagem:string
){

await fetch("/api/email/chamado",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email,
assunto,
mensagem
})

})

}