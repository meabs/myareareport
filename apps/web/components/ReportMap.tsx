'use client'

import { useCallback, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, GeoJSON as LeafletGeoJSON } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CrimeIncident, StopSearchRecord } from '@/lib/api'
import type { FeatureCollection, Feature, GeoJsonObject, Geometry } from 'geojson'

const DefaultIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

const CRIME_COLOURS: Record<string, string> = {
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

function crimeColour(cat: string): string {
  return CRIME_COLOURS[cat] ?? '#6b7280'
}

function formatCategory(cat: string): string {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

type GeoFeatureCollection = FeatureCollection<Geometry, Record<string, string>>

interface PlanningAppPoint {
  reference: string
  name: string
  description: string
  status: string
  lat: number
  lng: number
}

function parseWktPoint(wkt: string): { lat: number; lng: number } | null {
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
  if (!m) return null
  return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) }
}

async function fetchPlanningApplications(lat: number, lng: number): Promise<PlanningAppPoint[]> {
  const url = new URL('https://www.planning.data.gov.uk/entity.json')
  url.searchParams.set('dataset', 'planning-application')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('geometry_relation', 'intersects')
  url.searchParams.set('limit', '100')

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    const points: PlanningAppPoint[] = []

    for (const entity of (data.entities ?? [])) {
      let coords: { lat: number; lng: number } | null = null

      if (entity.point) {
        coords = parseWktPoint(entity.point)
      } else if (entity.geometry) {
        try {
          const geom = typeof entity.geometry === 'string' ? JSON.parse(entity.geometry) : entity.geometry
          if (geom.type === 'Point') {
            coords = { lng: geom.coordinates[0], lat: geom.coordinates[1] }
          }
        } catch { /* skip */ }
      }

      if (!coords) continue
      points.push({
        reference: entity.reference ?? String(entity.entity ?? ''),
        name: entity.name ?? '',
        description: entity.description ?? '',
        status: entity.status ?? '',
        lat: coords.lat,
        lng: coords.lng,
      })
    }

    return points
  } catch {
    return []
  }
}

interface PlanningLayerDef {
  id: string
  label: string
  color: string
  fillOpacity: number
  description: string
}

const PLANNING_LAYER_DEFS: PlanningLayerDef[] = [
  { id: 'conservation-area', label: 'Conservation Areas', color: '#7c3aed', fillOpacity: 0.15, description: 'Areas of special architectural or historic interest' },
  { id: 'listed-building-outline', label: 'Listed Buildings', color: '#d97706', fillOpacity: 0.3, description: 'Nationally important historic buildings' },
  { id: 'article-4-direction-area', label: 'Article 4 Directions', color: '#dc2626', fillOpacity: 0.15, description: 'Areas where permitted development rights are restricted' },
  { id: 'tree-preservation-zone', label: 'Tree Preservation Zones', color: '#16a34a', fillOpacity: 0.3, description: 'Areas with Tree Preservation Orders' },
  { id: 'ancient-woodland', label: 'Ancient Woodland', color: '#065f46', fillOpacity: 0.25, description: 'Land continuously wooded since 1600' },
  { id: 'area-of-outstanding-natural-beauty', label: 'AONB', color: '#15803d', fillOpacity: 0.15, description: 'Areas of Outstanding Natural Beauty' },
  { id: 'national-park', label: 'National Parks', color: '#166534', fillOpacity: 0.15, description: 'Nationally designated National Parks' },
  { id: 'site-of-special-scientific-interest', label: 'SSSIs', color: '#0891b2', fillOpacity: 0.2, description: 'Sites of Special Scientific Interest' },
  { id: 'special-area-of-conservation', label: 'Special Areas of Conservation', color: '#0e7490', fillOpacity: 0.2, description: 'EU Habitats Directive protected areas' },
  { id: 'special-protection-area', label: 'Special Protection Areas', color: '#155e75', fillOpacity: 0.2, description: 'Protected areas for wild birds' },
  { id: 'ramsar', label: 'Ramsar Wetlands', color: '#06b6d4', fillOpacity: 0.2, description: 'Internationally important wetlands' },
  { id: 'flood-risk-zone', label: 'Flood Risk Zones', color: '#2563eb', fillOpacity: 0.15, description: 'Environment Agency flood risk designations' },
  { id: 'green-belt', label: 'Green Belt', color: '#86efac', fillOpacity: 0.2, description: 'Designated Green Belt land' },
  { id: 'heritage-coast', label: 'Heritage Coast', color: '#f59e0b', fillOpacity: 0.2, description: 'England\'s most scenic stretches of undeveloped coastline' },
  { id: 'world-heritage-site-buffer-zone', label: 'World Heritage Sites', color: '#92400e', fillOpacity: 0.2, description: 'UNESCO World Heritage Site buffer zones' },
  { id: 'locally-listed-building', label: 'Locally Listed Buildings', color: '#b45309', fillOpacity: 0.3, description: 'Buildings of local architectural or historic interest' },
]

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 14) }, [lat, lng, map])
  return null
}

async function fetchPlanningLayer(dataset: string, lat: number, lng: number): Promise<GeoFeatureCollection> {
  const url = new URL('https://www.planning.data.gov.uk/entity.json')
  url.searchParams.set('dataset', dataset)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('geometry_relation', 'intersects')
  url.searchParams.set('limit', '100')

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { type: 'FeatureCollection', features: [] }
    const data = await res.json()
    const features: Feature<Geometry, Record<string, string>>[] = []

    for (const entity of (data.entities ?? [])) {
      if (!entity.geometry) continue
      try {
        const geom = typeof entity.geometry === 'string' ? JSON.parse(entity.geometry) : entity.geometry
        const feature: Feature<Geometry, Record<string, string>> = {
          type: 'Feature',
          geometry: geom as Geometry,
          properties: { name: entity.name ?? '', reference: entity.reference ?? '' },
        }
        features.push(feature)
      } catch {
        // skip malformed geometry
      }
    }

    return { type: 'FeatureCollection', features }
  } catch {
    return { type: 'FeatureCollection', features: [] }
  }
}

interface Props {
  postcode: string
  lat: number
  lng: number
  initialIncidents: CrimeIncident[]
  initialStopSearches: StopSearchRecord[]
}

export default function ReportMap({ postcode, lat, lng, initialIncidents, initialStopSearches }: Props) {
  const incidents = initialIncidents
  const stopSearches = initialStopSearches.filter(r => r.latitude && r.longitude)

  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(['crime', 'stop-search']))
  const [planningData, setPlanningData] = useState<Record<string, GeoFeatureCollection>>({})
  const [planningLoading, setPlanningLoading] = useState<Set<string>>(new Set())
  const [planningApps, setPlanningApps] = useState<PlanningAppPoint[] | null>(null)
  const [planningAppsLoading, setPlanningAppsLoading] = useState(false)

  const toggleLayer = useCallback(async (id: string) => {
    const isCurrentlyVisible = visibleLayers.has(id)
    setVisibleLayers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    if (!isCurrentlyVisible) {
      if (id === 'planning-applications') {
        if (planningApps === null) {
          setPlanningAppsLoading(true)
          const apps = await fetchPlanningApplications(lat, lng)
          setPlanningApps(apps)
          setPlanningAppsLoading(false)
        }
        return
      }
      if (!planningData[id] && PLANNING_LAYER_DEFS.some(l => l.id === id)) {
        setPlanningLoading(prev => new Set([...prev, id]))
        const data = await fetchPlanningLayer(id, lat, lng)
        setPlanningData(prev => ({ ...prev, [id]: data }))
        setPlanningLoading(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }
  }, [visibleLayers, planningData, planningApps, lat, lng])

  const activePlanningLayers = PLANNING_LAYER_DEFS.filter(
    l => visibleLayers.has(l.id) && planningData[l.id]?.features.length
  )

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-700">
          Map
          <span className="ml-2 text-slate-400 text-xs">
            {incidents.length} incidents · {stopSearches.length} stops · last 3 months
          </span>
        </span>
        <button
          onClick={() => setShowLayerPanel(p => !p)}
          className={`text-xs px-3 py-1 rounded border flex items-center gap-1.5 transition-colors ${
            showLayerPanel
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Layers ({visibleLayers.size})
        </button>
      </div>

      {/* Layer panel */}
      {showLayerPanel && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 max-h-72 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Police Data</p>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {[
              { id: 'crime', label: 'Crime Incidents', color: '#6366f1' },
              { id: 'stop-search', label: 'Stop & Search', color: '#1d4ed8' },
            ].map(layer => (
              <label key={layer.id} className="flex items-center gap-2 text-xs cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={visibleLayers.has(layer.id)}
                  onChange={() => toggleLayer(layer.id)}
                  className="rounded accent-slate-700"
                />
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                {layer.label}
              </label>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Planning Applications</p>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={visibleLayers.has('planning-applications')}
                onChange={() => toggleLayer('planning-applications')}
                className="rounded accent-slate-700"
              />
              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#f97316' }} />
              Applications
              {planningAppsLoading && <span className="text-slate-400 shrink-0">…</span>}
              {!planningAppsLoading && planningApps !== null && (
                <span className="text-slate-400 shrink-0">{planningApps.length === 0 ? '–' : planningApps.length}</span>
              )}
            </label>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Planning Designations</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {PLANNING_LAYER_DEFS.map(layer => (
              <label key={layer.id} className="flex items-center gap-2 text-xs cursor-pointer select-none py-1" title={layer.description}>
                <input
                  type="checkbox"
                  checked={visibleLayers.has(layer.id)}
                  onChange={() => toggleLayer(layer.id)}
                  className="rounded accent-slate-700"
                />
                <span className="inline-block w-2.5 h-2.5 rounded shrink-0 border" style={{ backgroundColor: layer.color + '60', borderColor: layer.color }} />
                <span className="truncate">{layer.label}</span>
                {planningLoading.has(layer.id) && <span className="text-slate-400 shrink-0">…</span>}
                {!planningLoading.has(layer.id) && planningData[layer.id] && (
                  <span className="text-slate-400 shrink-0">
                    {planningData[layer.id].features.length === 0 ? '–' : planningData[layer.id].features.length}
                  </span>
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Planning layers fetched from planning.data.gov.uk · Coverage varies by local authority
          </p>
        </div>
      )}

      {/* Map */}
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

        {/* Planning designation layers */}
        {PLANNING_LAYER_DEFS.map(layerDef => {
          if (!visibleLayers.has(layerDef.id)) return null
          const fc = planningData[layerDef.id]
          if (!fc || fc.features.length === 0) return null
          return (
            <LeafletGeoJSON
              key={`${layerDef.id}-${fc.features.length}`}
              data={fc as GeoJsonObject}
              style={() => ({
                color: layerDef.color,
                fillColor: layerDef.color,
                fillOpacity: layerDef.fillOpacity,
                weight: 1.5,
                opacity: 0.8,
              })}
              onEachFeature={(feature, featureLayer) => {
                const name = feature.properties?.name
                if (name) {
                  featureLayer.bindPopup(
                    `<strong>${name}</strong><br/><span style="font-size:11px;color:#6b7280">${layerDef.label}</span>`
                  )
                }
              }}
            />
          )
        })}

        {/* Planning applications */}
        {visibleLayers.has('planning-applications') && planningApps?.map((app, i) => (
          <CircleMarker
            key={`pa-${i}`}
            center={[app.lat, app.lng]}
            radius={6}
            pathOptions={{
              color: '#ea580c',
              fillColor: '#f97316',
              fillOpacity: 0.75,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <p style={{ fontWeight: 600, margin: '0 0 2px' }}>Planning Application</p>
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>{app.reference}</p>
                {app.name && <p style={{ margin: '0 0 2px' }}>{app.name}</p>}
                {app.description && <p style={{ color: '#64748b', margin: '0 0 2px' }}>{app.description}</p>}
                {app.status && <p style={{ color: '#94a3b8', margin: 0 }}>Status: {app.status}</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Postcode centre marker */}
        <Marker position={[lat, lng]}>
          <Popup><strong>{postcode}</strong></Popup>
        </Marker>

        {/* Crime incidents */}
        {visibleLayers.has('crime') && incidents.map((inc, i) => (
          <CircleMarker
            key={`crime-${i}`}
            center={[inc.latitude, inc.longitude]}
            radius={5}
            pathOptions={{
              color: crimeColour(inc.category),
              fillColor: crimeColour(inc.category),
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <p style={{ fontWeight: 600, margin: '0 0 2px' }}>{formatCategory(inc.category)}</p>
                <p style={{ color: '#64748b', margin: '0 0 2px' }}>{inc.street}</p>
                <p style={{ color: '#94a3b8', margin: 0 }}>{inc.month}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Stop & search */}
        {visibleLayers.has('stop-search') && stopSearches.map((ss, i) => (
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
                dashArray: '4',
              }}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <p style={{ fontWeight: 600, margin: '0 0 2px' }}>Stop &amp; Search</p>
                  {ss.object_of_search && <p style={{ margin: '0 0 2px' }}>Object: {ss.object_of_search}</p>}
                  {ss.outcome && <p style={{ margin: '0 0 2px' }}>Outcome: {ss.outcome}</p>}
                  <p style={{ color: '#94a3b8', margin: 0 }}>{ss.date.slice(0, 10)}</p>
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {visibleLayers.has('crime') && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-400" /> Crime
          </span>
        )}
        {visibleLayers.has('stop-search') && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-blue-700 bg-blue-200" /> Stop &amp; Search
          </span>
        )}
        {visibleLayers.has('planning-applications') && planningApps && planningApps.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400" /> Planning Applications ({planningApps.length})
          </span>
        )}
        {activePlanningLayers.map(l => (
          <span key={l.id} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm border"
              style={{ backgroundColor: l.color + '50', borderColor: l.color }}
            />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-slate-400">
          police.uk · planning.data.gov.uk · © OSM
        </span>
      </div>
    </div>
  )
}
