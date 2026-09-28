type Breakdown = {
  score_beds: number
  score_baths: number
  score_size: number
  score_price: number
}

export default function ScoreBreakdown({ b }: { b: Breakdown }) {
  const items = [
    { label: 'Beds',  pct: b.score_beds  > 0 ? 100 : 0, partial: false },
    { label: 'Baths', pct: b.score_baths > 0 ? 100 : 0, partial: false },
    { label: 'Size',  pct: Math.round((b.score_size  / 20) * 100), partial: b.score_size > 0 && b.score_size < 20 },
    { label: 'Price', pct: Math.round((b.score_price / 20) * 100), partial: b.score_price > 0 && b.score_price < 20 },
  ]
  return (
    <div className="space-y-1.5 w-full">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-8 text-[#9A8E84] dark:text-[#7A7068] shrink-0">{item.label}</span>
          <div className="flex-1 bg-[#EAE4DC] dark:bg-[#1C1814] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                item.pct === 0 ? '' : item.partial ? 'bg-[#C17F5A]' : 'bg-emerald-500'
              }`}
              style={{ width: `${item.pct}%` }}
            />
          </div>
          <span className={`w-8 text-right shrink-0 font-medium tabular-nums ${
            item.pct === 0 ? 'text-red-400' : item.partial ? 'text-[#C17F5A]' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {item.pct === 0 ? '✗' : `${item.pct}%`}
          </span>
        </div>
      ))}
    </div>
  )
}
