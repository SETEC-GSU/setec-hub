"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export default function MapEscolas({ escolas, selected, onSelect }: any) {
  return (
    <MapContainer center={[-23.45, -46.53]} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {escolas
        .filter((e: any) => e.latitude && e.longitude)
        .map((e: any) => (
          <Marker
            key={e.id}
            position={[e.latitude, e.longitude]}
            icon={markerIcon}
            eventHandlers={{ click: () => onSelect(e) }}
          >
            <Popup>
              <p className="font-semibold">{e.nome_escola}</p>
              <p className="text-xs">{e.endereco}</p>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}