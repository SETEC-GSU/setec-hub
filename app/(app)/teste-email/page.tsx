"use client"

export default function TesteEmailPage() {

async function testarEmail() {

await fetch("/api/enviar-email",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email:"setecguarulhossul@gmail.com"
})

})

alert("Email enviado!")

}

return (

<div style={{padding:40}}>

<h1>Teste envio email</h1>

<button onClick={testarEmail}>
Enviar email teste
</button>

</div>

)

}