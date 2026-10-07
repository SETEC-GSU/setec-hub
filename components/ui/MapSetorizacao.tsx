"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  getCoordenadas,
  getTecnicos,
  getTecnicoVisual,
  SEM_TECNICO,
  textoSeguro,
  type EscolaMapa
} from "@/lib/fieldsMap"

type MapSetorizacaoProps = {
  escolas: EscolaMapa[]
  selected?: EscolaMapa | null
  onSelect?: (escola: EscolaMapa) => void
  fitBoundsKey?: number
  filtroTecnico?: string
  onFilterTecnico?: (id: string) => void
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function createMarkerIcon(
  tecnico: string | null | undefined,
  selected: boolean
) {
  const visual = getTecnicoVisual(tecnico)
  const size = selected ? 42 : 34
  return L.divIcon({
    className: "fields-marker-icon",
    html: `<div class="fields-marker-dot${selected ? " is-selected" : ""}" style="width:${size}px;height:${size}px;background-color:${visual.cor}"><span>${escapeHtml(visual.iniciais)}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 5]
  })
}

function MapCamera({
  coordenadasKey,
  fitBoundsKey
}: {
  coordenadasKey: string
  fitBoundsKey: number
}) {
  const map = useMap()
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    let frame = 0
    const resize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true })
        const next = map.getSize()
        setSize((previous) =>
          previous.width === next.x && previous.height === next.y
            ? previous
            : { width: next.x, height: next.y }
        )
      })
    }
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    observer?.observe(map.getContainer())
    window.addEventListener("resize", resize)
    resize()
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(frame)
    }
  }, [map])

  useEffect(() => {
    if (!coordenadasKey || !size.width || !size.height) return
    const pontos = coordenadasKey.split(";").map((item) => {
      const [latitude, longitude] = item.split(",").map(Number)
      return L.latLng(latitude, longitude)
    })
    const frame = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false })
      map.fitBounds(L.latLngBounds(pontos), {
        paddingTopLeft: [48, 48],
        paddingBottomRight: [map.getSize().x >= 900 ? 300 : 48, 60],
        maxZoom: pontos.length === 1 ? 15 : 13,
        animate: false
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [map, coordenadasKey, fitBoundsKey, size.width, size.height])

  return null
}

function EscolaMarker({
  escola,
  coordenadas,
  icon,
  selected,
  onSelect
}: {
  escola: EscolaMapa
  coordenadas: [number, number]
  icon: L.DivIcon
  selected: boolean
  onSelect: (escola: EscolaMapa) => void
}) {
  const map = useMap()
  const marker = useRef<L.Marker | null>(null)
  const visual = getTecnicoVisual(escola.tecnico_atribuido)

  useEffect(() => {
    if (!selected) return
    const frame = requestAnimationFrame(() => {
      map.panTo(coordenadas, { animate: false })
      marker.current?.openPopup()
    })
    return () => cancelAnimationFrame(frame)
  }, [map, selected, coordenadas])

  return (
    <Marker
      ref={marker}
      position={coordenadas}
      icon={icon}
      title={`${textoSeguro(escola.nome_escola, "Unidade escolar")} — ${visual.nome}`}
      alt={textoSeguro(escola.nome_escola, "Unidade escolar")}
      eventHandlers={{ click: () => onSelect(escola) }}
    >
      <Popup minWidth={190} maxWidth={280} closeButton>
        <div className="fields-school-popup">
          <p className="fields-popup-label">Unidade escolar</p>
          <h3>{textoSeguro(escola.nome_escola, "Unidade escolar")}</h3>
          <p className="fields-popup-cie">
            CIE: {textoSeguro(escola.cie, "S/N")}
          </p>
          <div className="fields-popup-technician">
            <span
              className="fields-tech-avatar"
              style={{ backgroundColor: visual.cor }}
            >
              {visual.iniciais}
            </span>
            <div>
              <p className="fields-popup-label">Técnico responsável</p>
              <p className="fields-popup-name">{visual.nome}</p>
            </div>
          </div>
          <a
            className="fields-popup-directions"
            href={`https://www.google.com/maps/dir/?api=1&destination=${coordenadas[0]},${coordenadas[1]}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir rota ↗
          </a>
        </div>
      </Popup>
    </Marker>
  )
}

export default function MapSetorizacao({
  escolas,
  selected,
  onSelect,
  fitBoundsKey = 0,
  filtroTecnico = "",
  onFilterTecnico
}: MapSetorizacaoProps) {
  const [legendaAberta, setLegendaAberta] = useState(false)
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null)
  const legendaId = useId()

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const update = () => setLegendaAberta(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const escolasNoMapa = useMemo(
    () =>
      escolas.flatMap((escola) => {
        const coordenadas = getCoordenadas(escola)
        return coordenadas ? [{ escola, coordenadas }] : []
      }),
    [escolas]
  )
  const tecnicos = useMemo(
    () => getTecnicos(escolasNoMapa.map(({ escola }) => escola)),
    [escolasNoMapa]
  )
  const coordenadasKey = useMemo(
    () =>
      escolasNoMapa.map(({ coordenadas }) => coordenadas.join(",")).join(";"),
    [escolasNoMapa]
  )
  const selectedId = selected === undefined ? selectedLocal : selected?.id
  const icons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>()
    for (const tecnico of tecnicos) {
      cache.set(tecnico.id, createMarkerIcon(tecnico.nome, false))
      cache.set(`${tecnico.id}:selected`, createMarkerIcon(tecnico.nome, true))
    }
    return cache
  }, [tecnicos])
  const totalTecnicos = tecnicos.filter(
    (tecnico) => tecnico.id !== SEM_TECNICO
  ).length

  return (
    <div className="fields-map relative h-full w-full overflow-hidden">
      <MapContainer
        center={[-23.45, -46.53]}
        zoom={12}
        scrollWheelZoom={false}
        preferCanvas
        style={{ height: "100%", width: "100%", background: "#0f172a" }}
      >
        <MapCamera
          coordenadasKey={coordenadasKey}
          fitBoundsKey={fitBoundsKey}
        />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={2}
        />
        {escolasNoMapa.map(({ escola, coordenadas }) => {
          const visual = getTecnicoVisual(escola.tecnico_atribuido)
          const isSelected = String(selectedId) === String(escola.id)
          return (
            <EscolaMarker
              key={escola.id}
              escola={escola}
              coordenadas={coordenadas}
              selected={isSelected}
              icon={icons.get(`${visual.id}${isSelected ? ":selected" : ""}`)!}
              onSelect={(item) => {
                setSelectedLocal(item.id)
                onSelect?.(item)
              }}
            />
          )
        })}
      </MapContainer>

      {tecnicos.length > 0 && (
        <div className="fields-legend-wrapper">
          <button
            type="button"
            className="fields-legend-toggle"
            aria-expanded={legendaAberta}
            aria-controls={legendaId}
            onClick={() => setLegendaAberta((anterior) => !anterior)}
          >
            <span className="fields-legend-indicator" aria-hidden="true" />
            Técnicos no mapa{" "}
            <span className="fields-legend-total">{totalTecnicos}</span>
            <span aria-hidden="true">{legendaAberta ? "⌃" : "⌄"}</span>
          </button>
          {legendaAberta && (
            <div
              id={legendaId}
              className="fields-legend-panel"
              aria-label="Legenda de técnicos"
            >
              <p className="fields-legend-description">
                {onFilterTecnico
                  ? "Toque no técnico para filtrar."
                  : "Cores e iniciais por responsável."}
              </p>
              <ul className="fields-legend-list">
                {tecnicos.map((tecnico) => (
                  <li key={tecnico.id}>
                    <button
                      type="button"
                      className="fields-legend-item"
                      aria-pressed={filtroTecnico === tecnico.id}
                      disabled={!onFilterTecnico}
                      onClick={() =>
                        onFilterTecnico?.(
                          filtroTecnico === tecnico.id ? "" : tecnico.id
                        )
                      }
                    >
                      <span
                        className="fields-tech-avatar"
                        style={{ backgroundColor: tecnico.cor }}
                      >
                        {tecnico.iniciais}
                      </span>
                      <span className="fields-legend-name">{tecnico.nome}</span>
                      <span
                        className="fields-legend-count"
                        aria-label={`${tecnico.quantidade} escolas`}
                      >
                        {tecnico.quantidade}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .fields-map {
          isolation: isolate;
        }
        .fields-map .leaflet-container {
          font-family: inherit;
        }
        .fields-map .leaflet-control-zoom {
          overflow: hidden;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 8px 20px #02061733;
        }
        .fields-map .leaflet-control-zoom a {
          width: 42px;
          height: 42px;
          line-height: 42px;
          color: #e2e8f0;
          background: #0f172a;
          border-color: #334155;
        }
        .fields-map .leaflet-control-zoom a:hover {
          background: #1e293b;
          color: #67e8f9;
        }
        .fields-map .leaflet-control-attribution {
          font-size: 10px;
          color: #cbd5e1;
          background: #020617df;
        }
        .fields-map .leaflet-control-attribution a {
          color: #67e8f9;
        }
        .fields-map .fields-marker-icon {
          background: transparent;
          border: 0;
        }
        .fields-map .fields-marker-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
          border-radius: 50%;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          text-shadow: 0 1px 2px #0009;
          box-shadow: 0 4px 12px #02061766;
        }
        .fields-map .fields-marker-dot.is-selected {
          border-color: #67e8f9;
          box-shadow:
            0 0 0 4px #22d3ee44,
            0 4px 12px #02061766;
        }
        .fields-map .fields-marker-icon:hover .fields-marker-dot {
          filter: brightness(1.12);
        }
        .fields-map .leaflet-marker-icon:focus-visible {
          outline: 3px solid #22d3ee;
          outline-offset: 5px;
          border-radius: 50%;
        }
        .fields-map .leaflet-popup-content-wrapper {
          border: 1px solid #334155;
          border-radius: 18px;
          background: #020617;
          color: #f8fafc;
          box-shadow: 0 20px 40px #02061755;
        }
        .fields-map .leaflet-popup-content {
          margin: 18px;
          font-family: inherit;
        }
        .fields-map .leaflet-popup-tip {
          background: #020617;
        }
        .fields-map a.leaflet-popup-close-button {
          color: #94a3b8;
          font-size: 22px;
          width: 30px;
          height: 30px;
        }
        .fields-map .fields-school-popup h3 {
          margin: 7px 12px 8px 0;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        .fields-map .fields-popup-label {
          margin: 0;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
        }
        .fields-map .fields-popup-cie {
          margin: 0;
          color: #67e8f9;
          font-size: 12px;
        }
        .fields-map .fields-popup-technician {
          display: flex;
          gap: 10px;
          align-items: center;
          margin: 16px 0 10px;
          padding-top: 12px;
          border-top: 1px solid #1e293b;
        }
        .fields-map .fields-popup-name {
          margin: 3px 0 0;
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }
        .fields-map .fields-tech-avatar {
          display: inline-flex;
          flex: none;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          border: 1px solid #ffffff66;
          border-radius: 50%;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
        }
        .fields-map a.fields-popup-directions {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 44px;
          margin-top: 12px;
          border: 1px solid #22d3ee44;
          border-radius: 10px;
          color: #67e8f9;
          background: #06b6d415;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }
        .fields-map .fields-legend-wrapper {
          position: absolute;
          z-index: 800;
          top: 12px;
          right: 12px;
          width: 260px;
          max-width: calc(100% - 84px);
        }
        .fields-map .fields-legend-toggle {
          display: flex;
          width: 100%;
          min-height: 44px;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border: 1px solid #334155;
          border-radius: 12px;
          color: #e2e8f0;
          background: #020617ed;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 8px 24px #02061733;
        }
        .fields-map .fields-legend-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22d3ee;
        }
        .fields-map .fields-legend-total {
          margin-left: auto;
          border-radius: 6px;
          background: #06b6d422;
          color: #67e8f9;
          padding: 2px 6px;
        }
        .fields-map .fields-legend-panel {
          margin-top: 8px;
          padding: 12px;
          border: 1px solid #334155;
          border-radius: 14px;
          background: #020617ed;
          box-shadow: 0 8px 24px #02061733;
        }
        .fields-map .fields-legend-description {
          margin: 0 0 8px;
          font-size: 11px;
          color: #94a3b8;
        }
        .fields-map .fields-legend-list {
          max-height: min(240px, 36vh);
          overflow-y: auto;
          overscroll-behavior: contain;
          margin: 0;
          padding: 0;
          list-style: none;
          scrollbar-width: thin;
          scrollbar-color: #475569 transparent;
        }
        .fields-map .fields-legend-item {
          display: flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          gap: 9px;
          padding: 8px 4px;
          border: 0;
          border-radius: 8px;
          text-align: left;
          color: #cbd5e1;
          background: transparent;
        }
        .fields-map .fields-legend-item:hover:not(:disabled),
        .fields-map .fields-legend-item[aria-pressed="true"] {
          background: #06b6d41a;
          color: #67e8f9;
        }
        .fields-map .fields-legend-item:disabled {
          cursor: default;
        }
        .fields-map .fields-legend-name {
          flex: 1;
          min-width: 0;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }
        .fields-map .fields-legend-count {
          flex: none;
          font-size: 11px;
          font-weight: 800;
          color: #94a3b8;
        }
        .fields-map button:focus-visible,
        .fields-map a:focus-visible {
          outline: 2px solid #22d3ee;
          outline-offset: 2px;
        }
        @media (max-width: 767px) {
          .fields-map .fields-legend-wrapper {
            width: 220px;
          }
          .fields-map .fields-legend-list {
            max-height: min(190px, 28vh);
          }
          .fields-map .leaflet-popup-content-wrapper {
            max-width: calc(100vw - 72px);
          }
          .fields-map .leaflet-popup-content {
            margin: 16px;
            max-width: calc(100vw - 108px);
          }
        }
      `}</style>
    </div>
  )
}
