import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, Bell, Plug, Users, CreditCard, CheckCircle, Mail, Calendar, Moon, Sun, Monitor } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Sidebar'
import { Card, Spinner } from '@/components/ui'
import { toast } from '@/components/ui/toast'
import { useAuthStore, useThemeStore, useLocalSettingsStore } from '@/store'
import type { ThemePreference } from '@/store'
import { organizationService, integrationsService } from '@/services'
import type { DecodedUser, IntegrationProvider } from '@/types'

const TABS = [
  { id: 'profile',       label: 'Profile',        icon: Users },
  { id: 'integrations',  label: 'Integrations',    icon: Plug },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'security',      label: 'Security',        icon: Shield },
  { id: 'billing',       label: 'Billing',         icon: CreditCard },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    const integration = searchParams.get('integration')
    const status = searchParams.get('status')
    const error = searchParams.get('error')
    if (integration || error) {
      handledRef.current = true
      setActiveTab('integrations')
      if (status === 'connected') toast(`${integration} connected successfully`, 'success')
      if (error) toast(error === 'integration_failed' ? 'Failed to connect provider' : error, 'error')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Settings" />

      <div className="flex flex-1 overflow-hidden">
        {/* Tabs sidebar */}
        <div className="w-52 min-w-52 border-r border-gray-100 dark:border-navy-600 py-4 bg-white dark:bg-navy-800 overflow-y-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                activeTab === id
                  ? 'text-magenta-600 dark:text-magenta-400 bg-pink-50 dark:bg-pink-500/10 font-medium border-r-2 border-r-magenta-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'profile'       && <ProfileTab user={user} />}
          {activeTab === 'integrations'  && <IntegrationsTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security'      && <SecurityTab />}
          {activeTab === 'billing'       && <BillingTab />}
        </div>
      </div>
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: DecodedUser | null }) {
  const { preference: themePref, setPreference } = useThemeStore()
  const { language, replyStyle, setLanguage, setReplyStyle } = useLocalSettingsStore()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: org } = useQuery({
    queryKey: ['organization'],
    queryFn: organizationService.get,
  })

  const [orgName, setOrgName] = useState('')
  useEffect(() => {
    if (org) setOrgName(org.name)
  }, [org])

  const updateOrgMutation = useMutation({
    mutationFn: (name: string) => organizationService.update({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      toast('Settings saved', 'success')
    },
    onError: () => {
      toast('Не удалось сохранить настройки организации.', 'error')
    },
    onSettled: () => {
      setSaving(false)
    },
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (org && orgName.trim() && orgName !== org.name) {
      updateOrgMutation.mutate(orgName.trim())
    } else {
      toast('Settings saved', 'success')
      setSaving(false)
    }
  }

  const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light',  label: 'Light',  icon: <Sun size={14} /> },
    { value: 'dark',   label: 'Dark',   icon: <Moon size={14} /> },
    { value: 'system', label: 'System', icon: <Monitor size={14} /> },
  ]

  return (
    <div className="space-y-5 max-w-md">
      <Card title="Organization">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Organization Name</label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Plan</label>
            <div className="input-field opacity-60 cursor-not-allowed capitalize">
              {org?.plan ?? '—'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Your Role</label>
            <div className="input-field opacity-60 cursor-not-allowed capitalize">
              {user?.role ?? '—'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Interface Language
              <span className="text-gray-400 dark:text-gray-500 font-normal"> (this device only)</span>
            </label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'ru' | 'kk')} className="input-field">
              <option value="en">English</option>
              <option value="ru">Russian</option>
              <option value="kk">Kazakh</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              AI Reply Style
              <span className="text-gray-400 dark:text-gray-500 font-normal"> (this device only)</span>
            </label>
            <select value={replyStyle} onChange={(e) => setReplyStyle(e.target.value as 'formal' | 'neutral' | 'friendly')} className="input-field">
              <option value="formal">Formal</option>
              <option value="neutral">Neutral</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner className="text-white w-4 h-4" /> : <CheckCircle size={14} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Card>

      <Card title="Appearance">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Choose how Mengu looks. Your preference is saved across sessions.
        </p>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setPreference(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                themePref === opt.value
                  ? 'border-magenta-500 bg-pink-50 dark:bg-pink-500/10 text-magenta-600 dark:text-magenta-400'
                  : 'border-gray-200 dark:border-navy-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-700'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab() {
  const queryClient = useQueryClient()

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationsService.list,
  })

  const disconnectMutation = useMutation({
    mutationFn: (provider: IntegrationProvider) => integrationsService.disconnect(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast('Disconnected', 'success')
    },
  })

  const watchMutation = useMutation({
    mutationFn: () => integrationsService.startGmailWatch(),
    onSuccess: (res) => {
      toast(`Email monitoring enabled for ${res.email_address}`, 'success')
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message ?? 'Failed to enable monitoring', 'error')
    },
  })

  async function handleConnect(provider: IntegrationProvider) {
    try {
      const url = await integrationsService.getOAuthUrl(provider)
      window.location.href = url
    } catch {
      toast('Could not start the connection. Please try again.', 'error')
    }
  }

  const LABELS: Record<IntegrationProvider, { name: string; desc: string; icon: React.ReactNode }> = {
    gmail: { name: 'Gmail', desc: 'Inbound email processing', icon: <Mail size={20} /> },
    calendar: { name: 'Google Calendar', desc: 'Automatic meeting creation', icon: <Calendar size={20} /> },
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Connect Google services for automatic event and document processing
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        (integrations ?? []).map((intg) => (
          <div
            key={intg.provider}
            className="flex items-center gap-4 bg-white dark:bg-navy-800 border border-gray-100 dark:border-navy-600 rounded-lg px-4 py-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center flex-shrink-0 text-magenta-500">
              {LABELS[intg.provider].icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{LABELS[intg.provider].name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{LABELS[intg.provider].desc}</div>
            </div>
            {intg.connected ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Connected
                </span>
                {intg.provider === 'gmail' && (
                  <button
                    type="button"
                    onClick={() => watchMutation.mutate()}
                    disabled={watchMutation.isPending}
                    className="text-xs text-magenta-500 hover:text-magenta-600 transition-colors"
                  >
                    {watchMutation.isPending ? 'Enabling...' : 'Enable monitoring'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => disconnectMutation.mutate(intg.provider)}
                  disabled={disconnectMutation.isPending}
                  className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => handleConnect(intg.provider)} className="btn-primary text-xs py-1.5 px-3">
                Connect
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const channels = [
    { label: 'Email Notifications', desc: 'Critical events and digest' },
    { label: 'Browser Push',        desc: 'New tasks and insights' },
    { label: 'Slack Notifications', desc: 'Requires Slack integration' },
  ]
  return (
    <Card title="Notification Channels">
      <div className="space-y-4 max-w-md">
        {channels.map((ch) => (
          <div key={ch.label} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{ch.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{ch.desc}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 dark:bg-navy-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-magenta-500" />
            </label>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  return (
    <div className="space-y-4 max-w-md">
      <Card title="Account Security">
        <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Shield size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Password changes, two-factor authentication, and session management aren't available
            yet — the backend doesn't support them. Your account is currently secured by JWT-based
            sign-in only.
          </span>
        </div>
      </Card>
    </div>
  )
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

function BillingTab() {
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: organizationService.get,
  })

  return (
    <div className="space-y-4">
      <Card title="Current Plan">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <div>
            <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1 capitalize">
              {org?.plan ?? '—'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Billing management and plan upgrades aren't available yet — there's no payment
              integration on the backend.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
