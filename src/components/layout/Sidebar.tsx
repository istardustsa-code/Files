import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  FolderKanban,
  Layers,
  Files,
  BarChart3,
  Bell,
  Palette,
  ShieldCheck,
  History,
  Settings,
  Award,
  FileCheck2,
  FolderOpen,
  UserCircle2,
  ClipboardCheck,
  X,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { LogoMark } from '../common/LogoMark';
import type { ManagerNavId, SuperAdminNavId, TeacherNavId } from '../../types/platform';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    currentRole,
    currentUser,
    branding,
    adminNav,
    setAdminNav,
    managerNav,
    setManagerNav,
    teacherNav,
    setTeacherNav,
    unreadNotificationsCount,
  } = usePlatform();

  const superAdminItems: { id: SuperAdminNavId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'users', label: 'إدارة المستخدمين', icon: Users },
    { id: 'teachers', label: 'المعلمون', icon: GraduationCap },
    { id: 'managers', label: 'مديرو العمل', icon: Briefcase },
    { id: 'schools', label: 'المدارس والمجموعات', icon: Building2 },
    { id: 'portfolios', label: 'ملفات الإنجاز', icon: FolderKanban },
    { id: 'sections', label: 'إدارة الأقسام', icon: Layers },
    { id: 'files', label: 'إدارة الملفات', icon: Files },
    { id: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3 },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, badge: unreadNotificationsCount },
    { id: 'branding', label: 'الهوية البصرية', icon: Palette },
    { id: 'permissions', label: 'الصلاحيات', icon: ShieldCheck },
    { id: 'activity_log', label: 'سجل النشاطات', icon: History },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const managerItems: { id: ManagerNavId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'assigned_teachers', label: 'المعلمون التابعون لي', icon: GraduationCap },
    { id: 'assigned_schools', label: 'المدارس والمجموعات', icon: Building2 },
    { id: 'review_portfolios', label: 'مراجعة ملفات الإنجاز', icon: ClipboardCheck },
    { id: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3 },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, badge: unreadNotificationsCount },
  ];

  const teacherItems: { id: TeacherNavId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'لوحة المعلم', icon: LayoutDashboard },
    { id: 'my_portfolio', label: 'ملف الإنجاز', icon: FolderKanban },
    { id: 'my_achievements', label: 'إنجازاتي', icon: Award },
    { id: 'my_certificates', label: 'شهاداتي ودوراتي', icon: GraduationCap },
    { id: 'my_evidence', label: 'الشواهد التعليمية', icon: FileCheck2 },
    { id: 'my_sections', label: 'مستنداتي وأقسامي', icon: FolderOpen },
    { id: 'my_files', label: 'إدارة ملفاتي', icon: Files },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, badge: unreadNotificationsCount },
    { id: 'profile', label: 'الملف الشخصي', icon: UserCircle2 },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-white border-l border-[#D9C9B5]/70">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-[#D9C9B5]/50">
        <div className="flex items-center gap-3 min-w-0">
          <LogoMark size="md" />
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-[#454943] truncate">
              {branding.platformName}
            </p>
            <p className="text-[11px] font-medium tracking-wider text-[#666560] truncate" dir="ltr">
              {branding.secondaryName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-[#666560] hover:bg-[#F7F5F0]"
          aria-label="إغلاق القائمة"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="القائمة الجانبية">
        {currentRole === 'super_admin' &&
          superAdminItems.map((item) => {
            const Icon = item.icon;
            const active = adminNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAdminNav(item.id);
                  onCloseMobile();
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors duration-75 ${
                  active
                    ? 'bg-[#A8B9A5]/25 text-[#454943] font-semibold'
                    : 'text-[#666560] hover:bg-[#F7F5F0] hover:text-[#454943]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.7}
                    className={active ? 'text-[#454943]' : 'text-[#85847E]'}
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-xs font-mono-num font-semibold text-[#8A5E56]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

        {currentRole === 'manager' &&
          managerItems.map((item) => {
            const Icon = item.icon;
            const active = managerNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setManagerNav(item.id);
                  onCloseMobile();
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors duration-75 ${
                  active
                    ? 'bg-[#A8B9A5]/25 text-[#454943] font-semibold'
                    : 'text-[#666560] hover:bg-[#F7F5F0] hover:text-[#454943]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.7}
                    className={active ? 'text-[#454943]' : 'text-[#85847E]'}
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-xs font-mono-num font-semibold text-[#8A5E56]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

        {currentRole === 'teacher' &&
          teacherItems.map((item) => {
            const Icon = item.icon;
            const active = teacherNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTeacherNav(item.id);
                  onCloseMobile();
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors duration-75 ${
                  active
                    ? 'bg-[#A8B9A5]/25 text-[#454943] font-semibold'
                    : 'text-[#666560] hover:bg-[#F7F5F0] hover:text-[#454943]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.7}
                    className={active ? 'text-[#454943]' : 'text-[#85847E]'}
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-xs font-mono-num font-semibold text-[#8A5E56]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Account Footer */}
      <div className="p-4 border-t border-[#D9C9B5]/50 bg-[#F7F5F0]/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#D8BDB7]/45 text-[#454943] flex items-center justify-center font-semibold text-sm shrink-0">
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#454943] truncate">{currentUser.fullName}</p>
            <p className="text-xs text-[#666560] truncate">{currentUser.jobTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-66 shrink-0 h-screen sticky top-0">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#454943]/35"
            onClick={onCloseMobile}
          />
          <aside className="relative z-50 w-72 max-w-[85vw] h-full shadow-xl">
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
};
