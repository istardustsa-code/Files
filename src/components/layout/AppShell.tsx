import React, { useState } from 'react';
import { Menu, Search, Upload, Bell, ShieldAlert, LogOut, RefreshCw, Database } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { usePlatform } from '../../context/PlatformContext';
import { UploadFileModal } from '../common/UploadFileModal';
import { ToastContainer } from '../common/ToastContainer';
import { SupabaseSetupModal } from '../auth/SupabaseSetupModal';
import { getRoleLabelArabic } from '../../utils/formatters';
import type { UserRole } from '../../types/platform';

interface AppShellProps {
  pageTitle: string;
  pageSubtitle?: string;
  onExitPreviewToAuth?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  pageTitle,
  pageSubtitle,
  onExitPreviewToAuth,
  children,
}) => {
  const {
    isSupabaseLive,
    signOut,
    refreshWorkspace,
    currentRole,
    currentUser,
    switchRole,
    globalSearch,
    setGlobalSearch,
    unreadNotificationsCount,
    setAdminNav,
    setManagerNav,
    setTeacherNav,
  } = usePlatform();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const openNotifications = () => {
    if (currentRole === 'super_admin') setAdminNav('notifications');
    else if (currentRole === 'manager') setManagerNav('notifications');
    else setTeacherNav('notifications');
  };

  const roles: { id: UserRole; label: string }[] = [
    { id: 'super_admin', label: 'مديرة المنصة' },
    { id: 'manager', label: 'مدير العمل' },
    { id: 'teacher', label: 'المعلم' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#454943] flex">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Connection / Session Status Bar */}
        {isSupabaseLive ? (
          <div className="bg-white border-b border-[#D9C9B5]/60 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#556952]">
              <Database size={14} className="shrink-0" />
              <span>
                متصل بـ Supabase · الدور الحالي:{' '}
                <strong className="text-[#454943]">{getRoleLabelArabic(currentRole)}</strong> (
                {currentUser.email})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshWorkspace}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#666560] hover:text-[#454943] bg-[#F7F5F0] rounded-lg"
              >
                <RefreshCw size={12} />
                <span>تحديث</span>
              </button>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#8A5E56] bg-[#D8BDB7]/25 hover:bg-[#D8BDB7]/40 rounded-lg"
              >
                <LogOut size={12} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border-b border-[#D9C9B5]/60 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#666560]">
              <ShieldAlert size={14} className="text-[#8A5E56] shrink-0" />
              <span>
                معاينة الواجهة فقط — Supabase غير مربوط بعد (لا توجد مصادقة أو تخزين سحابي فعلي حالياً)
              </span>
              <button
                type="button"
                onClick={() => setSetupModalOpen(true)}
                className="text-[#556952] font-semibold hover:underline whitespace-nowrap"
              >
                خطوات الربط
              </button>
              {onExitPreviewToAuth && (
                <button
                  type="button"
                  onClick={onExitPreviewToAuth}
                  className="text-[#454943] font-medium hover:underline whitespace-nowrap"
                >
                  · شاشة الدخول
                </button>
              )}
            </div>

            <div
              className="flex items-center gap-1 p-0.5 bg-[#F7F5F0] border border-[#D9C9B5]/70 rounded-lg"
              role="group"
              aria-label="تبديل معاينة الواجهة حسب الدور"
            >
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => switchRole(r.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    currentRole === r.id
                      ? 'bg-white text-[#454943] shadow-xs'
                      : 'text-[#666560] hover:text-[#454943]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clean 3-Zone Top Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-[#D9C9B5]/60 px-4 sm:px-8 py-4 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-[#D9C9B5]/80 text-[#454943] hover:bg-[#F7F5F0] shrink-0"
                aria-label="فتح القائمة الجانبية"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-bold text-[#454943] truncate">
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p className="text-xs text-[#666560] truncate hidden sm:block mt-0.5">
                    {pageSubtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#85847E] pointer-events-none"
                />
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="ابحث في الملفات، الأقسام، أو الأسماء..."
                  className="w-full pr-10 pl-4 py-2 text-sm bg-[#F7F5F0] border border-[#D9C9B5]/70 rounded-xl text-[#454943] placeholder:text-[#85847E] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={openNotifications}
                className="relative w-10 h-10 rounded-xl border border-[#D9C9B5]/80 bg-white hover:bg-[#F7F5F0] flex items-center justify-center text-[#454943] transition-colors shrink-0"
                aria-label="الإشعارات"
              >
                <Bell size={18} strokeWidth={1.8} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-4.5 h-4.5 px-1 rounded-full bg-[#8A5E56] text-white text-[10px] font-mono-num font-semibold flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {(currentRole === 'teacher' || currentRole === 'super_admin') && (
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#343732] rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload size={16} />
                  <span>رفع ملف سريع</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <UploadFileModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
      <SupabaseSetupModal isOpen={setupModalOpen} onClose={() => setSetupModalOpen(false)} />
      <ToastContainer />
    </div>
  );
};
