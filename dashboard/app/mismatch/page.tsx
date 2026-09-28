'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = {
  id: number
  status: 'matched' | 'missing_from_bayut' | 'extra_on_bayut'
  dr_url: string | null
  bayut_url: string | null
  dr_beds: number | null
  dr_baths: number | null
  dr_size_sqft: number | null
  dr_price_aed: number | null
  dr_location: string | null
  dr_community: string | null
  dr_unit_id: string | null
  bayut_beds: number | null
  bayut_baths: number | null
  bayut_sqft: number | null
  bayut_price: number | null
  bayut_location: string | null
  bayut_reference: string | null
  bayut_permit: string | null
  price_diff_pct: number | null
  size_diff_pct: number | null
  building_match: boolean | null
  dr_building: string | null
  bayut_building: string | null
}

type Tab = 'all' | 'matched' | 'missing_from_bayut' | 'extra_on_bayut'

export default function MismatchPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [priceOnly, setPriceOnly] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('dr_bayut_comparison')
        .select('*')
        .order('status')
        .limit(500)
      setRows((data ?? []) as Row[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter(r => {
    if (tab !== 'all' && r.status !== tab) return false
    if (priceOnly && r.status === 'matched') return (r.price_diff_pct ?? 0) > 5
    return true
  })

  const counts = {
    matched:            rows.filter(r => r.status === 'matched').length,
    missing_from_bayut: rows.filter(r => r.status === 'missing_from_bayut').length,
    extra_on_bayut:     rows.filter(r => r.status === 'extra_on_bayut').length,
    price_mismatch:     rows.filter(r => r.status === 'matched' && (r.price_diff_pct ?? 0) > 5).length,
  }

  const tabs: { key: Tab; label: string; count: number; active: string; inactive: string }[] = [
    { key: 'all',                label: 'All',              count: rows.length,              active: 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900',    inactive: 'bg-white dark:bg-[#2C2822] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm' },
    { key: 'matched',            label: 'Matched',          count: counts.matched,           active: 'bg-emerald-600 text-white',  inactive: 'bg-white dark:bg-[#2C2822] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm' },
    { key: 'missing_from_bayut', label: 'Missing on Bayut', count: counts.missing_from_bayut, active: 'bg-red-600 text-white',     inactive: 'bg-white dark:bg-[#2C2822] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm' },
    { key: 'extra_on_bayut',     label: 'Extra on Bayut',   count: counts.extra_on_bayut,    active: 'bg-amber-500 text-stone-900', inactive: 'bg-white dark:bg-[#2C2822] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm' },
  ]

  return (
    <div className="min-h-full px-6 py-8 md:px-10">

      <div className="mb-8">
        <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-widest mb-1">Reports</p>
        <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tracking-tight">DR Website vs Bayut</h1>
        <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">Comparing your 118 website units against your 146 official Bayut listings</p>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Matched',            value: counts.matched,            color: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500', sub: 'found on both'          },
            { label: 'Missing from Bayut', value: counts.missing_from_bayut, color: 'text-red-600 dark:text-red-400',         border: 'border-l-red-500',     sub: 'on website, not Bayut' },
            { label: 'Extra on Bayut',     value: counts.extra_on_bayut,     color: 'text-amber-600 dark:text-amber-400',     border: 'border-l-amber-500',   sub: 'on Bayut, not website' },
            { label: 'Price Mismatch',     value: counts.price_mismatch,     color: 'text-rose-600 dark:text-rose-400',       border: 'border-l-rose-500',    sub: 'price differs >5%'     },
          ].map(s => (
            <div key={s.label} className={`bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm border-l-4 ${s.border} p-4 shadow-sm`}>
              <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs + filters */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPriceOnly(false) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? t.active : t.inactive + ' hover:bg-[#EAE4DC]/60 dark:hover:bg-[#1C1814]/60'}`}
              >
                {t.label} <span className="ml-1 opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {(tab === 'matched' || tab === 'all') && (
              <label className="flex items-center gap-2 text-sm text-[#1C1917] dark:text-[#F0EAE2] cursor-pointer">
                <input type="checkbox" checked={priceOnly} onChange={e => setPriceOnly(e.target.checked)} className="rounded accent-amber-500" />
                Price mismatch only (&gt;5%)
              </label>
            )}
            <span className="text-sm text-[#9A8E84] dark:text-[#7A7068]">{filtered.length} rows</span>
          </div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="text-center py-20 text-[#9A8E84] dark:text-[#7A7068]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#9A8E84] dark:text-[#7A7068]">No results</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className={`bg-white dark:bg-[#2C2822] rounded-2xl border shadow-sm p-5 ${
                r.status === 'missing_from_bayut' ? 'border-red-200 dark:border-red-900/50' :
                r.status === 'extra_on_bayut'     ? 'border-amber-200 dark:border-amber-900/50' :
                (r.price_diff_pct ?? 0) > 5       ? 'border-rose-200 dark:border-rose-900/50' :
                                                     ''
              }`}>
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">

                  {/* Status badge */}
                  <div className="shrink-0 w-36">
                    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-lg ${
                      r.status === 'matched'            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                      r.status === 'missing_from_bayut' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                                          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {r.status === 'matched'            ? '✓ Matched' :
                       r.status === 'missing_from_bayut' ? '✗ Missing from Bayut' :
                                                            '+ Extra on Bayut'}
                    </span>
                    {r.building_match === true && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">✓ Same building</p>
                    )}
                    {r.building_match === false && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">✗ Diff building</p>
                    )}
                  </div>

                  {/* DR side */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide mb-1">DR Website</p>
                    {r.dr_url ? (
                      <>
                        <a href={r.dr_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-[#1C1917] dark:text-[#F0EAE2] hover:text-amber-600 dark:hover:text-amber-400 truncate block">
                          {r.dr_location}
                        </a>
                        <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">
                          {r.dr_unit_id} · {r.dr_beds}bd · {r.dr_baths}ba · {r.dr_size_sqft?.toLocaleString()} sqft
                        </p>
                        <p className="text-sm font-bold text-[#1C1917] dark:text-[#F0EAE2] mt-1">
                          AED {r.dr_price_aed?.toLocaleString()}
                        </p>
                        {r.dr_building && <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">Building {r.dr_building}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] italic">Not on DR website</p>
                    )}
                  </div>

                  {/* Diff column */}
                  {r.status === 'matched' && (
                    <div className="shrink-0 w-28 text-center">
                      {(r.price_diff_pct ?? 0) > 0 ? (
                        <div className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                          (r.price_diff_pct ?? 0) > 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          (r.price_diff_pct ?? 0) > 5  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                          'bg-stone-100 dark:bg-[#2A2218] text-[#9A8E84] dark:text-[#9A8E84]'
                        }`}>
                          Price diff<br />{r.price_diff_pct}%
                        </div>
                      ) : (
                        <div className="rounded-lg px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                          Price match
                        </div>
                      )}
                      {(r.size_diff_pct ?? 0) > 0 && (
                        <div className="mt-1 text-xs text-[#9A8E84] dark:text-[#7A7068]">
                          Size diff: {r.size_diff_pct}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bayut side */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-wide mb-1">Bayut (DR Official)</p>
                    {r.bayut_url ? (
                      <>
                        <a href={r.bayut_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-[#1C1917] dark:text-[#F0EAE2] hover:text-amber-600 dark:hover:text-amber-400 truncate block">
                          {r.bayut_location}
                        </a>
                        <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">
                          Ref: {r.bayut_reference} · {r.bayut_beds}bd · {r.bayut_baths}ba · {r.bayut_sqft?.toLocaleString()} sqft
                        </p>
                        <p className="text-sm font-bold text-[#1C1917] dark:text-[#F0EAE2] mt-1">
                          AED {r.bayut_price?.toLocaleString()}
                        </p>
                        {r.bayut_building && <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">Building {r.bayut_building}</p>}
                        {r.bayut_permit && <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">Permit: {r.bayut_permit}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] italic">Not on Bayut</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      <div className="h-10" />
    </div>
  )
}
