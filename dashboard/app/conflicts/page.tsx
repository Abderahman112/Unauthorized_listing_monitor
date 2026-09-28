'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Source = 'bayut' | 'propertyfinder'

type ConflictRow = {
  id: number
  permit_number: string
  community: string | null
  location: string
  beds: string
  baths: string
  agency_name: string
  agent_name: string
  agent_mobile?: string | null
  dr_url: string | null
  listing_url: string | null
  listing_label: string
}

type SortKey = 'community' | 'agency_name' | 'permit_number' | 'location'
type SortDir = 'asc' | 'desc'

const COMMUNITIES = [
  'All', 'The Gardens', 'Gardens Apartments', 'Garden View Apartments',
  'Garden View Villas', 'Bluewaters', 'Citywalk', 'Meydan Residence 1',
  'International City', 'Discovery Gardens', 'Manazel Al Khor',
  'Jebel Ali Village', 'City Walk', 'Al Jaddaf', 'Al Quoz',
  'Dubai Waterfront', 'Culture Village', 'Meydan Avenue', 'Remraam',
]

function normalizeBayut(raw: Record<string, string | number | null>[]): ConflictRow[] {
  return raw.map(c => ({
    id:            c.id as number,
    permit_number: c.permit_number as string,
    community:     c.community as string | null,
    location:      c.dr_location as string,
    beds:          String(c.dr_beds ?? '—'),
    baths:         String(c.dr_baths ?? '—'),
    agency_name:   c.agency_name as string ?? 'Unknown',
    agent_name:    c.agent_name as string ?? '—',
    agent_mobile:  c.agent_mobile as string | null,
    dr_url:        c.dr_bayut_url as string | null,
    listing_url:   c.unauthorized_url as string | null,
    listing_label: 'Bayut ↗',
  }))
}

function normalizePF(raw: Record<string, string | number | null>[]): ConflictRow[] {
  return raw.map(c => ({
    id:            c.id as number,
    permit_number: c.permit_number as string,
    community:     c.pf_community as string | null,
    location:      c.pf_location as string ?? '—',
    beds:          c.pf_beds as string ?? '—',
    baths:         c.pf_baths as string ?? '—',
    agency_name:   c.pf_agency_name as string ?? 'Unknown',
    agent_name:    c.pf_agent_name as string ?? '—',
    agent_mobile:  null,
    dr_url:        c.bayut_url as string | null,
    listing_url:   c.pf_url as string | null,
    listing_label: 'PF ↗',
  }))
}

export default function ConflictsPage() {
  const [source, setSource]       = useState<Source>('bayut')
  const [conflicts, setConflicts] = useState<ConflictRow[]>([])
  const [pfCount, setPfCount]     = useState(0)
  const [bayutCount, setBayutCount] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [community, setCommunity] = useState('All')
  const [search, setSearch]       = useState('')
  const [sortKey, setSortKey]     = useState<SortKey>('community')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')

  useEffect(() => {
    async function loadCounts() {
      const [b, p] = await Promise.all([
        supabase.from('permit_conflicts').select('id', { count: 'exact', head: true }),
        supabase.from('propertyfinder_conflicts').select('id', { count: 'exact', head: true }),
      ])
      setBayutCount(b.count ?? 0)
      setPfCount(p.count ?? 0)
    }
    loadCounts()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (source === 'bayut') {
        const { data } = await supabase.from('permit_conflicts').select('*').limit(500)
        setConflicts(normalizeBayut((data ?? []) as Record<string, string | number | null>[]))
      } else {
        const { data } = await supabase.from('propertyfinder_conflicts').select('*').limit(500)
        setConflicts(normalizePF((data ?? []) as Record<string, string | number | null>[]))
      }
      setLoading(false)
    }
    load()
  }, [source])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = conflicts
    .filter(c => {
      if (community !== 'All' && c.community !== community) return false
      if (search) {
        const s = search.toLowerCase()
        return (
          c.permit_number?.includes(s) ||
          c.agent_name?.toLowerCase().includes(s) ||
          c.agency_name?.toLowerCase().includes(s) ||
          c.location?.toLowerCase().includes(s)
        )
      }
      return true
    })
    .sort((a, b) => {
      const av = (a[sortKey] ?? '') as string
      const bv = (b[sortKey] ?? '') as string
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const agencyCounts = conflicts.reduce<Record<string, number>>((acc, c) => {
    const k = c.agency_name ?? 'Unknown'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const topAgencies = Object.entries(agencyCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-[#9A8E84] ml-1 opacity-40">↕</span>
    return <span className="text-[#C17F5A] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const totalConflicts = bayutCount + pfCount

  return (
    <div className="min-h-full px-6 py-8 md:px-10">

      {/* Header */}
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-widest mb-1">DLD Permit Verification</p>
          <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tracking-tight">
            Permit Conflicts
            <span className="ml-3 text-lg font-semibold text-red-500">{totalConflicts}</span>
          </h1>
          <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">Same DLD permit on a DR unit and an unauthorized listing — confirmed same physical unit</p>
        </div>

        {/* Source toggle */}
        <div className="flex bg-[#EAE4DC] dark:bg-[#1C1814] rounded-xl p-1 gap-1">
          {(['bayut', 'propertyfinder'] as Source[]).map(s => (
            <button
              key={s}
              onClick={() => { setSource(s); setCommunity('All'); setSearch('') }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                source === s
                  ? 'bg-[#C17F5A] text-white shadow-sm'
                  : 'text-[#9A8E84] hover:text-[#1C1917] dark:hover:text-[#F0EAE2]'
              }`}
            >
              {s === 'bayut' ? `Bayut (${bayutCount})` : `PropertyFinder (${pfCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Conflicts',   value: conflicts.length,                                      color: 'text-red-500'       },
          { label: 'Unique Permits',    value: new Set(conflicts.map(c => c.permit_number)).size,      color: 'text-[#C17F5A]'     },
          { label: 'Agencies Involved', value: new Set(conflicts.map(c => c.agency_name)).size,        color: 'text-[#1C1917] dark:text-[#F0EAE2]' },
          { label: 'Top Offender',      value: topAgencies[0]?.[1] ?? 0, sub: topAgencies[0]?.[0] ?? '—', color: 'text-[#1C1917] dark:text-[#F0EAE2]' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#2C2822] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#9A8E84] uppercase tracking-widest mb-3">{s.label}</p>
            <p className={`text-3xl font-bold tabular-nums leading-none ${s.color}`}>{s.value.toLocaleString()}</p>
            {'sub' in s && s.sub && <p className="text-xs text-[#9A8E84] mt-2 truncate">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Agency bar */}
      <div className="bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm p-6 mb-6">
        <p className="text-xs font-bold text-[#9A8E84] uppercase tracking-widest mb-4">Top Offending Agencies</p>
        <div className="space-y-3">
          {topAgencies.map(([agency, count]) => (
            <div key={agency} className="flex items-center gap-3">
              <span className="text-sm text-[#1C1917] dark:text-[#F0EAE2] w-56 truncate shrink-0">{agency}</span>
              <div className="flex-1 bg-[#EAE4DC] dark:bg-[#1C1814] rounded-full h-1.5">
                <div className="bg-[#C17F5A] h-1.5 rounded-full transition-all"
                  style={{ width: `${(count / (topAgencies[0]?.[1] ?? 1)) * 100}%` }} />
              </div>
              <span className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] w-5 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm px-5 py-4 mb-5 flex flex-wrap items-center gap-3">
        <select
          className="text-sm bg-[#EAE4DC] dark:bg-[#1C1814] text-[#1C1917] dark:text-[#F0EAE2] rounded-lg px-3 py-1.5 border-0 outline-none cursor-pointer"
          value={community} onChange={e => setCommunity(e.target.value)}>
          {COMMUNITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search permit, agent, agency, location…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 text-sm bg-[#EAE4DC] dark:bg-[#1C1814] text-[#1C1917] dark:text-[#F0EAE2] rounded-lg px-3 py-1.5 border-0 outline-none placeholder:text-[#9A8E84]"
        />
        <span className="text-sm text-[#9A8E84] ml-auto tabular-nums">{filtered.length} results</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-[#9A8E84]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#9A8E84]">No conflicts found</div>
      ) : (
        <div className="bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.06] bg-[#EAE4DC]/60 dark:bg-[#1C1814]/60">
                  {[
                    { key: 'community'     as SortKey, label: 'Community' },
                    { key: 'permit_number' as SortKey, label: 'Permit'    },
                    { key: 'location'      as SortKey, label: 'Location'  },
                    { key: 'agency_name'   as SortKey, label: 'Agency'    },
                  ].map(col => (
                    <th key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="text-left text-[11px] font-bold text-[#9A8E84] uppercase tracking-widest px-5 py-3.5 cursor-pointer hover:text-[#1C1917] dark:hover:text-[#F0EAE2] select-none whitespace-nowrap">
                      {col.label}<SortIcon col={col.key} />
                    </th>
                  ))}
                  <th className="text-left text-[11px] font-bold text-[#9A8E84] uppercase tracking-widest px-5 py-3.5 whitespace-nowrap">Agent</th>
                  <th className="text-left text-[11px] font-bold text-[#9A8E84] uppercase tracking-widest px-5 py-3.5 whitespace-nowrap">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-[#EAE4DC]/40 dark:hover:bg-[#1C1814]/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-[#C17F5A] bg-[#C17F5A]/10 px-2 py-0.5 rounded-lg">
                        {c.community ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs text-[#9A8E84]">{c.permit_number}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[#1C1917] dark:text-[#F0EAE2] font-medium text-xs max-w-xs truncate">{c.location}</p>
                      <p className="text-[#9A8E84] text-xs mt-0.5">{c.beds} bd · {c.baths} ba</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-red-500 text-xs whitespace-nowrap">{c.agency_name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[#1C1917] dark:text-[#F0EAE2] text-xs whitespace-nowrap">{c.agent_name}</p>
                      {c.agent_mobile && (
                        <a href={`tel:${c.agent_mobile}`} className="text-xs text-[#C17F5A] hover:underline">{c.agent_mobile}</a>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex gap-2">
                        {c.dr_url && (
                          <a href={c.dr_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg whitespace-nowrap">DR ↗</a>
                        )}
                        {c.listing_url && (
                          <a href={c.listing_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-lg whitespace-nowrap">{c.listing_label}</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="h-10" />
    </div>
  )
}
