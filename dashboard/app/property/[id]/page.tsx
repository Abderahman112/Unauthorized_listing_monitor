'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ScoreBadge from '@/components/ScoreBadge'
import ScoreBreakdown from '@/components/ScoreBreakdown'

type DRProperty = {
  url: string
  community: string
  property_id: string
  unit_id: string
  apartment_type: string
  location: string
  price_aed: number
  beds: number
  baths: number
  size_sqft: number
}

type BayutMatch = {
  id: number
  score: number
  score_beds: number
  score_baths: number
  score_size: number
  score_price: number
  building_match: boolean | null
  is_authorized: boolean
  dr_building: string | null
  bayut_building: string | null
  bayut_community_rentals: {
    url: string
    title: string
    beds: number
    baths: number
    area_sqft: number
    price: { amount: number; currency: string }
    location: string
    furnishing: string
    added_on: string
    agent: { name: string; mobile: string }
    agency: { name: string }
    permit_number: string
    cover_photo: string
    is_verified: boolean
  }
}

type BuildingFilter = 'exclude_diff' | 'same_only' | 'all'

export default function PropertyPage() {
  const params = useParams()
  const drUrl = decodeURIComponent(params.id as string)

  const [property, setProperty] = useState<DRProperty | null>(null)
  const [allMatches, setAllMatches] = useState<BayutMatch[]>([])
  const [buildingFilter, setBuildingFilter] = useState<BuildingFilter>('exclude_diff')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [propRes, matchRes] = await Promise.all([
        supabase
          .from('dubai_residentials_full')
          .select('url, community, property_id, unit_id, apartment_type, location, price_aed, beds, baths, size_sqft')
          .eq('url', drUrl)
          .single(),
        supabase
          .from('listing_matches')
          .select(`
            id, score, score_beds, score_baths, score_size, score_price,
            building_match, is_authorized, dr_building, bayut_building,
            bayut_community_rentals!listing_matches_bayut_id_fkey(
              url, title, beds, baths, area_sqft, price, location, furnishing, added_on,
              agent, agency, permit_number, cover_photo, is_verified
            )
          `)
          .eq('dr_url', drUrl)
          .order('score', { ascending: false }),
      ])
      setProperty(propRes.data as DRProperty)
      setAllMatches((matchRes.data ?? []) as unknown as BayutMatch[])
      setLoading(false)
    }
    load()
  }, [drUrl])

  const matches = allMatches.filter(m => {
    if (buildingFilter === 'same_only') return m.building_match === true
    if (buildingFilter === 'exclude_diff') return m.building_match !== false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-full px-6 py-8 md:px-10 flex items-center justify-center text-[#9A8E84] dark:text-[#7A7068]">
        Loading...
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-full px-6 py-8 md:px-10 flex items-center justify-center text-[#9A8E84] dark:text-[#7A7068]">
        Property not found.
      </div>
    )
  }

  const sameBuilding = allMatches.filter(m => m.building_match === true).length
  const diffBuilding = allMatches.filter(m => m.building_match === false).length
  const unauthorized = matches.filter(m => !m.is_authorized).length

  return (
    <div className="min-h-full px-6 py-8 md:px-10">
      <div className="max-w-5xl mx-auto">

        <Link href="/search"
          className="text-sm text-[#9A8E84] dark:text-[#7A7068] hover:text-[#1C1917] dark:hover:text-[#F0EAE2] mb-6 inline-block transition-colors">
          ← Back to search
        </Link>

        {/* DR property card */}
        <div className="bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-[#C17F5A] bg-[#C17F5A]/10 px-2 py-0.5 rounded-lg">
                  {property.community}
                </span>
                {property.apartment_type && (
                  <span className="text-xs text-[#9A8E84] dark:text-[#7A7068]">{property.apartment_type}</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-[#1C1917] dark:text-[#F0EAE2]">{property.location}</h1>
              <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">
                Property ID: {property.property_id} · Unit: {property.unit_id}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-[#1C1917] dark:text-[#F0EAE2]">AED {property.price_aed?.toLocaleString()}</p>
              <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">
                {property.beds}bd · {property.baths}ba · {property.size_sqft?.toLocaleString()} sqft
              </p>
            </div>
          </div>
          <a href={property.url} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-[#C17F5A] hover:underline">
            View on Dubai Residentials ↗
          </a>
        </div>

        {/* Match summary + filter */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F0EAE2]">{matches.length} matches shown</h2>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg">
              {sameBuilding} same building
            </span>
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg">
              {diffBuilding} different building
            </span>
            {unauthorized > 0 && (
              <span className="text-xs bg-[#C17F5A]/10 text-[#C17F5A] px-2 py-0.5 rounded-lg">
                ⚠ {unauthorized} unverified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#1C1917] dark:text-[#F0EAE2]">Building filter</label>
            <select
              className="shadow-sm rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-[#2C2822] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm"
              value={buildingFilter} onChange={e => setBuildingFilter(e.target.value as BuildingFilter)}>
              <option value="exclude_diff">Exclude different building</option>
              <option value="same_only">Same building only</option>
              <option value="all">All matches</option>
            </select>
          </div>
        </div>

        {/* Matches */}
        {matches.length === 0 ? (
          <div className="text-center py-20 text-[#9A8E84] dark:text-[#7A7068]">No matches for this filter.</div>
        ) : (
          <div className="space-y-4">
            {matches.map(m => {
              const b = m.bayut_community_rentals
              if (!b) return null
              return (
                <div key={m.id} className={`bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm overflow-hidden ${
                  m.building_match === false ? 'ring-1 ring-red-200 dark:ring-red-900/50 opacity-60' : ''
                }`}>
                  <div className={`h-1 w-full ${
                    m.is_authorized ? 'bg-emerald-400' :
                    m.building_match === true ? 'bg-[#C17F5A]' :
                    m.building_match === false ? 'bg-red-300' : 'bg-stone-200 dark:bg-stone-700'
                  }`} />

                  <div className="flex flex-col sm:flex-row">
                    {b.cover_photo && (
                      <div className="w-full sm:w-44 h-36 sm:h-auto shrink-0">
                        <img src={b.cover_photo} alt={b.title} className="w-full h-full object-cover" /> {/* eslint-disable-line */}
                      </div>
                    )}
                    <div className="flex-1 p-5 flex flex-col sm:flex-row gap-6">
                      {/* Bayut info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <a href={b.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] hover:text-[#C17F5A] truncate">
                            {b.title}
                          </a>
                          {b.is_verified && (
                            <span className="shrink-0 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] truncate">{b.location}</p>
                        <p className="text-xs text-[#1C1917] dark:text-[#F0EAE2] mt-2">
                          {b.beds}bd · {b.baths}ba · {b.area_sqft?.toLocaleString()} sqft
                          {b.furnishing && ` · ${b.furnishing}`}
                        </p>
                        <p className="text-sm font-bold text-[#1C1917] dark:text-[#F0EAE2] mt-1">
                          AED {b.price?.amount?.toLocaleString()}
                          <span className="text-xs font-normal text-[#9A8E84] dark:text-[#7A7068] ml-1">/ year</span>
                        </p>
                        {b.added_on && <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-1">Listed: {b.added_on}</p>}
                      </div>

                      {/* Score + badges */}
                      <div className="flex flex-col items-center gap-2 sm:w-40 shrink-0">
                        <ScoreBadge score={m.score} />
                        <ScoreBreakdown b={m} />
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium text-center w-full ${
                          m.building_match === true  ? 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                          m.building_match === false ? 'bg-red-100/60 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                                                       'bg-[#EAE4DC] dark:bg-[#1C1814] text-[#9A8E84]'
                        }`}>
                          {m.building_match === true  ? `✓ Bldg ${m.dr_building}` :
                           m.building_match === false ? `✗ ${m.dr_building} / ${m.bayut_building}` :
                                                        '? Building unknown'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium text-center w-full ${
                          m.is_authorized
                            ? 'bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-[#C17F5A]/10 text-[#C17F5A]'
                        }`}>
                          {m.is_authorized ? '✓ Authorized' : '⚠ Unverified'}
                        </span>
                      </div>

                      {/* Agent */}
                      <div className="sm:w-52 shrink-0">
                        <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mb-1">Agent</p>
                        <p className="text-xs font-medium text-[#1C1917] dark:text-[#F0EAE2] leading-snug">{b.agent?.name}</p>
                        <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] leading-snug">{b.agency?.name}</p>
                        {b.agent?.mobile && (
                          <a href={`tel:${b.agent.mobile}`} className="text-xs text-[#C17F5A] hover:underline mt-1 block">
                            {b.agent.mobile}
                          </a>
                        )}
                        {b.permit_number && (
                          <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-2">Permit: {b.permit_number}</p>
                        )}
                        <a href={b.url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs bg-[#C17F5A]/10 hover:bg-[#C17F5A]/20 text-[#C17F5A] px-3 py-1.5 rounded-lg">
                          View on Bayut ↗
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="h-10" />
    </div>
  )
}
