'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CrimeIncident, StopSearchRecord } from '@/lib/api'
import { getCrimeIncidents, getStopSearch } from '@/lib/api'

// Fix Leaflet default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

const CATEGORY_COLOURS: Record<string, string> = {
  'anti-social-behaviour': '#6366f1',
  'burglary': '#8b5cf6',
  'criminal-damage-arson': '#f59e0b',
  'drugs': '#10b981',
  'other-theft': '#3b82f6',
  'possession-of-weapons': '#f97316',
  'public-order': '#06b6d4',
  'robbery': '#8b5cf6',
  'shoplifting': '#3b82f6',
  'theft-from-the-person': '#6366f1',
  'vehicle-crime': '#14b8a6',
  'violence-and-sexual-offences': '#ec4899',
}

function categoryColour(cat: string): string {
  return CATEGORY_COLOURS[cat] ?? '#6b7280'
}

function formatCategory(cat: string): string {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 14) }, [lat, lng, map])
  return null
}

interface Props {
  postcode: string
  lat: number
  lng: number
}

export default function ReportMap({ postcode, lat, lng }: Props) {
  const [incidents, setIncidents] = useState<CrimeIncident[]>([])
  const [stopSearches, setStopSearches] = useState<StopSearchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLayer, setActiveLayer] = useState<'crime' | 'stop-search' | 'both'>('both')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getCrimeIncidents(postcode, 3),
      getStopSearch(postcode, 3),
    ]).then(([crimeData, ssData]) => {
      setIncidents(crimeData?.incidents ?? [])
      setStopSearches(ssData?.records.filter(r => r.latitude && r.longitude) ?? [])
      setLoading(false)
    })
  }, [postcode])

  const showCrime = activeLayer === 'crime' || activeLayer === 'both'
  const showSS = activeLayer === 'stop-search' || activeLayer === 'both'

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-700">
          Map — last 3 months
          {loading && <span className="ml-2 text-slate-400 text-xs">Loading…</span>}
          {!loading && (
            <span className="ml-2 text-slate-400 text-xs">
              {incidents.length} incidents · {stopSearches.length} stops
            </span>
          )}
        </span>
        <div className="flex gap-1 text-xs">
          {(['both', 'crime', 'stop-search'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={`px-2 py-1 rounded ${activeLayer === layer ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              {layer === 'both' ? 'All' : layer === 'crime' ? 'Crime' : 'Stop & Search'}
            </button>
          ))}
        </div>
      </div>

      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '460px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <RecenterMap lat={lat} lng={lng} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Postcode centre pin */}
        <Marker position={[lat, lng]}>
          <Popup><strong>{postcode}</strong></Popup>
        </Marker>

        {/* Crime incidents */}
        {showCrime && incidents.map((inc, i) => (
          <CircleMarker
            key={`crime-${i}`}
            center={[inc.latitude, inc.longitude]}
            radius={5}
            pathOptions={{
              color: categoryColour(inc.category),
              fillColor: categoryColour(inc.category),
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{formatCategory(inc.category)}</p>
                <p className="text-slate-500">{inc.street}</p>
                <p className="text-slate-400">{inc.month}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Stop & search */}
        {showSS && stopSearches.map((ss, i) => (
          ss.latitude && ss.longitude ? (
            <CircleMarker
              key={`ss-${i}`}
              center={[ss.latitude, ss.longitude]}
              radius={5}
              pathOptions={{
                color: '#1d4ed8',
                fillColor: '#93c5fd',
                fillOpacity: 0.8,
                weight: 1,
                dashArray: '3',
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">Stop &amp; Search</p>
                  {ss.object_of_search && <p>Object: {ss.object_of_search}</p>}
                  {ss.outcome && <p>Outcome: {ss.outcome}</p>}
                  <p className="text-slate-400">{ss.date.slice(0, 10)}</p>
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-slate-400" /> Crime incident
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-700 bg-blue-200" /> Stop &amp; search
        </span>
        <span className="ml-auto text-slate-400">
          Locations approximate · Source: police.uk · © OpenStreetMap contributors
        </span>
      </div>
    </div>
  )
}
