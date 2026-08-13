import { useSajuApp } from './hooks/useSajuApp.js'
import { LoginModal, ProfileModal } from './components/auth'
import { Toast } from './components/common'
import { Hero } from './components/hero'
import { EditProfileForm } from './components/profile'
import {
  EditReadingForm,
  GuestSajuForm,
  MemberSajuForm,
  ResultSection,
} from './components/saju'
import { Sidebar } from './components/sidebar'
import { trackEvent } from './lib/analytics.js'
import './styles/app.css'

export default function App() {
  const app = useSajuApp()

  return (
    <div className={`page${app.session && app.sidebarOpen ? ' page--sidebar-open' : ''}`}>
      {app.isGuest && !app.authLoading && (
        <button
          type="button"
          className="page-login"
          onClick={() => app.openLoginModal('header')}
          disabled={app.actionLoading}
        >
          로그인
        </button>
      )}

      <Toast toast={app.toast} />

      <LoginModal
        open={app.showLoginModal && app.isGuest}
        onClose={() => app.setShowLoginModal(false)}
        onGoogleSignIn={() => app.handleGoogleSignIn('login_modal')}
        actionLoading={app.actionLoading}
        error={app.error}
      />

      <ProfileModal
        open={Boolean(app.session && app.showProfileModal)}
        form={app.profileForm}
        onChange={app.applyProfileFormChange}
        onSubmit={app.handleSaveProfile}
        profileError={app.profileError}
        actionLoading={app.actionLoading}
      />

      {app.session && app.sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => app.setSidebarOpen(false)}
          aria-label="사이드바 닫기"
        />
      )}
      {app.session && !app.sidebarOpen && (
        <button
          type="button"
          className="sidebar-fab"
          onClick={() => {
            trackEvent('sidebar_open')
            app.setSidebarOpen(true)
          }}
          aria-label="기록 열기"
        >
          기록
        </button>
      )}

      {app.session && (
        <Sidebar
          open={app.sidebarOpen}
          onClose={() => app.setSidebarOpen(false)}
          session={app.session}
          profile={app.profile}
          readings={app.readings}
          selectedId={app.selectedId}
          isViewing={app.isViewing}
          showProfileEdit={app.showProfileEdit}
          listLoading={app.listLoading}
          profileLoading={app.profileLoading}
          isBusy={app.isBusy}
          onOpenProfileEdit={app.handleOpenProfileEdit}
          onSignOut={app.handleSignOut}
          onNewReading={app.handleNewReading}
          onSelectReading={app.handleSelectReading}
          onDeleteReading={app.handleDeleteReading}
        />
      )}

      <main className={`app${app.isViewing || app.showProfileEdit ? ' app--reading' : ''}`}>
        {app.authLoading ? (
          <p className="auth-shell__message">잠시만요...</p>
        ) : app.showProfileEdit && app.session ? (
          <EditProfileForm
            form={app.profileForm}
            onChange={app.applyProfileFormChange}
            onSubmit={app.handleSaveProfile}
            onCancel={app.handleCancelProfileEdit}
            profileError={app.profileError}
            actionLoading={app.actionLoading}
          />
        ) : (
          <>
            {!app.isViewing && <Hero isGuest={app.isGuest} readingCount={app.readingCount} />}

            {app.isViewing && !app.isEditing && (
              <ResultSection
                resultRef={app.resultRef}
                loading={app.loading}
                result={app.result}
                isViewing={app.isViewing}
                isEditing={app.isEditing}
                isResultLocked={app.isResultLocked}
                subject={app.activeSubject}
                actionLoading={app.actionLoading}
                isBusy={app.isBusy}
                onGoogleSignIn={() => app.handleGoogleSignIn('result_gate')}
                onShare={() => app.handleShareReading()}
                onStartEdit={app.handleStartEdit}
                onDelete={() => app.handleDeleteReading()}
                onNewReading={app.handleNewReading}
              />
            )}

            {app.isViewing && app.isEditing && (
              <EditReadingForm
                subject={app.activeSubject}
                result={app.result}
                onChangeResult={app.setResult}
                onSubmit={app.handleSaveEdit}
                onReinterpret={app.handleReinterpret}
                onCancel={app.handleCancelEdit}
                loading={app.loading}
                actionLoading={app.actionLoading}
                isBusy={app.isBusy}
              />
            )}

            {!app.isViewing && app.isGuest && (
              <GuestSajuForm
                formRef={app.formRef}
                form={app.profileForm}
                onChange={app.applyProfileFormChange}
                onSubmit={app.handleSubmit}
                loading={app.loading}
                actionLoading={app.actionLoading}
                onOpenLogin={() => app.openLoginModal('guest_form')}
              />
            )}

            {!app.isViewing && app.session && app.profile && (
              <MemberSajuForm
                formRef={app.formRef}
                profile={app.profile}
                subjectForm={app.subjectForm}
                onChangeSubject={app.applySubjectFormChange}
                onFillFromProfile={app.handleFillSubjectFromProfile}
                onSubmit={app.handleSubmit}
                onEditProfile={app.handleOpenProfileEdit}
                loading={app.loading}
                isBusy={app.isBusy}
              />
            )}

            {app.error && <p className="error">{app.error}</p>}

            {!app.isViewing && (
              <ResultSection
                resultRef={app.resultRef}
                loading={app.loading}
                result={app.result}
                isViewing={app.isViewing}
                isEditing={app.isEditing}
                isResultLocked={app.isResultLocked}
                subject={app.activeSubject}
                actionLoading={app.actionLoading}
                isBusy={app.isBusy}
                onGoogleSignIn={() => app.handleGoogleSignIn('result_gate')}
                onShare={() => app.handleShareReading()}
                onStartEdit={app.handleStartEdit}
                onDelete={() => app.handleDeleteReading()}
                onNewReading={app.handleNewReading}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
