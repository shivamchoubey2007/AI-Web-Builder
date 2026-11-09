import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AccountSettingsCards,
  ChangePasswordCard,
  DeleteAccountCard,
} from '@daveyplate/better-auth-ui';
import { User, Shield, AlertTriangle, Sliders } from 'lucide-react';

const cardClassNames = {
  base: 'bg-black/20 backdrop-blur border border-slate-800/80 ring-1 ring-indigo-950/60 max-w-xl mx-auto rounded-xl text-white shadow-xl',
  footer: 'bg-black/40 border-t border-slate-800/60 rounded-b-xl',
};

const dangerCardClassNames = {
  base: 'bg-black/20 backdrop-blur border border-red-950/60 ring-1 ring-red-900/40 max-w-xl mx-auto rounded-xl text-white shadow-xl',
  footer: 'bg-red-950/20 border-t border-red-900/30 rounded-b-xl',
};

type TabType = 'account' | 'security' | 'danger' | 'all';

const Settings = () => {
  const { pathname } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>(
    pathname === 'security' ? 'security' : 'account'
  );

  return (
    <div className="relative min-h-[90vh] w-full p-4 md:p-8 flex flex-col items-center">
      {/* Background Gradient */}
      <img
        src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/refs/heads/main/assets/hero/bg-gradient-2.png"
        className="pointer-events-none absolute inset-0 -z-10 size-full opacity-40"
        alt=""
      />

      <div className="w-full max-w-xl space-y-6 pt-4 pb-16">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Account Settings
          </h1>
          <p className="text-sm text-slate-400">
            Manage your personal profile, security credentials, and account status.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-md overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'account'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <User className="size-4" />
            Profile & Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="size-4" />
            Security & Password
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'danger'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-red-400 hover:text-red-300 hover:bg-red-950/40'
            }`}
          >
            <AlertTriangle className="size-4" />
            Danger Zone
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="size-4" />
            All
          </button>
        </div>

        {/* Account Tab */}
        {(activeTab === 'account' || activeTab === 'all') && (
          <section className="space-y-4">
            {activeTab === 'all' && (
              <div className="border-b border-slate-800/80 pb-2 pt-2">
                <h2 className="text-base font-semibold text-slate-200">Personal Information</h2>
                <p className="text-xs text-slate-400">Update your avatar, name, and email address.</p>
              </div>
            )}
            <AccountSettingsCards
              classNames={{
                card: cardClassNames,
              }}
            />
          </section>
        )}

        {/* Security & Password Tab */}
        {(activeTab === 'security' || activeTab === 'all') && (
          <section className="space-y-4">
            {activeTab === 'all' && (
              <div className="border-b border-slate-800/80 pb-2 pt-4">
                <h2 className="text-base font-semibold text-slate-200">Security</h2>
                <p className="text-xs text-slate-400">Manage your password and authentication credentials.</p>
              </div>
            )}
            <ChangePasswordCard classNames={cardClassNames} />
          </section>
        )}

        {/* Danger Zone Tab */}
        {(activeTab === 'danger' || activeTab === 'all') && (
          <section className="space-y-4">
            {activeTab === 'all' && (
              <div className="border-b border-red-900/40 pb-2 pt-4">
                <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
                <p className="text-xs text-red-400/80">Permanent actions that cannot be undone.</p>
              </div>
            )}
            <DeleteAccountCard classNames={dangerCardClassNames} />
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;
