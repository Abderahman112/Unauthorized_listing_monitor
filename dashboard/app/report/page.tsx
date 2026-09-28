'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Conflict = {
  id: number
  permit_number: string
  dr_bayut_url: string
  dr_reference: string
  dr_location: string
  dr_beds: number
  dr_baths: number
  unauthorized_url: string
  unauthorized_reference: string
  unauthorized_location: string
  unauthorized_beds: number
  unauthorized_baths: number
  agent_name: string
  agency_name: string
  agent_mobile: string | null
  community: string | null
  created_at: string
}

const COMMUNITY_ORDER = [
  'The Gardens', 'Gardens Apartments', 'Garden View Apartments', 'Garden View Villas',
  'Citywalk', 'Bluewaters', 'Meydan Residence 1', 'International City',
  'Discovery Gardens', 'Manazel Al Khor',
]

export default function ReportPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('permit_conflicts')
        .select('*')
        .order('community')
        .limit(500)
      setConflicts((data ?? []) as Conflict[])
      setLoading(false)
    }
    load()
  }, [])

  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const byCommunity = conflicts.reduce<Record<string, Conflict[]>>((acc, c) => {
    const key = c.community ?? 'Other'
    acc[key] = acc[key] ?? []
    acc[key].push(c)
    return acc
  }, {})

  const orderedCommunities = [
    ...COMMUNITY_ORDER.filter(c => byCommunity[c]),
    ...Object.keys(byCommunity).filter(c => !COMMUNITY_ORDER.includes(c)),
  ]

  const agencyCounts = conflicts.reduce<Record<string, { count: number; agents: Set<string> }>>((acc, c) => {
    const k = c.agency_name ?? 'Unknown'
    if (!acc[k]) acc[k] = { count: 0, agents: new Set() }
    acc[k].count++
    if (c.agent_name) acc[k].agents.add(c.agent_name)
    return acc
  }, {})
  const agencySummary = Object.entries(agencyCounts).sort((a, b) => b[1].count - a[1].count)

  let violationNum = 0

  if (loading) {
    return (
      <div className="min-h-full px-6 py-8 md:px-10 flex items-center justify-center text-[#9A8E84] dark:text-[#7A7068]">
        Loading report...
      </div>
    )
  }

  return (
    <div className="min-h-full px-6 py-8 md:px-10">
      <div className="max-w-4xl mx-auto">

        {/* Toolbar */}
        <div className="print:hidden flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-widest mb-1">Reports</p>
            <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tracking-tight">Violation Report</h1>
            <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">Printable report of all confirmed permit conflicts</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-stone-900 dark:bg-[#F0EBE3] hover:bg-stone-700 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-medium px-5 py-2.5 rounded-2xl shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save as PDF
          </button>
        </div>

        {/* Report document */}
        <div className="bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm print:shadow-none print:border-none print:rounded-none">

          {/* Cover */}
          <div className="px-10 sm:px-12 pt-12 pb-8 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-[0.2em] mb-3">Confidential</p>
                <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] leading-tight">
                  Unauthorized Listing<br />Violation Report
                </h1>
                <p className="text-base text-[#9A8E84] dark:text-[#7A7068] mt-3">
                  Prepared by Dubai Residential L.L.C<br />
                  Date: {reportDate}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-block bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-6 py-4">
                  <p className="text-xs text-red-500 dark:text-red-400 font-bold uppercase tracking-wide">Total Violations</p>
                  <p className="text-5xl font-bold text-red-600 dark:text-red-400 mt-1">{conflicts.length}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-[#1C1917] dark:text-[#F0EAE2] mt-6 leading-relaxed max-w-2xl">
              This report documents <strong>{conflicts.length} confirmed instances</strong> of unauthorized property listings
              on Bayut.com where third-party agents have listed Dubai Residential units using the company&apos;s
              registered DLD permit numbers without authorization. Each violation has been verified by matching
              the DLD permit number of Dubai Residential&apos;s official listing against the unauthorized listing.
            </p>
          </div>

          {/* Executive Summary */}
          <div className="px-10 sm:px-12 py-8 border-b border-black/[0.06] dark:border-white/[0.06]">
            <h2 className="text-lg font-bold text-[#1C1917] dark:text-[#F0EAE2] mb-5">Executive Summary</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Units Compromised',    value: new Set(conflicts.map(c => c.permit_number)).size, sub: 'unique DLD permits'    },
                { label: 'Communities Affected', value: orderedCommunities.length,                          sub: 'out of 22 managed'    },
                { label: 'Agencies Involved',    value: agencySummary.length,                              sub: 'real estate agencies' },
              ].map(s => (
                <div key={s.label} className="bg-[#EAE4DC] dark:bg-[#1C1814] rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-[#1C1917] dark:text-[#F0EAE2]">{s.value}</p>
                  <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="text-left text-xs text-[#9A8E84] dark:text-[#7A7068] font-semibold uppercase tracking-wide py-2">Community</th>
                  <th className="text-right text-xs text-[#9A8E84] dark:text-[#7A7068] font-semibold uppercase tracking-wide py-2">Violations</th>
                  <th className="text-right text-xs text-[#9A8E84] dark:text-[#7A7068] font-semibold uppercase tracking-wide py-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {orderedCommunities.map(comm => (
                  <tr key={comm} className="border-b border-black/[0.06] dark:border-white/[0.06]border-stone-100 ">
                    <td className="py-2 text-[#1C1917] dark:text-[#F0EAE2]">{comm}</td>
                    <td className="py-2 text-right font-semibold text-[#1C1917] dark:text-[#F0EAE2]">{byCommunity[comm].length}</td>
                    <td className="py-2 text-right text-[#9A8E84] dark:text-[#7A7068]">
                      {Math.round((byCommunity[comm].length / conflicts.length) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F0EAE2] mb-3">Agencies Involved</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="text-left text-xs text-[#9A8E84] dark:text-[#7A7068] font-semibold uppercase tracking-wide py-2">Agency</th>
                  <th className="text-left text-xs text-[#9A8E84] dark:text-[#7A7068] font-semibold uppercase tracking-wide py-2">Agents</th>
                  <th className="text-right text-xs text-[#9A8E84] dark:text-[#7A7068] font-semibold uppercase tracking-wide py-2">Violations</th>
                </tr>
              </thead>
              <tbody>
                {agencySummary.map(([agency, data]) => (
                  <tr key={agency} className="border-b border-black/[0.06] dark:border-white/[0.06]border-stone-100 ">
                    <td className="py-2 text-[#1C1917] dark:text-[#F0EAE2] font-medium">{agency}</td>
                    <td className="py-2 text-[#9A8E84] dark:text-[#7A7068] text-xs">{Array.from(data.agents).join(', ')}</td>
                    <td className="py-2 text-right font-semibold text-red-600 dark:text-red-400">{data.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed Violations */}
          <div className="px-10 sm:px-12 py-8">
            <h2 className="text-lg font-bold text-[#1C1917] dark:text-[#F0EAE2] mb-6">Detailed Violations</h2>

            {orderedCommunities.map((comm, ci) => (
              <div key={comm} className={ci > 0 ? 'mt-10' : ''}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-base font-bold text-[#1C1917] dark:text-[#F0EAE2]">{comm}</h3>
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full">
                    {byCommunity[comm].length} violation{byCommunity[comm].length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {byCommunity[comm].map(c => {
                    violationNum++
                    return (
                      <div key={c.id} className="shadow-sm rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between bg-[#EAE4DC] dark:bg-[#1C1814] px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-white bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                              {violationNum}
                            </span>
                            <span className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] truncate">{c.dr_location}</span>
                          </div>
                          <span className="text-xs font-mono text-[#9A8E84] dark:text-[#7A7068] shrink-0 ml-4">
                            Permit: {c.permit_number}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-black/[0.06] dark:divide-white/[0.06]">
                          <div className="px-4 py-3">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">
                              Dubai Residential — Official
                            </p>
                            <p className="text-sm text-[#1C1917] dark:text-[#F0EAE2]">{c.dr_location}</p>
                            <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">
                              {c.dr_beds} Bed · {c.dr_baths} Bath
                            </p>
                            <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">Ref: {c.dr_reference}</p>
                            <a href={c.dr_bayut_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1 block print:text-[#9A8E84] print:no-underline">
                              {c.dr_bayut_url}
                            </a>
                          </div>

                          <div className="px-4 py-3 bg-red-50/50 dark:bg-red-950/20">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">
                              Unauthorized Listing
                            </p>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{c.agency_name}</p>
                            <p className="text-xs text-[#1C1917] dark:text-[#F0EAE2] mt-0.5">Agent: {c.agent_name}</p>
                            {c.agent_mobile && (
                              <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">Tel: {c.agent_mobile}</p>
                            )}
                            <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">Ref: {c.unauthorized_reference}</p>
                            <a href={c.unauthorized_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1 block print:text-[#9A8E84] print:no-underline">
                              {c.unauthorized_url}
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-10 sm:px-12 py-5 border-t  bg-[#EAE4DC] dark:bg-[#1C1814] print:bg-white rounded-b-2xl">
            <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] text-center">
              Dubai Residential L.L.C · Confidential · Generated {reportDate} ·
              All violations confirmed via DLD permit number cross-reference
            </p>
          </div>
        </div>

        <div className="h-12 print:hidden" />
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </div>
  )
}
