import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { useGroups } from './hooks/useGroups'
import { CategoriesProvider } from './contexts/CategoriesContext'
import { AccountProvider, useAccount } from './contexts/AccountContext'
import AuthGate from './components/auth/AuthGate'
import ProfileSetup from './components/auth/ProfileSetup'
import ResetPassword from './components/auth/ResetPassword'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './components/dashboard/Dashboard'
import TransactionList from './components/transactions/TransactionList'
import ImportWizard from './components/import/ImportWizard'
import CategoriesManager from './components/categories/CategoriesManager'
import ActivityLog from './components/activity/ActivityLog'
import InvestmentsList from './components/investments/InvestmentsList'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ViewerNotice() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-500 text-sm">
      You have view-only access to this account.
    </div>
  )
}

// The authenticated app shell — everything here is scoped to the active account.
function Workspace({ user, profile }) {
  const { ownerId, canWrite, activeAccount, setActiveAccountId } = useAccount()
  const { groups, createGroup, deleteGroup } = useGroups(user, activeAccount)
  const [page, setPage] = useState('dashboard')
  const [activeGroupId, setActiveGroupId] = useState(null)

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [viewMode, setViewMode] = useState('month')

  const activeGroup = groups.find((g) => g.id === activeGroupId)

  const goToPage = (id) => { setActiveGroupId(null); setPage(id) }
  const selectGroup = (g) => { setActiveGroupId(g.id); setPage('group') }
  const switchAccount = (id) => { setActiveAccountId(id); setActiveGroupId(null); setPage('dashboard') }
  const handleDeleteGroup = async (id) => {
    await deleteGroup(id)
    setActiveGroupId(null)
    setPage('transactions')
  }

  return (
    <CategoriesProvider userId={ownerId}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentPage={page}
          activeGroupId={activeGroupId}
          onNavigate={goToPage}
          onSelectGroup={selectGroup}
          groups={groups}
          onCreateGroup={createGroup}
          canCreateGroup={canWrite}
          user={user}
          profile={profile}
          onSwitchAccount={switchAccount}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar
            currentPage={page}
            title={page === 'group' ? activeGroup?.name : undefined}
            month={month}
            year={year}
            viewMode={viewMode}
            onMonthChange={(m, y) => { setMonth(m); setYear(y) }}
            onViewModeChange={setViewMode}
          />

          <main className="flex-1 overflow-hidden flex flex-col">
            {page === 'dashboard' && (
              <Dashboard key={ownerId} user={user} ownerId={ownerId} canWrite={canWrite} month={month} year={year} viewMode={viewMode} onNavigate={goToPage} />
            )}
            {page === 'transactions' && (
              <TransactionList
                key={ownerId}
                user={user}
                profile={profile}
                ownerId={ownerId}
                accountCanWrite={canWrite}
                month={month}
                year={year}
                groups={groups}
              />
            )}
            {page === 'group' && activeGroup && (
              <TransactionList
                key={activeGroup.id}
                user={user}
                profile={profile}
                ownerId={ownerId}
                accountCanWrite={canWrite}
                month={month}
                year={year}
                group={activeGroup}
                groups={groups}
                onDeleteGroup={handleDeleteGroup}
              />
            )}
            {page === 'import' && (
              canWrite ? (
                <ImportWizard
                  user={user}
                  ownerId={ownerId}
                  onImported={(m, y) => {
                    if (m && y) { setMonth(m); setYear(y) }
                    setPage('transactions')
                  }}
                />
              ) : <ViewerNotice />
            )}
            {page === 'categories' && <CategoriesManager canWrite={canWrite} />}
            {page === 'activity' && <ActivityLog key={ownerId} ownerId={ownerId} groups={groups} />}
            {page === 'investments' && <InvestmentsList key={ownerId} user={user} ownerId={ownerId} canWrite={canWrite} />}
          </main>
        </div>
      </div>
    </CategoriesProvider>
  )
}

export default function App() {
  const { user, loading, recovery, clearRecovery } = useAuth()
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile(user)

  if (recovery) return <ResetPassword onDone={clearRecovery} />
  if (loading) return <LoadingScreen />
  if (!user) return <AuthGate user={null} />
  if (profileLoading) return <LoadingScreen />
  if (!profile) return <ProfileSetup user={user} onDone={refetchProfile} />

  return (
    <AccountProvider user={user} profile={profile}>
      <Workspace user={user} profile={profile} />
    </AccountProvider>
  )
}
