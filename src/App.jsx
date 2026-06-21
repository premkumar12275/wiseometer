import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthGate from './components/auth/AuthGate'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './components/dashboard/Dashboard'
import TransactionList from './components/transactions/TransactionList'
import ImportWizard from './components/import/ImportWizard'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  if (loading) return <LoadingScreen />

  return (
    <AuthGate user={user}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentPage={page} onNavigate={setPage} user={user} />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar
            currentPage={page}
            month={month}
            year={year}
            onMonthChange={(m, y) => { setMonth(m); setYear(y) }}
          />

          <main className="flex-1 overflow-hidden flex flex-col">
            {page === 'dashboard' && (
              <Dashboard
                user={user}
                month={month}
                year={year}
                onNavigate={setPage}
              />
            )}
            {page === 'transactions' && (
              <TransactionList
                user={user}
                month={month}
                year={year}
              />
            )}
            {page === 'import' && (
              <ImportWizard
                user={user}
                onImported={(m, y) => {
                  if (m && y) { setMonth(m); setYear(y) }
                  setPage('transactions')
                }}
              />
            )}
          </main>
        </div>
      </div>
    </AuthGate>
  )
}
