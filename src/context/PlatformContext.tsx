import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  DEFAULT_BRANDING,
  DEFAULT_PERMISSIONS,
  DEFAULT_SETTINGS,
  DEMO_ACHIEVEMENTS,
  DEMO_ACTIVITY_LOGS,
  DEMO_FILES,
  DEMO_GROUPS,
  DEMO_NOTIFICATIONS,
  DEMO_SCHOOLS,
  DEMO_SECTIONS,
  DEMO_USERS,
} from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import { SupabaseBackend } from '../lib/supabase/repositories';
import type {
  AchievementItem,
  ActivityLogEntry,
  EducationalGroup,
  ManagerNavId,
  NotificationItem,
  PlatformBranding,
  PlatformSettings,
  PortfolioFile,
  PortfolioSection,
  ReviewStatus,
  RolePermissionSet,
  School,
  SuperAdminNavId,
  TeacherNavId,
  UserAccount,
  UserRole,
} from '../types/platform';
import { detectFileCategory } from '../utils/formatters';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'warning';
}

interface UploadFileInput {
  file: File;
  title: string;
  description: string;
  sectionId: string;
  customFieldValues?: Record<string, string>;
}

interface PlatformContextValue {
  // Backend & Auth State
  isSupabaseLive: boolean;
  authLoading: boolean;
  workspaceLoading: boolean;
  workspaceError: string | null;
  accountBlockReason: 'disabled' | 'profile_missing' | 'profile_error' | null;
  session: Session | null;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;

  // Active Role & User
  currentRole: UserRole;
  currentUser: UserAccount;
  switchRole: (role: UserRole) => void; // Available ONLY in unconfigured UI preview

  // Navigation state
  adminNav: SuperAdminNavId;
  setAdminNav: (nav: SuperAdminNavId) => void;
  managerNav: ManagerNavId;
  setManagerNav: (nav: ManagerNavId) => void;
  teacherNav: TeacherNavId;
  setTeacherNav: (nav: TeacherNavId) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  // Collections
  users: UserAccount[];
  schools: School[];
  groups: EducationalGroup[];
  sections: PortfolioSection[];
  visibleSections: PortfolioSection[];
  visibleFiles: PortfolioFile[];
  allPlatformFilesCount: number;
  visibleAchievements: AchievementItem[];
  assignedTeachers: UserAccount[];
  assignedSchools: School[];
  assignedGroups: EducationalGroup[];
  activityLogs: ActivityLogEntry[];
  visibleNotifications: NotificationItem[];
  unreadNotificationsCount: number;
  branding: PlatformBranding;
  permissions: Record<UserRole, RolePermissionSet>;
  settings: PlatformSettings;

  // File operations
  uploadFiles: (items: UploadFileInput[]) => Promise<void>;
  getSignedFileUrl: (file: PortfolioFile) => Promise<string | null>;
  renameAndUpdateFile: (
    fileId: string,
    updates: { title: string; description: string; customFieldValues?: Record<string, string> }
  ) => Promise<void>;
  replaceFileBinary: (fileId: string, newFile: File) => Promise<void>;
  moveFileToSection: (fileId: string, targetSectionId: string) => Promise<void>;
  softDeleteFile: (fileId: string) => Promise<void>;
  restoreFile: (fileId: string) => Promise<void>;
  permanentlyDeleteFile: (fileId: string) => Promise<void>;
  reviewFile: (fileId: string, status: ReviewStatus, note: string) => Promise<void>;

  // Achievement operations
  addAchievement: (input: Omit<AchievementItem, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;

  // Dynamic Section operations
  createSection: (input: Omit<PortfolioSection, 'id' | 'order'>) => Promise<void>;
  updateSection: (id: string, updates: Partial<PortfolioSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSection: (id: string, direction: 'up' | 'down') => Promise<void>;

  // User, School & Group operations
  createUser: (input: Omit<UserAccount, 'id' | 'createdAt' | 'lastActiveAt'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => Promise<void>;
  toggleUserActive: (id: string) => Promise<void>;
  createSchool: (input: Omit<School, 'id' | 'createdAt' | 'groupsCount'>) => Promise<void>;
  updateSchool: (id: string, updates: Partial<School>) => void;
  deleteSchool: (id: string) => Promise<void>;
  createGroup: (input: Omit<EducationalGroup, 'id' | 'createdAt'>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  sendNotification: (input: {
    title: string;
    message: string;
    targetRole: UserRole | 'all';
    targetSchoolId?: string;
    targetGroupId?: string;
    targetUserId?: string;
    category: NotificationItem['category'];
  }) => Promise<void>;

  // Branding, Permissions & Settings
  uploadBrandingAsset: (file: File, kind: 'logo' | 'app_icon') => Promise<void>;
  updateBranding: (updates: Partial<PlatformBranding>) => Promise<void>;
  resetBranding: () => Promise<void>;
  updatePermissions: (role: UserRole, updates: Partial<RolePermissionSet>) => Promise<void>;
  updateSettings: (updates: Partial<PlatformSettings>) => Promise<void>;

  // Helpers & Toasts
  getTeacherCompletionPercent: (teacherId: string) => number;
  toasts: ToastMessage[];
  pushToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSupabaseLive = isSupabaseConfigured();

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseLive);
  const [workspaceLoading, setWorkspaceLoading] = useState<boolean>(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState<boolean>(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // When Supabase IS configured, never pre-populate with demo records!
  const [previewRole, setPreviewRole] = useState<UserRole>('super_admin');
  const [users, setUsers] = useState<UserAccount[]>(isSupabaseLive ? [] : DEMO_USERS);
  const [schools, setSchools] = useState<School[]>(isSupabaseLive ? [] : DEMO_SCHOOLS);
  const [groups, setGroups] = useState<EducationalGroup[]>(isSupabaseLive ? [] : DEMO_GROUPS);
  const [sections, setSections] = useState<PortfolioSection[]>(
    isSupabaseLive ? [] : DEMO_SECTIONS
  );
  const [files, setFiles] = useState<PortfolioFile[]>(isSupabaseLive ? [] : DEMO_FILES);
  const [achievements, setAchievements] = useState<AchievementItem[]>(
    isSupabaseLive ? [] : DEMO_ACHIEVEMENTS
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(
    isSupabaseLive ? [] : DEMO_ACTIVITY_LOGS
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    isSupabaseLive ? [] : DEMO_NOTIFICATIONS
  );
  const [branding, setBranding] = useState<PlatformBranding>(DEFAULT_BRANDING);
  const [permissions, setPermissions] =
    useState<Record<UserRole, RolePermissionSet>>(DEFAULT_PERMISSIONS);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);

  const [adminNav, setAdminNav] = useState<SuperAdminNavId>('overview');
  const [managerNav, setManagerNav] = useState<ManagerNavId>('overview');
  const [teacherNav, setTeacherNav] = useState<TeacherNavId>('overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const hydrateLiveWorkspace = useCallback(
    async (userId: string) => {
      setWorkspaceLoading(true);
      setWorkspaceError(null);
      try {
        const data = await SupabaseBackend.loadAuthenticatedWorkspace(userId);
        setUsers(data.users);
        setSchools(data.schools);
        setGroups(data.groups);
        setSections(data.sections);
        setFiles(data.files);
        setAchievements(data.achievements);
        setActivityLogs(data.activityLogs);
        setNotifications(data.notifications);
        if (data.branding) setBranding(data.branding);
        if (data.permissions) setPermissions(data.permissions);
        if (data.settings) setSettings(data.settings);
        setWorkspaceLoaded(true);
      } catch (err) {
        const extracted =
          err instanceof Error
            ? err.message
            : err &&
                typeof err === 'object' &&
                'message' in err &&
                typeof (err as { message?: unknown }).message === 'string'
              ? (err as { message: string }).message
              : '';
        const msg = extracted.trim() || 'تعذر تحميل بيانات المنصة من قاعدة البيانات';
        setWorkspaceLoaded(false);
        setWorkspaceError(msg);
        pushToast(msg, 'warning');
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [pushToast]
  );

  // Supabase Auth Session Listener + Public Branding Fetch
  useEffect(() => {
    if (!isSupabaseLive || !supabase) return;

    let active = true;

    SupabaseBackend.loadPublicConfig().then((cfg) => {
      if (!active) return;
      if (cfg?.branding) setBranding(cfg.branding);
      if (cfg?.permissions) setPermissions(cfg.permissions);
      if (cfg?.settings) setSettings(cfg.settings);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
      if (data.session?.user?.id) {
        hydrateLiveWorkspace(data.session.user.id);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthLoading(false);
      if (event === 'INITIAL_SESSION') return;
      if (nextSession?.user?.id) {
        hydrateLiveWorkspace(nextSession.user.id);
      } else {
        setWorkspaceLoaded(false);
        setWorkspaceError(null);
        setUsers([]);
        setFiles([]);
        setAchievements([]);
        setNotifications([]);
        setActivityLogs([]);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [isSupabaseLive, hydrateLiveWorkspace]);

  // Sync live branding CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-ivory', branding.colors.ivory);
    root.style.setProperty('--brand-white', branding.colors.white);
    root.style.setProperty('--brand-sage', branding.colors.sage);
    root.style.setProperty('--brand-rose', branding.colors.rose);
    root.style.setProperty('--brand-sand', branding.colors.sand);
    root.style.setProperty('--brand-gray', branding.colors.gray);
    root.style.setProperty('--brand-ink', branding.colors.ink);
  }, [branding.colors]);

  const liveProfile = useMemo(() => {
    if (!isSupabaseLive || !session?.user) return null;
    return users.find((u) => u.id === session.user.id) ?? null;
  }, [isSupabaseLive, session, users]);

  const effectiveWorkspaceLoading =
    workspaceLoading ||
    (isSupabaseLive && Boolean(session?.user) && !workspaceLoaded && !workspaceError);

  const accountBlockReason: 'disabled' | 'profile_missing' | 'profile_error' | null = useMemo(() => {
    if (!isSupabaseLive || !session?.user || authLoading || effectiveWorkspaceLoading) return null;
    if (workspaceError) return 'profile_error';
    if (workspaceLoaded && !liveProfile) return 'profile_missing';
    if (liveProfile && !liveProfile.isActive) return 'disabled';
    return null;
  }, [
    isSupabaseLive,
    session,
    authLoading,
    effectiveWorkspaceLoading,
    workspaceError,
    workspaceLoaded,
    liveProfile,
  ]);

  const currentUser: UserAccount = useMemo(() => {
    if (isSupabaseLive && session?.user) {
      if (liveProfile) return liveProfile;
      return {
        id: session.user.id,
        fullName:
          (session.user.user_metadata?.full_name as string) ||
          session.user.email?.split('@')[0] ||
          'مستخدم',
        email: session.user.email || '',
        role: 'teacher',
        jobTitle: 'معلم',
        isActive: false,
        createdAt: session.user.created_at,
        lastActiveAt: new Date().toISOString(),
        storageQuotaMb: 500,
      };
    }

    if (previewRole === 'super_admin') {
      return users.find((u) => u.role === 'super_admin') ?? DEMO_USERS[0];
    }
    if (previewRole === 'manager') {
      return users.find((u) => u.role === 'manager') ?? DEMO_USERS[1];
    }
    return (
      users.find((u) => u.id === 'usr-tch-1') ??
      users.find((u) => u.role === 'teacher') ??
      DEMO_USERS[3]
    );
  }, [isSupabaseLive, session, liveProfile, users, previewRole]);

  const currentRole: UserRole = currentUser.role;

  const switchRole = (role: UserRole) => {
    if (isSupabaseLive) return;
    setPreviewRole(role);
    setGlobalSearch('');
    const label = role === 'super_admin' ? 'مديرة المنصة' : role === 'manager' ? 'مدير العمل' : 'المعلم';
    pushToast(`تم التبديل إلى معاينة واجهة ${label}`, 'info');
  };

  const signOut = async () => {
    if (!isSupabaseLive) return;
    await SupabaseBackend.signOut();
    pushToast('تم تسجيل الخروج بأمان', 'info');
  };

  const refreshWorkspace = async () => {
    if (isSupabaseLive && session?.user?.id) {
      await hydrateLiveWorkspace(session.user.id);
    }
  };

  const recordActivity = async (
    actionType: ActivityLogEntry['actionType'],
    description: string,
    targetName?: string
  ) => {
    const entry: ActivityLogEntry = {
      id: `act-${Date.now()}`,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      actionType,
      description,
      targetName,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [entry, ...prev]);

    if (isSupabaseLive && session?.user) {
      await SupabaseBackend.logActivity({
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        actionType,
        description,
        targetName,
      }).catch(() => undefined);
    }
  };

  // Scope selectors
  const assignedTeachers = useMemo(() => {
    if (currentRole === 'super_admin') return users.filter((u) => u.role === 'teacher');
    if (currentRole === 'manager') {
      return users.filter(
        (u) =>
          u.role === 'teacher' &&
          (u.managerId === currentUser.id ||
            (currentUser.assignedSchoolIds?.includes(u.schoolId ?? '') ?? false) ||
            (currentUser.assignedGroupIds?.includes(u.groupId ?? '') ?? false))
      );
    }
    return [];
  }, [currentRole, currentUser, users]);

  const assignedSchools = useMemo(() => {
    if (currentRole === 'super_admin') return schools;
    if (currentRole === 'manager') {
      return schools.filter(
        (s) =>
          s.managerId === currentUser.id ||
          (currentUser.assignedSchoolIds?.includes(s.id) ?? false)
      );
    }
    return [];
  }, [currentRole, currentUser, schools]);

  const assignedGroups = useMemo(() => {
    if (currentRole === 'super_admin') return groups;
    if (currentRole === 'manager') {
      const schoolIds = new Set(assignedSchools.map((s) => s.id));
      return groups.filter(
        (g) =>
          g.managerId === currentUser.id ||
          schoolIds.has(g.schoolId) ||
          (currentUser.assignedGroupIds?.includes(g.id) ?? false)
      );
    }
    return [];
  }, [currentRole, currentUser, groups, assignedSchools]);

  const visibleSections = useMemo(() => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    if (currentRole === 'super_admin') return sorted;
    return sorted.filter(
      (sec) => sec.isActive && (!sec.ownerId || sec.ownerId === currentUser.id)
    );
  }, [sections, currentRole, currentUser.id]);

  const visibleFiles = useMemo(() => {
    if (currentRole === 'super_admin') return files;
    if (currentRole === 'teacher') {
      return files.filter((f) => f.ownerId === currentUser.id);
    }
    const teacherIds = new Set(assignedTeachers.map((t) => t.id));
    return files.filter((f) => !f.isDeleted && teacherIds.has(f.ownerId));
  }, [files, currentRole, currentUser.id, assignedTeachers]);

  const visibleAchievements = useMemo(() => {
    if (currentRole === 'super_admin') return achievements;
    if (currentRole === 'teacher') {
      return achievements.filter((a) => a.ownerId === currentUser.id);
    }
    const teacherIds = new Set(assignedTeachers.map((t) => t.id));
    return achievements.filter((a) => teacherIds.has(a.ownerId));
  }, [achievements, currentRole, currentUser.id, assignedTeachers]);

  const visibleNotifications = useMemo(() => {
    const assignedSchoolSet = new Set(assignedSchools.map((s) => s.id));
    const assignedGroupSet = new Set(assignedGroups.map((g) => g.id));
    return notifications.filter((n) => {
      if (currentRole === 'super_admin') return true;
      if (n.targetUserId) return n.targetUserId === currentUser.id;
      const roleMatch = n.targetRole === 'all' || n.targetRole === currentRole;
      if (!roleMatch) return false;
      if (!n.targetSchoolId && !n.targetGroupId) return true;
      if (currentRole === 'manager') {
        return Boolean(
          (n.targetSchoolId && assignedSchoolSet.has(n.targetSchoolId)) ||
            (n.targetGroupId && assignedGroupSet.has(n.targetGroupId))
        );
      }
      return Boolean(
        (n.targetSchoolId && currentUser.schoolId === n.targetSchoolId) ||
          (n.targetGroupId && currentUser.groupId === n.targetGroupId)
      );
    });
  }, [
    notifications,
    currentRole,
    currentUser.id,
    currentUser.schoolId,
    currentUser.groupId,
    assignedSchools,
    assignedGroups,
  ]);

  const unreadNotificationsCount = useMemo(
    () => visibleNotifications.filter((n) => !n.isRead).length,
    [visibleNotifications]
  );

  // --------------------------------------------------------------------------
  // File Operations
  // --------------------------------------------------------------------------
  const uploadFiles = async (items: UploadFileInput[]) => {
    if (isSupabaseLive) {
      try {
        const uploaded = await Promise.all(
          items.map((item) =>
            SupabaseBackend.uploadPrivateFile({
              ownerId: currentUser.id,
              sectionId: item.sectionId,
              file: item.file,
              title: item.title,
              description: item.description,
              customFieldValues: item.customFieldValues,
            })
          )
        );
        setFiles((prev) => [...uploaded, ...prev]);
        await recordActivity(
          'file_upload',
          uploaded.length === 1
            ? `تم رفع ملف جديد: ${uploaded[0].title}`
            : `تم رفع ${uploaded.length} ملفات جديدة`,
          uploaded[0]?.title
        );
        pushToast(
          uploaded.length === 1 ? 'تم رفع الملف في التخزين الخاص' : `تم رفع ${uploaded.length} ملفات بنجاح`
        );
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'فشل رفع الملف', 'warning');
      }
      return;
    }

    const now = new Date().toISOString();
    const created: PortfolioFile[] = items.map((item, idx) => ({
      id: `fil-${Date.now()}-${idx}`,
      title: item.title.trim() || item.file.name.replace(/\.[^/.]+$/, ''),
      originalFileName: item.file.name,
      description: item.description.trim(),
      sectionId: item.sectionId,
      ownerId: currentUser.id,
      fileType: detectFileCategory(item.file.name, item.file.type),
      mimeType: item.file.type || 'application/octet-stream',
      sizeBytes: item.file.size,
      uploadedAt: now,
      updatedAt: now,
      isDeleted: false,
      reviewStatus: 'pending',
      customFieldValues: item.customFieldValues,
      localPreviewUrl: URL.createObjectURL(item.file),
      storagePath: `${currentUser.id}/${item.sectionId}/${Date.now()}_${item.file.name}`,
    }));
    setFiles((prev) => [...created, ...prev]);
    await recordActivity('file_upload', `تم رفع ملف (${created[0]?.title ?? ''})`, created[0]?.title);
    pushToast(created.length === 1 ? 'تم رفع الملف بنجاح' : `تم رفع ${created.length} ملفات بنجاح`);
  };

  const getSignedFileUrl = async (file: PortfolioFile): Promise<string | null> => {
    if (file.localPreviewUrl) return file.localPreviewUrl;
    if (!isSupabaseLive) return null;
    try {
      return await SupabaseBackend.getSignedFileUrl(file.storagePath);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'تعذر جلب الرابط الموقّع للملف', 'warning');
      return null;
    }
  };

  const renameAndUpdateFile = async (
    fileId: string,
    updates: { title: string; description: string; customFieldValues?: Record<string, string> }
  ) => {
    if (isSupabaseLive) {
      try {
        const updated = await SupabaseBackend.updateFileMetadata(fileId, updates);
        setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
        await recordActivity('file_update', 'تم تعديل بيانات الملف', updated.title);
        pushToast('تم حفظ تعديلات الملف');
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر تعديل الملف', 'warning');
      }
      return;
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              title: updates.title.trim() || f.title,
              description: updates.description,
              customFieldValues: updates.customFieldValues ?? f.customFieldValues,
              updatedAt: new Date().toISOString(),
            }
          : f
      )
    );
    await recordActivity('file_update', 'تم تعديل بيانات الملف', updates.title);
    pushToast('تم تحديث بيانات الملف');
  };

  const replaceFileBinary = async (fileId: string, newFile: File) => {
    const existing = files.find((f) => f.id === fileId);
    if (!existing) return;

    if (isSupabaseLive) {
      try {
        const updated = await SupabaseBackend.replacePrivateFile(existing, newFile);
        setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
        await recordActivity('file_update', 'تم استبدال الملف بنسخة جديدة', newFile.name);
        pushToast('تم استبدال الملف في التخزين الخاص');
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'فشل استبدال الملف', 'warning');
      }
      return;
    }

    const previewUrl = URL.createObjectURL(newFile);
    const fileType = detectFileCategory(newFile.name, newFile.type);
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              originalFileName: newFile.name,
              fileType,
              mimeType: newFile.type || f.mimeType,
              sizeBytes: newFile.size,
              localPreviewUrl: previewUrl,
              updatedAt: new Date().toISOString(),
            }
          : f
      )
    );
    await recordActivity('file_update', 'تم استبدال نسخة الملف', newFile.name);
    pushToast('تم استبدال الملف بنجاح');
  };

  const moveFileToSection = async (fileId: string, targetSectionId: string) => {
    const targetSec = sections.find((s) => s.id === targetSectionId);
    if (isSupabaseLive) {
      try {
        const updated = await SupabaseBackend.updateFileMetadata(fileId, {
          sectionId: targetSectionId,
        });
        setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
        pushToast(`تم نقل الملف إلى "${targetSec?.title ?? ''}"`);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر نقل الملف', 'warning');
      }
      return;
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, sectionId: targetSectionId, updatedAt: new Date().toISOString() }
          : f
      )
    );
    pushToast(`تم نقل الملف إلى "${targetSec?.title ?? 'القسم المحدد'}"`);
  };

  const softDeleteFile = async (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.softDeleteFile(fileId);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حذف الملف', 'warning');
        return;
      }
    }
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, isDeleted: true, deletedAt: new Date().toISOString() } : f
      )
    );
    await recordActivity('file_delete', 'تم نقل الملف إلى سلة المحذوفات', target?.title);
    pushToast('تم نقل الملف إلى سلة المحذوفات', 'info');
  };

  const restoreFile = async (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.restoreFile(fileId);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر استعادة الملف', 'warning');
        return;
      }
    }
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, isDeleted: false, deletedAt: undefined } : f
      )
    );
    await recordActivity('file_restore', 'تمت استعادة الملف من سلة المحذوفات', target?.title);
    pushToast('تمت استعادة الملف بنجاح');
  };

  const permanentlyDeleteFile = async (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    if (!target) return;
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.permanentlyDeleteFile(target);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر الحذف النهائي', 'warning');
        return;
      }
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    await recordActivity('file_delete', 'تم حذف الملف نهائياً', target.title);
    pushToast('تم حذف الملف نهائياً', 'warning');
  };

  const reviewFile = async (fileId: string, status: ReviewStatus, note: string) => {
    const target = files.find((f) => f.id === fileId);
    if (isSupabaseLive) {
      try {
        const updated = await SupabaseBackend.reviewFile(fileId, currentUser.id, status, note);
        setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حفظ المراجعة', 'warning');
        return;
      }
    } else {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                reviewStatus: status,
                reviewNote: note.trim(),
                reviewedBy: currentUser.id,
                reviewedAt: new Date().toISOString(),
              }
            : f
        )
      );
    }

    const statusText =
      status === 'approved' ? 'اعتماد' : status === 'needs_revision' ? 'طلب استكمال' : 'تحديث حالة';
    await recordActivity('review_submit', `تم ${statusText} الملف`, target?.title);
    pushToast(`تم حفظ المراجعة (${statusText})`);
  };

  // --------------------------------------------------------------------------
  // Achievements
  // --------------------------------------------------------------------------
  const addAchievement = async (input: Omit<AchievementItem, 'id' | 'ownerId' | 'createdAt'>) => {
    if (isSupabaseLive) {
      try {
        const created = await SupabaseBackend.createAchievement(currentUser.id, input);
        setAchievements((prev) => [created, ...prev]);
        await recordActivity('file_upload', 'تمت إضافة إنجاز مهني جديد', created.title);
        pushToast('تمت إضافة الإنجاز بنجاح');
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر إضافة الإنجاز', 'warning');
      }
      return;
    }

    const item: AchievementItem = {
      ...input,
      id: `ach-${Date.now()}`,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    setAchievements((prev) => [item, ...prev]);
    await recordActivity('file_upload', 'تمت إضافة إنجاز مهني جديد', item.title);
    pushToast('تمت إضافة الإنجاز بنجاح');
  };

  const deleteAchievement = async (id: string) => {
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.deleteAchievement(id);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حذف الإنجاز', 'warning');
        return;
      }
    }
    setAchievements((prev) => prev.filter((a) => a.id !== id));
    pushToast('تم حذف الإنجاز', 'info');
  };

  // --------------------------------------------------------------------------
  // Dynamic Sections
  // --------------------------------------------------------------------------
  const createSection = async (input: Omit<PortfolioSection, 'id' | 'order'>) => {
    const maxOrder = sections.reduce((acc, s) => Math.max(acc, s.order), 0);
    if (isSupabaseLive) {
      try {
        const created = await SupabaseBackend.createSection({ ...input, order: maxOrder + 1 });
        setSections((prev) => [...prev, created]);
        await recordActivity('section_create', 'تم إنشاء قسم جديد', created.title);
        pushToast(`تم إنشاء قسم "${created.title}"`);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر إنشاء القسم', 'warning');
      }
      return;
    }

    const newSec: PortfolioSection = {
      ...input,
      id: `sec-${Date.now()}`,
      order: maxOrder + 1,
    };
    setSections((prev) => [...prev, newSec]);
    await recordActivity('section_create', 'تم إنشاء قسم جديد في ملف الإنجاز', newSec.title);
    pushToast(`تم إنشاء قسم "${newSec.title}"`);
  };

  const updateSection = async (id: string, updates: Partial<PortfolioSection>) => {
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.updateSection(id, updates);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر تحديث القسم', 'warning');
        return;
      }
    }
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await recordActivity('section_update', 'تم تحديث إعدادات القسم', updates.title);
    pushToast('تم حفظ تعديلات القسم');
  };

  const deleteSection = async (id: string) => {
    const hasFiles = files.some((f) => f.sectionId === id && !f.isDeleted);
    if (hasFiles) {
      pushToast('لا يمكن حذف قسم يحتوي على ملفات نشطة، انقل الملفات أولاً', 'warning');
      return;
    }
    const target = sections.find((s) => s.id === id);
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.deleteSection(id);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حذف القسم', 'warning');
        return;
      }
    }
    setSections((prev) =>
      prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 }))
    );
    await recordActivity('section_update', 'تم حذف القسم', target?.title);
    pushToast('تم حذف القسم', 'info');
  };

  const reorderSection = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.id === id);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const copy = [...sorted];
    const temp = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temp;
    const reordered = copy.map((s, i) => ({ ...s, order: i + 1 }));
    setSections(reordered);

    if (isSupabaseLive) {
      await Promise.all([
        SupabaseBackend.updateSection(reordered[index].id, { order: reordered[index].order }),
        SupabaseBackend.updateSection(reordered[swapIndex].id, {
          order: reordered[swapIndex].order,
        }),
      ]).catch(() => undefined);
    }
    pushToast('تم تحديث ترتيب الأقسام', 'info');
  };

  // --------------------------------------------------------------------------
  // Users, Schools & Groups
  // --------------------------------------------------------------------------
  const createUser = (input: Omit<UserAccount, 'id' | 'createdAt' | 'lastActiveAt'>) => {
    if (isSupabaseLive) {
      pushToast(
        'في وضع Supabase الحقيقي يسجل المستخدم حسابه عبر شاشة الدخول الآمن ثم تضبطين دوره ومدرسته من هنا.',
        'info'
      );
      return;
    }
    const now = new Date().toISOString();
    const user: UserAccount = {
      ...input,
      id: `usr-${Date.now()}`,
      createdAt: now,
      lastActiveAt: now,
    };
    setUsers((prev) => [user, ...prev]);
    recordActivity('user_create', `تمت إضافة حساب مستخدم جديد (${user.fullName})`, user.fullName);
    pushToast(`تمت إضافة "${user.fullName}" بنجاح`);
  };

  const updateUser = async (id: string, updates: Partial<UserAccount>) => {
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.updateProfile(id, updates);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر تحديث البيانات', 'warning');
        return;
      }
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    pushToast('تم تحديث بيانات الحساب');
  };

  const toggleUserActive = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const nextState = !target.isActive;
    await updateUser(id, { isActive: nextState });
  };

  const createSchool = async (input: Omit<School, 'id' | 'createdAt' | 'groupsCount'>) => {
    if (isSupabaseLive) {
      try {
        const created = await SupabaseBackend.createSchool(input);
        setSchools((prev) => [created, ...prev]);
        pushToast(`تمت إضافة "${created.name}"`);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر إضافة المدرسة', 'warning');
      }
      return;
    }

    const school: School = {
      ...input,
      id: `sch-${Date.now()}`,
      groupsCount: 0,
      createdAt: new Date().toISOString(),
    };
    setSchools((prev) => [school, ...prev]);
    pushToast(`تمت إضافة "${school.name}"`);
  };

  const updateSchool = (id: string, updates: Partial<School>) => {
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    pushToast('تم تحديث بيانات المدرسة');
  };

  const deleteSchool = async (id: string) => {
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.deleteSchool(id);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حذف المدرسة', 'warning');
        return;
      }
    }
    setSchools((prev) => prev.filter((s) => s.id !== id));
    setGroups((prev) => prev.filter((g) => g.schoolId !== id));
    pushToast('تم حذف المدرسة والمجموعات المرتبطة بها', 'info');
  };

  const createGroup = async (input: Omit<EducationalGroup, 'id' | 'createdAt'>) => {
    if (isSupabaseLive) {
      try {
        const created = await SupabaseBackend.createGroup(input);
        setGroups((prev) => [created, ...prev]);
        setSchools((prev) =>
          prev.map((s) =>
            s.id === input.schoolId ? { ...s, groupsCount: s.groupsCount + 1 } : s
          )
        );
        pushToast(`تمت إضافة "${created.name}"`);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر إضافة المجموعة', 'warning');
      }
      return;
    }

    const group: EducationalGroup = {
      ...input,
      id: `grp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setGroups((prev) => [group, ...prev]);
    setSchools((prev) =>
      prev.map((s) =>
        s.id === input.schoolId ? { ...s, groupsCount: s.groupsCount + 1 } : s
      )
    );
    pushToast(`تمت إضافة "${group.name}"`);
  };

  const deleteGroup = async (id: string) => {
    const target = groups.find((g) => g.id === id);
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.deleteGroup(id);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حذف المجموعة', 'warning');
        return;
      }
    }
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (target) {
      setSchools((prev) =>
        prev.map((s) =>
          s.id === target.schoolId
            ? { ...s, groupsCount: Math.max(0, s.groupsCount - 1) }
            : s
        )
      );
    }
    pushToast('تم حذف المجموعة', 'info');
  };

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------
  const markNotificationRead = async (id: string) => {
    if (isSupabaseLive) {
      await SupabaseBackend.markNotificationRead(id, currentUser.id).catch(() => undefined);
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    if (isSupabaseLive) {
      await Promise.all(
        visibleNotifications
          .filter((n) => !n.isRead)
          .map((n) => SupabaseBackend.markNotificationRead(n.id, currentUser.id))
      ).catch(() => undefined);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    pushToast('تم تحديد جميع الإشعارات كمقروءة', 'info');
  };

  const sendNotification = async (input: {
    title: string;
    message: string;
    targetRole: UserRole | 'all';
    targetSchoolId?: string;
    targetGroupId?: string;
    targetUserId?: string;
    category: NotificationItem['category'];
  }) => {
    if (
      currentRole === 'manager' &&
      !input.targetSchoolId &&
      !input.targetGroupId &&
      !input.targetUserId
    ) {
      pushToast('يجب تحديد مدرسة أو مجموعة مسندة عند إرسال الإشعار', 'warning');
      return;
    }

    if (isSupabaseLive) {
      try {
        const created = await SupabaseBackend.sendNotification({
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          ...input,
        });
        setNotifications((prev) => [created, ...prev]);
        pushToast('تم إرسال الإشعار بنجاح');
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر إرسال الإشعار', 'warning');
      }
      return;
    }

    const item: NotificationItem = {
      id: `not-${Date.now()}`,
      title: input.title,
      message: input.message,
      senderName: currentUser.fullName,
      targetRole: input.targetRole,
      targetSchoolId: input.targetSchoolId,
      targetGroupId: input.targetGroupId,
      targetUserId: input.targetUserId,
      isRead: false,
      createdAt: new Date().toISOString(),
      category: input.category,
    };
    setNotifications((prev) => [item, ...prev]);
    pushToast('تم إرسال الإشعار بنجاح');
  };

  // --------------------------------------------------------------------------
  // Branding, Permissions & Settings (platform_config)
  // --------------------------------------------------------------------------
  const persistConfig = async (
    nextBranding: PlatformBranding,
    nextPermissions: Record<UserRole, RolePermissionSet>,
    nextSettings: PlatformSettings
  ) => {
    if (!isSupabaseLive) return;
    await SupabaseBackend.savePlatformConfig(currentUser.id, {
      branding: nextBranding,
      permissions: nextPermissions,
      settings: nextSettings,
    });
  };

  const uploadBrandingAsset = async (file: File, kind: 'logo' | 'app_icon') => {
    const field = kind === 'logo' ? 'logoDataUrl' : 'appIconDataUrl';
    if (isSupabaseLive) {
      try {
        const url = await SupabaseBackend.uploadBrandingAsset(file, kind);
        await updateBranding({ [field]: url });
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر رفع الصورة', 'warning');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateBranding({ [field]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateBranding = async (updates: Partial<PlatformBranding>) => {
    const nextBranding: PlatformBranding = {
      ...branding,
      ...updates,
      colors: updates.colors ? { ...branding.colors, ...updates.colors } : branding.colors,
    };
    if (isSupabaseLive) {
      try {
        await persistConfig(nextBranding, permissions, settings);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حفظ الهوية البصرية', 'warning');
        return;
      }
    }
    setBranding(nextBranding);
    await recordActivity('branding_update', 'تم تحديث الهوية البصرية للمنصة');
    pushToast('تم حفظ إعدادات الهوية البصرية');
  };

  const resetBranding = async () => {
    if (isSupabaseLive) {
      try {
        await persistConfig(DEFAULT_BRANDING, permissions, settings);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر استعادة الهوية', 'warning');
        return;
      }
    }
    setBranding(DEFAULT_BRANDING);
    await recordActivity('branding_update', 'تمت استعادة الهوية البصرية الافتراضية');
    pushToast('تمت استعادة الهوية الافتراضية', 'info');
  };

  const updatePermissions = async (role: UserRole, updates: Partial<RolePermissionSet>) => {
    const nextPermissions = {
      ...permissions,
      [role]: { ...permissions[role], ...updates },
    };
    if (isSupabaseLive) {
      try {
        await persistConfig(branding, nextPermissions, settings);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر تحديث الصلاحيات', 'warning');
        return;
      }
    }
    setPermissions(nextPermissions);
    pushToast('تم تحديث مصفوفة الصلاحيات');
  };

  const updateSettings = async (updates: Partial<PlatformSettings>) => {
    const nextSettings: PlatformSettings = {
      ...settings,
      ...updates,
      dashboardWidgets: updates.dashboardWidgets
        ? { ...settings.dashboardWidgets, ...updates.dashboardWidgets }
        : settings.dashboardWidgets,
    };
    if (isSupabaseLive) {
      try {
        await persistConfig(branding, permissions, nextSettings);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات', 'warning');
        return;
      }
    }
    setSettings(nextSettings);
    await recordActivity('settings_update', 'تم تحديث الإعدادات العامة للمنصة');
    pushToast('تم حفظ الإعدادات');
  };

  const getTeacherCompletionPercent = (teacherId: string): number => {
    const requiredSections = sections.filter((s) => s.isActive && !s.ownerId && s.isRequired);
    const activeTarget =
      requiredSections.length > 0
        ? requiredSections
        : sections.filter((s) => s.isActive && !s.ownerId);
    if (activeTarget.length === 0) return 0;
    const teacherActiveFiles = files.filter((f) => f.ownerId === teacherId && !f.isDeleted);
    const coveredCount = activeTarget.filter((sec) =>
      teacherActiveFiles.some((f) => f.sectionId === sec.id)
    ).length;
    return Math.round((coveredCount / activeTarget.length) * 100);
  };

  return (
    <PlatformContext.Provider
      value={{
        isSupabaseLive,
        authLoading,
        workspaceLoading: effectiveWorkspaceLoading,
        workspaceError,
        accountBlockReason,
        session,
        signOut,
        refreshWorkspace,
        currentRole,
        currentUser,
        switchRole,
        adminNav,
        setAdminNav,
        managerNav,
        setManagerNav,
        teacherNav,
        setTeacherNav,
        globalSearch,
        setGlobalSearch,
        users,
        schools,
        groups,
        sections,
        visibleSections,
        visibleFiles,
        allPlatformFilesCount: files.filter((f) => !f.isDeleted).length,
        visibleAchievements,
        assignedTeachers,
        assignedSchools,
        assignedGroups,
        activityLogs,
        visibleNotifications,
        unreadNotificationsCount,
        branding,
        permissions,
        settings,
        uploadFiles,
        getSignedFileUrl,
        renameAndUpdateFile,
        replaceFileBinary,
        moveFileToSection,
        softDeleteFile,
        restoreFile,
        permanentlyDeleteFile,
        reviewFile,
        addAchievement,
        deleteAchievement,
        createSection,
        updateSection,
        deleteSection,
        reorderSection,
        createUser,
        updateUser,
        toggleUserActive,
        createSchool,
        updateSchool,
        deleteSchool,
        createGroup,
        deleteGroup,
        markNotificationRead,
        markAllNotificationsRead,
        sendNotification,
        uploadBrandingAsset,
        updateBranding,
        resetBranding,
        updatePermissions,
        updateSettings,
        getTeacherCompletionPercent,
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return ctx;
}
