'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type AgentRow = {
  agent_name: string
  agency_name: string
  match_count: number
  avg_score: number
  max_score: number
  listings: { bayut_url: string; score: number; dr_location: string }[]
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('listing_matches')
        .select(`
          dr_url, score,
          dubai_residentials_full!listing_matches_dr_url_fkey(location),
          bayut_community_rentals!listing_matches_bayut_id_fkey(url, agent, agency)
        `)
        .gte('score', 60)
        .order('score', { ascending: false })
        .limit(2000)

      if (!data) { setLoading(false); return }

      const map = new Map<string, AgentRow>()
      for (const row of data as any[]) {
        const b = row.bayut_community_rentals
        const dr = row.dubai_residentials_full
        const agentName: string = b?.agent?.name ?? 'Unknown Agent'
        const agencyName: string = b?.agency?.name ?? ''
        const key = agentName

        if (!map.has(key)) {
          map.set(key, { agent_name: agentName, agency_name: agencyName, match_count: 0, avg_score: 0, max_score: 0, listings: [] })
        }
        const entry = map.get(key)!
        entry.match_count++
        entry.max_score = Math.max(entry.max_score, row.score)
        entry.listings.push({ bayut_url: b?.url ?? '', score: row.score, dr_location: dr?.location ?? '' })
      }

      const rows: AgentRow[] = Array.from(map.values()).map(a => ({
        ...a,
        avg_score: Math.round(a.listings.reduce((s, l) => s + l.score, 0) / a.listings.length),
      }))
      rows.sort((a, b) => b.match_count - a.match_count)
      setAgents(rows)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-full px-6 py-8 md:px-10">

      <div className="mb-8">
        <p className="text-xs font-semibold text-[#C17F5A] uppercase tracking-widest mb-1">Intelligence</p>
        <h1 className="text-3xl font-bold text-[#1C1917] dark:text-[#F0EAE2] tracking-tight">Agent Fingerprinting</h1>
        <p className="text-sm text-[#9A8E84] dark:text-[#7A7068] mt-1">Agents ranked by number of high-similarity matches with your properties</p>
      </div>

        {loading ? (
          <div className="text-center py-20 text-[#9A8E84] dark:text-[#7A7068]">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 text-[#9A8E84] dark:text-[#7A7068]">No agents found</div>
        ) : (
          <div className="space-y-3">
            {agents.map((a, i) => (
              <div key={a.agent_name}
                className="bg-white dark:bg-[#2C2822] rounded-2xl shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#EAE4DC]/50 dark:hover:bg-[#1C1814]/50 transition-colors"
                  onClick={() => setExpanded(expanded === a.agent_name ? null : a.agent_name)}
                >
                  <span className="w-7 h-7 rounded-full bg-[#C17F5A]/10 text-[#C17F5A] text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] truncate">{a.agent_name}</p>
                    <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">{a.agency_name}</p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 text-right">
                    <div>
                      <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">Matches</p>
                      <p className="text-lg font-bold text-[#1C1917] dark:text-[#F0EAE2]">{a.match_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">Avg score</p>
                      <p className={`text-lg font-bold ${
                        a.avg_score >= 80 ? 'text-red-600 dark:text-red-400'
                        : a.avg_score >= 70 ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[#9A8E84] dark:text-[#9A8E84]'
                      }`}>
                        {a.avg_score}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9A8E84] dark:text-[#7A7068]">Top score</p>
                      <p className="text-lg font-bold text-[#1C1917] dark:text-[#F0EAE2]">{a.max_score}%</p>
                    </div>
                    <span className="text-stone-300 dark:text-[#9A8E84]">{expanded === a.agent_name ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded === a.agent_name && (
                  <div className="border-t border-stone-100  px-5 py-3 space-y-2 bg-[#EAE4DC] dark:bg-[#1C1814]">
                    {a.listings.slice(0, 10).map((l, j) => (
                      <div key={j} className="flex items-center justify-between text-xs gap-4">
                        <span className="text-[#1C1917] dark:text-[#F0EAE2] truncate flex-1">{l.dr_location}</span>
                        <span className="text-[#9A8E84] dark:text-[#7A7068] shrink-0">Score: <strong>{l.score}%</strong></span>
                        <a href={l.bayut_url} target="_blank" rel="noopener noreferrer"
                          className="text-[#C17F5A] hover:underline shrink-0">
                          View on Bayut ↗
                        </a>
                      </div>
                    ))}
                    {a.listings.length > 10 && (
                      <p className="text-xs text-[#9A8E84] dark:text-[#7A7068] pt-1">+{a.listings.length - 10} more matches</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      <div className="h-10" />
    </div>
  )
}
