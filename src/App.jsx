import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TravelQrPage from './pages/TravelQrPage'
import VehicleApprovalLinkPage from './pages/VehicleApprovalLinkPage'
import { travelApprovalFromPath, travelQrFromPath } from './hr'

const TOKEN_KEY = 'bmc.auth.token'
const USER_KEY = 'bmc.auth.user'
const TOUR_KEY = 'bmc.tour.seen'

function readSession() {
  for (const storage of [localStorage, sessionStorage]) {
    const token = storage.getItem(TOKEN_KEY)
    if (!token) continue
    try { return { token, user: JSON.parse(storage.getItem(USER_KEY) || 'null') } } catch { storage.removeItem(TOKEN_KEY); storage.removeItem(USER_KEY) }
  }
  return null
}

export default function App() {
  const approval = travelApprovalFromPath(window.location.pathname)
  const qr = travelQrFromPath(window.location.pathname)
  const [session, setSession] = useState(readSession)
  const [showTour, setShowTour] = useState(() => localStorage.getItem(TOUR_KEY) !== '1')
  const closeTour = () => { localStorage.setItem(TOUR_KEY, '1'); setShowTour(false) }
  if (approval) return <VehicleApprovalLinkPage token={approval.token} />
  if (qr) return <TravelQrPage travelId={qr.travelId} token={qr.token} />
  if (!session) return <LoginPage onLogin={(nextSession) => { setSession(nextSession); setShowTour(localStorage.getItem(TOUR_KEY) !== '1') }} />
  return <DashboardPage token={session.token} user={session.user} showTour={showTour} onTourOpen={() => setShowTour(true)} onTourClose={closeTour} onLogout={() => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setShowTour(false); setSession(null) }} />
}
