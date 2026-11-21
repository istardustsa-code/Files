import React, { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  ListPlus,
  X,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import type {
  CustomFieldDefinition,
  CustomFieldType,
  PortfolioSection,
} from '../../../types/platform';
import { Modal } from '../../common/Modal';

export const SectionBuilderView: React.FC = () => {
  const {
    sections,
    settings,
    createSection,
    updateSection,
    deleteSection,
    reorderSection,
  } = usePlatform();

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioSection | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(settings.sectionCategories[0] ?? 'عام');
  const [accentColor, setAccentColor] = useState('#A8B9A5');
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);

  // New custom field draft
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const openNewModal = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setCategory(settings.sectionCategories[0] ?? 'عام');
    setAccentColor('#A8B9A5');
    setIsRequired(false);
    setIsActive(true);
    setCustomFields([]);
    setModalOpen(true);
  };

  const openEditModal = (sec: PortfolioSection) => {
    setEditing(sec);
    setTitle(sec.title);
    setDescription(sec.description);
    setCategory(sec.category);
    setAccentColor(sec.accentColor);
    setIsRequired(sec.isRequired);
    setIsActive(sec.isActive);
    setCustomFields(sec.customFields);
    setModalOpen(true);
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const field: CustomFieldDefinition = {
      id: `cf-${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options:
        newFieldType === 'select'
          ? newFieldOptions
              .split('،')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    };
    setCustomFields((prev) => [...prev, field]);
    setNewFieldLabel('');
    setNewFieldOptions('');
    setNewFieldRequired(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editing) {
      updateSection(editing.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        accentColor,
        isRequired,
        isActive,
        customFields,
      });
    } else {
      createSection({
        title: title.trim(),
        description: description.trim(),
        iconName: 'Folder',
        accentColor,
        isActive,
        isRequired,
        isSystemDefault: false,
        category,
        customFields,
      });
    }
    setModalOpen(false);
  };

  const fieldTypeLabel = (t: CustomFieldType) => {
    switch (t) {
      case 'text':
        return 'نص قصير';
      case 'textarea':
        return 'نص طويل';
      case 'date':
        return 'تاريخ';
      case 'number':
        return 'رقم';
      case 'select':
        return 'قائمة خيارات';
      case 'attachment':
        return 'مرفق إضافي';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#454943]">
            إدارة الأقسام وبناء الحقول الديناميكية
          </h2>
          <p className="text-xs text-[#666560] mt-0.5">
            أنشئ، عدّل، أعد ترتيب، أو خصّص حقول الإدخال والمرفقات لكل قسم في ملف الإنجاز بشكل ديناميكي بالكامل
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Sections List */}
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl divide-y divide-[#D9C9B5]/50">
        {sortedSections.map((sec, idx) => (
          <div
            key={sec.id}
            className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
              !sec.isActive ? 'opacity-65 bg-[#F7F5F0]/40' : ''
            }`}
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => reorderSection(sec.id, 'up')}
                  className="p-1 rounded hover:bg-[#F7F5F0] text-[#666560] disabled:opacity-30"
                  title="تحريك للأعلى"
                  aria-label="تحريك للأعلى"
                >
                  <ArrowUp size={14} />
                </button>
                <span className="font-mono-num text-xs font-semibold text-[#85847E]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  disabled={idx === sortedSections.length - 1}
                  onClick={() => reorderSection(sec.id, 'down')}
                  className="p-1 rounded hover:bg-[#F7F5F0] text-[#666560] disabled:opacity-30"
                  title="تحريك للأسفل"
                  aria-label="تحريك للأسفل"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sec.accentColor }}
                  />
                  <h3 className="text-base font-semibold text-[#454943]">{sec.title}</h3>
                  <span className="text-xs text-[#666560]">· {sec.category}</span>
                  {sec.isRequired && (
                    <span className="text-xs font-medium text-[#556952]">· قسم أساسي مطلوب</span>
                  )}
                  {!sec.isActive && (
                    <span className="text-xs font-medium text-[#8A5E56]">· مخفي عن المعلمين</span>
                  )}
                </div>

                <p className="text-sm text-[#666560] leading-relaxed">{sec.description}</p>

                <p className="text-xs text-[#85847E] tabular-nums">
                  الحقول المخصصة ({sec.customFields.length}):{' '}
                  {sec.customFields.length > 0
                    ? sec.customFields.map((f) => f.label).join('، ')
                    : 'لا توجد حقول إضافية'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => updateSection(sec.id, { isActive: !sec.isActive })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg whitespace-nowrap"
              >
                {sec.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{sec.isActive ? 'إخفاء' : 'تفعيل'}</span>
              </button>
              <button
                type="button"
                onClick={() => openEditModal(sec)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg whitespace-nowrap"
              >
                <Edit3 size={14} />
                <span>تعديل والحقول</span>
              </button>
              <button
                type="button"
                onClick={() => deleteSection(sec.id)}
                className="p-2 text-[#85847E] hover:text-[#8A5E56] rounded-lg hover:bg-[#D8BDB7]/20"
                title="حذف القسم"
                aria-label="حذف القسم"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Section & Custom Field Builder Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `تعديل قسم: ${editing.title}` : 'إنشاء قسم ديناميكي جديد'}
        subtitle="يمكنك تعريف الحقول المخصصة والمرفقات المطلوبة داخل هذا القسم"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">اسم القسم</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="مثال: الشراكة المجتمعية"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              >
                {settings.sectionCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">وصف القسم</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وضح للمعلمين الغرض من هذا القسم ونوعية الشواهد المطلوبة..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-medium text-[#454943] cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              <span>قسم إلزامي ضمن نسبة اكتمال ملف الإنجاز</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-[#454943] cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>مفعّل ومرئي للمعلمين</span>
            </label>
            <div className="flex items-center gap-2 text-xs font-medium text-[#454943]">
              <span>اللون التمييزي:</span>
              {['#A8B9A5', '#D8BDB7', '#D9C9B5', '#85847E'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setAccentColor(col)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    accentColor === col ? 'border-[#454943]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: col }}
                  aria-label={`اختيار اللون ${col}`}
                />
              ))}
            </div>
          </div>

          {/* Dynamic Custom Fields Builder */}
          <div className="pt-4 border-t border-[#D9C9B5]/60 space-y-3">
            <div className="flex items-center gap-2">
              <ListPlus size={16} className="text-[#556952]" />
              <h4 className="text-sm font-semibold text-[#454943]">الحقول المخصصة للقسم</h4>
            </div>

            {customFields.length > 0 && (
              <div className="divide-y divide-[#D9C9B5]/40 border border-[#D9C9B5]/70 rounded-xl bg-[#F7F5F0]/50">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#454943]">{field.label}</span>
                      <span className="text-[#666560] mr-2">
                        · {fieldTypeLabel(field.type)} {field.required ? '· مطلوب' : '· اختياري'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomFields((prev) => prev.filter((f) => f.id !== field.id))
                      }
                      className="text-[#85847E] hover:text-[#8A5E56]"
                      aria-label="حذف الحقل"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="اسم الحقل الجديد (مثال: الجهة المنفذة)"
                  className="px-3 py-2 text-xs bg-white border border-[#D9C9B5] rounded-lg"
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                  className="px-3 py-2 text-xs bg-white border border-[#D9C9B5] rounded-lg"
                >
                  <option value="text">نص قصير</option>
                  <option value="textarea">نص طويل</option>
                  <option value="number">رقم</option>
                  <option value="date">تاريخ</option>
                  <option value="select">قائمة خيارات</option>
                  <option value="attachment">مرفق إضافي</option>
                </select>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-[#454943]">
                    <input
                      type="checkbox"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                    />
                    <span>إلزامي</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="px-3 py-1.5 text-xs font-medium bg-[#556952] text-white rounded-lg hover:bg-[#465743] whitespace-nowrap"
                  >
                    + إدراج حقل
                  </button>
                </div>
              </div>
              {newFieldType === 'select' && (
                <input
                  type="text"
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  placeholder="اكتب الخيارات مفصولة بفاصلة عربية (مثال: مدرسة، مكتب تعليم، إدارة تعليم)"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B5] rounded-lg"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9C9B5]/60">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] text-[#454943] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg hover:bg-[#353833]"
            >
              {editing ? 'حفظ القسم' : 'إنشاء القسم'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
