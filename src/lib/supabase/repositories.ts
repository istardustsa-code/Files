import {
  PRIVATE_FILES_BUCKET,
  PUBLIC_BRANDING_BUCKET,
  sendAnonRpcKeepalive,
  supabase,
  verifySupabaseAuthEndpoint,
} from './client';
import {
  mapAchievementRow,
  mapActivityRow,
  mapFileRow,
  mapGroupRow,
  mapNotificationRow,
  mapProfileRow,
  mapSchoolRow,
  mapSectionRow,
  mapVisitCodeRow,
  mapVisitLogRow,
  type SupabaseAchievementRow,
  type SupabaseActivityLogRow,
  type SupabaseGroupRow,
  type SupabaseNotificationRow,
  type SupabasePlatformConfigRow,
  type SupabasePortfolioFileRow,
  type SupabasePortfolioSectionRow,
  type SupabaseProfileRow,
  type SupabaseSchoolRow,
  type SupabaseTeacherVisitCodeRow,
  type SupabaseTeacherVisitLogRow,
} from './types';
import type {
  AchievementItem,
  ActivityLogEntry,
  EducationalGroup,
  GuestVisitSessionPayload,
  GuestVisitTeacherSummary,
  NotificationItem,
  PlatformBranding,
  PlatformSettings,
  PortfolioFile,
  PortfolioSection,
  ReviewStatus,
  RolePermissionSet,
  School,
  TeacherVisitCode,
  TeacherVisitLog,
  UserAccount,
  UserRole,
} from '../../types/platform';
import { detectFileCategory } from '../../utils/formatters';

function requireClient() {
  if (!supabase) {
    throw new Error('لم يتم ربط مشروع Supabase بعد. أضف متغيرات البيئة أولاً.');
  }
  return supabase;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-\u0600-\u06FF]/g, '_');
}

const TEACHER_SUBSECTION_EXT_CATEGORY = '__teacher_subsections__';

export function mergeSectionsWithTeacherExtensions(
  rawSections: PortfolioSection[],
  teacherId: string
): PortfolioSection[] {
  const extByParent = new Map<string, PortfolioSection['customFields']>();
  rawSections.forEach((s) => {
    if (s.category === TEACHER_SUBSECTION_EXT_CATEGORY && s.ownerId === teacherId) {
      const existing = extByParent.get(s.iconName) ?? [];
      extByParent.set(s.iconName, [...existing, ...s.customFields]);
    }
  });

  return rawSections
    .filter(
      (s) =>
        s.category !== TEACHER_SUBSECTION_EXT_CATEGORY &&
        s.isActive &&
        (!s.ownerId || s.ownerId === teacherId)
    )
    .sort((a, b) => a.order - b.order)
    .map((sec) => {
      const extraSubs = extByParent.get(sec.id);
      if (!extraSubs || extraSubs.length === 0) return sec;
      return {
        ...sec,
        customFields: [...sec.customFields, ...extraSubs],
      };
    });
}

export const SupabaseBackend = {
  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------
  async signIn(email: string, password: string) {
    const client = requireClient();
    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(
    email: string,
    password: string,
    fullName: string,
    jobTitle: string,
    schoolCode?: string
  ) {
    const client = requireClient();
    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();
    const cleanSchoolCode = schoolCode ? schoolCode.trim().toUpperCase() : '';
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          job_title: jobTitle || 'معلم',
          ...(cleanSchoolCode ? { school_code: cleanSchoolCode } : {}),
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const client = requireClient();
    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  async testLiveConnection(): Promise<{
    ok: boolean;
    schemaReady: boolean;
    message: string;
  }> {
    if (!supabase) {
      return {
        ok: false,
        schemaReady: false,
        message: 'المتغير VITE_SUPABASE_PUBLISHABLE_KEY غير مضاف أو غير مكتمل بعد.',
      };
    }

    const endpointCheck = await verifySupabaseAuthEndpoint();
    if (!endpointCheck.ok) {
      return {
        ok: false,
        schemaReady: false,
        message: `تعذر التحقق من الاتصال بخدمة المصادقة في Supabase: ${endpointCheck.error || 'خطأ غير معروف'}`,
      };
    }

    const { error: dbErr } = await supabase.from('platform_config').select('id').limit(1);
    if (dbErr) {
      return {
        ok: true,
        schemaReady: false,
        message: `تم التحقق من المفتاح والاتصال بالمشروع بنجاح، لكن الجداول أو الترحيلات غير مكتملة بعد: ${dbErr.message}`,
      };
    }

    return {
      ok: true,
      schemaReady: true,
      message: 'تم التحقق من الاتصال بـ Supabase وجاهزية قاعدة البيانات والجداول بنجاح.',
    };
  },

  // --------------------------------------------------------------------------
  // Initial Workspace Hydration (RLS enforces all role boundaries on server)
  // --------------------------------------------------------------------------
  async loadPublicConfig(): Promise<{
    branding?: PlatformBranding;
    permissions?: Record<UserRole, RolePermissionSet>;
    settings?: PlatformSettings;
  } | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('platform_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle<SupabasePlatformConfigRow>();
    if (error || !data) return null;
    return {
      branding: data.branding,
      permissions: data.permissions,
      settings: data.settings,
    };
  },

  async loadAuthenticatedWorkspace(userId: string, retried = false): Promise<{
    users: UserAccount[];
    schools: School[];
    groups: EducationalGroup[];
    sections: PortfolioSection[];
    files: PortfolioFile[];
    achievements: AchievementItem[];
    activityLogs: ActivityLogEntry[];
    notifications: NotificationItem[];
    branding?: PlatformBranding;
    permissions?: Record<UserRole, RolePermissionSet>;
    settings?: PlatformSettings;
  }> {
    const client = requireClient();

    const [
      profilesRes,
      schoolsRes,
      groupsRes,
      mgrSchoolsRes,
      mgrGroupsRes,
      sectionsRes,
      filesRes,
      achievementsRes,
      logsRes,
      notifsRes,
      notifReadsRes,
      configRes,
    ] = await Promise.all([
      client.from('profiles').select('*').order('created_at', { ascending: false }),
      client.from('schools').select('*').order('created_at', { ascending: false }),
      client.from('educational_groups').select('*').order('created_at', { ascending: false }),
      client.from('manager_school_assignments').select('manager_id, school_id'),
      client.from('manager_group_assignments').select('manager_id, group_id'),
      client.from('portfolio_sections').select('*').order('sort_order', { ascending: true }),
      client.from('portfolio_files').select('*').order('uploaded_at', { ascending: false }),
      client.from('achievements').select('*').order('created_at', { ascending: false }),
      client.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100),
      client.from('notifications').select('*').order('created_at', { ascending: false }),
      client.from('notification_reads').select('notification_id').eq('user_id', userId),
      client.from('platform_config').select('*').eq('id', 'default').maybeSingle(),
    ]);

    const firstCoreError =
      (profilesRes.error && { table: 'profiles', err: profilesRes.error }) ||
      (schoolsRes.error && { table: 'schools', err: schoolsRes.error }) ||
      (groupsRes.error && { table: 'educational_groups', err: groupsRes.error }) ||
      (sectionsRes.error && { table: 'portfolio_sections', err: sectionsRes.error }) ||
      (filesRes.error && { table: 'portfolio_files', err: filesRes.error }) ||
      null;

    if (firstCoreError) {
      const { table, err } = firstCoreError;
      const errMsg = err.message || 'خطأ في الاستعلام';
      const isJwtIssue =
        err.code === 'PGRST301' ||
        err.code === 'PGRST302' ||
        err.code === 'PGRST303' ||
        errMsg.toLowerCase().includes('jwt');
      if (isJwtIssue && !retried) {
        const { data: refreshed } = await client.auth.refreshSession();
        if (refreshed.session?.user?.id) {
          return this.loadAuthenticatedWorkspace(refreshed.session.user.id, true);
        }
      }
      throw new Error(`[${table}] ${errMsg}${err.code ? ` (${err.code})` : ''}`);
    }

    const groupsList = (groupsRes.data as SupabaseGroupRow[]).map(mapGroupRow);
    const schoolsList = (schoolsRes.data as SupabaseSchoolRow[]).map((s) =>
      mapSchoolRow(s, groupsList.filter((g) => g.schoolId === s.id).length)
    );

    const mgrSchoolMap = new Map<string, string[]>();
    (mgrSchoolsRes.data ?? []).forEach((row: { manager_id: string; school_id: string }) => {
      const prev = mgrSchoolMap.get(row.manager_id) ?? [];
      mgrSchoolMap.set(row.manager_id, [...prev, row.school_id]);
    });

    const mgrGroupMap = new Map<string, string[]>();
    (mgrGroupsRes.data ?? []).forEach((row: { manager_id: string; group_id: string }) => {
      const prev = mgrGroupMap.get(row.manager_id) ?? [];
      mgrGroupMap.set(row.manager_id, [...prev, row.group_id]);
    });

    const usersList = (profilesRes.data as SupabaseProfileRow[]).map((p) =>
      mapProfileRow(p, mgrSchoolMap.get(p.id) ?? [], mgrGroupMap.get(p.id) ?? [])
    );

    const sectionsList = (sectionsRes.data as SupabasePortfolioSectionRow[]).map(mapSectionRow);
    const filesList = (filesRes.data as SupabasePortfolioFileRow[]).map(mapFileRow);
    const achievementsList = ((achievementsRes.data ?? []) as SupabaseAchievementRow[]).map(
      mapAchievementRow
    );
    const logsList = ((logsRes.data ?? []) as SupabaseActivityLogRow[]).map(mapActivityRow);
    const readIds = new Set<string>(
      (notifReadsRes.data ?? []).map((r: { notification_id: string }) => r.notification_id)
    );
    const notificationsList = ((notifsRes.data ?? []) as SupabaseNotificationRow[]).map((n) =>
      mapNotificationRow(n, readIds)
    );

    const cfg = configRes.data as SupabasePlatformConfigRow | null;

    return {
      users: usersList,
      schools: schoolsList,
      groups: groupsList,
      sections: sectionsList,
      files: filesList,
      achievements: achievementsList,
      activityLogs: logsList,
      notifications: notificationsList,
      branding: cfg?.branding,
      permissions: cfg?.permissions,
      settings: cfg?.settings,
    };
  },

  // --------------------------------------------------------------------------
  // Private File Storage & Metadata CRUD
  // --------------------------------------------------------------------------
  async uploadPrivateFile(input: {
    ownerId: string;
    sectionId: string;
    file: File;
    title: string;
    description: string;
    customFieldValues?: Record<string, string>;
  }): Promise<PortfolioFile> {
    const client = requireClient();
    const fileType = detectFileCategory(input.file.name, input.file.type);
    const safeName = sanitizeFilename(input.file.name);
    const storagePath = `${input.ownerId}/${input.sectionId}/${crypto.randomUUID()}_${safeName}`;

    const { error: uploadError } = await client.storage
      .from(PRIVATE_FILES_BUCKET)
      .upload(storagePath, input.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: input.file.type || 'application/octet-stream',
      });

    if (uploadError) throw uploadError;

    const { data, error: dbError } = await client
      .from('portfolio_files')
      .insert({
        title: input.title.trim() || input.file.name.replace(/\.[^/.]+$/, ''),
        original_file_name: input.file.name,
        description: input.description.trim(),
        section_id: input.sectionId,
        owner_id: input.ownerId,
        file_type: fileType,
        mime_type: input.file.type || 'application/octet-stream',
        size_bytes: input.file.size,
        storage_path: storagePath,
        custom_field_values: input.customFieldValues ?? {},
      })
      .select()
      .single<SupabasePortfolioFileRow>();

    if (dbError) {
      // Roll back storage object if DB insert fails
      await client.storage.from(PRIVATE_FILES_BUCKET).remove([storagePath]);
      throw dbError;
    }

    return mapFileRow(data);
  },

  async getSignedFileUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const client = requireClient();
    const { data, error } = await client.storage
      .from(PRIVATE_FILES_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async updateFileMetadata(
    fileId: string,
    updates: {
      title?: string;
      description?: string;
      sectionId?: string;
      customFieldValues?: Record<string, string>;
    }
  ): Promise<PortfolioFile> {
    const client = requireClient();
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.sectionId !== undefined) payload.section_id = updates.sectionId;
    if (updates.customFieldValues !== undefined)
      payload.custom_field_values = updates.customFieldValues;

    const { data, error } = await client
      .from('portfolio_files')
      .update(payload)
      .eq('id', fileId)
      .select()
      .single<SupabasePortfolioFileRow>();

    if (error) throw error;
    return mapFileRow(data);
  },

  async replacePrivateFile(
    existing: PortfolioFile,
    newFile: File,
    customFieldValues?: Record<string, string>
  ): Promise<PortfolioFile> {
    const client = requireClient();
    const fileType = detectFileCategory(newFile.name, newFile.type);
    const safeName = sanitizeFilename(newFile.name);
    const newPath = `${existing.ownerId}/${existing.sectionId}/${crypto.randomUUID()}_${safeName}`;

    const { error: uploadError } = await client.storage
      .from(PRIVATE_FILES_BUCKET)
      .upload(newPath, newFile, {
        contentType: newFile.type || 'application/octet-stream',
      });
    if (uploadError) throw uploadError;

    const { data, error: dbError } = await client
      .from('portfolio_files')
      .update({
        original_file_name: newFile.name,
        file_type: fileType,
        mime_type: newFile.type || existing.mimeType,
        size_bytes: newFile.size,
        storage_path: newPath,
        ...(customFieldValues ? { custom_field_values: customFieldValues } : {}),
      })
      .eq('id', existing.id)
      .select()
      .single<SupabasePortfolioFileRow>();

    if (dbError) {
      await client.storage.from(PRIVATE_FILES_BUCKET).remove([newPath]);
      throw dbError;
    }

    // Remove previous binary safely
    await client.storage.from(PRIVATE_FILES_BUCKET).remove([existing.storagePath]);
    return mapFileRow(data);
  },

  async softDeleteFile(fileId: string): Promise<void> {
    const client = requireClient();
    const { error } = await client
      .from('portfolio_files')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', fileId);
    if (error) throw error;
  },

  async restoreFile(fileId: string): Promise<void> {
    const client = requireClient();
    const { error } = await client
      .from('portfolio_files')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', fileId);
    if (error) throw error;
  },

  async permanentlyDeleteFile(file: PortfolioFile): Promise<void> {
    const client = requireClient();
    const { error: dbError } = await client.from('portfolio_files').delete().eq('id', file.id);
    if (dbError) throw dbError;
    await client.storage.from(PRIVATE_FILES_BUCKET).remove([file.storagePath]);
  },

  async reviewFile(
    fileId: string,
    reviewerId: string,
    status: ReviewStatus,
    note: string
  ): Promise<PortfolioFile> {
    const client = requireClient();
    const { data, error } = await client
      .from('portfolio_files')
      .update({
        review_status: status,
        review_note: note.trim(),
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single<SupabasePortfolioFileRow>();

    if (error) throw error;
    return mapFileRow(data);
  },

  // --------------------------------------------------------------------------
  // Dynamic Sections
  // --------------------------------------------------------------------------
  async createSection(input: Omit<PortfolioSection, 'id'>): Promise<PortfolioSection> {
    const client = requireClient();
    const { data, error } = await client
      .from('portfolio_sections')
      .insert({
        title: input.title,
        description: input.description,
        icon_name: input.iconName,
        accent_color: input.accentColor,
        sort_order: input.order,
        is_active: input.isActive,
        is_required: input.isRequired,
        is_system_default: input.isSystemDefault,
        owner_id: input.ownerId ?? null,
        category: input.category,
        custom_fields: input.customFields,
      })
      .select()
      .single<SupabasePortfolioSectionRow>();
    if (error) throw error;
    return mapSectionRow(data);
  },

  async updateSection(id: string, updates: Partial<PortfolioSection>): Promise<void> {
    const client = requireClient();
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.accentColor !== undefined) payload.accent_color = updates.accentColor;
    if (updates.order !== undefined) payload.sort_order = updates.order;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.isRequired !== undefined) payload.is_required = updates.isRequired;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.customFields !== undefined) payload.custom_fields = updates.customFields;

    const { error } = await client.from('portfolio_sections').update(payload).eq('id', id);
    if (error) throw error;
  },

  async deleteSection(id: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.from('portfolio_sections').delete().eq('id', id);
    if (error) throw error;
  },

  // --------------------------------------------------------------------------
  // Achievements
  // --------------------------------------------------------------------------
  async createAchievement(
    ownerId: string,
    input: Omit<AchievementItem, 'id' | 'ownerId' | 'createdAt'>
  ): Promise<AchievementItem> {
    const client = requireClient();
    const { data, error } = await client
      .from('achievements')
      .insert({
        owner_id: ownerId,
        section_id: input.sectionId,
        title: input.title,
        description: input.description,
        achieved_date: input.date,
        level: input.level,
        attachment_file_id: input.attachmentFileId ?? null,
        custom_field_values: input.customFieldValues ?? {},
      })
      .select()
      .single<SupabaseAchievementRow>();
    if (error) throw error;
    return mapAchievementRow(data);
  },

  async deleteAchievement(id: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.from('achievements').delete().eq('id', id);
    if (error) throw error;
  },

  // --------------------------------------------------------------------------
  // Users, Schools & Groups
  // --------------------------------------------------------------------------
  async updateProfile(id: string, updates: Partial<UserAccount>): Promise<void> {
    const client = requireClient();
    const payload: Record<string, unknown> = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
    if (updates.specialty !== undefined) payload.specialty = updates.specialty;
    if (updates.qualification !== undefined) payload.qualification = updates.qualification;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.schoolId !== undefined) payload.school_id = updates.schoolId || null;
    if (updates.groupId !== undefined) payload.group_id = updates.groupId || null;
    if (updates.managerId !== undefined) payload.manager_id = updates.managerId || null;
    if (updates.allowManagerView !== undefined)
      payload.allow_manager_view = updates.allowManagerView;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await client.from('profiles').update(payload).eq('id', id);
    if (error) throw error;

    if (updates.assignedSchoolIds !== undefined) {
      await client.from('manager_school_assignments').delete().eq('manager_id', id);
      if (updates.assignedSchoolIds.length > 0) {
        await client.from('manager_school_assignments').insert(
          updates.assignedSchoolIds.map((school_id) => ({ manager_id: id, school_id }))
        );
      }
    }
  },

  async joinSchoolByCode(schoolCode: string): Promise<School> {
    const client = requireClient();
    const { data, error } = await client.rpc('join_school_by_code', {
      target_code: schoolCode.trim().toUpperCase(),
    });
    if (error) throw error;
    return mapSchoolRow(data as SupabaseSchoolRow, 0);
  },

  async createSchool(input: Omit<School, 'id' | 'createdAt' | 'groupsCount'>): Promise<School> {
    const client = requireClient();
    const { data, error } = await client
      .from('schools')
      .insert({
        name: input.name,
        code: input.code.trim().toUpperCase(),
        stage: input.stage,
        city: input.city,
        manager_id: input.managerId ?? null,
      })
      .select()
      .single<SupabaseSchoolRow>();
    if (error) throw error;
    return mapSchoolRow(data, 0);
  },

  async updateSchool(id: string, updates: Partial<School>): Promise<School> {
    const client = requireClient();
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.code !== undefined) payload.code = updates.code.trim().toUpperCase();
    if (updates.stage !== undefined) payload.stage = updates.stage;
    if (updates.city !== undefined) payload.city = updates.city.trim();
    if ('managerId' in updates) payload.manager_id = updates.managerId || null;

    const { data, error } = await client
      .from('schools')
      .update(payload)
      .eq('id', id)
      .select()
      .single<SupabaseSchoolRow>();
    if (error) throw error;
    return mapSchoolRow(data, updates.groupsCount ?? 0);
  },

  async deleteSchool(id: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.from('schools').delete().eq('id', id);
    if (error) throw error;
  },

  async createGroup(input: Omit<EducationalGroup, 'id' | 'createdAt'>): Promise<EducationalGroup> {
    const client = requireClient();
    const { data, error } = await client
      .from('educational_groups')
      .insert({
        name: input.name,
        school_id: input.schoolId,
        manager_id: input.managerId ?? null,
        specialty: input.specialty,
      })
      .select()
      .single<SupabaseGroupRow>();
    if (error) throw error;
    return mapGroupRow(data);
  },

  async deleteGroup(id: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.from('educational_groups').delete().eq('id', id);
    if (error) throw error;
  },

  // --------------------------------------------------------------------------
  // Notifications & Activity Logs
  // --------------------------------------------------------------------------
  async sendNotification(input: {
    senderId: string;
    senderName: string;
    title: string;
    message: string;
    targetRole: UserRole | 'all';
    targetSchoolId?: string;
    targetGroupId?: string;
    targetUserId?: string;
    category: NotificationItem['category'];
  }): Promise<NotificationItem> {
    const client = requireClient();
    const { data, error } = await client
      .from('notifications')
      .insert({
        sender_id: input.senderId,
        sender_name: input.senderName,
        title: input.title,
        message: input.message,
        target_role: input.targetRole,
        target_school_id: input.targetSchoolId || null,
        target_group_id: input.targetGroupId || null,
        target_user_id: input.targetUserId || null,
        category: input.category,
      })
      .select()
      .single<SupabaseNotificationRow>();
    if (error) throw error;
    return mapNotificationRow(data, new Set());
  },

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const client = requireClient();
    const { error } = await client
      .from('notification_reads')
      .upsert({ notification_id: notificationId, user_id: userId });
    if (error) throw error;
  },

  async logActivity(entry: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    actionType: ActivityLogEntry['actionType'];
    description: string;
    targetName?: string;
  }): Promise<void> {
    const client = requireClient();
    await client.from('activity_logs').insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      actor_role: entry.actorRole,
      action_type: entry.actionType,
      description: entry.description,
      target_name: entry.targetName ?? null,
    });
  },

  // --------------------------------------------------------------------------
  // Branding & Platform Config
  // --------------------------------------------------------------------------
  async uploadBrandingAsset(file: File, kind: 'logo' | 'app_icon'): Promise<string> {
    const client = requireClient();
    const ext = file.name.split('.').pop() || 'png';
    const path = `${kind}_${Date.now()}.${ext}`;
    const { error } = await client.storage.from(PUBLIC_BRANDING_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = client.storage.from(PUBLIC_BRANDING_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async savePlatformConfig(
    userId: string,
    payload: {
      branding: PlatformBranding;
      permissions: Record<UserRole, RolePermissionSet>;
      settings: PlatformSettings;
    }
  ): Promise<void> {
    const client = requireClient();
    const { error } = await client.from('platform_config').upsert({
      id: 'default',
      branding: payload.branding,
      permissions: payload.permissions,
      settings: payload.settings,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    });
    if (error) throw error;
  },

  // --------------------------------------------------------------------------
  // Temporary Visit Codes (Teacher Control + Live Logs + Guest Read-Only View)
  // --------------------------------------------------------------------------
  async getOrCreateMyVisitCode(): Promise<TeacherVisitCode> {
    const client = requireClient();
    const { data, error } = await client
      .rpc('get_or_create_my_visit_code')
      .single<SupabaseTeacherVisitCodeRow>();
    if (error) throw error;
    return mapVisitCodeRow(data);
  },

  async getMyVisitLogs(teacherId: string): Promise<TeacherVisitLog[]> {
    const client = requireClient();
    const { data, error } = await client
      .from('teacher_visit_logs')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('entered_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return ((data ?? []) as SupabaseTeacherVisitLogRow[]).map(mapVisitLogRow);
  },

  async toggleMyVisitCode(nextActive: boolean): Promise<TeacherVisitCode> {
    const client = requireClient();
    const { data, error } = await client
      .rpc('toggle_my_visit_code', { next_active: nextActive })
      .single<SupabaseTeacherVisitCodeRow>();
    if (error) throw error;
    return mapVisitCodeRow(data);
  },

  async regenerateMyVisitCode(): Promise<TeacherVisitCode> {
    const client = requireClient();
    const { data, error } = await client
      .rpc('regenerate_my_visit_code')
      .single<SupabaseTeacherVisitCodeRow>();
    if (error) throw error;
    return mapVisitCodeRow(data);
  },

  async enterVisitSession(code: string, visitorName?: string): Promise<GuestVisitSessionPayload> {
    const client = requireClient();
    const { data, error } = await client.rpc('enter_visit_session', {
      p_code: code.trim().toUpperCase(),
      p_visitor_name: visitorName?.trim() || null,
    });
    if (error) throw error;

    const raw = data as {
      sessionToken: string;
      enteredAt: string;
      code: string;
      teacher: GuestVisitTeacherSummary;
      sections: SupabasePortfolioSectionRow[];
      files: SupabasePortfolioFileRow[];
      achievements: SupabaseAchievementRow[];
    };

    const mappedRawSections = (raw.sections ?? []).map(mapSectionRow);
    return {
      sessionToken: raw.sessionToken,
      enteredAt: raw.enteredAt,
      code: raw.code,
      teacher: raw.teacher,
      sections: mergeSectionsWithTeacherExtensions(mappedRawSections, raw.teacher.id),
      files: (raw.files ?? []).map(mapFileRow),
      achievements: (raw.achievements ?? []).map(mapAchievementRow),
    };
  },

  async pingVisitSession(
    code: string,
    sessionToken: string,
    teacherId: string
  ): Promise<
    | {
        active: true;
        sections: PortfolioSection[];
        files: PortfolioFile[];
        achievements: AchievementItem[];
      }
    | { active: false }
  > {
    const client = requireClient();
    const { data, error } = await client.rpc('ping_visit_session', {
      p_code: code.trim().toUpperCase(),
      p_session_token: sessionToken,
    });
    if (error) throw error;

    const raw = data as {
      active: boolean;
      sections?: SupabasePortfolioSectionRow[];
      files?: SupabasePortfolioFileRow[];
      achievements?: SupabaseAchievementRow[];
    };

    if (!raw?.active) {
      return { active: false };
    }

    const mappedRawSections = (raw.sections ?? []).map(mapSectionRow);
    return {
      active: true,
      sections: mergeSectionsWithTeacherExtensions(mappedRawSections, teacherId),
      files: (raw.files ?? []).map(mapFileRow),
      achievements: (raw.achievements ?? []).map(mapAchievementRow),
    };
  },

  async endVisitSession(sessionToken: string): Promise<void> {
    if (!supabase) return;
    await supabase.rpc('end_visit_session', { p_session_token: sessionToken });
  },

  endVisitSessionKeepalive(sessionToken: string): void {
    sendAnonRpcKeepalive('end_visit_session', { p_session_token: sessionToken });
  },

  async getGuestSignedFileUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
    const client = requireClient();
    const { data, error } = await client.storage
      .from(PRIVATE_FILES_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },
};

