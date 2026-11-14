import React, { useState, useMemo } from 'react';
import {
  HouseholdData,
  HouseholdCommonAssets,
  Beneficiary,
  GNDivision,
  User,
  PovertyScoringWeights,
  DEFAULT_POVERTY_WEIGHTS,
  calculateFamilyPovertyScore,
  AssistanceRecord,
  FamilyRelationship,
} from '../types';
import { Language, translations } from '../translations/i18n';
import {
  Users,
  Search,
  Plus,
  Settings,
  Phone,
  Trash2,
  Edit,
  Home,
  Droplets,
  FileText,
  UserPlus,
} from 'lucide-react';
import {
  clearAllHouseholdsPermanently,
  recordDeletedId,
  saveHouseholds,
} from '../services/storage';
import {
  OfficialFamilyDossierWindow,
  DossierWindowTab,
} from './OfficialFamilyDossierWindow';
import { computeMembersAtAGlance } from '../types';

interface FamilyDataCenterViewProps {
  households: HouseholdData[];
  beneficiaries: Beneficiary[];
  assistanceRecords?: AssistanceRecord[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  povertyWeights: PovertyScoringWeights;
  onUpdateHouseholds: (items: HouseholdData[]) => void;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onUpdatePovertyWeights: (weights: PovertyScoringWeights) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const FamilyDataCenterView: React.FC<FamilyDataCenterViewProps> = ({
  households,
  beneficiaries,
  assistanceRecords = [],
  divisions,
  currentUser,
  lang,
  povertyWeights,
  onUpdateHouseholds,
  onUpdateBeneficiaries,
  onUpdatePovertyWeights,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Role permissions
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const canEdit = isSuperAdmin || currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2' || currentUser.role === 'GRAMANIILATHARI';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Pagination State (Requirement 03)
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Dedicated Full-Window Official Family Entry & A4 Summary Workspace
  const [dossierWindowOpen, setDossierWindowOpen] = useState(false);
  const [dossierInitialTab, setDossierInitialTab] = useState<DossierWindowTab>('family-entry');
  const [dossierEditingHousehold, setDossierEditingHousehold] = useState<HouseholdData | null>(null);

  // Super Admin Scoring Formula Configuration Modal (Requirement 08)
  const [isConfigWeightsOpen, setIsConfigWeightsOpen] = useState(false);
  const [tempWeights, setTempWeights] = useState<PovertyScoringWeights>(povertyWeights);

  // Filtered dataset
  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      if (selectedDivision !== 'ALL' && h.divisionCode !== selectedDivision) return false;
      if (selectedPriority !== 'ALL' && String(h.priorityRank) !== selectedPriority) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = h.familyCode?.toLowerCase().includes(q);
        const matchRef = h.householdReference?.toLowerCase().includes(q);
        const matchApp = h.applicationReference?.toLowerCase().includes(q);
        const matchNameTa = h.applicantNameTa?.toLowerCase().includes(q);
        const matchNameEn = h.applicantNameEn?.toLowerCase().includes(q);
        const matchNic = h.applicantNic?.toLowerCase().includes(q);
        const matchPhone = h.phone?.includes(q);
        return matchCode || matchRef || matchApp || matchNameTa || matchNameEn || matchNic || matchPhone;
      }
      return true;
    });
  }, [households, selectedDivision, selectedPriority, searchQuery]);

  // Paginated dataset (Requirement 03)
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredHouseholds.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedHouseholds = useMemo(() => {
    if (pageSize === 'ALL') return filteredHouseholds;
    const start = (effectivePage - 1) * pageSize;
    return filteredHouseholds.slice(start, start + pageSize);
  }, [filteredHouseholds, effectivePage, pageSize]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = households.length;
    const p1Count = households.filter((h) => h.priorityRank === 1).length;
    const p2Count = households.filter((h) => h.priorityRank === 2).length;
    const p3Count = households.filter((h) => h.priorityRank === 3).length;
    const p4Count = households.filter((h) => h.priorityRank === 4).length;
    return { total, p1Count, p2Count, p3Count, p4Count };
  }, [households]);

  // Open Official Dossier Window (New Family, Edit, Add Members under Head QR, or A4 Summary)
  const handleOpenOfficialWindow = (
    household: HouseholdData | null,
    tab: DossierWindowTab = 'family-entry'
  ) => {
    setDossierEditingHousehold(household);
    setDossierInitialTab(tab);
    setDossierWindowOpen(true);
  };

  // Super Admin: Permanently wipe all family records
  const handleClearAllFamilies = () => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'அனைத்து குடும்பங்களையும் அழிக்க சுப்பர் அட்மின் அனுமதி தேவை.' : 'Super Admin permission required to wipe all family records.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? 'எச்சரிக்கை: பதிவுசெய்யப்பட்ட அனைத்து குடும்ப விபரங்களையும் நிரந்தரமாக அழிக்க விரும்புகிறீர்களா? இந்நடவடிக்கையை மீளப்பெற முடியாது.'
        : 'WARNING: Are you sure you want to permanently wipe all family records? This cannot be undone.'
    );
    if (!confirmed) return;

    const code = window.prompt(
      lang === 'ta'
        ? 'நிரந்தரமாக அழிக்க "DELETE" அல்லது "அழி" என தட்டச்சு செய்க:'
        : 'Type "DELETE" to confirm permanent deletion:'
    );
    if (code !== 'DELETE' && code !== 'அழி') {
      alert(lang === 'ta' ? 'உறுதிப்படுத்தல் சொல் பொருந்தவில்லை. நடவடிக்கை ரத்து செய்யப்பட்டது.' : 'Confirmation text did not match. Aborted.');
      return;
    }

    clearAllHouseholdsPermanently();
    onUpdateHouseholds([]);
    setDossierWindowOpen(false);
    onAuditLog('CLEAR_ALL_HOUSEHOLDS', `Super Admin ${currentUser.name} wiped all family records.`);
    alert(lang === 'ta' ? 'அனைத்து குடும்ப விபரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன.' : 'All family records have been wiped.');
  };

  // Delete a single household
  const handleDeleteHousehold = (h: HouseholdData) => {
    if (!canEdit) {
      alert(lang === 'ta' ? 'குடும்பத்தை அழிக்க அனுமதி இல்லை.' : 'Permission denied to delete family.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? `${h.familyCode} (${h.applicantNameTa}) குடும்ப விபரங்களை நிரந்தரமாக அழிக்க விரும்புகிறீர்களா?`
        : `Are you sure you want to delete family ${h.familyCode} (${h.applicantNameEn || h.applicantNameTa})?`
    );
    if (!confirmed) return;

    recordDeletedId(h.id, h.applicantNic);
    const updated = households.filter((item) => item.id !== h.id);
    saveHouseholds(updated);
    onUpdateHouseholds(updated);
    if (dossierEditingHousehold?.id === h.id) setDossierWindowOpen(false);
    onAuditLog('DELETE_HOUSEHOLD', `Deleted household ${h.familyCode} (ID: ${h.id})`);
  };

  // Save handler from OfficialFamilyDossierWindow
  const handleSaveOfficialFamily = ({
    household,
    savedMembers,
    removedMemberIds,
    isEdit,
  }: {
    household: HouseholdData;
    savedMembers: Beneficiary[];
    removedMemberIds: string[];
    isEdit: boolean;
  }) => {
    // 1. Merge Households
    const existingIdx = households.findIndex(
      (h) => h.id === household.id || h.familyCode === household.familyCode
    );
    let nextHouseholds: HouseholdData[];
    if (existingIdx >= 0) {
      nextHouseholds = [...households];
      nextHouseholds[existingIdx] = household;
    } else {
      nextHouseholds = [household, ...households];
    }
    onUpdateHouseholds(nextHouseholds);

    // 2. Merge Beneficiaries (update existing, prepend new, remove deleted member drafts)
    const savedMap = new Map(savedMembers.map((m) => [m.id, m]));
    const removedSet = new Set(removedMemberIds);
    const updatedExisting = beneficiaries
      .filter((b) => !removedSet.has(b.id))
      .map((b) => savedMap.get(b.id) || b);
    const existingIds = new Set(updatedExisting.map((b) => b.id));
    const newlyAdded = savedMembers.filter((m) => !existingIds.has(m.id));
    onUpdateBeneficiaries([...newlyAdded, ...updatedExisting]);

    onAuditLog(
      isEdit ? 'UPDATE_FAMILY_UNIT' : 'REGISTER_FAMILY_UNIT',
      `${isEdit ? 'Updated' : 'Registered'} family ${household.familyCode} (${savedMembers.length} members under Head QR). Score: ${household.score100}/100 (Priority ${household.priorityRank})`
    );

    setDossierWindowOpen(false);
    setDossierEditingHousehold(null);
  };

  // Save Super Admin Scoring Weights
  const handleSaveScoringWeights = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePovertyWeights(tempWeights);
    onAuditLog(
      'CONFIG_POVERTY_WEIGHTS',
      `Super Admin (${currentUser.name}) updated poverty scoring criteria weights and recalculated all households`
    );
    setIsConfigWeightsOpen(false);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl text-xl shadow-xs">👨‍👩‍👧‍👦</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {t.familyCenterTitle}
              </h2>
              <span className="text-[11px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded font-mono">
                100-Point Poverty Assessment & Priority Allocation Engine
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.familyCenterSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <button
              onClick={() => {
                setTempWeights(povertyWeights);
                setIsConfigWeightsOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Super Admin: Edit scoring weights and formula"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.configureScoringWeights}</span>
            </button>
          )}

          {isSuperAdmin && households.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllFamilies}
              className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title={lang === 'ta' ? 'அனைத்து குடும்பங்களையும் நிரந்தரமாக அழி (Super Admin)' : 'Wipe all family records (Super Admin)'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'ta' ? 'அனைத்து குடும்பங்களையும் அழி' : 'Clear All Families'}</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => handleOpenOfficialWindow(null, 'family-entry')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ta' ? 'குடும்ப விபரத்தை உள்ளடக்கு' : 'Enter Official Family Details'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Priority Stat Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">
            {lang === 'ta' ? 'பதிவான குடும்பங்கள்' : 'Total Families'}
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-white p-3.5 border border-red-200 rounded-xl shadow-2xs bg-red-50/25">
          <div className="text-[10px] uppercase font-bold text-red-800 font-mono flex items-center gap-1">
            <span>🔴 முன்னுரிமை 1 (80-100)</span>
          </div>
          <div className="text-xl font-extrabold text-red-950 mt-1">{stats.p1Count}</div>
          <div className="text-[10px] text-red-700 font-bold">தீவிர வறுமை / அவசரம்</div>
        </div>

        <div className="bg-white p-3.5 border border-amber-200 rounded-xl shadow-2xs bg-amber-50/25">
          <div className="text-[10px] uppercase font-bold text-amber-800 font-mono flex items-center gap-1">
            <span>🟠 முன்னுரிமை 2 (60-79)</span>
          </div>
          <div className="text-xl font-extrabold text-amber-950 mt-1">{stats.p2Count}</div>
          <div className="text-[10px] text-amber-700 font-bold">விளிம்புநிலை வறுமை</div>
        </div>

        <div className="bg-white p-3.5 border border-yellow-200 rounded-xl shadow-2xs bg-yellow-50/25">
          <div className="text-[10px] uppercase font-bold text-yellow-800 font-mono flex items-center gap-1">
            <span>🟡 முன்னுரிமை 3 (40-59)</span>
          </div>
          <div className="text-xl font-extrabold text-yellow-950 mt-1">{stats.p3Count}</div>
          <div className="text-[10px] text-yellow-700 font-bold">இடைக்கால உதவி நிலை</div>
        </div>

        <div className="bg-white p-3.5 border border-emerald-200 rounded-xl shadow-2xs bg-emerald-50/25 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-emerald-800 font-mono flex items-center gap-1">
            <span>🟢 முன்னுரிமை 4 (&lt;40)</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-950 mt-1">{stats.p4Count}</div>
          <div className="text-[10px] text-emerald-700 font-bold">தன்னிறைவு பெற்றவை</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={lang === 'ta' ? 'குடும்ப QR, குறிப்பு எண், குடும்பத் தலைவர் NIC, பெயர், தொலைபேசி...' : 'Search Family Code, HH Ref, Head NIC, Name, Phone...'}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
            />
          </div>

          {/* Division Filter */}
          <div>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">🗺️ {t.allDivisions}</option>
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTa}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Ranking Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-slate-800"
            >
              <option value="ALL">🎯 {t.priorityRank}: {t.allDivisions}</option>
              <option value="1">🔴 முன்னுரிமை 1: தீவிர வறுமை (80-100 pts)</option>
              <option value="2">🟠 முன்னுரிமை 2: வறுமை நிலை (60-79 pts)</option>
              <option value="3">🟡 முன்னுரிமை 3: இடைக்கால நிலை (40-59 pts)</option>
              <option value="4">🟢 முன்னுரிமை 4: தன்னிறைவு (&lt;40 pts)</option>
            </select>
          </div>
        </div>

        {/* Second Row: Page Size Selector */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            {lang === 'ta' ? '100 புள்ளிகள் அடிப்படையில் கணிக்கப்பட்ட அதிகாரப்பூர்வ வறுமை அட்டவணை' : 'Official multi-dimensional poverty registry based on 100-point scale'}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {t.perPage}:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="ALL">{t.allRecords}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Household Cards / Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider font-mono">
              {filteredHouseholds.length} {lang === 'ta' ? 'குடும்பங்கள்' : 'Families'}
            </span>
            {pageSize !== 'ALL' && (
              <span className="text-[11px] text-slate-500">
                ({t.showingRecords} {Math.min(filteredHouseholds.length, (effectivePage - 1) * pageSize + 1)} - {Math.min(filteredHouseholds.length, effectivePage * pageSize)} {t.ofTotal} {filteredHouseholds.length})
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[11px]">
            {lang === 'ta' ? 'அனைத்து உறுப்பினர்களும் ஒரே QR குறியீட்டின் கீழ் இணைக்கப்பட்டுள்ளனர்' : 'All members unified under one Master QR code'}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {paginatedHouseholds.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {t.noData}
            </div>
          ) : (
            paginatedHouseholds.map((h) => {
              const members = beneficiaries.filter((b) => b.familyCode === h.familyCode);
              return (
                <div
                  key={h.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Household & Head Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-emerald-950 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                        {h.familyCode}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {h.householdReference}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {h.divisionCode} - {divisions.find((d) => d.code === h.divisionCode)?.nameTa || h.divisionCode}
                      </span>
                      {h.commonAssets.isSingleParent && (
                        <span className="text-[10px] bg-pink-100 text-pink-900 border border-pink-200 px-2 py-0.5 rounded-full font-bold">
                          👩‍👧 ஒற்றைப் பெற்றோர் (Single Parent)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="font-bold text-slate-900 text-sm">
                        {h.applicantNameTa} <span className="text-xs text-slate-500 font-normal">({h.applicantNameEn})</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-700">
                        NIC: {h.applicantNic}
                      </div>
                      {h.phone && (
                        <div className="text-xs text-slate-600 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{h.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Living Conditions & Members-at-a-Glance Summary Tags */}
                    {(() => {
                      const g = computeMembersAtAGlance(members);
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                            <Users className="w-3 h-3 text-emerald-700" />
                            <span>உறுப்பினர்கள்: <b>{members.length || h.totalMembersCount}</b></span>
                          </span>
                          {g.ckduCount > 0 && (
                            <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-bold">CKDU: {g.ckduCount}</span>
                          )}
                          {g.disabilityCount > 0 && (
                            <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">மாற்றுத்திறனாளி: {g.disabilityCount}</span>
                          )}
                          {g.over70Count > 0 && (
                            <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-bold">70+: {g.over70Count}</span>
                          )}
                          {g.childrenNotInSchool5To16Count > 0 && (
                            <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded font-bold">பள்ளி செல்லாதோர் (5–16): {g.childrenNotInSchool5To16Count}</span>
                          )}
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                            <Home className="w-3 h-3 text-slate-500" />
                            <span>{h.commonAssets.houseArea === 'LESS_THAN_500_SQFT' ? '<500 sq.ft' : h.commonAssets.houseArea}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            <span>{h.commonAssets.waterSource === 'UNPROTECTED_WELL' ? 'பாதுகாப்பற்ற கிணறு' : h.commonAssets.waterSource}</span>
                          </span>
                          <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                            வருமானம்: Rs.{(h.commonAssets.income?.total || 0).toLocaleString()} | {h.commonAssets.electricityUnitsKwh || 0} kWh
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right: 100-Point Score & Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
                    {/* Score Gauge */}
                    <div className="text-right mr-1">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {h.score100}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">/100</span>
                      </div>
                      <div className="mt-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          h.priorityRank === 1
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : h.priorityRank === 2
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : h.priorityRank === 3
                            ? 'bg-yellow-100 text-yellow-900 border-yellow-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {h.priorityRank === 1
                            ? 'முன்னுரிமை 1: தீவிர வறுமை'
                            : h.priorityRank === 2
                            ? 'முன்னுரிமை 2: வறுமை'
                            : h.priorityRank === 3
                            ? 'முன்னுரிமை 3: இடைக்காலம்'
                            : 'முன்னுரிமை 4: தன்னிறைவு'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenOfficialWindow(h, 'summary-a4')}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-colors"
                      title={lang === 'ta' ? 'முழுமையான சமரி & A4 அச்சிடு' : 'Official A4 Summary & Print'}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{lang === 'ta' ? 'சமரி / A4' : 'Summary A4'}</span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenOfficialWindow(h, 'members')}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-colors"
                        title={lang === 'ta' ? 'தலைமை QR கீழ் பல குடும்ப உறுப்பினர்களை சேர்' : 'Add members under Head QR'}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{lang === 'ta' ? 'உறுப்பினர் (QR)' : '+ Members'}</span>
                      </button>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenOfficialWindow(h, 'family-entry')}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        title={lang === 'ta' ? 'குடும்ப விபரத்தை திருத்து' : 'Edit family details'}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteHousehold(h)}
                        className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                        title={lang === 'ta' ? 'இக்குடும்ப விபரத்தை நிரந்தரமாக அழி' : 'Delete household permanently'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls (Requirement 03) */}
        {pageSize !== 'ALL' && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="text-slate-600 font-medium">
              {t.showingRecords} {Math.min(filteredHouseholds.length, (effectivePage - 1) * pageSize + 1)} - {Math.min(filteredHouseholds.length, effectivePage * pageSize)} {t.ofTotal} {filteredHouseholds.length}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={effectivePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold"
              >
                ← {t.prevPage}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        effectivePage === p
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                type="button"
                disabled={effectivePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold"
              >
                {t.nextPage} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Official Government Dossier Modal removed per user request */}
      {/* Super Admin Configure Scoring Weights Modal (Requirement 08) */}
      {isConfigWeightsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg text-lg">⚙️</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.configureScoringWeights}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    சுப்பர் அட்மின் அதிகாரம்: வறுமை மதிப்பீட்டு புள்ளிகளை விடயங்களுக்கு ஏற்ப மாற்றியமைக்கலாம்
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigWeightsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveScoringWeights} className="space-y-4">
              {/* Category Maximums */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block">01. பிரதான பிரிவுகளுக்கான அதிகபட்ச புள்ளிகள் (Max Total: 100)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Housing Max</label>
                    <input
                      type="number"
                      value={tempWeights.housingMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, housingMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Sanitation Max</label>
                    <input
                      type="number"
                      value={tempWeights.sanitationMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, sanitationMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Demographics Max</label>
                    <input
                      type="number"
                      value={tempWeights.demographicsMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, demographicsMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Economic Max</label>
                    <input
                      type="number"
                      value={tempWeights.economicMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, economicMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Individual Item Weights */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                <span className="font-bold text-slate-800 block">02. தனித்தனி விடயங்களுக்கான புள்ளிகள் (Item Criteria Points)</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">ஓலைக் கூரை (Thatch Roof):</label>
                    <input
                      type="number"
                      value={tempWeights.thatchRoofPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, thatchRoofPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">மண் சுவர் (Mud Wall):</label>
                    <input
                      type="number"
                      value={tempWeights.mudWallPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, mudWallPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">கழிப்பறை அற்றது (No Toilet):</label>
                    <input
                      type="number"
                      value={tempWeights.noToiletPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, noToiletPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">ஒற்றைப் பெற்றோர் (Single Parent):</label>
                    <input
                      type="number"
                      value={tempWeights.singleParentPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, singleParentPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">மாற்றுத்திறனாளி (Disability):</label>
                    <input
                      type="number"
                      value={tempWeights.disabilityMemberPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, disabilityMemberPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">சிறுநீரக/நாள்பட்ட நோய் (Chronic):</label>
                    <input
                      type="number"
                      value={tempWeights.chronicIllnessPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, chronicIllnessPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">குறைந்த வருமானம் (&lt;15k):</label>
                    <input
                      type="number"
                      value={tempWeights.lowIncomePoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, lowIncomePoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">வாகனம் அற்றவர் (No Vehicle):</label>
                    <input
                      type="number"
                      value={tempWeights.noVehiclePoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, noVehiclePoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">தினக்கூலி வேலை (Daily Wage):</label>
                    <input
                      type="number"
                      value={tempWeights.dailyWageLaborPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, dailyWageLaborPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">CKDU சிறுநீரக நோய்:</label>
                    <input
                      type="number"
                      value={tempWeights.ckduPoints ?? 6}
                      onChange={(e) => setTempWeights({ ...tempWeights, ckduPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">பள்ளி செல்லா (5–16):</label>
                    <input
                      type="number"
                      value={tempWeights.childrenNotInSchoolPoints ?? 5}
                      onChange={(e) => setTempWeights({ ...tempWeights, childrenNotInSchoolPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">O/L கீழ் கல்வி (Below O/L):</label>
                    <input
                      type="number"
                      value={tempWeights.belowOLPoints ?? 3}
                      onChange={(e) => setTempWeights({ ...tempWeights, belowOLPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">அதிக தங்கி வாழ்வோர்:</label>
                    <input
                      type="number"
                      value={tempWeights.dependentsPoints ?? 4}
                      onChange={(e) => setTempWeights({ ...tempWeights, dependentsPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">நிரந்தரமற்ற வீடு:</label>
                    <input
                      type="number"
                      value={tempWeights.nonPermanentHousePoints ?? 6}
                      onChange={(e) => setTempWeights({ ...tempWeights, nonPermanentHousePoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">குறைந்த மின்சார அலகு:</label>
                    <input
                      type="number"
                      value={tempWeights.lowElectricityUnitsPoints ?? 4}
                      onChange={(e) => setTempWeights({ ...tempWeights, lowElectricityUnitsPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTempWeights(DEFAULT_POVERTY_WEIGHTS)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100"
                >
                  மீட்டமை (Reset to Default)
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigWeightsOpen(false)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow-xs"
                  >
                    சேமித்து மீளக்கணக்கிடு (Save & Recalculate)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Full-Window Family Dossier, Multi-Member Entry under Head QR & A4 Print Summary */}
      <OfficialFamilyDossierWindow
        isOpen={dossierWindowOpen}
        initialTab={dossierInitialTab}
        editingHousehold={dossierEditingHousehold}
        existingHouseholdsCount={households.length}
        existingBeneficiaries={beneficiaries}
        divisions={divisions}
        lang={lang}
        povertyWeights={povertyWeights}
        canEdit={canEdit}
        onClose={() => {
          setDossierWindowOpen(false);
          setDossierEditingHousehold(null);
        }}
        onSaveFamily={handleSaveOfficialFamily}
      />
    </div>
  );
};
