"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from "react-leaflet"
import { Focus, MapPin } from "lucide-react"
import { agruparEscolas, type GrupoMapa, type VistaMapa } from "@/lib/escolas/mapa"
import { prepararEscola, rotaEscola, STATUS_ESCOLA, texto, type Escola, type EscolaPainel } from "@/lib/escolas/modelo"
import styles from "./MapEscolas.module.css"

type Props = { escolas: EscolaPainel[]; selecionada?: string | null; selecionar?: (escola: EscolaPainel) => void; vistaInicial?: VistaMapa; guardarVista?: (vista: VistaMapa) => void }
const icones = new Map<string, L.DivIcon>()
const svgEscola = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-7h6v7M7 11h.01M17 11h.01M12 7v3"/></svg>'
function icone(grupo: GrupoMapa, selecionada: boolean) {
  const n = grupo.escolas.length, chave = `${grupo.status}:${n}:${selecionada}`
  let salvo = icones.get(chave)
  if (!salvo) {
    const corpo = n > 1 ? `<span class="${styles.grupo}" style="--marcador:${STATUS_ESCOLA[grupo.status].cor}">${n}</span>` : `<span class="${styles.pin} ${selecionada ? styles.selecionado : ""}" style="--marcador:${STATUS_ESCOLA[grupo.status].cor}">${svgEscola}</span>`
    salvo = L.divIcon({ className: styles.marcador, html: corpo, iconSize: [40, 40], iconAnchor: [20, 35], popupAnchor: [0, -28], tooltipAnchor: [0, -25] })
    icones.set(chave, salvo)
  }
  return salvo
}
function ajustar(map: L.Map, escolas: EscolaPainel[]) {
  const pontos = escolas.flatMap(e => e.ponto ? [e.ponto] : [])
  if (!pontos.length) return
  map.invalidateSize({ pan: false })
  if (pontos.length === 1) map.setView(pontos[0], 15, { animate: false })
  else map.fitBounds(L.latLngBounds(pontos), { padding: [44, 44], maxZoom: 15, animate: false })
}
function Conteudo({ escolas, selecionada, selecionar, vistaInicial, guardarVista }: Props) {
  const map = useMap(), [zoom, setZoom] = useState(map.getZoom()), [falhaMapa, setFalhaMapa] = useState(false)
  const assinatura = useMemo(() => escolas.map(e => `${e.id}:${e.ponto?.join(",")}`).sort().join("|"), [escolas])
  const anterior = useRef<string | null>(null)
  useMapEvents({ zoomend() { setZoom(map.getZoom()) }, moveend() { const p = map.getCenter(); guardarVista?.({ centro: [p.lat, p.lng], zoom: map.getZoom() }) } })
  useEffect(() => {
    if (anterior.current === assinatura) return
    const primeira = anterior.current === null; anterior.current = assinatura
    if (!primeira || !vistaInicial) ajustar(map, escolas)
    // O recorte geográfico, e não o texto/contagem de renderizações, controla o enquadramento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, map])
  useEffect(() => {
    const e = escolas.find(e => e.id === selecionada)
    if (e?.ponto) map.setView(e.ponto, Math.max(map.getZoom(), 15), { animate: false })
  }, [selecionada, escolas, map])
  useEffect(() => {
    const container = map.getContainer()
    const redimensionar = () => map.invalidateSize({ pan: false, debounceMoveend: true })
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", redimensionar); return () => window.removeEventListener("resize", redimensionar) }
    const observer = new ResizeObserver(redimensionar); observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  const grupos = useMemo(() => agruparEscolas(escolas, zoom, selecionada), [escolas, zoom, selecionada])
  return <>
    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} keepBuffer={1} updateWhenIdle attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' eventHandlers={{ tileerror: () => setFalhaMapa(true), tileload: () => setFalhaMapa(false) }}/>
    <ZoomControl position="bottomright" zoomInTitle="Aproximar" zoomOutTitle="Afastar"/>
    <div className={styles.ferramentas} ref={el => { if (el) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el) } }}><button type="button" onClick={() => { ajustar(map, escolas); map.closePopup() }} aria-label="Enquadrar escolas do filtro"><Focus size={17} aria-hidden="true"/>Enquadrar</button></div>
    {falhaMapa && <div role="status" className={styles.aviso}>O mapa de fundo está indisponível. As escolas e as fichas continuam acessíveis.</div>}
    {grupos.map(grupo => {
      const unica = grupo.escolas.length === 1, escola = grupo.escolas[0], ativa = unica && escola.id === selecionada
      return <Marker key={grupo.id} position={grupo.ponto} icon={icone(grupo, ativa)} title={unica ? `${texto(escola.nome_escola)} — ${STATUS_ESCOLA[grupo.status].label}` : `${grupo.escolas.length} escolas próximas. Aproximar ou abrir lista.`} keyboard zIndexOffset={ativa ? 1000 : unica ? 100 : 0} eventHandlers={{ click: () => {
        if (unica) selecionar?.(escola)
        else {
          const pontos = grupo.escolas.map(e => e.ponto!)
          const bounds = L.latLngBounds(pontos)
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) map.setView(grupo.ponto, Math.min(map.getZoom() + 2, 19), { animate: false })
          else map.fitBounds(bounds, { padding: [48, 48], maxZoom: Math.min(map.getZoom() + 3, 19), animate: false })
        }
      } }}>
        <Tooltip direction="top">{unica ? texto(escola.nome_escola) : `${grupo.escolas.length} escolas próximas`}</Tooltip>
        <Popup minWidth={205} maxWidth={280} autoPanPadding={[20, 20]}>
          {unica ? <div className={styles.ficha}><span className={styles.cie}>CIE {texto(escola.cie, "não informado")}</span><strong>{texto(escola.nome_escola)}</strong><span style={{ color: STATUS_ESCOLA[grupo.status].cor }}>{STATUS_ESCOLA[grupo.status].label}</span><span>{texto(escola.tecnico_atribuido, "Técnico não informado")}</span><span>{texto(escola.endereco, "Endereço não informado")}</span><div className={styles.acoes}><Link href={`/escolas/${encodeURIComponent(escola.id)}`}>Abrir ficha →</Link>{rotaEscola(escola) && <a href={rotaEscola(escola)} target="_blank" rel="noopener noreferrer"><MapPin size={13} aria-hidden="true"/>Rota</a>}</div></div> : <div className={styles.ficha}><strong>{grupo.escolas.length} escolas nesta região</strong><span>Aproxime o mapa ou escolha uma ficha:</span><ul className={styles.lista}>{grupo.escolas.map(e => <li key={e.id}><Link href={`/escolas/${encodeURIComponent(e.id)}`}>{texto(e.nome_escola)} →</Link></li>)}</ul></div>}
        </Popup>
      </Marker>
    })}
  </>
}
// O Dashboard Escolar também usa este componente e passa os registros crus.
// Preserva essa interface e os callbacks da versão anterior.
export default function MapEscolas({ escolas, selected, onSelect, ...props }: Omit<Props, "escolas"> & { escolas: Escola[]; selected?: Escola | null; onSelect?: (escola: EscolaPainel) => void }) {
  const preparadas = useMemo(() => escolas.map(e => {
    if ("indicadores" in e && "ponto" in e) return e as EscolaPainel
    const preparada = prepararEscola(e)
    // O Dashboard Escolar possui seu próprio enriquecimento. Sua legenda deve
    // continuar coincidindo com a classificação que essa página já apresenta.
    if ("criticidadeCalculada" in e && typeof e.criticidadeCalculada === "string" && Object.hasOwn(STATUS_ESCOLA, e.criticidadeCalculada)) {
      preparada.indicadores.criticidade = e.criticidadeCalculada as EscolaPainel["indicadores"]["criticidade"]
    }
    return preparada
  }), [escolas])
  return <div className={styles.mapa}><MapContainer center={props.vistaInicial?.centro ?? [-23.45, -46.53]} zoom={props.vistaInicial?.zoom ?? 11} minZoom={3} maxZoom={19} scrollWheelZoom={false} zoomControl={false} zoomAnimation={false} markerZoomAnimation={false} fadeAnimation={false} style={{ height: "100%", width: "100%" }}><Conteudo {...props} escolas={preparadas} selecionada={props.selecionada ?? selected?.id} selecionar={props.selecionar ?? onSelect}/></MapContainer></div>
}
