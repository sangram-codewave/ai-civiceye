import { divIcon } from 'leaflet'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Link } from 'react-router-dom'
import { BENGALURU, categoryLabel, severityLabel, statusLabel } from '@shared/constants'
import type { ComplaintListItem, Severity } from '@shared/types'

const colors: Record<Severity, string> = {
  low: '#059669',
  medium: '#d97706',
  high: '#ea580c',
  critical: '#dc2626',
}

function markerIcon(severity: Severity) {
  return divIcon({
    className: 'civiceye-marker',
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${colors[severity]};border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}

type MapComplaint = Pick<
  ComplaintListItem,
  'id' | 'reference_number' | 'title' | 'category' | 'severity' | 'status' | 'latitude' | 'longitude' | 'address'
>

export function ComplaintMap({
  complaints,
  linkBase,
  height = '420px',
}: {
  complaints: MapComplaint[]
  linkBase: string
  height?: string
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const center = complaints.length === 1
    ? ([complaints[0]!.latitude, complaints[0]!.longitude] as [number, number])
    : ([BENGALURU.latitude, BENGALURU.longitude] as [number, number])

  if (!ready) return <div style={{ height }} className="rounded-2xl bg-slate-100" />

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer key={complaints.map((complaint) => complaint.id).join('|')} center={center} zoom={complaints.length === 1 ? 15 : 12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading>
          {complaints.map((complaint) => (
            <Marker key={complaint.id} position={[complaint.latitude, complaint.longitude]} icon={markerIcon(complaint.severity)}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{complaint.reference_number}</p>
                  <p>{complaint.title}</p>
                  <p>
                    {categoryLabel(complaint.category)} · {severityLabel(complaint.severity)} · {statusLabel(complaint.status)}
                  </p>
                  {complaint.address ? <p>{complaint.address}</p> : null}
                  <Link className="font-semibold text-blue-700" to={`${linkBase}/${complaint.id}`}>
                    Open complaint
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}
