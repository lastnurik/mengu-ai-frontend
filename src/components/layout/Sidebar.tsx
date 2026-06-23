import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Inbox, CheckSquare, FileText, Send,
  Calendar, Settings, Shield,
  LogOut, Bell, ChevronDown, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle, Menu, X,
} from 'lucide-react'
import { useAuthStore, useNotificationStore } from '@/store'
import { cn, timeAgo, LIVE_POLL_INTERVAL_MS } from '@/utils/helpers'
import { eventsService, tasksService } from '@/services'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  badge?: number
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: () => eventsService.getAll(),
    refetchInterval: LIVE_POLL_INTERVAL_MS,
  })
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksService.getAll(),
    refetchInterval: LIVE_POLL_INTERVAL_MS,
  })
  const newEvents = eventsData?.data.filter((e) => e.status === 'new').length ?? 0
  const activeTasks = tasksData?.data.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length ?? 0

  const NAV: { section: string; items: NavItem[] }[] = [
    {
      section: 'Main',
      items: [
        { to: '/',        icon: LayoutDashboard, label: 'Dashboard',   badge: activeTasks },
        { to: '/inbox',   icon: Inbox,           label: 'Inbox',       badge: newEvents },
      ],
    },
    {
      section: 'Work',
      items: [
        { to: '/tasks',     icon: CheckSquare, label: 'Tasks' },
        { to: '/drafts',    icon: Send,        label: 'Drafts' },
        { to: '/documents', icon: FileText,    label: 'Documents' },
        { to: '/calendar',  icon: Calendar,    label: 'Calendar' },
      ],
    },
    {
      section: 'System',
      items: [
        { to: '/settings', icon: Settings, label: 'Settings' },
        ...(user?.role === 'admin' ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
      ],
    },
  ]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 rounded-lg text-gray-500 dark:text-gray-400 shadow-sm"
        aria-label="Открыть меню"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col w-[220px] min-w-[220px] bg-navy-800 h-screen
          md:relative md:flex
          ${mobileOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'}
        `}
        aria-label="Основная навигация"
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
          aria-label="Закрыть меню"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <img src="/logo-dark.png" alt="Mengu" className="h-14 hidden dark:block" />
          <img src="/logo-light.png" alt="Mengu" className="h-14 block dark:hidden" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map((group) => (
            <div key={group.section} className="mb-1">
              <div className="px-4 py-2 text-[10px] text-white/30 font-medium uppercase tracking-widest">
                {group.section}
              </div>
              {group.items.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                >
                  {({ isActive }) => (
                    <div className={cn('nav-item', isActive && 'active')} aria-current={isActive ? 'page' : undefined}>
                      <Icon size={17} className="flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span className="text-[10px] font-medium bg-magenta-500 text-white px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="nav-item w-full text-left"
          >
            <LogOut size={17} className="flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-magenta-500 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
              {user?.role === 'admin' ? 'A' : 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-white/85 truncate">
                {user?.role === 'admin' ? 'Admin' : 'Employee'}
              </div>
              <div className="text-[11px] text-white/40 truncate">{user?.id}</div>
            </div>
            <ChevronDown size={14} className="text-white/30 flex-shrink-0" />
          </div>
        </div>
      </aside>
    </>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

interface TopbarProps {
  title: string
  actions?: React.ReactNode
}

export function Topbar({ title, actions }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  const NOTIF_ICONS: Record<string, React.ReactNode> = {
    info: <Info size={14} className="text-blue-500" />,
    warning: <AlertTriangle size={14} className="text-amber-500" />,
    error: <AlertCircle size={14} className="text-red-500" />,
    success: <CheckCircle size={14} className="text-emerald-500" />,
  }

  return (
    <header className="h-14 flex items-center px-6 bg-white dark:bg-navy-800 border-b border-gray-100 dark:border-navy-600 gap-4 flex-shrink-0">
      <h1 className="text-base font-medium text-gray-900 dark:text-gray-100">{title}</h1>
      <div className="ml-auto flex items-center gap-2.5">
        {actions}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Уведомления"
            className="relative w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-navy-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-magenta-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-navy-600">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Notifications</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead} className="text-[11px] text-magenta-500 hover:underline flex items-center gap-1">
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">No notifications yet</div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex items-start gap-2.5 px-4 py-3 border-b border-gray-50 dark:border-navy-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors ${n.read ? 'opacity-60' : ''}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{NOTIF_ICONS[n.type] ?? <Info size={14} className="text-blue-500" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{n.title}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.description}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
