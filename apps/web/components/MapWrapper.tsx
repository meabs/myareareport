'use client'

import dynamic from 'next/dynamic'

const ReportMap = dynamic(() => import('./ReportMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-lg bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 text-sm">
      Loading map…
    </div>
  ),
})

interface Props {
  postcode: string
  lat: number
  lng: number
}

export default function MapWrapper({ postcode, lat, lng }: Props) {
  return <ReportMap postcode={postcode} lat={lat} lng={lng} />
}
