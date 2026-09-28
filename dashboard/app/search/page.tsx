'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DRProperty[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)

    const term = q.trim().toLowerCase()
    const { data } = await supabase
      .from('dubai_residentials_full')
      .select('url, community, property_id, unit_id, apartment_type, location, price_aed, beds, baths, size_sqft')
      .or(`location.ilike.%${term}%,community.ilike.%${term}%,property_id.ilike.%${term}%,unit_id.ilike.%${term}%,apartment_type.ilike.%${term}%`)
      .order('community')
      .limit(50)

    setResults((data ?? []) as DRProperty[])
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  return (
    <div className="min-h-full px-6 py-8 md:px-10">

      <div className="mb-8">
        <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-widest mb-1">Portfolio</p>
        <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tracking-tight">Search Properties</h1>
        <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">Search by name, ID, community, or location</p>
      </div>

      <div className="relative mb-6 max-w-2xl">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A8E84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="e.g. Al Khail Gate, 2bedroom, Phase II-1, akg-1-28…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm bg-white dark:bg-[#2C2822] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C17F5A]/50 placeholder:text-[#9A8E84] dark:placeholder:text-[#9A8E84]"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {loading && <div className="text-center py-20 text-[#9A8E84] dark:text-[#7A7068]">Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-20 text-[#9A8E84] dark:text-[#7A7068]">No properties found for &ldquo;{query}&rdquo;</div>
      )}

      {!loading && !searched && (
        <div className="text-center py-20 text-[#9A8E84]/40 dark:text-[#7A7068]/40 text-sm">Start typing to search</div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3 max-w-3xl">
          <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mb-3">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          {results.map(p => (
            <Link
              key={p.url}
              href={`/property/${encodeURIComponent(p.url)}`}
              className="block bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#C17F5A] bg-[#C17F5A]/10 px-2 py-0.5 rounded-lg">
                      {p.community}
                    </span>
                    {p.apartment_type && (
                      <span className="text-xs text-[#9A8E84] dark:text-[#7A7068]">{p.apartment_type}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#1C1917] dark:text-[#F0EAE2] truncate">{p.location}</p>
                  <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">
                    ID: {p.property_id} · Unit: {p.unit_id}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2]">AED {p.price_aed?.toLocaleString()}</p>
                  <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">
                    {p.beds}bd · {p.baths}ba · {p.size_sqft?.toLocaleString()} sqft
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="h-10" />
    </div>
  )
}
