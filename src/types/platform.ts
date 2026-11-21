export type UserRole = 'super_admin' | 'manager' | 'teacher';

export type FileTypeCategory = 'pdf' | 'word' | 'powerpoint' | 'excel' | 'image';

export type ReviewStatus = 'pending' | 'approved' | 'needs_revision';

export type CustomFieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'attachment';

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface PortfolioSection {
  id: string;
  title: string;
  description: string;
  iconName: string;
  accentColor: string;
  order: number;
  isActive: boolean;
  isRequired: boolean;
  isSystemDefault: boolean;
  ownerId?: string; // If created personally by a teacher as a custom section
  category: string;
  customFields: CustomFieldDefinition[];
}

export interface School {
  id: string;
  name: string;
  code: string;
  stage: string;
  city: string;
  managerId?: string;
  groupsCount: number;
  createdAt: string;
}

export interface EducationalGroup {
  id: string;
  name: string;
  schoolId: string;
  managerId?: string;
  specialty: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  specialty?: string;
  qualification?: string;
  phone?: string;
  bio?: string;
  schoolId?: string;
  groupId?: string;
  assignedSchoolIds?: string[]; // For managers
  assignedGroupIds?: string[];  // For managers
  managerId?: string;           // For teachers
  isActive: boolean;
  createdAt: string;
  lastActiveAt: string;
  storageQuotaMb: number;
}

export interface PortfolioFile {
  id: string;
  title: string;
  originalFileName: string;
  description: string;
  sectionId: string;
  ownerId: string;
  fileType: FileTypeCategory;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
  reviewStatus: ReviewStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  customFieldValues?: Record<string, string>;
  // Local runtime preview URL (Blob/DataURL) for files uploaded in browser session
  localPreviewUrl?: string;
  // Path reference prepared for Supabase private bucket (`portfolio-files`)
  storagePath: string;
}

export interface AchievementItem {
  id: string;
  ownerId: string;
  sectionId: string;
  title: string;
  description: string;
  date: string;
  level: 'مدرسة' | 'مكتب تعليم' | 'إدارة تعليم' | 'وطني' | 'دولي';
  attachmentFileId?: string;
  customFieldValues?: Record<string, string>;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actionType:
    | 'file_upload'
    | 'file_update'
    | 'file_delete'
    | 'file_restore'
    | 'section_create'
    | 'section_update'
    | 'user_create'
    | 'review_submit'
    | 'branding_update'
    | 'settings_update';
  description: string;
  targetName?: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  senderName: string;
  targetRole: UserRole | 'all';
  targetUserId?: string;
  targetSchoolId?: string;
  targetGroupId?: string;
  isRead: boolean;
  createdAt: string;
  category: 'إعلان' | 'مراجعة' | 'تذكير' | 'نظام';
}

export interface PlatformBranding {
  platformName: string;
  secondaryName: string;
  tagline: string;
  logoDataUrl: string | null;
  appIconDataUrl: string | null;
  colors: {
    ivory: string;
    white: string;
    sage: string;
    rose: string;
    sand: string;
    gray: string;
    ink: string;
  };
}

export interface RolePermissionSet {
  canUploadFiles: boolean;
  canDeleteOwnFiles: boolean;
  canCreateCustomSections: boolean;
  canManageAllSections: boolean;
  canViewAssignedTeachers: boolean;
  canReviewPortfolios: boolean;
  canManageUsers: boolean;
  canManageSchools: boolean;
  canEditBranding: boolean;
  canEditSettings: boolean;
  canViewReports: boolean;
}

export interface PlatformSettings {
  maxFileSizeMb: number;
  allowedFileTypes: FileTypeCategory[];
  allowTeacherCustomSections: boolean;
  requireManagerReviewForCompletion: boolean;
  autoArchiveDeletedDays: number;
  enableEmailDigest: boolean;
  enableInAppNotifications: boolean;
  sectionCategories: string[];
  dashboardWidgets: {
    showCompletionOverview: boolean;
    showStorageOverview: boolean;
    showRecentActivities: boolean;
    showQuickUpload: boolean;
  };
}

export type SuperAdminNavId =
  | 'overview'
  | 'users'
  | 'teachers'
  | 'managers'
  | 'schools'
  | 'portfolios'
  | 'sections'
  | 'files'
  | 'reports'
  | 'notifications'
  | 'branding'
  | 'permissions'
  | 'activity_log'
  | 'settings';

export type ManagerNavId =
  | 'overview'
  | 'assigned_teachers'
  | 'assigned_schools'
  | 'review_portfolios'
  | 'reports'
  | 'notifications';

export type TeacherNavId =
  | 'overview'
  | 'my_portfolio'
  | 'my_achievements'
  | 'my_certificates'
  | 'my_evidence'
  | 'my_sections'
  | 'my_files'
  | 'notifications'
  | 'profile';
