'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ScoreBadge from '@/components/ScoreBadge'

type Source = 'bayut' | 'propertyfinder'
type AuthFilter = 'hide' | 'show'
type BuildingFilter = 'all' | 'same_only' | 'exclude_diff'

type DR = {
  location: string; beds: number; baths: number
  size_sqft: number; price_aed: number; community: string
  photos: string[]; unit_id: string
}

type DisplayMatch = {
  id: number
  dr_url: string
  listing_url: string
  score: number
  score_beds: number; score_baths: number; score_size: number; score_price: number
  building_match: boolean | null
  is_authorized: boolean
  source: Source
  dr: DR
  title: string
  beds: string
  baths: string
  area_sqft: number | null
  price: number | null
  agent_name: string | null
  agency_name: string | null
  reference: string | null
  cover_photo: string | null
}

type Stats = {
  total_dr: number; total_bayut: number; total_pf: number
  high_risk_bayut: number; high_risk_pf: number; conflicts: number; pf_conflicts: number
}

const COMMUNITIES = [
  'All', 'Al Khail Gate', 'Bluewaters', 'Citywalk', 'Discovery Gardens',
  'Dubai Wharf', 'Garden View Apartments', 'Garden View Villas', 'Gardens Apartments',
  'International City', 'Manazel Al Khor', 'Meydan Residence 1', 'The Gardens',
]

export default function Dashboard() {
  const [matches, setMatches]             = useState<DisplayMatch[]>([])
  const [stats, setStats]                 = useState<Stats>({ total_dr: 0, total_bayut: 0, total_pf: 0, high_risk_bayut: 0, high_risk_pf: 0, conflicts: 0, pf_conflicts: 0 })
  const [source, setSource]              = useState<Source>('bayut')
  const [threshold, setThreshold]         = useState(95)
  const [community, setCommunity]         = useState('All')
  const [authFilter, setAuthFilter]       = useState<AuthFilter>('hide')
  const [buildingFilter, setBuildingFilter] = useState<BuildingFilter>('all')
  const [loading, setLoading]             = useState(true)
  const [lastScrape, setLastScrape]       = useState<string | null>(null)

  const fetchBayutMatches = useCallback(async () => {
    let q = supabase
      .from('listing_matches')
      .select(`
        id, dr_url, bayut_id, score, score_beds, score_baths, score_size, score_price,
        building_match, is_authorized, created_at,
        dubai_residentials_full!listing_matches_dr_url_fkey(location,beds,baths,size_sqft,price_aed,community,photos,unit_id),
        bayut_community_rentals!listing_matches_bayut_id_fkey(url,title,beds,baths,area_sqft,price,agent,agency,permit_number,cover_photo,added_on)
      `)
      .gte('score', threshold)
      .order('score', { ascending: false })
      .limit(2000)
    if (authFilter === 'hide') q = q.eq('is_authorized', false)
    const { data } = await q
    if (!data) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map(m => ({
      id: m.id,
      dr_url: m.dr_url,
      listing_url: m.bayut_community_rentals?.url ?? '',
      score: m.score,
      score_beds: m.score_beds ?? 0,
      score_baths: m.score_baths ?? 0,
      score_size: m.score_size ?? 0,
      score_price: m.score_price ?? 0,
      building_match: m.building_match,
      is_authorized: m.is_authorized,
      source: 'bayut' as Source,
      dr: m.dubai_residentials_full,
      title: m.bayut_community_rentals?.title ?? '',
      beds: String(m.bayut_community_rentals?.beds ?? ''),
      baths: String(m.bayut_community_rentals?.baths ?? ''),
      area_sqft: m.bayut_community_rentals?.area_sqft ?? null,
      price: m.bayut_community_rentals?.price?.amount ?? null,
      agent_name: m.bayut_community_rentals?.agent?.name ?? null,
      agency_name: m.bayut_community_rentals?.agency?.name ?? null,
      reference: m.bayut_community_rentals?.permit_number ?? null,
      cover_photo: m.bayut_community_rentals?.cover_photo ?? null,
    })) as DisplayMatch[]
  }, [threshold, authFilter])

  const fetchPFMatches = useCallback(async () => {
    let q = supabase
      .from('propertyfinder_matches')
      .select('id,dr_url,pf_url,score,score_beds,score_baths,score_size,score_price,building_match,is_authorized')
      .gte('score', threshold)
      .order('score', { ascending: false })
      .limit(2000)
    if (authFilter === 'hide') q = q.eq('is_authorized', false)
    const { data: matchRows } = await q
    if (!matchRows || matchRows.length === 0) return []

    const drUrls  = [...new Set(matchRows.map(m => m.dr_url))]
    const pfUrls  = [...new Set(matchRows.map(m => m.pf_url))]

    const [drRes, pfRes] = await Promise.all([
      supabase.from('dubai_residentials_full').select('url,location,beds,baths,size_sqft,price_aed,community,photos,unit_id').in('url', drUrls),
      supabase.from('propertyfinder_listings').select('url,title,beds,baths,beds_numeric,baths_numeric,area_sqft,price_value,agent_name,agency_name,reference,location,photos').in('url', pfUrls),
    ])

    const drMap = Object.fromEntries((drRes.data ?? []).map(d => [d.url, d]))
    const pfMap = Object.fromEntries((pfRes.data ?? []).map(p => [p.url, p]))

    return matchRows.map(m => {
      const dr = drMap[m.dr_url]
      const pf = pfMap[m.pf_url]
      return {
        id: m.id,
        dr_url: m.dr_url,
        listing_url: m.pf_url,
        score: m.score,
        score_beds: m.score_beds ?? 0,
        score_baths: m.score_baths ?? 0,
        score_size: m.score_size ?? 0,
        score_price: m.score_price ?? 0,
        building_match: m.building_match,
        is_authorized: m.is_authorized,
        source: 'propertyfinder' as Source,
        dr,
        title: pf?.title ?? '',
        beds: pf?.beds ?? '',
        baths: pf?.baths ?? '',
        area_sqft: pf?.area_sqft ?? null,
        price: pf?.price_value ?? null,
        agent_name: pf?.agent_name ?? null,
        agency_name: pf?.agency_name ?? null,
        reference: pf?.reference ?? null,
        cover_photo: pf?.photos?.[0] ?? null,
      }
    }) as DisplayMatch[]
  }, [threshold, authFilter])

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    const data = source === 'bayut' ? await fetchBayutMatches() : await fetchPFMatches()
    setMatches(data)
    setLoading(false)
  }, [source, fetchBayutMatches, fetchPFMatches])

  const fetchStats = useCallback(async () => {
    const [drRes, bayutRes, pfRes, highBayutRes, highPFRes, conflictsRes, pfConflictsRes, lastScrapeRes] = await Promise.all([
      supabase.from('dubai_residentials_full').select('url', { count: 'exact', head: true }),
      supabase.from('bayut_community_rentals').select('id', { count: 'exact', head: true }),
      supabase.from('propertyfinder_listings').select('id', { count: 'exact', head: true }),
      supabase.from('listing_matches').select('id', { count: 'exact', head: true }).gte('score', 95).eq('is_authorized', false),
      supabase.from('propertyfinder_matches').select('id', { count: 'exact', head: true }).gte('score', 95).eq('is_authorized', false),
      supabase.from('permit_conflicts').select('id', { count: 'exact', head: true }),
      supabase.from('propertyfinder_conflicts').select('id', { count: 'exact', head: true }),
      supabase.from('bayut_community_rentals').select('added_on').order('added_on', { ascending: false }).limit(1),
    ])
    setStats({
      total_dr:        drRes.count ?? 0,
      total_bayut:     bayutRes.count ?? 0,
      total_pf:        pfRes.count ?? 0,
      high_risk_bayut: highBayutRes.count ?? 0,
      high_risk_pf:    highPFRes.count ?? 0,
      conflicts:       conflictsRes.count ?? 0,
      pf_conflicts:    pfConflictsRes.count ?? 0,
    })
    const raw = lastScrapeRes.data?.[0]?.added_on
    if (raw) setLastScrape(raw)
  }, [])

  useEffect(() => { fetchMatches() }, [fetchMatches])
  useEffect(() => { fetchStats() }, [fetchStats])

  const dedupedMatches = (() => {
    const seen = new Set<string>()
    const out: DisplayMatch[] = []
    const filtered = matches.filter(m => {
      if (!m.dr) return false
      if (community !== 'All' && m.dr.community !== community) return false
      if (buildingFilter === 'same_only') return m.building_match === true
      if (buildingFilter === 'exclude_diff') return m.building_match !== false
      return true
    })
    for (const m of filtered) {
      if (!seen.has(m.dr_url)) { seen.add(m.dr_url); out.push(m) }
    }
    return out
  })()

  const highRisk = source === 'bayut' ? stats.high_risk_bayut : stats.high_risk_pf
  const monitored = source === 'bayut' ? stats.total_bayut : stats.total_pf
  const monitoredLabel = source === 'bayut' ? 'Bayut Monitored' : 'PF Monitored'
  const confirmedConflicts = source === 'bayut' ? stats.conflicts : stats.pf_conflicts

  return (
    <div className="min-h-full px-6 py-8 md:px-10">

      {/* Page header */}
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-widest mb-1">Dubai Residential L.L.C</p>
          <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tracking-tight">Listing Monitor</h1>
          <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">Unauthorized listings on Bayut &amp; PropertyFinder</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Source toggle */}
          <div className="flex items-center rounded-xl bg-white dark:bg-[#2C2822] shadow-sm p-1 gap-1">
            {(['bayut', 'propertyfinder'] as Source[]).map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  source === s
                    ? 'bg-[#C17F5A] text-white shadow-sm'
                    : 'text-[#9A8E84] hover:text-[#1C1917] dark:hover:text-[#F0EAE2]'
                }`}
              >
                {s === 'bayut' ? 'Bayut' : 'PropertyFinder'}
              </button>
            ))}
          </div>
          {lastScrape && (
            <div className="flex items-center gap-2 text-xs text-[#9A8E84] dark:text-[#7A7068] bg-white dark:bg-[#2C2822] rounded-xl px-4 py-2.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              Last scrape: <span className="text-[#1C1917] dark:text-[#F0EAE2] font-medium">{lastScrape}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'DR Properties',   value: stats.total_dr,  note: 'managed units',    href: undefined },
          { label: monitoredLabel,     value: monitored,       note: 'scraped listings', href: undefined },
          { label: 'High-Risk',        value: highRisk,        note: 'score ≥ 95%',      href: undefined, risk: true },
          { label: 'Confirmed Cases',  value: confirmedConflicts, note: 'permit conflicts',  href: '/conflicts', risk: true },
        ].map(s => {
          const inner = (
            <div className="bg-white dark:bg-[#2C2822] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest mb-3">{s.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tabular-nums leading-none">{s.value.toLocaleString()}</p>
                {s.risk && s.value > 0 && <span className="text-xs font-semibold text-red-500 mb-0.5">⚠ Active</span>}
              </div>
              <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-2">{s.note}</p>
            </div>
          )
          return s.href
            ? <Link key={s.label} href={s.href}>{inner}</Link>
            : <div key={s.label}>{inner}</div>
        })}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#2C2822] rounded-2xl px-5 py-4 shadow-sm mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9A8E84] uppercase tracking-widest">Score</span>
          <select
            className="text-sm bg-[#EAE4DC] dark:bg-[#1C1814] text-[#1C1917] dark:text-[#F0EAE2] rounded-lg px-3 py-1.5 border-0 outline-none cursor-pointer"
            value={threshold} onChange={e => setThreshold(Number(e.target.value))}>
            {[60, 70, 75, 80, 85, 90, 95].map(v => <option key={v} value={v}>≥ {v}%</option>)}
          </select>
        </div>
        <div className="w-px h-5 bg-black/[0.08] dark:bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9A8E84] uppercase tracking-widest">Community</span>
          <select
            className="text-sm bg-[#EAE4DC] dark:bg-[#1C1814] text-[#1C1917] dark:text-[#F0EAE2] rounded-lg px-3 py-1.5 border-0 outline-none cursor-pointer"
            value={community} onChange={e => setCommunity(e.target.value)}>
            {COMMUNITIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="w-px h-5 bg-black/[0.08] dark:bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9A8E84] uppercase tracking-widest">DR</span>
          <select
            className="text-sm bg-[#EAE4DC] dark:bg-[#1C1814] text-[#1C1917] dark:text-[#F0EAE2] rounded-lg px-3 py-1.5 border-0 outline-none cursor-pointer"
            value={authFilter} onChange={e => setAuthFilter(e.target.value as AuthFilter)}>
            <option value="hide">Hide authorized</option>
            <option value="show">Show all</option>
          </select>
        </div>
        <div className="w-px h-5 bg-black/[0.08] dark:bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9A8E84] uppercase tracking-widest">Building</span>
          <div className="flex items-center rounded-lg bg-[#EAE4DC] dark:bg-[#1C1814] p-0.5 gap-px">
            {([
              { key: 'all'          as BuildingFilter, label: 'All'       },
              { key: 'same_only'    as BuildingFilter, label: 'Same'      },
              { key: 'exclude_diff' as BuildingFilter, label: 'Excl. diff'},
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setBuildingFilter(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  buildingFilter === key
                    ? 'bg-white dark:bg-[#2C2822] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm'
                    : 'text-[#9A8E84] hover:text-[#1C1917] dark:hover:text-[#F0EAE2]'
                }`}>{label}</button>
            ))}
          </div>
        </div>
        <span className="text-sm text-[#9A8E84] ml-auto tabular-nums">
          {loading ? '—' : `${dedupedMatches.length} properties`}
        </span>
      </div>

      {/* Match cards */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-[#9A8E84]">
          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-sm">Loading matches…</span>
        </div>
      ) : dedupedMatches.length === 0 ? (
        <div className="text-center py-32 text-sm text-[#9A8E84]">No matches for this filter</div>
      ) : (
        <div className="space-y-3">
          {dedupedMatches.map(m => {
            if (!m.dr) return null
            const riskColor =
              m.score >= 95 ? 'border-l-red-400'
              : m.score >= 75 ? 'border-l-[#C17F5A]'
              : 'border-l-transparent'
            const sourceLabel = m.source === 'bayut' ? 'Bayut' : 'PF'

            return (
              <div key={m.id}
                className={`bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border-l-4 ${riskColor}`}>
                <div className="flex flex-col sm:flex-row">

                  {/* Photos */}
                  {(m.dr.photos?.[0] || m.cover_photo) && (
                    <div className="flex sm:flex-col w-full sm:w-24 h-20 sm:h-auto shrink-0">
                      <div className="flex-1 relative bg-[#EAE4DC] dark:bg-[#1C1814] overflow-hidden">
                        {m.dr.photos?.[0]
                          ? <img src={m.dr.photos[0]} alt="" className="w-full h-full object-cover" /> // eslint-disable-line
                          : <div className="w-full h-full flex items-center justify-center text-[#9A8E84] text-[10px]">No photo</div>}
                        <span className="absolute bottom-1 left-1 text-[9px] bg-[#C17F5A] text-white px-1 py-0.5 rounded font-bold">DR</span>
                      </div>
                      <div className="flex-1 relative bg-[#EAE4DC] dark:bg-[#1C1814] overflow-hidden border-t sm:border-t border-l sm:border-l-0 border-black/[0.06]">
                        {m.cover_photo
                          ? <img src={m.cover_photo} alt="" className="w-full h-full object-cover" /> // eslint-disable-line
                          : <div className="w-full h-full flex items-center justify-center text-[#9A8E84] text-[10px]">No photo</div>}
                        <span className="absolute bottom-1 left-1 text-[9px] bg-[#1C1917] dark:bg-[#3A3430] text-white px-1 py-0.5 rounded font-bold">{sourceLabel}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col sm:flex-row gap-5 p-5 min-w-0">

                    {/* DR info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[#C17F5A] uppercase tracking-widest mb-1.5">Your Property</p>
                      <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] truncate">{m.dr.location}</p>
                      <p className="text-[11px] font-mono text-[#9A8E84] mt-0.5">{m.dr.unit_id}</p>
                      <p className="text-xs text-[#9A8E84] mt-2">{m.dr.beds}bd · {m.dr.baths}ba · {m.dr.size_sqft?.toLocaleString()} sqft</p>
                      <p className="text-sm font-bold text-[#1C1917] dark:text-[#F0EAE2] mt-1 tabular-nums">AED {m.dr.price_aed?.toLocaleString()}</p>
                      <a href={m.dr_url} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-block text-xs bg-[#C17F5A] hover:bg-[#A86D4A] text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                        View on DR ↗
                      </a>
                    </div>

                    {/* Score */}
                    <div className="flex sm:flex-col items-center gap-3 sm:w-28 shrink-0">
                      <ScoreBadge score={m.score} />
                      <div className="flex sm:flex-col gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${
                          m.building_match === true  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                          m.building_match === false ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                                                       'bg-black/[0.04] dark:bg-white/[0.04] text-[#9A8E84]'
                        }`}>
                          {m.building_match === true ? '✓ Same bldg' : m.building_match === false ? '✗ Diff bldg' : '? Bldg'}
                        </span>
                        {m.is_authorized && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                            ✓ Authorized
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Listing info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[#9A8E84] uppercase tracking-widest mb-1.5">{sourceLabel} Listing</p>
                      <a href={m.listing_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] hover:text-[#C17F5A] truncate block">
                        {m.title}
                      </a>
                      <p className="text-xs text-[#9A8E84] mt-2">{m.beds}bd · {m.baths}ba · {m.area_sqft?.toLocaleString()} sqft</p>
                      <p className="text-sm font-bold text-[#1C1917] dark:text-[#F0EAE2] mt-1 tabular-nums">
                        AED {m.price?.toLocaleString()}
                      </p>
                      {m.agent_name && (
                        <p className="text-xs text-[#9A8E84] mt-1 truncate">
                          {m.agent_name}{m.agency_name && <> · {m.agency_name}</>}
                        </p>
                      )}
                      {m.reference && <p className="text-xs text-[#9A8E84] mt-0.5 truncate font-mono">Ref: {m.reference}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 justify-start sm:justify-center shrink-0">
                      <Link href={`/property/${encodeURIComponent(m.dr_url)}`}
                        className="text-xs bg-[#EAE4DC] dark:bg-[#1C1814] hover:bg-[#DDD7CF] dark:hover:bg-[#252017] text-[#1C1917] dark:text-[#F0EAE2] px-3 py-1.5 rounded-lg text-center whitespace-nowrap transition-colors font-medium">
                        All matches →
                      </Link>
                      <a href={m.listing_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs border border-[#C17F5A]/30 hover:border-[#C17F5A] text-[#C17F5A] px-3 py-1.5 rounded-lg text-center whitespace-nowrap transition-colors">
                        {sourceLabel} ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="h-10" />
    </div>
  )
}
