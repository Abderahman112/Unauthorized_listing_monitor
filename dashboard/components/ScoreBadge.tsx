export default function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 95 ? 'bg-red-100/80 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
    score >= 75 ? 'bg-[#C17F5A]/10 text-[#C17F5A]' :
    score >= 60 ? 'bg-[#EAE4DC] dark:bg-[#1C1814] text-[#9A8E84]' :
                  'bg-[#EAE4DC] dark:bg-[#1C1814] text-[#9A8E84]'
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold tabular-nums ${color}`}>
      {score}%
    </span>
  )
}
