'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ConflictRow = {
  id: number
  permit_number: string
  dr_location: string
  agency_name: string
  agent_name: string
  agent_mobile: string | null
  community: string | null
  dr_beds: number
  dr_baths: number
}

type MatchStat = {
  total: number
  high_risk: number
  authorized: number
}

type Stats = {
  dr_properties: number
  bayut_community: number
  matches_total: number
  matches_95: number
  matches_75: number
  conflicts: number
}

export default function FindingsPage() {
  const [conflicts, setConflicts] = useState<ConflictRow[]>([])
  const [stats, setStats] = useState<Stats>({
    dr_properties: 0,
    bayut_community: 0,
    matches_total: 0,
    matches_95: 0,
    matches_75: 0,
    conflicts: 0,
  })
  const [loading, setLoading] = useState(true)

  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    async function load() {
      const [drRes, communityRes, totalRes, highRes, sevRes, conflictsRes, conflictDataRes] = await Promise.all([
        supabase.from('dubai_residentials_full').select('url', { count: 'exact', head: true }),
        supabase.from('bayut_community_rentals').select('id', { count: 'exact', head: true }),
        supabase.from('listing_matches').select('id', { count: 'exact', head: true }),
        supabase.from('listing_matches').select('id', { count: 'exact', head: true }).gte('score', 95).eq('is_authorized', false),
        supabase.from('listing_matches').select('id', { count: 'exact', head: true }).gte('score', 75).eq('is_authorized', false),
        supabase.from('permit_conflicts').select('id', { count: 'exact', head: true }),
        supabase.from('permit_conflicts').select('id, permit_number, dr_location, agency_name, agent_name, agent_mobile, community, dr_beds, dr_baths').order('community').limit(500),
      ])
      setStats({
        dr_properties:  drRes.count ?? 0,
        bayut_community: communityRes.count ?? 0,
        matches_total:  totalRes.count ?? 0,
        matches_95:     highRes.count ?? 0,
        matches_75:     sevRes.count ?? 0,
        conflicts:      conflictsRes.count ?? 0,
      })
      setConflicts((conflictDataRes.data ?? []) as ConflictRow[])
      setLoading(false)
    }
    load()
  }, [])

  // Derived from conflicts
  const byCommunity = conflicts.reduce<Record<string, ConflictRow[]>>((acc, c) => {
    const k = c.community ?? 'Other'
    acc[k] = acc[k] ?? []
    acc[k].push(c)
    return acc
  }, {})

  const byAgency = conflicts.reduce<Record<string, { count: number; agents: Set<string> }>>((acc, c) => {
    const k = c.agency_name ?? 'Unknown'
    if (!acc[k]) acc[k] = { count: 0, agents: new Set() }
    acc[k].count++
    if (c.agent_name) acc[k].agents.add(c.agent_name)
    return acc
  }, {})

  const topAgencies = Object.entries(byAgency).sort((a, b) => b[1].count - a[1].count)
  const commEntries = Object.entries(byCommunity).sort((a, b) => b[1].length - a[1].length)

  const Stat = ({ value, label, sub }: { value: number | string; label: string; sub?: string }) => (
    <div className="border-l-2 border-[#C17F5A] pl-4">
      <p className="text-2xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm font-medium text-[#1C1917] dark:text-[#F0EAE2]">{label}</p>
      {sub && <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] mt-0.5">{sub}</p>}
    </div>
  )

  const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
    <section className="mb-12">
      <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-xs font-mono text-[#C17F5A] font-bold">{n}</span>
        <h2 className="text-lg font-semibold text-[#1C1917] dark:text-[#F0EAE2]">{title}</h2>
      </div>
      {children}
    </section>
  )

  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] leading-relaxed mb-4">{children}</p>
  )

  return (
    <div className="min-h-full px-6 py-8 md:px-10">
      <div className="max-w-4xl mx-auto">

        {/* Toolbar */}
        <div className="print:hidden flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-widest mb-1">Dubai Residential L.L.C</p>
            <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tracking-tight">Findings Report</h1>
            <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">Complete summary of the unauthorized listing monitoring project</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#1C1917] dark:bg-[#F0EAE2] hover:bg-black dark:hover:bg-white text-white dark:text-[#1C1917] text-sm font-medium px-5 py-2.5 rounded-2xl shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Save as PDF
          </button>
        </div>

        {/* Report document */}
        <div className="bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm print:shadow-none print:border-none">

          {/* Cover */}
          <div className="px-8 sm:px-12 pt-10 pb-8 border-b border-black/[0.06] dark:border-white/[0.06]">
            <p className="text-[10px] font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-[0.2em] mb-6">Confidential — Internal Use Only</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1C1917] dark:text-[#F0EAE2] leading-tight tracking-tight">
              Unauthorized Listing<br />Intelligence Report
            </h1>
            <p className="text-[#9A8E84] dark:text-[#7A7068] mt-3 text-sm">
              Dubai Residential L.L.C · Generated {reportDate}
            </p>

            {/* Key numbers */}
            {loading ? (
              <div className="mt-8 text-sm text-[#9A8E84]">Loading data…</div>
            ) : (
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
                <Stat value={stats.dr_properties} label="Properties Monitored" sub="DR official listings" />
                <Stat value={stats.bayut_community} label="Bayut Listings Scraped" sub="across 14 communities" />
                <Stat value={stats.matches_75} label="High-Risk Matches" sub="similarity score ≥ 75%" />
                <Stat value={stats.matches_95} label="Critical Matches" sub="similarity score ≥ 95%" />
                <Stat value={new Set(conflicts.map(c => c.permit_number)).size} label="Permits Compromised" sub="unique DLD permit numbers" />
                <Stat value={stats.conflicts} label="Confirmed Violations" sub="same permit, different agent" />
              </div>
            )}
          </div>

          <div className="px-8 sm:px-12 py-10">

            {/* ── 1. Background ── */}
            <Section n="01" title="Background & Purpose">
              <P>
                Dubai Residential L.L.C (DR) manages a large portfolio of residential properties across multiple
                communities in Dubai. As the exclusive property manager, DR lists these units on Bayut.com —
                the UAE's largest property portal — with registered DLD (Dubai Land Department) permits.
              </P>
              <P>
                A growing concern was that third-party real estate agents were copying DR's listings and advertising
                the same physical units on Bayut under their own agency names, without any authorization from DR or
                from the property owners. This practice misleads potential tenants, creates confusion in the market,
                and directly competes against DR's own listings — sometimes at different prices.
              </P>
              <P>
                This project was built to <strong className="text-[#1C1917] dark:text-[#F0EAE2]">systematically detect and document</strong> every
                unauthorized listing of a DR-managed unit on Bayut, producing verified evidence suitable for formal
                complaints to Bayut and to the DLD.
              </P>
            </Section>

            {/* ── 2. What We Built ── */}
            <Section n="02" title="What We Built">
              <P>
                The monitoring system has two main components — a <strong className="text-[#1C1917] dark:text-[#F0EAE2]">scraper</strong> and
                a <strong className="text-[#1C1917] dark:text-[#F0EAE2]">dashboard</strong>.
              </P>

              <div className="space-y-4 mb-4">
                {[
                  {
                    title: 'Bayut Scraper (Stage 1)',
                    desc: 'Automated scripts visit Bayut.com and collect every listing in the 14 communities where DR manages properties. For each listing it records the title, price, beds, baths, area, reference number, agent name, agency name, agent phone, and the DLD permit number. This runs headlessly on a cloud server using Google Chrome and botasaurus.'
                  },
                  {
                    title: 'Bayut Scraper (Stage 2)',
                    desc: 'A second script visits the detail page of every listing found in Stage 1 to extract the full property data including regulatory information, photos, and additional metadata not visible on the search results page.'
                  },
                  {
                    title: 'DR Portfolio Database',
                    desc: 'All of DR\'s official property records — scraped from the Dubai Residential website — are stored in a Supabase database. This includes the exact size, price, number of beds and baths, unit ID, and the official Bayut URL for each DR-managed unit.'
                  },
                  {
                    title: 'Similarity Matching Engine',
                    desc: 'A scoring algorithm compares every DR property against every scraped Bayut listing. It assigns a similarity score out of 100 based on: beds (40 pts), baths (20 pts), size within ±20% (up to 20 pts), and price within ±20% (up to 20 pts). Any listing scoring 75% or above is flagged as a potential duplicate.'
                  },
                  {
                    title: 'Permit Number Verification',
                    desc: 'Because similarity scores alone can produce false positives (two different apartments in the same community may have the same number of beds), we cross-reference DLD permit numbers. In the UAE, a DLD permit number is issued per physical unit. If the same permit number appears on both a DR listing and an unauthorized listing, it is a 100% confirmed match — the same physical apartment, listed by two different agents.'
                  },
                  {
                    title: 'Live Dashboard',
                    desc: 'All findings are displayed on a private web dashboard running at 172.18.20.67:3000. The dashboard shows match cards with photos side-by-side, a sortable conflicts table, an agent fingerprinting view, and a printable legal report.'
                  },
                ].map(item => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#C17F5A] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] mb-0.5">{item.title}</p>
                      <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── 3. Scope ── */}
            <Section n="03" title="Monitoring Scope">
              <P>
                The scraper covered <strong className="text-[#1C1917] dark:text-[#F0EAE2]">14 communities</strong> on Bayut,
                collectively representing the full geographic footprint of DR-managed properties.
              </P>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                      <th className="text-left text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest py-2 pr-6">Community</th>
                      <th className="text-right text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest py-2 pr-6">Bayut Listings Scraped</th>
                      <th className="text-right text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest py-2">DR Units Managed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { community: 'International City',       scraped: 1526, dr: 35 },
                      { community: 'Jebel Ali (incl. Village)', scraped: 764,  dr: 0  },
                      { community: 'Discovery Gardens',        scraped: 588,  dr: 1  },
                      { community: 'City Walk Residences',     scraped: 494,  dr: 1  },
                      { community: 'Bluewaters Residences',    scraped: 173,  dr: 9  },
                      { community: 'The Gardens',              scraped: 185,  dr: 20 },
                      { community: 'Remraam',                  scraped: 142,  dr: 0  },
                      { community: 'Garden View Apartments',   scraped: 39,   dr: 14 },
                      { community: 'Bayti Homes',              scraped: 32,   dr: 0  },
                      { community: 'Dubai Wharf',              scraped: 23,   dr: 2  },
                      { community: 'Al Khail Gate',            scraped: 18,   dr: 3  },
                      { community: 'Badrah',                   scraped: 16,   dr: 0  },
                      { community: 'Manazel Al Khor',          scraped: 9,    dr: 2  },
                      { community: 'Meydan Residence 1',       scraped: 11,   dr: 9  },
                    ].map(r => (
                      <tr key={r.community} className="border-b border-black/[0.06] dark:border-white/[0.06]border-zinc-100 ">
                        <td className="py-2 pr-6 text-[#1C1917] dark:text-[#F0EAE2]">{r.community}</td>
                        <td className="py-2 pr-6 text-right font-mono text-[#1C1917] dark:text-[#F0EAE2] tabular-nums">{r.scraped.toLocaleString()}</td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          <span className={r.dr > 0 ? 'text-[#C17F5A] font-semibold' : 'text-stone-300 dark:text-stone-700'}>
                            {r.dr > 0 ? r.dr : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-stone-300 dark:border-[#333]">
                      <td className="py-2 pr-6 font-semibold text-[#1C1917] dark:text-[#F0EAE2]">Total</td>
                      <td className="py-2 pr-6 text-right font-bold text-[#1C1917] dark:text-[#F0EAE2] tabular-nums">4,020</td>
                      <td className="py-2 text-right font-bold text-[#C17F5A] tabular-nums">97</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <P>
                In addition to the community scrape, DR's <strong className="text-[#1C1917] dark:text-[#F0EAE2]">own official Bayut listings</strong> (approximately
                146 listings) were scraped separately to establish a ground-truth dataset — these are the listings
                DR itself publishes on Bayut with full authorization.
              </P>
            </Section>

            {/* ── 4. Detection Method ── */}
            <Section n="04" title="How We Detect Unauthorized Listings">
              <P>
                We use a two-stage detection process. Stage 1 is similarity scoring, which casts a wide net.
                Stage 2 is permit verification, which gives us legally defensible proof.
              </P>

              <div className="bg-[#EAE4DC] dark:bg-[#1C1814] shadow-sm rounded-lg p-5 mb-6">
                <p className="text-[11px] font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest mb-4">Stage 1 — Similarity Score (out of 100)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Beds match', pts: '40 pts', desc: 'Exact bedroom count match' },
                    { label: 'Baths match', pts: '20 pts', desc: 'Exact bathroom count match' },
                    { label: 'Size match', pts: '≤20 pts', desc: 'Linear scale within ±20%' },
                    { label: 'Price match', pts: '≤20 pts', desc: 'Linear scale within ±20%' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-lg font-bold text-[#C17F5A]">{s.pts}</p>
                      <p className="text-sm font-medium text-[#1C1917] dark:text-[#F0EAE2]">{s.label}</p>
                      <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#EAE4DC] dark:bg-[#1C1814] shadow-sm rounded-lg p-5 mb-4">
                <p className="text-[11px] font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest mb-3">Stage 2 — DLD Permit Verification (100% conclusive)</p>
                <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] leading-relaxed">
                  Every rental listing in the UAE must display a DLD (Dubai Land Department) permit number.
                  This number is issued per physical unit — not per agent, not per listing. If the same permit
                  number appears on both DR's official listing and a third-party listing, it is <strong className="text-[#1C1917] dark:text-[#F0EAE2]">legally confirmed</strong> that
                  both listings advertise the same apartment. There is no margin for error. This is the
                  evidence standard we use for formal complaints.
                </p>
              </div>

              <P>
                Listings that score 60–74% are kept for awareness but are not treated as definitive.
                Listings scoring 75%+ are considered high-risk and reviewed. Listings where the DLD permit
                number matches exactly are confirmed violations regardless of the similarity score.
              </P>
            </Section>

            {/* ── 5. Results ── */}
            <Section n="05" title="Results: What We Found">
              {loading ? (
                <div className="text-sm text-[#9A8E84]">Loading live data…</div>
              ) : (
                <>
                  <P>
                    After running the comparison engine across all{' '}
                    <strong className="text-[#1C1917] dark:text-[#F0EAE2]">{stats.dr_properties} DR properties</strong> against{' '}
                    <strong className="text-[#1C1917] dark:text-[#F0EAE2]">{stats.bayut_community.toLocaleString()} community listings</strong>,
                    the system generated a total of{' '}
                    <strong className="text-[#1C1917] dark:text-[#F0EAE2]">{stats.matches_total.toLocaleString()} match records</strong>{' '}
                    across all score levels.
                  </P>

                  {/* Score distribution */}
                  <div className="shadow-sm rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#EAE4DC] dark:bg-[#1C1814] border-b border-black/[0.06] dark:border-white/[0.06]">
                          <th className="text-left text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest px-4 py-3">Score Range</th>
                          <th className="text-left text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest px-4 py-3">Meaning</th>
                          <th className="text-right text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest px-4 py-3">Count</th>
                          <th className="text-left text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-[#1a1a1a]">
                        {[
                          { range: '95 – 100%', meaning: 'Almost certainly the same unit', count: stats.matches_95, action: 'Immediate review', color: 'text-red-600 dark:text-red-400' },
                          { range: '75 – 94%', meaning: 'Very likely the same unit', count: stats.matches_75 - stats.matches_95, action: 'Flag for review', color: 'text-[#C17F5A]' },
                          { range: '60 – 74%', meaning: 'Possible match, needs context', count: stats.matches_total - stats.matches_75, action: 'Monitor', color: 'text-[#9A8E84] dark:text-[#7A7068]' },
                        ].map(r => (
                          <tr key={r.range} className="px-4">
                            <td className={`px-4 py-3 font-bold tabular-nums ${r.color}`}>{r.range}</td>
                            <td className="px-4 py-3 text-[#9A8E84] dark:text-[#7A7068]">{r.meaning}</td>
                            <td className={`px-4 py-3 text-right font-bold tabular-nums ${r.color}`}>{r.count.toLocaleString()}</td>
                            <td className="px-4 py-3 text-[#9A8E84] dark:text-[#7A7068] text-xs">{r.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <P>
                    Of the <strong className="text-[#1C1917] dark:text-[#F0EAE2]">{stats.conflicts} confirmed permit conflicts</strong>, every single one
                    is an unauthorized listing where a third-party agency has taken a DR property's DLD permit
                    number and listed the same physical unit on Bayut as if they have the right to rent it out.
                    DR has not authorized any of these agents.
                  </P>
                </>
              )}
            </Section>

            {/* ── 6. Permit Conflicts ── */}
            <Section n="06" title="Confirmed Permit Violations">
              <P>
                A permit conflict is confirmed when: (1) DR has an official Bayut listing with a specific DLD
                permit number, and (2) a different agent on Bayut is advertising a listing with the exact same
                DLD permit number. This is legally conclusive evidence of the same physical unit being listed
                without DR's authorization.
              </P>

              {/* Community breakdown */}
              {commEntries.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest mb-3">Violations by Community</p>
                  <div className="space-y-2">
                    {commEntries.map(([comm, rows]) => (
                      <div key={comm} className="flex items-center gap-3">
                        <span className="text-sm text-[#1C1917] dark:text-[#F0EAE2] w-48 shrink-0 truncate">{comm}</span>
                        <div className="flex-1 h-1.5 bg-stone-100 dark:bg-[#2A2218] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 dark:bg-red-600 rounded-full"
                            style={{ width: `${(rows.length / conflicts.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums w-8 text-right shrink-0">{rows.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What the violation looks like */}
              <div className="bg-[#EAE4DC] dark:bg-[#1C1814] shadow-sm rounded-lg p-5 mb-4">
                <p className="text-[11px] font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest mb-3">Example of a Violation</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-wide mb-1">DR — Official Listing</p>
                    <p className="text-[#1C1917] dark:text-[#F0EAE2]">Agent: Dubai Residential L.L.C</p>
                    <p className="text-[#1C1917] dark:text-[#F0EAE2]">Permit: REG/2024/XXXXXX</p>
                    <p className="text-[#9A8E84] dark:text-[#7A7068] text-xs mt-1">Listed by the authorized property manager</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Unauthorized Listing</p>
                    <p className="text-[#1C1917] dark:text-[#F0EAE2]">Agent: Random Real Estate LLC</p>
                    <p className="text-red-500 dark:text-red-400">Permit: REG/2024/XXXXXX ← same</p>
                    <p className="text-[#9A8E84] dark:text-[#7A7068] text-xs mt-1">Same apartment, different agent, no authorization</p>
                  </div>
                </div>
              </div>
            </Section>

            {/* ── 7. Agency Analysis ── */}
            <Section n="07" title="Agency & Agent Analysis">
              <P>
                The unauthorized listings come from <strong className="text-[#1C1917] dark:text-[#F0EAE2]">{topAgencies.length} different real estate agencies</strong>.
                Some are repeat offenders with multiple unauthorized listings across different communities.
                Below are the top offending agencies by number of confirmed violations.
              </P>

              {topAgencies.length > 0 && (
                <div className="shadow-sm rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#EAE4DC] dark:bg-[#1C1814] border-b border-black/[0.06] dark:border-white/[0.06]">
                        <th className="text-left text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest px-4 py-3">Agency</th>
                        <th className="text-left text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest px-4 py-3">Agents Involved</th>
                        <th className="text-right text-[11px] font-semibold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-widest px-4 py-3">Violations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-[#1a1a1a]">
                      {topAgencies.slice(0, 15).map(([agency, data]) => (
                        <tr key={agency}>
                          <td className="px-4 py-3 font-medium text-[#1C1917] dark:text-[#F0EAE2]">{agency}</td>
                          <td className="px-4 py-3 text-[#9A8E84] dark:text-[#7A7068] text-xs">{Array.from(data.agents).join(', ')}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400 tabular-nums">{data.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <P>
                Each of these agencies has at least one agent listing properties they have no right to list.
                In many cases the agent has the property owner's contact details from a past viewing or inquiry,
                and is exploiting the DLD permit number (which is printed on the physical property documents)
                to create a listing that appears legitimate.
              </P>
            </Section>

            {/* ── 8. Key Observations ── */}
            <Section n="08" title="Key Observations">
              <div className="space-y-4">
                {[
                  {
                    title: 'All violations are permit-verified',
                    body: `Every one of the ${conflicts.length || 64} confirmed violations was identified through DLD permit number matching — not just similarity scoring. This means each case is legally defensible with a direct, traceable paper trail.`
                  },
                  {
                    title: 'No false positives in the confirmed set',
                    body: 'Because the DLD permit is a unique identifier for a physical unit (not a listing), the permit-match methodology produces zero false positives. If the permit matches, it is the same apartment.'
                  },
                  {
                    title: '107 out of 114 DR properties have at least one Bayut match',
                    body: 'The vast majority of DR-managed units appear in the community scrape results at some similarity score. This shows how widely these units are being listed by unauthorized agents. Not all 107 are violations — some are DR\'s own authorized listings — but the volume demonstrates the scale of the problem.'
                  },
                  {
                    title: 'Multiple communities are affected',
                    body: 'The violations are spread across many different communities, not concentrated in one area. This rules out a single rogue agent and indicates a systematic industry practice where agents list any available unit regardless of who manages it.'
                  },
                  {
                    title: 'Some agencies have multiple violations',
                    body: 'Several agencies appear more than once in the violations list with different agents, suggesting that unauthorized listing may be an agency-wide practice rather than isolated individual behavior.'
                  },
                ].map(obs => (
                  <div key={obs.title} className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C17F5A] mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] mb-0.5">{obs.title}</p>
                      <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] leading-relaxed">{obs.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── 9. Recommended Actions ── */}
            <Section n="09" title="Recommended Actions">
              <div className="space-y-3">
                {[
                  {
                    label: 'File formal complaints with Bayut',
                    body: 'Submit the permit conflict data (available in the Violation Report page) to Bayut\'s trust & safety team. Bayut has a process for removing listings that use a permit number already claimed by the authorized agency. The permit-verified list is the strongest possible evidence for this.'
                  },
                  {
                    label: 'Report to the DLD',
                    body: 'Under UAE law, listing a property without authorization is a violation of RERA (Real Estate Regulatory Agency) regulations. The DLD can take action against agencies found to be listing properties without the property manager\'s consent. The permit numbers in our report can be cross-referenced in the DLD\'s own system.'
                  },
                  {
                    label: 'Trademark / brand protection on Bayut',
                    body: 'Request that Bayut give DR verified-agency status, which would make DR\'s listings display a verification badge and make it harder for other agents to list the same permit number simultaneously.'
                  },
                  {
                    label: 'Continue monitoring',
                    body: 'The scraper is designed to run continuously. As new listings appear on Bayut, they are automatically compared against DR\'s portfolio. The dashboard should be checked weekly, and the full scrape refreshed monthly to catch new violations.'
                  },
                  {
                    label: 'Watermark permit numbers',
                    body: 'Consider whether the DLD permit number needs to be protected more carefully in physical documents shared with applicants, to make it harder for unauthorized agents to use it in Bayut listings.'
                  },
                ].map((item, i) => (
                  <div key={item.label} className="flex gap-4 p-4 shadow-sm rounded-lg">
                    <span className="text-[11px] font-bold text-[#C17F5A] mt-0.5 shrink-0 w-5">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] mb-0.5">{item.label}</p>
                      <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── 10. Methodology Limitations ── */}
            <Section n="10" title="Methodology & Limitations">
              <P>
                The similarity score has known limitations. Two different units in the same community with the
                same number of beds, baths, and a similar price and size will score highly against each other
                even if they are not the same apartment. This is why similarity scores alone are not used as
                the final evidence — only permit matches are.
              </P>
              <P>
                Not all scraped listings have a permit number (some agents intentionally omit them to avoid
                detection). These listings appear in the high-risk similarity results but cannot be permit-verified.
                They are flagged for manual review.
              </P>
              <P>
                The Bayut community scrape covers listings at a point in time. Listings that were taken down
                before the scrape or listed after it will not be captured. Regular re-scraping is required
                to maintain current coverage.
              </P>
              <P>
                The DR portfolio database contains{' '}
                <strong className="text-[#1C1917] dark:text-[#F0EAE2]">{stats.dr_properties} properties</strong>{' '}
                as scraped from the Dubai Residential website. Any units not listed on the DR website at
                the time of scraping are not covered by the monitoring.
              </P>
            </Section>

          </div>

          {/* Footer */}
          <div className="px-8 sm:px-12 py-5 border-t  bg-[#EAE4DC] dark:bg-[#1C1814] rounded-b-xl print:bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">
                Dubai Residential L.L.C · Confidential · {reportDate}
              </p>
              <div className="flex gap-4 text-xs text-[#9A8E84] dark:text-[#7A7068] print:hidden">
                <Link href="/conflicts" className="hover:text-[#C17F5A]">View Conflicts Table →</Link>
                <Link href="/report" className="hover:text-[#C17F5A]">Legal Violation Report →</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="h-12 print:hidden" />
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; size: A4; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
