"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Mapeamento das cores (mantemos para quem não tem daltonismo, como um reforço visual)
const techColors: Record<string, string> = {
  "Matheus Paiva Guedes": "blue",
  "Ricardo Ramos Julio": "green",
  "Felype Aquino dos Santos": "violet",
  "Ricardo Lee Recabarren Medina": "gold",
  "Allan Vieira Napoleão": "red",
  "Willian Andrade Braga": "orange",
  "Onezimo dos Santos Neto": "yellow",
  "Ederson de Assis": "black",
  "Gabriel de Amorim Sparano": "grey"
}

const hexColors: Record<string, string> = {
  blue: "#2b82cb",
  green: "#2aad27",
  violet: "#9c2bc5",
  gold: "#cb8427",
  red: "#cb2b3e",
  orange: "#f29b27",
  yellow: "#cac428",
  black: "#3d3d3d",
  grey: "#7b7b7b"
}

// 🚀 Função inteligente para extrair as iniciais (ex: "Matheus Paiva" -> "MP")
const getInitials = (name: string) => {
  if (!name || name === "Sem Técnico") return "⚠️";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function MapSetorizacao({ escolas, selected, onSelect }: any) {
  
  // ⭐ MÁGICA DE ACESSIBILIDADE: Gerando o marcador com HTML puro e Iniciais
  const getMarkerIcon = (tecnico: string) => {
    const colorKey = techColors[tecnico] || "grey";
    const bgColor = hexColors[colorKey] || "#7b7b7b";
    const initials = getInitials(tecnico);
    
    // Usamos L.divIcon para injetar CSS direto no mapa
    return L.divIcon({
      className: "custom-initials-icon",
      html: `
        <div style="
          background-color: ${bgColor}; 
          color: white; 
          width: 42px; 
          height: 42px; 
          border-radius: 50%; 
          border: 2px solid white; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 900; 
          font-size: 11px; 
          box-shadow: 0 3px 6px rgba(0,0,0,0.5);
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        ">
          ${initials}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14], // Centraliza exatamente no meio da bolinha
      popupAnchor: [0, -16],
    })
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[-23.45, -46.53]} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%", borderRadius: '1.5rem' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {escolas
          .filter((e: any) => e.latitude && e.longitude)
          .map((e: any) => (
            <Marker
              key={e.id}
              position={[e.latitude, e.longitude]}
              icon={getMarkerIcon(e.tecnico_atribuido)}
              eventHandlers={{ click: () => {
                  if (onSelect) onSelect(e)
              } }}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <p className="font-bold text-slate-800 text-sm mb-1">{e.nome_escola}</p>
                  <p className="text-[10px] text-slate-500 font-mono mb-2 border-b pb-2">CIE: {e.cie || "S/N"}</p>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Técnico Responsável</span>
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-2">
                       <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px]">{getInitials(e.tecnico_atribuido)}</span>
                      {e.tecnico_atribuido || "⚠️ Sem Atribuição"}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* 🚀 LEGENDA ACESSÍVEL FLUTUANTE NO CANTO DO MAPA */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-[#020617]/95 backdrop-blur-md border border-slate-800 p-5 rounded-2xl shadow-2xl max-w-[260px]">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Legenda Acessível</h4>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(techColors).map(([name, colorName]) => {
             const initials = getInitials(name);
             return (
              <div key={name} className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-slate-700 flex items-center justify-center text-white text-[8px] font-black" 
                  style={{ backgroundColor: hexColors[colorName] }}
                  title={name}
                >
                  {initials}
                </div>
                <span className="text-[11px] text-slate-300 font-bold truncate" title={name}>{name}</span>
              </div>
            )
          })}
          <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-800">
            <div className="w-5 h-5 rounded-full shrink-0 shadow-sm bg-[#7b7b7b] border border-slate-700 flex items-center justify-center text-white text-[10px] font-black">
              ⚠️
            </div>
            <span className="text-[11px] text-slate-500 font-bold italic">Unidade Descoberta</span>
          </div>
        </div>
      </div>
    </div>
  )
}