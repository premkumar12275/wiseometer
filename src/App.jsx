import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useGroups } from './hooks/useGroups'
import { CategoriesProvider } from './contexts/CategoriesContext'
import AuthGate from './components/auth/AuthGate'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './components/dashboard/Dashboard'
import TransactionList from './components/transactions/TransactionList'
import ImportWizard from './components/import/ImportWizard'
import CategoriesManager from './components/categories/CategoriesManager'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const { groups, createGroup, deleteGroup } = useGroups(user?.id)
  const [page, setPage] = useState('dashboard')
  const [activeGroupId, setActiveGroupId] = useState(null)

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  if (loading) return <LoadingScreen />

  // Kept fresh from the list so a rename/refresh flows through.
  const activeGroup = groups.find((g) => g.id === activeGroupId)

  const goToPage = (id) => { setActiveGroupId(null); setPage(id) }
  const selectGroup = (g) => { setActiveGroupId(g.id); setPage('group') }
  const handleDeleteGroup = async (id) => {
    await deleteGroup(id)
    setActiveGroupId(null)
    setPage('transactions')
  }

  return (
    <AuthGate user={user}>
      <CategoriesProvider userId={user.id}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentPage={page}
          activeGroupId={activeGroupId}
          onNavigate={goToPage}
          onSelectGroup={selectGroup}
          groups={groups}
          onCreateGroup={createGroup}
          user={user}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar
            currentPage={page}
            title={page === 'group' ? activeGroup?.name : undefined}
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
                onNavigate={goToPage}
              />
            )}
            {page === 'transactions' && (
              <TransactionList
                user={user}
                month={month}
                year={year}
                groups={groups}
              />
            )}
            {page === 'group' && activeGroup && (
              <TransactionList
                key={activeGroup.id}
                user={user}
                month={month}
                year={year}
                group={activeGroup}
                groups={groups}
                onDeleteGroup={handleDeleteGroup}
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
            {page === 'categories' && <CategoriesManager />}
          </main>
        </div>
      </div>
      </CategoriesProvider>
    </AuthGate>
  )
}
