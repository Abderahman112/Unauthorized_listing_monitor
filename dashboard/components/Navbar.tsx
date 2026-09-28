'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const links = [
  { href: '/',          label: 'Dashboard'       },
  { href: '/conflicts', label: 'Conflicts'        },
  { href: '/findings',  label: 'Findings Report' },
  { href: '/report',    label: 'Violations'      },
  { href: '/search',    label: 'Search'          },
  { href: '/mismatch',  label: 'DR vs Bayut'     },
  { href: '/agents',    label: 'Agents'          },
]

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

export default function Navbar() {
  const path = usePathname()
  const [theme, setTheme] = useState<Theme>('system')
  const [menuOpen, setMenuOpen] = useState(false)

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
  const SystemIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
  const MoonIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )

  return (
    <nav className="sticky top-0 z-50 bg-stone-900 border-b border-stone-800 print:hidden">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center text-stone-900 text-xs font-black tracking-tight">DR</span>
            <span className="hidden sm:block font-semibold text-sm text-stone-100">Listing Monitor</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0">
            {links.map(l => {
              const isActive = path === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-stone-400 hover:text-stone-100 font-normal'
                  }`}
                >
                  {l.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-amber-500 rounded-full" />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            {/* 3-way theme toggle */}
            <div className="flex items-center rounded-md bg-stone-800 p-0.5 gap-px">
              {([
                { key: 'light'  as Theme, Icon: SunIcon,    title: 'Light'  },
                { key: 'system' as Theme, Icon: SystemIcon, title: 'System' },
                { key: 'dark'   as Theme, Icon: MoonIcon,   title: 'Dark'   },
              ]).map(({ key, Icon, title }) => (
                <button
                  key={key}
                  onClick={() => changeTheme(key)}
                  title={title}
                  aria-label={`${title} mode`}
                  className={`p-1.5 rounded transition-colors ${
                    theme === key
                      ? 'bg-amber-500 text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-200'
                  }`}
                >
                  <Icon />
                </button>
              ))}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:bg-stone-800"
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-stone-800 bg-stone-900 px-4 py-2 space-y-0.5">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                path === l.href
                  ? 'text-white font-medium bg-stone-800'
                  : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
