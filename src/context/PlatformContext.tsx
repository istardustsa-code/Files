import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  mergeSectionsWithTeacherExtensions,
  SupabaseBackend,
} from '../lib/supabase/repositories';
import type {
  AchievementItem,
  ActivityLogEntry,
  EducationalGroup,
  GuestVisitSessionPayload,
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
  TeacherVisitCode,
  TeacherVisitLog,
  UserAccount,
  UserRole,
} from '../types/platform';
import { detectFileCategory } from '../utils/formatters';
import {
  prepareFileForPortfolioUpload,
  SUPABASE_SAFE_SINGLE_OBJECT_BYTES,
} from '../utils/pdfLargeFile';

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
  focusedSectionId: string | null;
  setFocusedSectionId: (sectionId: string | null) => void;
  openTeacherSection: (sectionId: string) => void;
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
  uploadProgress: { active: boolean; completed: number; total: number } | null;
  uploadFiles: (items: UploadFileInput[]) => Promise<void>;
  getSignedFileUrl: (file: PortfolioFile) => Promise<string | null>;
  renameAndUpdateFile: (
    fileId: string,
    updates: { title: string; description: string; customFieldValues?: Record<string, string> }
  ) => Promise<void>;
  replaceFileBinary: (fileId: string, newFile: File) => Promise<void>;
  appendFilesToEntry: (targetFileId: string, newFiles: File[]) => Promise<void>;
  moveFileToSection: (
    fileId: string,
    targetSectionId: string,
    targetSubSectionId?: string
  ) => Promise<void>;
  batchMoveFilesToSection: (
    fileIds: string[],
    targetSectionId: string,
    targetSubSectionId?: string
  ) => Promise<void>;
  softDeleteFile: (fileId: string) => Promise<void>;
  batchSoftDeleteFiles: (fileIds: string[]) => Promise<void>;
  restoreFile: (fileId: string) => Promise<void>;
  batchRestoreFiles: (fileIds: string[]) => Promise<void>;
  permanentlyDeleteFile: (fileId: string) => Promise<void>;
  batchPermanentlyDeleteFiles: (fileIds: string[]) => Promise<void>;
  reviewFile: (fileId: string, status: ReviewStatus, note: string) => Promise<void>;

  // Achievement operations
  addAchievement: (input: Omit<AchievementItem, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;

  // Dynamic Section operations
  createSection: (input: Omit<PortfolioSection, 'id' | 'order'>) => Promise<void>;
  updateSection: (id: string, updates: Partial<PortfolioSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSection: (id: string, direction: 'up' | 'down') => Promise<void>;
  addTeacherSubSection: (
    parentSectionId: string,
    input: { label: string; placeholder?: string }
  ) => Promise<void>;
  deleteTeacherSubSection: (parentSectionId: string, subSectionId: string) => Promise<void>;

  // User, School & Group operations
  createUser: (input: Omit<UserAccount, 'id' | 'createdAt' | 'lastActiveAt'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => Promise<void>;
  toggleManagerViewPermission: (allow: boolean) => Promise<void>;
  joinSchoolByCode: (code: string) => Promise<boolean>;
  toggleUserActive: (id: string) => Promise<void>;
  createSchool: (input: Omit<School, 'id' | 'createdAt' | 'groupsCount'>) => Promise<void>;
  updateSchool: (id: string, updates: Partial<School>) => Promise<void>;
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

  // Temporary Visit Code (Teacher Control & Guest Read-Only Session)
  myVisitCode: TeacherVisitCode | null;
  myVisitLogs: TeacherVisitLog[];
  visitCodeLoading: boolean;
  loadMyVisitData: (silent?: boolean) => Promise<void>;
  toggleMyVisitCode: (nextActive: boolean) => Promise<void>;
  regenerateMyVisitCode: () => Promise<void>;
  guestVisitSession: GuestVisitSessionPayload | null;
  enterGuestVisitSession: (code: string, visitorName?: string) => Promise<void>;
  exitGuestVisitSession: () => Promise<void>;
  getGuestSignedFileUrl: (file: PortfolioFile) => Promise<string | null>;

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
  const [rawSections, setRawSections] = useState<PortfolioSection[]>(
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
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    completed: number;
    total: number;
  } | null>(null);
  const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());

  const openTeacherSection = useCallback((sectionId: string) => {
    setFocusedSectionId(sectionId);
    setTeacherNav('my_portfolio');
  }, []);

  // Temporary Visit Codes & Guest Read-Only Session State
  const [myVisitCode, setMyVisitCode] = useState<TeacherVisitCode | null>(null);
  const [myVisitLogs, setMyVisitLogs] = useState<TeacherVisitLog[]>([]);
  const [visitCodeLoading, setVisitCodeLoading] = useState(false);
  const [guestVisitSession, setGuestVisitSession] = useState<GuestVisitSessionPayload | null>(null);

  const pushToast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hydrateLiveWorkspace = useCallback(
    async (userId: string) => {
      setWorkspaceLoading(true);
      setWorkspaceError(null);
      try {
        const data = await SupabaseBackend.loadAuthenticatedWorkspace(userId);
        setUsers(data.users);
        setSchools(data.schools);
        setGroups(data.groups);
        setRawSections(data.sections);
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
        setMyVisitCode(null);
        setMyVisitLogs([]);
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

  const recordActivity = (
    actionType: ActivityLogEntry['actionType'],
    description: string,
    targetName?: string
  ) => {
    const entry: ActivityLogEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
      void SupabaseBackend.logActivity({
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

  const TEACHER_SUBSECTION_EXT_CATEGORY = '__teacher_subsections__';

  const sections = useMemo(
    () => rawSections.filter((s) => s.category !== TEACHER_SUBSECTION_EXT_CATEGORY),
    [rawSections]
  );

  const visibleSections = useMemo(() => {
    const extByParent = new Map<string, PortfolioSection['customFields']>();
    rawSections.forEach((s) => {
      if (s.category === TEACHER_SUBSECTION_EXT_CATEGORY && s.ownerId === currentUser.id) {
        const existing = extByParent.get(s.iconName) ?? [];
        extByParent.set(s.iconName, [...existing, ...s.customFields]);
      }
    });

    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const filtered =
      currentRole === 'super_admin'
        ? sorted
        : sorted.filter(
            (sec) => sec.isActive && (!sec.ownerId || sec.ownerId === currentUser.id)
          );

    return filtered.map((sec) => {
      const extraSubs = extByParent.get(sec.id);
      if (!extraSubs || extraSubs.length === 0) return sec;
      return {
        ...sec,
        customFields: [...sec.customFields, ...extraSubs],
      };
    });
  }, [rawSections, sections, currentRole, currentUser.id]);

  const visibleFiles = useMemo(() => {
    if (currentRole === 'super_admin') return files;
    if (currentRole === 'teacher') {
      return files.filter((f) => f.ownerId === currentUser.id);
    }
    const viewableTeacherIds = new Set(
      assignedTeachers.filter((t) => t.allowManagerView !== false).map((t) => t.id)
    );
    return files.filter((f) => !f.isDeleted && viewableTeacherIds.has(f.ownerId));
  }, [files, currentRole, currentUser.id, assignedTeachers]);

  const visibleAchievements = useMemo(() => {
    if (currentRole === 'super_admin') return achievements;
    if (currentRole === 'teacher') {
      return achievements.filter((a) => a.ownerId === currentUser.id);
    }
    const viewableTeacherIds = new Set(
      assignedTeachers.filter((t) => t.allowManagerView !== false).map((t) => t.id)
    );
    return achievements.filter((a) => viewableTeacherIds.has(a.ownerId));
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
  // File Operations (High-Speed Parallel Batch Upload & Cached Previews)
  // --------------------------------------------------------------------------
  const uploadFiles = async (items: UploadFileInput[]) => {
    if (items.length === 0) return;
    const hasLargeItem = items.some((i) => i.file.size > 15 * 1024 * 1024);
    if (hasLargeItem) {
      pushToast('جاري تجهيز ورفع الملف الكبير... يرجى الانتظار قليلاً', 'info');
    }

    const preparedResults = await Promise.all(
      items.map(async (item) => {
        const prepared = await prepareFileForPortfolioUpload(
          item.file,
          SUPABASE_SAFE_SINGLE_OBJECT_BYTES
        );
        return { item, prepared };
      })
    );

    const preparedItems: UploadFileInput[] = [];
    let splitPerformed = false;

    for (const { item, prepared } of preparedResults) {
      if (prepared.wasSplitPdf && prepared.files.length > 1) {
        splitPerformed = true;
        const sharedBundleId =
          item.customFieldValues?._bundleId ||
          `bnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        prepared.files.forEach((partFile) => {
          preparedItems.push({
            ...item,
            file: partFile,
            customFieldValues: {
              ...(item.customFieldValues ?? {}),
              _bundleId: sharedBundleId,
              ...(prepared.totalPages ? { _totalPages: String(prepared.totalPages) } : {}),
            },
          });
        });
      } else {
        preparedItems.push(item);
      }
    }

    if (isSupabaseLive) {
      const totalCount = preparedItems.length;
      setUploadProgress({ active: true, completed: 0, total: totalCount });
      try {
        const uploaded = await SupabaseBackend.uploadPrivateFilesBatch(
          preparedItems.map((item) => ({
            ownerId: currentUser.id,
            sectionId: item.sectionId,
            file: item.file,
            title: item.title,
            description: item.description,
            customFieldValues: item.customFieldValues,
          })),
          {
            onProgress: (completed, total) => {
              setUploadProgress({ active: true, completed, total });
            },
            onChunkSaved: (savedChunk) => {
              setFiles((prev) => [...savedChunk, ...prev]);
            },
          }
        );

        recordActivity(
          'file_upload',
          uploaded.length === 1
            ? `تم رفع ملف جديد: ${uploaded[0].title}`
            : `تم رفع ${uploaded.length} ملفات جديدة`,
          uploaded[0]?.title
        );
        pushToast(
          splitPerformed
            ? `تم تجهيز ورفع الملف الكبير كاملاً (${uploaded.length} أجزاء داخل عنصر واحد)`
            : uploaded.length === 1
              ? 'تم رفع الملف في التخزين الخاص'
              : `تم رفع ${uploaded.length} ملفات بنجاح`
        );
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : 'فشل رفع الملف';
        const lower = rawMsg.toLowerCase();
        if (lower.includes('maximum allowed size') || lower.includes('payload too large')) {
          pushToast(
            'تجاوز الملف حد التخزين الفردي (50 م.ب على الخطة المجانية). لملفات +100 صفحة كبيرة الحجم، احفظيها بصيغة PDF ليتم رفعها وتنظيمها تلقائياً داخل عنصر واحد.',
            'warning'
          );
        } else {
          pushToast(rawMsg, 'warning');
        }
      } finally {
        setUploadProgress(null);
      }
      return;
    }

    const now = new Date().toISOString();
    const created: PortfolioFile[] = preparedItems.map((item, idx) => ({
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
    recordActivity('file_upload', `تم رفع ملف (${created[0]?.title ?? ''})`, created[0]?.title);
    pushToast(
      splitPerformed
        ? `تم تجهيز ورفع الملف الكبير كاملاً (${created.length} أجزاء داخل عنصر واحد)`
        : created.length === 1
          ? 'تم رفع الملف بنجاح'
          : `تم رفع ${created.length} ملفات بنجاح`
    );
  };

  const getSignedFileUrl = useCallback(
    async (file: PortfolioFile): Promise<string | null> => {
      if (file.localPreviewUrl) return file.localPreviewUrl;
      if (!isSupabaseLive) return null;

      const cacheKey = `auth:${file.storagePath}`;
      const cached = signedUrlCacheRef.current.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
      }

      try {
        const url = await SupabaseBackend.getSignedFileUrl(file.storagePath, 3600);
        signedUrlCacheRef.current.set(cacheKey, {
          url,
          expiresAt: Date.now() + 45 * 60 * 1000,
        });
        return url;
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر جلب الرابط الموقّع للملف', 'warning');
        return null;
      }
    },
    [isSupabaseLive, pushToast]
  );

  const renameAndUpdateFile = async (
    fileId: string,
    updates: { title: string; description: string; customFieldValues?: Record<string, string> }
  ) => {
    const existing = files.find((f) => f.id === fileId);
    const bundleId = existing?.customFieldValues?._bundleId;
    const targetIds = bundleId
      ? files
          .filter(
            (f) =>
              !f.isDeleted &&
              f.ownerId === existing?.ownerId &&
              f.customFieldValues?._bundleId === bundleId
          )
          .map((f) => f.id)
      : [fileId];

    if (isSupabaseLive) {
      try {
        const updatedList = await Promise.all(
          targetIds.map((id) =>
            SupabaseBackend.updateFileMetadata(id, {
              title: updates.title,
              description: updates.description,
              ...(id === fileId && updates.customFieldValues
                ? { customFieldValues: updates.customFieldValues }
                : {}),
            })
          )
        );
        const updatedMap = new Map(updatedList.map((u) => [u.id, u]));
        setFiles((prev) => prev.map((f) => updatedMap.get(f.id) ?? f));
        await recordActivity('file_update', 'تم تعديل بيانات الملف', updates.title);
        pushToast('تم حفظ تعديلات الملف');
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر تعديل الملف', 'warning');
      }
      return;
    }

    const idSet = new Set(targetIds);
    setFiles((prev) =>
      prev.map((f) =>
        idSet.has(f.id)
          ? {
              ...f,
              title: updates.title.trim() || f.title,
              description: updates.description,
              customFieldValues:
                f.id === fileId && updates.customFieldValues
                  ? updates.customFieldValues
                  : f.customFieldValues,
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
        signedUrlCacheRef.current.delete(`auth:${existing.storagePath}`);
        setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
        recordActivity('file_update', 'تم استبدال الملف بنسخة جديدة', newFile.name);
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

  const appendFilesToEntry = async (targetFileId: string, newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const targetFile = files.find((f) => f.id === targetFileId);
    if (!targetFile) return;

    const existingBundleId = targetFile.customFieldValues?._bundleId;
    const bundleId =
      typeof existingBundleId === 'string' && existingBundleId.trim()
        ? existingBundleId.trim()
        : `bnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const sharedCustomValues: Record<string, string> = {
      ...(targetFile.customFieldValues ?? {}),
      _bundleId: bundleId,
    };

    // Ensure the original file carries the _bundleId if it was uploaded solo
    if (!existingBundleId) {
      if (isSupabaseLive) {
        try {
          const updatedOrigin = await SupabaseBackend.updateFileMetadata(targetFile.id, {
            customFieldValues: sharedCustomValues,
          });
          setFiles((prev) => prev.map((f) => (f.id === targetFile.id ? updatedOrigin : f)));
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'تعذر ربط المرفقات الإضافية', 'warning');
          return;
        }
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === targetFile.id ? { ...f, customFieldValues: sharedCustomValues } : f
          )
        );
      }
    }

    await uploadFiles(
      newFiles.map((file) => ({
        file,
        title: targetFile.title,
        description: targetFile.description,
        sectionId: targetFile.sectionId,
        customFieldValues: sharedCustomValues,
      }))
    );
  };

  const moveFileToSection = async (
    fileId: string,
    targetSectionId: string,
    targetSubSectionId?: string
  ) => {
    const existing = files.find((f) => f.id === fileId);
    const targetSec = visibleSections.find((s) => s.id === targetSectionId);
    const subTitle = targetSubSectionId
      ? targetSec?.customFields.find((cf) => cf.id === targetSubSectionId)?.label
      : undefined;

    const buildNextValues = (prevValues?: Record<string, string>) => {
      const nextCustomValues: Record<string, string> = { ...(prevValues ?? {}) };
      if (targetSubSectionId) {
        nextCustomValues._subSectionId = targetSubSectionId;
        if (subTitle) {
          nextCustomValues._subSectionLabel = subTitle;
        }
      } else {
        delete nextCustomValues._subSectionId;
        delete nextCustomValues._subSectionLabel;
      }
      return nextCustomValues;
    };

    const bundleId = existing?.customFieldValues?._bundleId;
    const siblingFiles = bundleId
      ? files.filter(
          (f) =>
            !f.isDeleted &&
            f.ownerId === existing?.ownerId &&
            f.customFieldValues?._bundleId === bundleId
        )
      : existing
        ? [existing]
        : [];

    if (isSupabaseLive) {
      try {
        const updatedList = await Promise.all(
          siblingFiles.map((f) =>
            SupabaseBackend.updateFileMetadata(f.id, {
              sectionId: targetSectionId,
              customFieldValues: buildNextValues(f.customFieldValues),
            })
          )
        );
        const updatedMap = new Map(updatedList.map((u) => [u.id, u]));
        setFiles((prev) => prev.map((f) => updatedMap.get(f.id) ?? f));
        pushToast(
          subTitle
            ? `تم نقل الملف إلى "${targetSec?.title ?? ''} ← ${subTitle}"`
            : `تم نقل الملف إلى "${targetSec?.title ?? ''}"`
        );
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر نقل الملف', 'warning');
      }
      return;
    }

    const siblingIdSet = new Set(siblingFiles.map((f) => f.id));
    setFiles((prev) =>
      prev.map((f) =>
        siblingIdSet.has(f.id)
          ? {
              ...f,
              sectionId: targetSectionId,
              customFieldValues: buildNextValues(f.customFieldValues),
              updatedAt: new Date().toISOString(),
            }
          : f
      )
    );
    pushToast(
      subTitle
        ? `تم نقل الملف إلى "${targetSec?.title ?? 'القسم المحدد'} ← ${subTitle}"`
        : `تم نقل الملف إلى "${targetSec?.title ?? 'القسم المحدد'}"`
    );
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

  const batchMoveFilesToSection = async (
    fileIds: string[],
    targetSectionId: string,
    targetSubSectionId?: string
  ) => {
    if (fileIds.length === 0) return;
    const idSet = new Set(fileIds);
    const targetSec = visibleSections.find((s) => s.id === targetSectionId);
    const subTitle = targetSubSectionId
      ? targetSec?.customFields.find((cf) => cf.id === targetSubSectionId)?.label
      : undefined;

    const buildNextValues = (prevValues?: Record<string, string>) => {
      const nextCustomValues: Record<string, string> = { ...(prevValues ?? {}) };
      if (targetSubSectionId) {
        nextCustomValues._subSectionId = targetSubSectionId;
        if (subTitle) {
          nextCustomValues._subSectionLabel = subTitle;
        }
      } else {
        delete nextCustomValues._subSectionId;
        delete nextCustomValues._subSectionLabel;
      }
      return nextCustomValues;
    };

    const targets = files.filter((f) => idSet.has(f.id) && !f.isDeleted);
    if (targets.length === 0) return;

    if (isSupabaseLive) {
      try {
        const updatedList = await Promise.all(
          targets.map((f) =>
            SupabaseBackend.updateFileMetadata(f.id, {
              sectionId: targetSectionId,
              customFieldValues: buildNextValues(f.customFieldValues),
            })
          )
        );
        const updatedMap = new Map(updatedList.map((u) => [u.id, u]));
        setFiles((prev) => prev.map((f) => updatedMap.get(f.id) ?? f));
        await recordActivity(
          'file_update',
          `تم نقل ${updatedList.length} ملفات إلى قسم: ${targetSec?.title ?? ''}`,
          targetSec?.title
        );
        pushToast(
          subTitle
            ? `تم نقل ${updatedList.length} ملفات إلى "${targetSec?.title ?? ''} ← ${subTitle}"`
            : `تم نقل ${updatedList.length} ملفات إلى "${targetSec?.title ?? ''}"`
        );
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر نقل الملفات المحددة', 'warning');
      }
      return;
    }

    const now = new Date().toISOString();
    const targetIdSet = new Set(targets.map((t) => t.id));
    setFiles((prev) =>
      prev.map((f) =>
        targetIdSet.has(f.id)
          ? {
              ...f,
              sectionId: targetSectionId,
              customFieldValues: buildNextValues(f.customFieldValues),
              updatedAt: now,
            }
          : f
      )
    );
    await recordActivity(
      'file_update',
      `تم نقل ${targets.length} ملفات إلى قسم: ${targetSec?.title ?? ''}`,
      targetSec?.title
    );
    pushToast(
      subTitle
        ? `تم نقل ${targets.length} ملفات إلى "${targetSec?.title ?? ''} ← ${subTitle}"`
        : `تم نقل ${targets.length} ملفات إلى "${targetSec?.title ?? ''}"`
    );
  };

  const batchSoftDeleteFiles = async (fileIds: string[]) => {
    if (fileIds.length === 0) return;
    const idSet = new Set(fileIds);
    const targets = files.filter((f) => idSet.has(f.id) && !f.isDeleted);
    if (targets.length === 0) return;

    if (isSupabaseLive) {
      try {
        await SupabaseBackend.batchSoftDeleteFiles(targets.map((f) => f.id));
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حذف الملفات المحددة', 'warning');
        return;
      }
    }

    const now = new Date().toISOString();
    const targetIdSet = new Set(targets.map((t) => t.id));
    setFiles((prev) =>
      prev.map((f) => (targetIdSet.has(f.id) ? { ...f, isDeleted: true, deletedAt: now } : f))
    );
    recordActivity('file_delete', `تم نقل ${targets.length} ملفات إلى سلة المحذوفات`);
    pushToast(`تم نقل ${targets.length} ملفات إلى سلة المحذوفات`, 'info');
  };

  const batchRestoreFiles = async (fileIds: string[]) => {
    if (fileIds.length === 0) return;
    const idSet = new Set(fileIds);
    const targets = files.filter((f) => idSet.has(f.id) && f.isDeleted);
    if (targets.length === 0) return;

    if (isSupabaseLive) {
      try {
        await SupabaseBackend.batchRestoreFiles(targets.map((f) => f.id));
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر استعادة الملفات المحددة', 'warning');
        return;
      }
    }

    const targetIdSet = new Set(targets.map((t) => t.id));
    setFiles((prev) =>
      prev.map((f) => (targetIdSet.has(f.id) ? { ...f, isDeleted: false, deletedAt: undefined } : f))
    );
    recordActivity('file_restore', `تمت استعادة ${targets.length} ملفات من سلة المحذوفات`);
    pushToast(`تمت استعادة ${targets.length} ملفات بنجاح`);
  };

  const batchPermanentlyDeleteFiles = async (fileIds: string[]) => {
    if (fileIds.length === 0) return;
    const idSet = new Set(fileIds);
    const targets = files.filter((f) => idSet.has(f.id));
    if (targets.length === 0) return;

    if (isSupabaseLive) {
      try {
        await SupabaseBackend.batchPermanentlyDeleteFiles(targets);
      } catch (err) {
        pushToast(
          err instanceof Error ? err.message : 'تعذر الحذف النهائي للملفات المحددة',
          'warning'
        );
        return;
      }
    }

    const targetIdSet = new Set(targets.map((t) => t.id));
    setFiles((prev) => prev.filter((f) => !targetIdSet.has(f.id)));
    recordActivity('file_delete', `تم الحذف النهائي لـ ${targets.length} ملفات`);
    pushToast(`تم الحذف النهائي لـ ${targets.length} ملفات`, 'warning');
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
        setRawSections((prev) => [...prev, created]);
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
    setRawSections((prev) => [...prev, newSec]);
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
    setRawSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    if (currentRole === 'super_admin') {
      await recordActivity('section_update', 'تم تحديث إعدادات القسم', updates.title);
    }
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
    setRawSections((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      let nextOrder = 1;
      return remaining.map((s) =>
        s.category === TEACHER_SUBSECTION_EXT_CATEGORY ? s : { ...s, order: nextOrder++ }
      );
    });
    if (currentRole === 'super_admin') {
      await recordActivity('section_update', 'تم حذف القسم', target?.title);
    }
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
    const orderMap = new Map(reordered.map((s) => [s.id, s.order]));
    setRawSections((prev) =>
      prev.map((s) => (orderMap.has(s.id) ? { ...s, order: orderMap.get(s.id)! } : s))
    );

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

  const addTeacherSubSection = async (
    parentSectionId: string,
    input: { label: string; placeholder?: string }
  ) => {
    const cleanLabel = input.label.trim();
    if (!cleanLabel) return;
    const parent = rawSections.find((s) => s.id === parentSectionId);
    if (!parent) return;

    const newSubField = {
      id: `cf-personal-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: cleanLabel,
      type: 'subsection' as const,
      required: false,
      placeholder: input.placeholder?.trim() || undefined,
    };

    // Case 1: Teacher already owns the parent main section -> update directly
    if (parent.ownerId === currentUser.id) {
      const nextFields = [...parent.customFields, newSubField];
      if (isSupabaseLive) {
        try {
          await SupabaseBackend.updateSection(parent.id, { customFields: nextFields });
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'تعذر إضافة القسم الفرعي', 'warning');
          return;
        }
      }
      setRawSections((prev) =>
        prev.map((s) => (s.id === parent.id ? { ...s, customFields: nextFields } : s))
      );
      pushToast(`تمت إضافة القسم الفرعي "${cleanLabel}"`);
      return;
    }

    // Case 2: System main section -> store in per-teacher extension row in portfolio_sections
    const existingExt = rawSections.find(
      (s) =>
        s.category === TEACHER_SUBSECTION_EXT_CATEGORY &&
        s.ownerId === currentUser.id &&
        s.iconName === parentSectionId
    );

    if (existingExt) {
      const nextFields = [...existingExt.customFields, newSubField];
      if (isSupabaseLive) {
        try {
          await SupabaseBackend.updateSection(existingExt.id, { customFields: nextFields });
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'تعذر إضافة القسم الفرعي', 'warning');
          return;
        }
      }
      setRawSections((prev) =>
        prev.map((s) => (s.id === existingExt.id ? { ...s, customFields: nextFields } : s))
      );
      pushToast(`تمت إضافة القسم الفرعي "${cleanLabel}"`);
      return;
    }

    const extPayload: Omit<PortfolioSection, 'id'> = {
      title: parent.title,
      description: '',
      iconName: parentSectionId,
      accentColor: parent.accentColor,
      order: 9999,
      isActive: true,
      isRequired: false,
      isSystemDefault: false,
      ownerId: currentUser.id,
      category: TEACHER_SUBSECTION_EXT_CATEGORY,
      customFields: [newSubField],
    };

    if (isSupabaseLive) {
      try {
        const created = await SupabaseBackend.createSection(extPayload);
        setRawSections((prev) => [...prev, created]);
        await recordActivity('section_create', `تمت إضافة قسم فرعي: ${cleanLabel}`, cleanLabel);
        pushToast(`تمت إضافة القسم الفرعي "${cleanLabel}"`);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر إضافة القسم الفرعي', 'warning');
      }
      return;
    }

    const createdLocal: PortfolioSection = {
      ...extPayload,
      id: `sec-ext-${Date.now()}`,
    };
    setRawSections((prev) => [...prev, createdLocal]);
    pushToast(`تمت إضافة القسم الفرعي "${cleanLabel}"`);
  };

  const deleteTeacherSubSection = async (parentSectionId: string, subSectionId: string) => {
    const hasFiles = files.some(
      (f) =>
        !f.isDeleted &&
        f.sectionId === parentSectionId &&
        f.customFieldValues?._subSectionId === subSectionId
    );
    const hasNotes = achievements.some(
      (a) =>
        a.sectionId === parentSectionId && a.customFieldValues?._subSectionId === subSectionId
    );
    if (hasFiles || hasNotes) {
      pushToast('لا يمكن حذف قسم فرعي يحتوي على ملفات أو نصوص، احذفي محتواه أولاً', 'warning');
      return;
    }

    const parent = rawSections.find((s) => s.id === parentSectionId);
    if (parent && parent.ownerId === currentUser.id) {
      const nextFields = parent.customFields.filter((cf) => cf.id !== subSectionId);
      if (isSupabaseLive) {
        try {
          await SupabaseBackend.updateSection(parent.id, { customFields: nextFields });
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'تعذر حذف القسم الفرعي', 'warning');
          return;
        }
      }
      setRawSections((prev) =>
        prev.map((s) => (s.id === parent.id ? { ...s, customFields: nextFields } : s))
      );
      pushToast('تم حذف القسم الفرعي', 'info');
      return;
    }

    const extRow = rawSections.find(
      (s) =>
        s.category === TEACHER_SUBSECTION_EXT_CATEGORY &&
        s.ownerId === currentUser.id &&
        s.iconName === parentSectionId
    );
    if (!extRow) return;
    const nextFields = extRow.customFields.filter((cf) => cf.id !== subSectionId);
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.updateSection(extRow.id, { customFields: nextFields });
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر حذف القسم الفرعي', 'warning');
        return;
      }
    }
    setRawSections((prev) =>
      prev.map((s) => (s.id === extRow.id ? { ...s, customFields: nextFields } : s))
    );
    pushToast('تم حذف القسم الفرعي', 'info');
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

  const toggleManagerViewPermission = async (allow: boolean) => {
    if (isSupabaseLive) {
      try {
        await SupabaseBackend.updateProfile(currentUser.id, { allowManagerView: allow });
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر تحديث إعداد الخصوصية', 'warning');
        return;
      }
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, allowManagerView: allow } : u))
    );
    pushToast(
      allow
        ? 'تم تفعيل صلاحية اطلاع مدير العمل على ملفك'
        : 'تم إخفاء ملفك عن مدير العمل بنجاح',
      allow ? 'success' : 'info'
    );
  };

  const joinSchoolByCode = async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      pushToast('يرجى إدخال رمز المدرسة أولاً', 'warning');
      return false;
    }

    if (isSupabaseLive) {
      try {
        const joinedSchool = await SupabaseBackend.joinSchoolByCode(cleanCode);
        if (session?.user?.id) {
          await hydrateLiveWorkspace(session.user.id);
        }
        pushToast(`تم ربط حسابكِ بمدرسة "${joinedSchool.name}" بنجاح`);
        return true;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'تعذر الانضمام للمدرسة';
        pushToast(msg, 'warning');
        return false;
      }
    }

    const matched = schools.find((s) => s.code.trim().toUpperCase() === cleanCode);
    if (!matched) {
      pushToast('رمز المدرسة غير صحيح، يرجى التأكد من الرمز', 'warning');
      return false;
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, schoolId: matched.id, managerId: u.managerId || matched.managerId }
          : u
      )
    );
    pushToast(`تم ربط حسابكِ بمدرسة "${matched.name}" بنجاح`);
    return true;
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

  const updateSchool = async (id: string, updates: Partial<School>) => {
    if (isSupabaseLive) {
      try {
        const existing = schools.find((s) => s.id === id);
        const updated = await SupabaseBackend.updateSchool(id, {
          ...updates,
          groupsCount: existing?.groupsCount ?? 0,
        });
        setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
        pushToast('تم تحديث بيانات المدرسة');
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'تعذر تحديث المدرسة', 'warning');
      }
      return;
    }
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

  // --------------------------------------------------------------------------
  // Temporary Visit Codes (Teacher Control + Live Logs + Guest Read-Only View)
  // --------------------------------------------------------------------------
  const loadMyVisitData = useCallback(
    async (silent = false) => {
      if (isSupabaseLive) {
        if (!session?.user?.id) return;
        if (!silent) setVisitCodeLoading(true);
        try {
          const [codeRow, logs] = await Promise.all([
            SupabaseBackend.getOrCreateMyVisitCode(),
            SupabaseBackend.getMyVisitLogs(session.user.id),
          ]);
          setMyVisitCode(codeRow);
          setMyVisitLogs(logs);
        } catch (err) {
          if (!silent) {
            pushToast(
              err instanceof Error ? err.message : 'تعذر تحميل بيانات كود الزيارة المؤقتة',
              'warning'
            );
          }
        } finally {
          if (!silent) setVisitCodeLoading(false);
        }
        return;
      }

      setMyVisitCode((prev) => {
        if (prev && prev.teacherId === currentUser.id) return prev;
        const now = new Date().toISOString();
        return {
          id: `vc-${currentUser.id}`,
          teacherId: currentUser.id,
          code: 'VST-482910',
          isActive: false,
          totalVisits: 0,
          createdAt: now,
          updatedAt: now,
        };
      });
    },
    [isSupabaseLive, session?.user?.id, currentUser.id, pushToast]
  );

  // Auto-fetch teacher's visit code when teacher logs in
  useEffect(() => {
    if (currentRole !== 'teacher') return;
    if (isSupabaseLive && (!session?.user?.id || !workspaceLoaded)) return;
    void loadMyVisitData(true);
  }, [currentRole, isSupabaseLive, session?.user?.id, workspaceLoaded, loadMyVisitData]);

  const toggleMyVisitCode = async (nextActive: boolean) => {
    if (isSupabaseLive) {
      setVisitCodeLoading(true);
      try {
        const updated = await SupabaseBackend.toggleMyVisitCode(nextActive);
        setMyVisitCode(updated);
        if (session?.user?.id) {
          const logs = await SupabaseBackend.getMyVisitLogs(session.user.id);
          setMyVisitLogs(logs);
        }
        pushToast(
          nextActive
            ? 'تم تفعيل كود الزيارة المؤقتة — يمكن للمديرة الدخول الآن للاطلاع فقط'
            : 'تم إيقاف كود الزيارة المؤقتة وإغلاق أي جلسة مشاهدة حالية',
          nextActive ? 'success' : 'info'
        );
      } catch (err) {
        pushToast(
          err instanceof Error ? err.message : 'تعذر تحديث حالة كود الزيارة المؤقتة',
          'warning'
        );
      } finally {
        setVisitCodeLoading(false);
      }
      return;
    }

    const now = new Date().toISOString();
    setMyVisitCode((prev) =>
      prev
        ? { ...prev, isActive: nextActive, updatedAt: now }
        : {
            id: `vc-${currentUser.id}`,
            teacherId: currentUser.id,
            code: 'VST-482910',
            isActive: nextActive,
            totalVisits: 0,
            createdAt: now,
            updatedAt: now,
          }
    );
    if (!nextActive) {
      setMyVisitLogs((prev) =>
        prev.map((log) => (log.isLive ? { ...log, isLive: false, endedAt: log.endedAt ?? now } : log))
      );
    }
    pushToast(
      nextActive
        ? 'تم تفعيل كود الزيارة المؤقتة — يمكن للمديرة الدخول الآن للاطلاع فقط'
        : 'تم إيقاف كود الزيارة المؤقتة',
      nextActive ? 'success' : 'info'
    );
  };

  const regenerateMyVisitCode = async () => {
    if (isSupabaseLive) {
      setVisitCodeLoading(true);
      try {
        const updated = await SupabaseBackend.regenerateMyVisitCode();
        setMyVisitCode(updated);
        if (session?.user?.id) {
          const logs = await SupabaseBackend.getMyVisitLogs(session.user.id);
          setMyVisitLogs(logs);
        }
        pushToast('تم إصدار كود زيارة مؤقتة جديد وإلغاء الكود السابق', 'info');
      } catch (err) {
        pushToast(
          err instanceof Error ? err.message : 'تعذر إصدار كود جديد',
          'warning'
        );
      } finally {
        setVisitCodeLoading(false);
      }
      return;
    }

    const randomCode = `VST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    setMyVisitCode((prev) =>
      prev
        ? { ...prev, code: randomCode, updatedAt: now }
        : {
            id: `vc-${currentUser.id}`,
            teacherId: currentUser.id,
            code: randomCode,
            isActive: false,
            totalVisits: 0,
            createdAt: now,
            updatedAt: now,
          }
    );
    setMyVisitLogs((prev) =>
      prev.map((log) => (log.isLive ? { ...log, isLive: false, endedAt: log.endedAt ?? now } : log))
    );
    pushToast('تم إصدار كود زيارة مؤقتة جديد', 'info');
  };

  const enterGuestVisitSession = async (code: string, visitorName?: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('يرجى إدخال كود الزيارة المؤقتة.');
    }

    if (isSupabaseLive) {
      const payload = await SupabaseBackend.enterVisitSession(cleanCode, visitorName);
      setGuestVisitSession(payload);
      pushToast(`مرحباً بكِ في ملف المعلمة ${payload.teacher.fullName} (للاطلاع فقط)`);
      return;
    }

    // Local preview fallback when Supabase env vars are not connected
    const previewTeacher =
      users.find((u) => u.role === 'teacher' && u.isActive) ?? DEMO_USERS[3];
    const activeCode =
      myVisitCode && myVisitCode.teacherId === previewTeacher.id
        ? myVisitCode
        : {
            id: `vc-${previewTeacher.id}`,
            teacherId: previewTeacher.id,
            code: 'VST-482910',
            isActive: true,
            totalVisits: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

    if (activeCode.code.toUpperCase() !== cleanCode) {
      throw new Error('كود الزيارة المؤقتة غير صحيح.');
    }
    if (!activeCode.isActive) {
      throw new Error('كود الزيارة المؤقتة غير مفعل حالياً من قِبل المعلمة.');
    }

    const now = new Date().toISOString();
    const sessionToken = `guest-${Date.now()}`;
    const school = schools.find((s) => s.id === previewTeacher.schoolId);
    const mergedSections = mergeSectionsWithTeacherExtensions(rawSections, previewTeacher.id);
    const teacherFiles = files.filter((f) => f.ownerId === previewTeacher.id && !f.isDeleted);
    const teacherAchievements = achievements.filter((a) => a.ownerId === previewTeacher.id);

    setMyVisitCode({
      ...activeCode,
      totalVisits: activeCode.totalVisits + 1,
      updatedAt: now,
    });
    setMyVisitLogs((prev) => [
      {
        id: `vlog-${Date.now()}`,
        visitCodeId: activeCode.id,
        teacherId: previewTeacher.id,
        sessionToken,
        visitorLabel: visitorName?.trim() || 'زائرة بالكود المؤقت',
        enteredAt: now,
        lastSeenAt: now,
        isLive: true,
      },
      ...prev,
    ]);

    setGuestVisitSession({
      sessionToken,
      enteredAt: now,
      code: activeCode.code,
      teacher: {
        id: previewTeacher.id,
        fullName: previewTeacher.fullName,
        jobTitle: previewTeacher.jobTitle,
        specialty: previewTeacher.specialty,
        qualification: previewTeacher.qualification,
        schoolName: school?.name,
      },
      sections: mergedSections,
      files: teacherFiles,
      achievements: teacherAchievements,
    });
    pushToast(`مرحباً بكِ في ملف المعلمة ${previewTeacher.fullName} (للاطلاع فقط)`);
  };

  const exitGuestVisitSession = useCallback(async () => {
    const active = guestVisitSession;
    setGuestVisitSession(null);
    if (!active) return;

    if (isSupabaseLive) {
      await SupabaseBackend.endVisitSession(active.sessionToken).catch(() => undefined);
    } else {
      const now = new Date().toISOString();
      setMyVisitLogs((prev) =>
        prev.map((log) =>
          log.sessionToken === active.sessionToken
            ? { ...log, isLive: false, endedAt: now }
            : log
        )
      );
    }
    pushToast('تم إنهاء جلسة الزيارة المؤقتة بنجاح', 'info');
  }, [guestVisitSession, isSupabaseLive, pushToast]);

  const getGuestSignedFileUrl = useCallback(
    async (file: PortfolioFile): Promise<string | null> => {
      if (file.localPreviewUrl) return file.localPreviewUrl;
      if (!isSupabaseLive) return null;

      const cacheKey = `guest:${file.storagePath}`;
      const cached = signedUrlCacheRef.current.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
      }

      try {
        const url = await SupabaseBackend.getGuestSignedFileUrl(file.storagePath, 300);
        signedUrlCacheRef.current.set(cacheKey, {
          url,
          expiresAt: Date.now() + 4 * 60 * 1000,
        });
        return url;
      } catch (err) {
        pushToast(
          err instanceof Error ? err.message : 'تعذر فتح الملف — ربما تم إيقاف كود الزيارة',
          'warning'
        );
        return null;
      }
    },
    [isSupabaseLive, pushToast]
  );

  // Heartbeat & Pagehide cleanup while guest visit session is active
  useEffect(() => {
    if (!guestVisitSession) return;
    const { code, sessionToken, teacher } = guestVisitSession;

    if (!isSupabaseLive) {
      const localInterval = window.setInterval(() => {
        if (myVisitCode && (!myVisitCode.isActive || myVisitCode.code !== code)) {
          setGuestVisitSession(null);
          pushToast('تم إيقاف كود الزيارة المؤقتة من قِبل المعلمة وانتهت جلسة الاطلاع.', 'warning');
          return;
        }
        const now = new Date().toISOString();
        setMyVisitLogs((prev) =>
          prev.map((l) => (l.sessionToken === sessionToken ? { ...l, lastSeenAt: now } : l))
        );
      }, 15000);
      return () => window.clearInterval(localInterval);
    }

    const ping = async () => {
      try {
        const res = await SupabaseBackend.pingVisitSession(code, sessionToken, teacher.id);
        if (!res.active) {
          setGuestVisitSession(null);
          pushToast('تم إيقاف كود الزيارة المؤقتة من قِبل المعلمة وانتهت جلسة الاطلاع.', 'warning');
          return;
        }
        setGuestVisitSession((prev) =>
          prev && prev.sessionToken === sessionToken
            ? {
                ...prev,
                sections: res.sections,
                files: res.files,
                achievements: res.achievements,
              }
            : prev
        );
      } catch {
        // Ignore transient offline blip and retry on next heartbeat
      }
    };

    const intervalId = window.setInterval(() => {
      void ping();
    }, 15000);

    const handlePageHide = () => {
      SupabaseBackend.endVisitSessionKeepalive(sessionToken);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [guestVisitSession?.sessionToken, guestVisitSession?.code, guestVisitSession?.teacher.id, isSupabaseLive, myVisitCode?.isActive, myVisitCode?.code, pushToast]);

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
        focusedSectionId,
        setFocusedSectionId,
        openTeacherSection,
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
        uploadProgress,
        uploadFiles,
        getSignedFileUrl,
        renameAndUpdateFile,
        replaceFileBinary,
        appendFilesToEntry,
        moveFileToSection,
        batchMoveFilesToSection,
        softDeleteFile,
        batchSoftDeleteFiles,
        restoreFile,
        batchRestoreFiles,
        permanentlyDeleteFile,
        batchPermanentlyDeleteFiles,
        reviewFile,
        addAchievement,
        deleteAchievement,
        createSection,
        updateSection,
        deleteSection,
        reorderSection,
        addTeacherSubSection,
        deleteTeacherSubSection,
        createUser,
        updateUser,
        toggleManagerViewPermission,
        joinSchoolByCode,
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
        myVisitCode,
        myVisitLogs,
        visitCodeLoading,
        loadMyVisitData,
        toggleMyVisitCode,
        regenerateMyVisitCode,
        guestVisitSession,
        enterGuestVisitSession,
        exitGuestVisitSession,
        getGuestSignedFileUrl,
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
