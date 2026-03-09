require("dotenv").config({ path: ".env.local" })
const fetch = require("node-fetch")
const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function geocodeEndereco(endereco) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    endereco + ", Guarulhos, SP, Brasil"
  )}`

  const res = await fetch(url, {
    headers: { "User-Agent": "SETEC-HUB" },
  })

  const data = await res.json()

  if (!data[0]) return null

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  }
}

async function run() {
  const { data: escolas } = await supabase
    .from("escolas")
    .select("id, endereco, lat, lng")

  for (const e of escolas) {
    if (e.lat && e.lng) continue
    if (!e.endereco) continue

    try {
      const geo = await geocodeEndereco(e.endereco)

      if (!geo) {
        console.log("⚠ NÃO ENCONTROU:", e.id)
        continue
      }

      await supabase
        .from("escolas")
        .update({
          lat: geo.lat,
          lng: geo.lng,
        })
        .eq("id", e.id)

      console.log("✔", e.id, geo.lat, geo.lng)

      await new Promise(r => setTimeout(r, 1200)) // rate limit
    } catch (err) {
      console.log("Erro:", e.id)
    }
  }

  console.log("FINALIZADO 🚀")
}

run()