import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AppLayout }       from '@/components/layout/AppLayout'
import { ProtectedRoute }  from '@/components/layout/ProtectedRoute'
import { ErrorBoundary }   from '@/components/ErrorBoundary'
import { LoginPage }       from '@/components/pages/LoginPage'
import { RegisterPage }    from '@/components/pages/RegisterPage'
import { DashboardPage }   from '@/components/pages/DashboardPage'
import { InboxPage }       from '@/components/pages/InboxPage'
import { TasksPage }       from '@/components/pages/TasksPage'
import { DraftsPage }      from '@/components/pages/DraftsPage'
import { DocumentsPage }   from '@/components/pages/DocumentsPage'
import { CalendarPage }    from '@/components/pages/CalendarPage'
import { InsightsPage }    from '@/components/pages/InsightsPage'
import { AnalyticsPage }   from '@/components/pages/AnalyticsPage'
import { SettingsPage }    from '@/components/pages/SettingsPage'
import { AdminPage }       from '@/components/pages/AdminPage'
import { NotFoundPage }    from '@/components/pages/NotFoundPage'
import { ToastContainer }  from '@/components/ui/toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected — wrapped in AppLayout (sidebar + topbar) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/"           element={<DashboardPage />} />
                <Route path="/inbox"      element={<InboxPage />} />
                <Route path="/tasks"      element={<TasksPage />} />
                <Route path="/drafts"     element={<DraftsPage />} />
                <Route path="/documents"  element={<DocumentsPage />} />
                <Route path="/calendar"   element={<CalendarPage />} />
                <Route path="/insights"   element={<InsightsPage />} />
                <Route path="/analytics"  element={<AnalyticsPage />} />
                <Route path="/settings"   element={<SettingsPage />} />
                <Route path="/admin"     element={<AdminPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ToastContainer />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
