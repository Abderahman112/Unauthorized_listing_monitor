'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const nav = [
  {
    section: 'Monitor',
    links: [
      { href: '/',          label: 'Dashboard'      },
      { href: '/conflicts', label: 'Conflicts'       },
    ],
  },
  {
    section: 'Reports',
    links: [
      { href: '/report',   label: 'Violations'  },
      { href: '/mismatch', label: 'DR vs Bayut' },
    ],
  },
  {
    section: 'Tools',
    links: [
      { href: '/search', label: 'Search'  },
      { href: '/agents', label: 'Agents'  },
    ],
  },
]

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

export default function Sidebar() {
  const path = usePathname()
  const [theme, setTheme] = useState<Theme>('system')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') ?? 'system') as Theme
    setTheme(saved)
    applyTheme(saved)
  }, [])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => document.documentElement.classList.toggle('dark', e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function changeTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
    localStorage.setItem('theme', t)
  }

  const SunIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14A7 7 0 0012 5z" />
    </svg>
  )
  const MoonIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
  const MonitorIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C17F5A] flex items-center justify-center text-white text-[10px] font-black tracking-tight shrink-0 shadow-sm">
              DR
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2] leading-tight">DR Monitor</p>
              <p className="text-[10px] text-[#9A8E84] dark:text-[#7A7068] leading-tight mt-0.5">Unauthorized Listings</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
        {nav.map(group => (
          <div key={group.section}>
            <p className="text-[10px] font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-[0.14em] px-3 mb-2">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.links.map(l => {
                const isActive = path === l.href
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-[#EAE4DC] dark:bg-[#1C1814] text-[#1C1917] dark:text-[#F0EAE2] font-medium'
                        : 'text-[#9A8E84] dark:text-[#7A7068] hover:text-[#1C1917] dark:hover:text-[#F0EAE2] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {l.label}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C17F5A] shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme toggle footer */}
      <div className="px-3 pb-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
        <p className="text-[10px] font-bold text-[#9A8E84] dark:text-[#7A7068] uppercase tracking-[0.14em] px-3 mb-2">Appearance</p>
        <div className="flex items-center rounded-xl bg-black/[0.05] dark:bg-white/[0.05] p-1 gap-1">
          {([
            { key: 'light'  as Theme, Icon: SunIcon,     label: 'Light'  },
            { key: 'system' as Theme, Icon: MonitorIcon,  label: 'Auto'   },
            { key: 'dark'   as Theme, Icon: MoonIcon,     label: 'Dark'   },
          ]).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => changeTheme(key)}
              title={label}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === key
                  ? 'bg-white dark:bg-[#3A3430] text-[#1C1917] dark:text-[#F0EAE2] shadow-sm'
                  : 'text-[#9A8E84] hover:text-[#1C1917] dark:hover:text-[#F0EAE2]'
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col bg-white dark:bg-[#231F1B] h-screen print:hidden border-r border-black/[0.06] dark:border-white/[0.06]">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-12 bg-white dark:bg-[#231F1B] border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between px-4 print:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#C17F5A] flex items-center justify-center text-white text-[9px] font-black">DR</div>
          <span className="text-sm font-semibold text-[#1C1917] dark:text-[#F0EAE2]">DR Monitor</span>
        </Link>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9A8E84] hover:bg-black/[0.06]"
        >
          {mobileOpen
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          }
        </button>
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed top-12 left-0 bottom-0 z-40 w-52 bg-white dark:bg-[#231F1B] flex flex-col border-r border-black/[0.06] dark:border-white/[0.06]">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
