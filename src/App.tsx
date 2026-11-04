import { Link, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { PublicLayout, RequireAuth } from '@/layouts/PublicLayout'
import { AdminComplaintsPage, AdminDashboardPage, AnalyticsPage, MapPage } from '@/pages/AdminPages'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import { CitizenDashboardPage, MyComplaintsPage } from '@/pages/CitizenHomePage'
import { ComplaintDetailPage } from '@/pages/ComplaintDetailPage'
import { LandingPage } from '@/pages/LandingPage'
import { ReportPage } from '@/pages/ReportPage'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth role="citizen" />}>
        <Route element={<AppShell variant="citizen" />}>
          <Route path="/app" element={<CitizenDashboardPage />} />
          <Route path="/app/complaints/new" element={<ReportPage />} />
          <Route path="/app/complaints" element={<MyComplaintsPage />} />
          <Route path="/app/complaints/:id" element={<ComplaintDetailPage mode="citizen" />} />
        </Route>
      </Route>
      <Route element={<RequireAuth role="admin" />}>
        <Route element={<AppShell variant="admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
          <Route path="/admin/complaints/:id" element={<ComplaintDetailPage mode="admin" />} />
          <Route path="/admin/map" element={<MapPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <div className="mx-auto max-w-lg px-6 py-24 text-center">
            <h1 className="text-2xl font-bold text-navy">Page not found</h1>
            <p className="mt-2 text-slate-600">That address is not part of AI CivicEye.</p>
            <Link className="mt-4 inline-block font-semibold text-blue-700" to="/">Back home</Link>
          </div>
        }
      />
    </Routes>
  )
}
