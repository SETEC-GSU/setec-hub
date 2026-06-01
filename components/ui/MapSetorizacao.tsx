"use client"

import { useMemo, useState } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type EscolaMapa = {
  id: string
  nome_escola?: string | null
  cie?: string | number | null
  latitude?: string | number | null
  longitude?: string | number | null
  tecnico_atribuido?: string | null
}

type MapSetorizacaoProps = {
  escolas: EscolaMapa[]
  selected?: EscolaMapa | null
  onSelect?: (escola: EscolaMapa) => void
}

const techColors: Record<string, string> = {
  "Matheus Paiva Guedes": "blue",
  "Ricardo Ramos Julio": "green",
  "Felype Aquino dos Santos": "violet",
  "Ricardo Lee Recabarren Medina": "gold",
  "Allan Vieira Napoleão": "red",
  "Willian Andrade Braga": "orange",
  "Onezimo dos Santos Neto": "yellow",
  "Ederson de Assis": "black",
  "Gabriel de Amorim Sparano": "grey",
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
  grey: "#7b7b7b",
}

function textoSeguro(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function getInitials(name?: string | null) {
  const clean = textoSeguro(name)

  if (!clean || clean === "Sem Técnico") return "⚠️"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}

function getTecnicoNome(value?: string | null) {
  return textoSeguro(value, "Sem Técnico")
}

function getTecnicoColor(tecnico?: string | null) {
  const nome = getTecnicoNome(tecnico)
  const colorKey = techColors[nome] || "grey"

  return {
    colorKey,
    bgColor: hexColors[colorKey] || hexColors.grey,
  }
}

function getCoordenadas(escola: EscolaMapa): [number, number] | null {
  const latitude = Number(escola.latitude)
  const longitude = Number(escola.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude === 0 && longitude === 0) return null

  return [latitude, longitude]
}

function MapResizeFix() {
  const map = useMap()

  useMemo(() => {
    window.setTimeout(() => {
      map.invalidateSize()
    }, 250)
  }, [map])

  return null
}

export default function MapSetorizacao({
  escolas,
  selected,
  onSelect,
}: MapSetorizacaoProps) {
  const [legendaAberta, setLegendaAberta] = useState(true)

  const escolasComCoordenadas = useMemo(() => {
    return escolas
      .map((escola) => ({
        escola,
        coordenadas: getCoordenadas(escola),
      }))
      .filter(
        (
          item
        ): item is {
          escola: EscolaMapa
          coordenadas: [number, number]
        } => Boolean(item.coordenadas)
      )
  }, [escolas])

  const iconCache = useMemo(() => {
    const cache = new Map<string, L.DivIcon>()

    function getMarkerIcon(tecnico?: string | null, ativo = false) {
      const nomeTecnico = getTecnicoNome(tecnico)
      const cacheKey = `${nomeTecnico}-${ativo ? "ativo" : "normal"}`

      const cached = cache.get(cacheKey)
      if (cached) return cached

      const { bgColor } = getTecnicoColor(nomeTecnico)
      const initials = escapeHtml(getInitials(nomeTecnico))
      const size = ativo ? 48 : 42
      const borderColor = ativo ? "#67e8f9" : "#ffffff"
      const shadow = ativo
        ? "0 0 0 5px rgba(103,232,249,0.20), 0 14px 32px rgba(2,6,23,0.42)"
        : "0 10px 24px rgba(2,6,23,0.32)"

      const icon = L.divIcon({
        className: "custom-initials-icon",
        html: `
          <div class="custom-initials-marker" style="
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle at 32% 26%, rgba(255,255,255,0.30), transparent 28%), ${bgColor};
            border: 2px solid ${borderColor};
            box-shadow: ${shadow};
          ">
            <span>${initials}</span>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2) - 4],
      })

      cache.set(cacheKey, icon)
      return icon
    }

    return {
      getMarkerIcon,
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.5rem]">
      <MapContainer
        center={[-23.45, -46.53]}
        zoom={12}
        scrollWheelZoom={false}
        attributionControl={false}
        preferCanvas
        className="h-full w-full rounded-[1.5rem]"
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "1.5rem",
          background: "#020617",
        }}
      >
        <MapResizeFix />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={3}
        />

        {escolasComCoordenadas.map(({ escola, coordenadas }) => {
          const tecnico = getTecnicoNome(escola.tecnico_atribuido)
          const selectedId = selected?.id ? String(selected.id) : ""
          const ativo = selectedId === String(escola.id)

          return (
            <Marker
              key={escola.id}
              position={coordenadas}
              icon={iconCache.getMarkerIcon(tecnico, ativo)}
              eventHandlers={{
                click: () => {
                  if (onSelect) onSelect(escola)
                },
              }}
            >
              <Popup closeButton>
                <div className="min-w-[240px] max-w-[300px] rounded-2xl bg-[#020617] text-white">
                  <div className="mb-3 border-b border-slate-800 pb-3">
                    <p className="text-sm font-black uppercase leading-snug tracking-wide text-white">
                      {textoSeguro(escola.nome_escola, "Unidade escolar")}
                    </p>

                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      CIE:{" "}
                      <span className="font-black text-cyan-300">
                        {textoSeguro(escola.cie, "S/N")}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Técnico responsável
                    </span>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/40 text-[10px] font-black text-white shadow-lg"
                        style={{
                          backgroundColor: getTecnicoColor(tecnico).bgColor,
                        }}
                      >
                        {getInitials(tecnico)}
                      </span>

                      <span className="text-xs font-black leading-snug text-cyan-200">
                        {tecnico === "Sem Técnico"
                          ? "⚠️ Sem atribuição"
                          : tecnico}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      <button
        type="button"
        onClick={() => setLegendaAberta((prev) => !prev)}
        className="absolute bottom-4 right-4 z-[1001] inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-[#020617]/95 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 shadow-2xl shadow-slate-950/40 backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-slate-950 md:hidden"
      >
        {legendaAberta ? "Ocultar legenda" : "Ver legenda"}
      </button>

      <div
        className={`absolute z-[1000] rounded-2xl border border-slate-800 bg-[#020617]/95 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-md transition-all duration-300
        ${
          legendaAberta
            ? "bottom-20 right-4 max-h-[38vh] w-[min(280px,calc(100vw-2rem))] translate-y-0 opacity-100 md:bottom-6 md:right-6 md:max-h-[340px] md:w-[280px]"
            : "pointer-events-none bottom-20 right-4 max-h-0 w-[min(280px,calc(100vw-2rem))] translate-y-4 overflow-hidden opacity-0 md:pointer-events-auto md:bottom-6 md:right-6 md:max-h-[340px] md:w-[280px] md:translate-y-0 md:opacity-100"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              Legenda acessível
            </h4>
            <p className="mt-1 text-[10px] font-medium text-slate-500">
              Técnicos por iniciais
            </p>
          </div>

          <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-300">
            {Object.keys(techColors).length}
          </span>
        </div>

        <div className="custom-map-scrollbar max-h-[260px] space-y-2 overflow-y-auto pr-2 md:max-h-[270px]">
          {Object.entries(techColors).map(([name, colorName]) => {
            const initials = getInitials(name)

            return (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-slate-900 bg-slate-950/60 px-3 py-2"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/30 text-[9px] font-black text-white shadow-sm"
                  style={{ backgroundColor: hexColors[colorName] }}
                  title={name}
                >
                  {initials}
                </div>

                <span
                  className="truncate text-[11px] font-bold text-slate-300"
                  title={name}
                >
                  {name}
                </span>
              </div>
            )
          })}

          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-yellow-200/40 bg-[#7b7b7b] text-[11px] font-black text-white shadow-sm">
              ⚠️
            </div>

            <span className="text-[11px] font-bold text-yellow-200">
              Unidade sem atribuição
            </span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-initials-icon {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .custom-initials-icon::before,
        .custom-initials-icon::after {
          display: none !important;
          content: none !important;
        }

        .custom-initials-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          color: #ffffff;
          font-weight: 950;
          font-size: 11px;
          line-height: 1;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
          transition:
            transform 0.18s ease,
            filter 0.18s ease,
            box-shadow 0.18s ease;
          will-change: transform;
        }

        .custom-initials-marker span {
          transform: translateY(0.5px);
        }

        .custom-initials-icon:hover .custom-initials-marker {
          transform: scale(1.08);
          filter: brightness(1.08);
        }

        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-marker-icon {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }

        .leaflet-popup-content-wrapper {
          overflow: hidden !important;
          border: 1px solid rgba(51, 65, 85, 0.95) !important;
          border-radius: 1.25rem !important;
          background: #020617 !important;
          color: #f8fafc !important;
          box-shadow: 0 22px 60px rgba(2, 6, 23, 0.52) !important;
        }

        .leaflet-popup-content {
          margin: 0 !important;
          color: #f8fafc !important;
          font-family: inherit !important;
        }

        .leaflet-popup-tip {
          background: #020617 !important;
          border: 1px solid rgba(51, 65, 85, 0.95) !important;
        }

        .leaflet-popup-close-button {
          top: 10px !important;
          right: 10px !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 9999px !important;
          color: #94a3b8 !important;
          font-size: 18px !important;
          font-weight: 900 !important;
          transition: all 0.2s ease !important;
        }

        .leaflet-popup-close-button:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          color: #fecaca !important;
        }

        .custom-map-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #475569 rgba(15, 23, 42, 0.5);
        }

        .custom-map-scrollbar::-webkit-scrollbar {
          width: 7px;
        }

        .custom-map-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 999px;
        }

        .custom-map-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .custom-map-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }

        @media (max-width: 768px) {
          .leaflet-popup-content-wrapper {
            max-width: calc(100vw - 40px) !important;
          }

          .leaflet-popup-content {
            max-width: calc(100vw - 40px) !important;
          }

          .custom-initials-marker {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  )
}