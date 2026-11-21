/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { AppShell } from './components/layout/AppShell';
import { AuthScreen } from './components/auth/AuthScreen';
import { LogoMark } from './components/common/LogoMark';
import { ToastContainer } from './components/common/ToastContainer';

// Super Admin Views
import { SuperAdminOverview } from './components/views/super-admin/SuperAdminOverview';
import { UserManagementView } from './components/views/super-admin/UserManagementView';
import { SchoolsGroupsView } from './components/views/super-admin/SchoolsGroupsView';
import { PortfoliosOverviewView } from './components/views/super-admin/PortfoliosOverviewView';
import { SectionBuilderView } from './components/views/super-admin/SectionBuilderView';
import { ReportsView } from './components/views/super-admin/ReportsView';
import { BrandingView } from './components/views/super-admin/BrandingView';
import { PermissionsView } from './components/views/super-admin/PermissionsView';
import { ActivityLogView } from './components/views/super-admin/ActivityLogView';
import { SettingsView } from './components/views/super-admin/SettingsView';

// Manager Views
import { ManagerOverview } from './components/views/manager/ManagerOverview';
import { ManagerTeachersView } from './components/views/manager/ManagerTeachersView';
import { ManagerReviewView } from './components/views/manager/ManagerReviewView';

// Teacher Views
import { TeacherOverview } from './components/views/teacher/TeacherOverview';
import { TeacherPortfolioView } from './components/views/teacher/TeacherPortfolioView';
import { TeacherProfileView } from './components/views/teacher/TeacherProfileView';

// Shared Views
import { FileManagementView } from './components/views/shared/FileManagementView';
import { NotificationsView } from './components/views/shared/NotificationsView';

const WorkspaceRouter: React.FC = () => {
  const {
    isSupabaseLive,
    authLoading,
    workspaceLoading,
    workspaceError,
    accountBlockReason,
    session,
    signOut,
    refreshWorkspace,
    currentRole,
    adminNav,
    managerNav,
    teacherNav,
    branding,
  } = usePlatform();

  const [previewEntered, setPreviewEntered] = useState(false);

  // Loading state while verifying real Supabase session or loading RLS data
  if (isSupabaseLive && (authLoading || (session && workspaceLoading))) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <LogoMark size="lg" />
        <p className="font-display text-lg font-semibold text-[#454943]">
          {branding.platformName}
        </p>
        <p className="text-sm text-[#666560]">
          {authLoading ? 'جاري التحقق من الجلسة الآمنة...' : 'جاري تحميل بياناتك المحمية...'}
        </p>
      </div>
    );
  }

  // Real Supabase Auth Gate (no mock auth bypass)
  if (isSupabaseLive && !session) {
    return (
      <>
        <AuthScreen />
        <ToastContainer />
      </>
    );
  }

  // Account status & profile integrity guard (never fall back to teacher view on error/disabled)
  if (isSupabaseLive && session && accountBlockReason) {
    const isDisabled = accountBlockReason === 'disabled';
    const isMissing = accountBlockReason === 'profile_missing';
    const heading = isDisabled
      ? 'تم إيقاف هذا الحساب مؤقتًا'
      : isMissing
        ? 'ملف المستخدم غير مكتمل'
        : 'تعذر تحميل بيانات الحساب';
    const description = isDisabled
      ? 'حسابكِ معطّل حاليًا من قِبل مديرة المنصة ولا يمكن الوصول إلى مساحة العمل. تواصلي مع إدارة المنصة لإعادة التفعيل.'
      : isMissing
        ? 'تم التحقق من الجلسة بنجاح، ولكن لم يُعثر على سجل الملف الشخصي المرتبط بهذا الحساب في قاعدة البيانات.'
        : workspaceError ||
          'حدث خطأ أثناء قراءة ملفكِ الشخصي وصلاحياتكِ من قاعدة البيانات. يرجى إعادة المحاولة.';

    return (
      <>
        <div
          dir="rtl"
          className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6"
        >
          <div className="w-full max-w-md bg-white border border-[#D9C9B5]/80 rounded-2xl p-8 text-center shadow-xs space-y-5">
            <div className="flex justify-center">
              <LogoMark size="lg" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-xl font-bold text-[#454943]">{heading}</h1>
              <p className="text-sm leading-relaxed text-[#666560]">{description}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {!isDisabled && (
                <button
                  type="button"
                  onClick={() => void refreshWorkspace()}
                  className="px-5 py-2.5 rounded-xl bg-[#7C927E] text-white text-sm font-medium hover:bg-[#6B816D] transition-colors"
                >
                  إعادة المحاولة
                </button>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className="px-5 py-2.5 rounded-xl border border-[#D9C9B5] bg-[#F7F5F0] text-[#454943] text-sm font-medium hover:bg-[#EFECE4] transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
        <ToastContainer />
      </>
    );
  }

  // Unconfigured state: show honest Auth + Supabase Setup screen with optional UI preview toggle
  if (!isSupabaseLive && !previewEntered) {
    return (
      <>
        <AuthScreen onEnterPreviewMode={() => setPreviewEntered(true)} />
        <ToastContainer />
      </>
    );
  }

  const exitPreview = !isSupabaseLive ? () => setPreviewEntered(false) : undefined;

  if (currentRole === 'super_admin') {
    const meta: Record<typeof adminNav, { title: string; sub: string }> = {
      overview: { title: 'الرئيسية', sub: `${branding.platformName} · لوحة تحكم مديرة المنصة` },
      users: { title: 'إدارة المستخدمين', sub: 'إدارة جميع الحسابات والأدوار في المنصة' },
      teachers: { title: 'المعلمون', sub: 'متابعة حسابات المعلمين ونسب الإنجاز' },
      managers: { title: 'مديرو العمل', sub: 'إدارة المشرفين وتعيين المدارس والمجموعات' },
      schools: { title: 'المدارس والمجموعات', sub: 'تنظيم المؤسسات التعليمية والمجموعات التخصصية' },
      portfolios: { title: 'ملفات الإنجاز', sub: 'نظرة شاملة على تقدم ملفات الإنجاز المهني' },
      sections: { title: 'إدارة الأقسام', sub: 'منشئ الأقسام الديناميكية والحقول المخصصة' },
      files: { title: 'إدارة الملفات', sub: 'استعراض وتنظيم الملفات وسلة المحذوفات' },
      reports: { title: 'التقارير والإحصائيات', sub: 'تحليلات الأداء والتصدير بصيغة CSV' },
      notifications: { title: 'الإشعارات', sub: 'إدارة التنبيهات والتعاميم الإدارية' },
      branding: { title: 'الهوية البصرية', sub: 'إدارة الشعار، أيقونة التطبيق، والهوية اللونية' },
      permissions: { title: 'الصلاحيات', sub: 'توزيع الصلاحيات وعزل البيانات حسب الدور' },
      activity_log: { title: 'سجل النشاطات', sub: 'توثيق زمني لجميع العمليات داخل المنصة' },
      settings: { title: 'الإعدادات', sub: 'ضبط قواعد الملفات ولوحة التحكم والتهيئة العامة' },
    };

    const currentMeta = meta[adminNav];

    return (
      <AppShell
        pageTitle={currentMeta.title}
        pageSubtitle={currentMeta.sub}
        onExitPreviewToAuth={exitPreview}
      >
        {adminNav === 'overview' && <SuperAdminOverview />}
        {adminNav === 'users' && <UserManagementView mode="all" />}
        {adminNav === 'teachers' && <UserManagementView mode="teachers" />}
        {adminNav === 'managers' && <UserManagementView mode="managers" />}
        {adminNav === 'schools' && <SchoolsGroupsView />}
        {adminNav === 'portfolios' && <PortfoliosOverviewView />}
        {adminNav === 'sections' && <SectionBuilderView />}
        {adminNav === 'files' && <FileManagementView />}
        {adminNav === 'reports' && <ReportsView />}
        {adminNav === 'notifications' && <NotificationsView />}
        {adminNav === 'branding' && <BrandingView />}
        {adminNav === 'permissions' && <PermissionsView />}
        {adminNav === 'activity_log' && <ActivityLogView />}
        {adminNav === 'settings' && <SettingsView />}
      </AppShell>
    );
  }

  if (currentRole === 'manager') {
    const meta: Record<typeof managerNav, { title: string; sub: string }> = {
      overview: { title: 'الرئيسية', sub: 'لوحة متابعة مدير العمل ضمن النطاق المسند' },
      assigned_teachers: { title: 'المعلمون التابعون لي', sub: 'إدارة ومتابعة المعلمين المسندين إليك' },
      assigned_schools: { title: 'المدارس والمجموعات', sub: 'المدارس والمجموعات ضمن نطاق إشرافك' },
      review_portfolios: { title: 'مراجعة ملفات الإنجاز', sub: 'أدوات الفحص والاعتماد وإرسال الملاحظات' },
      reports: { title: 'التقارير والإحصائيات', sub: 'ملخص الإنجاز في المدارس المسندة' },
      notifications: { title: 'الإشعارات', sub: 'التنبيهات والتواصل مع المعلمين المسندين' },
    };

    const currentMeta = meta[managerNav];

    return (
      <AppShell
        pageTitle={currentMeta.title}
        pageSubtitle={currentMeta.sub}
        onExitPreviewToAuth={exitPreview}
      >
        {managerNav === 'overview' && <ManagerOverview />}
        {managerNav === 'assigned_teachers' && <ManagerTeachersView mode="teachers" />}
        {managerNav === 'assigned_schools' && <ManagerTeachersView mode="schools" />}
        {managerNav === 'review_portfolios' && <ManagerReviewView />}
        {managerNav === 'reports' && <ReportsView />}
        {managerNav === 'notifications' && <NotificationsView />}
      </AppShell>
    );
  }

  const teacherMeta: Record<typeof teacherNav, { title: string; sub: string }> = {
    overview: { title: 'لوحة المعلم', sub: branding.tagline },
    my_portfolio: { title: 'ملف الإنجاز', sub: 'تنظيم ورفع الشواهد عبر جميع الأقسام المفعلة' },
    my_achievements: { title: 'إنجازاتي', sub: 'توثيق المبادرات وخطابات الشكر والجوائز' },
    my_certificates: { title: 'شهاداتي ودوراتي', sub: 'سجل الشهادات التدريبية والتطوير المهني' },
    my_evidence: { title: 'الشواهد التعليمية', sub: 'استراتيجيات التدريس وأوراق العمل ونواتج التعلم' },
    my_sections: { title: 'مستنداتي وأقسامي', sub: 'أقسامك المخصصة ومساحتك المرنة' },
    my_files: { title: 'إدارة ملفاتي', sub: 'البحث، التعديل، الاستبدال، وسلة المحذوفات الخاصة بك' },
    notifications: { title: 'الإشعارات', sub: 'تنبيهات المراجعة والاعتماد والتعاميم' },
    profile: { title: 'الملف الشخصي', sub: 'بياناتك المهنية وجهة العمل' },
  };

  const currentTeacherMeta = teacherMeta[teacherNav];

  return (
    <AppShell
      pageTitle={currentTeacherMeta.title}
      pageSubtitle={currentTeacherMeta.sub}
      onExitPreviewToAuth={exitPreview}
    >
      {teacherNav === 'overview' && <TeacherOverview />}
      {teacherNav === 'my_portfolio' && <TeacherPortfolioView focusMode="all" />}
      {teacherNav === 'my_achievements' && <TeacherPortfolioView focusMode="achievements" />}
      {teacherNav === 'my_certificates' && <TeacherPortfolioView focusMode="certificates" />}
      {teacherNav === 'my_evidence' && <TeacherPortfolioView focusMode="evidence" />}
      {teacherNav === 'my_sections' && <TeacherPortfolioView focusMode="custom_sections" />}
      {teacherNav === 'my_files' && <FileManagementView />}
      {teacherNav === 'notifications' && <NotificationsView />}
      {teacherNav === 'profile' && <TeacherProfileView />}
    </AppShell>
  );
};

export default function App() {
  return (
    <PlatformProvider>
      <WorkspaceRouter />
    </PlatformProvider>
  );
}
