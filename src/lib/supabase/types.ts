import type {
  AchievementItem,
  ActivityLogEntry,
  CustomFieldDefinition,
  EducationalGroup,
  FileTypeCategory,
  NotificationItem,
  PlatformBranding,
  PlatformSettings,
  PortfolioFile,
  PortfolioSection,
  ReviewStatus,
  RolePermissionSet,
  School,
  UserAccount,
  UserRole,
} from '../../types/platform';

export interface SupabaseSchoolRow {
  id: string;
  name: string;
  code: string;
  stage: string;
  city: string;
  manager_id: string | null;
  created_at: string;
}

export interface SupabaseGroupRow {
  id: string;
  name: string;
  school_id: string;
  manager_id: string | null;
  specialty: string;
  created_at: string;
}

export interface SupabaseProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  job_title: string;
  specialty: string | null;
  qualification: string | null;
  phone: string | null;
  bio: string | null;
  school_id: string | null;
  group_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  storage_quota_mb: number;
  created_at: string;
  last_active_at: string | null;
}

export interface SupabasePortfolioSectionRow {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  accent_color: string;
  sort_order: number;
  is_active: boolean;
  is_required: boolean;
  is_system_default: boolean;
  owner_id: string | null;
  category: string;
  custom_fields: CustomFieldDefinition[] | null;
  created_at: string;
}

export interface SupabasePortfolioFileRow {
  id: string;
  title: string;
  original_file_name: string;
  description: string;
  section_id: string;
  owner_id: string;
  file_type: FileTypeCategory;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  is_deleted: boolean;
  deleted_at: string | null;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  custom_field_values: Record<string, string> | null;
  uploaded_at: string;
  updated_at: string;
}

export interface SupabaseAchievementRow {
  id: string;
  owner_id: string;
  section_id: string | null;
  title: string;
  description: string;
  achieved_date: string;
  level: AchievementItem['level'];
  attachment_file_id: string | null;
  custom_field_values: Record<string, string> | null;
  created_at: string;
}

export interface SupabaseActivityLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: UserRole;
  action_type: ActivityLogEntry['actionType'];
  description: string;
  target_name: string | null;
  created_at: string;
}

export interface SupabaseNotificationRow {
  id: string;
  title: string;
  message: string;
  sender_id: string | null;
  sender_name: string;
  target_role: UserRole | 'all';
  target_user_id: string | null;
  target_school_id: string | null;
  target_group_id: string | null;
  category: NotificationItem['category'];
  created_at: string;
}

export interface SupabasePlatformConfigRow {
  id: string;
  branding: PlatformBranding;
  permissions: Record<UserRole, RolePermissionSet>;
  settings: PlatformSettings;
  updated_at: string;
}

// ============================================================================
// Row -> Domain Mappers
// ============================================================================

export function mapSchoolRow(row: SupabaseSchoolRow, groupsCount = 0): School {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    stage: row.stage,
    city: row.city,
    managerId: row.manager_id ?? undefined,
    groupsCount,
    createdAt: row.created_at,
  };
}

export function mapGroupRow(row: SupabaseGroupRow): EducationalGroup {
  return {
    id: row.id,
    name: row.name,
    schoolId: row.school_id,
    managerId: row.manager_id ?? undefined,
    specialty: row.specialty,
    createdAt: row.created_at,
  };
}

export function mapProfileRow(
  row: SupabaseProfileRow,
  assignedSchoolIds: string[] = [],
  assignedGroupIds: string[] = []
): UserAccount {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    jobTitle: row.job_title,
    specialty: row.specialty ?? undefined,
    qualification: row.qualification ?? undefined,
    phone: row.phone ?? undefined,
    bio: row.bio ?? undefined,
    schoolId: row.school_id ?? undefined,
    groupId: row.group_id ?? undefined,
    managerId: row.manager_id ?? undefined,
    assignedSchoolIds: row.role === 'manager' ? assignedSchoolIds : undefined,
    assignedGroupIds: row.role === 'manager' ? assignedGroupIds : undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at ?? row.created_at,
    storageQuotaMb: row.storage_quota_mb,
  };
}

export function mapSectionRow(row: SupabasePortfolioSectionRow): PortfolioSection {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    iconName: row.icon_name,
    accentColor: row.accent_color,
    order: row.sort_order,
    isActive: row.is_active,
    isRequired: row.is_required,
    isSystemDefault: row.is_system_default,
    ownerId: row.owner_id ?? undefined,
    category: row.category,
    customFields: Array.isArray(row.custom_fields) ? row.custom_fields : [],
  };
}

export function mapFileRow(row: SupabasePortfolioFileRow): PortfolioFile {
  return {
    id: row.id,
    title: row.title,
    originalFileName: row.original_file_name,
    description: row.description,
    sectionId: row.section_id,
    ownerId: row.owner_id,
    fileType: row.file_type,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at ?? undefined,
    reviewStatus: row.review_status,
    reviewNote: row.review_note ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    customFieldValues: row.custom_field_values ?? undefined,
    storagePath: row.storage_path,
  };
}

export function mapAchievementRow(row: SupabaseAchievementRow): AchievementItem {
  return {
    id: row.id,
    ownerId: row.owner_id,
    sectionId: row.section_id ?? 'sec-2',
    title: row.title,
    description: row.description,
    date: row.achieved_date,
    level: row.level,
    attachmentFileId: row.attachment_file_id ?? undefined,
    customFieldValues: row.custom_field_values ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapActivityRow(row: SupabaseActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id ?? '',
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actionType: row.action_type,
    description: row.description,
    targetName: row.target_name ?? undefined,
    timestamp: row.created_at,
  };
}

export function mapNotificationRow(
  row: SupabaseNotificationRow,
  readIds: Set<string>
): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    senderName: row.sender_name,
    targetRole: row.target_role,
    targetUserId: row.target_user_id ?? undefined,
    targetSchoolId: row.target_school_id ?? undefined,
    targetGroupId: row.target_group_id ?? undefined,
    isRead: readIds.has(row.id),
    createdAt: row.created_at,
    category: row.category,
  };
}
