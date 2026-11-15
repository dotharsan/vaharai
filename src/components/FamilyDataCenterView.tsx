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
  isHouseholdActive,
  isBeneficiaryActive,
  normDivCode,
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
  Smartphone,
  Filter,
  BarChart3,
  Pin,
  PinOff,
  QrCode,
  RotateCcw,
  FileDown,
  ChevronDown,
  ChevronUp,
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
import { downloadCsvFile, escapeCsv } from '../services/csv';
import {
  ASWESUMA_LABELS,
  countActiveAdvancedFilters,
  computeHouseholdMetrics,
  DEFAULT_FAMILY_ADVANCED_FILTERS,
  FamilyAdvancedFilters,
  HOUSE_TYPE_LABELS,
  HOUSING_PERMANENCY_LABELS,
  LIGHTING_SOURCE_LABELS,
  LIVESTOCK_LABELS,
  matchesHouseholdAdvancedFilters,
  PADDY_EXTENT_LABELS,
  TriFilter,
  WATER_SOURCE_LABELS,
} from '../utils/familyAnalytics';
import { FamilyAnalyticsChartPanel } from './FamilyAnalyticsChartPanel';
import {
  HouseholdWithMetrics,
  PrintableFamilyFilterReportModal,
} from './PrintableFamilyFilterReportModal';

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
  onOpenMobileFieldApp?: () => void;
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
  onOpenMobileFieldApp,
}) => {
  const t = translations[lang];

  // Role permissions
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isGnLocked =
    currentUser.role === 'GRAMANIILATHARI' &&
    Boolean(currentUser.division && currentUser.division.trim().toUpperCase() !== 'ALL');
  const lockedDiv = isGnLocked ? (currentUser.division || '').trim().toUpperCase() : '';
  const canEdit = isSuperAdmin || currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2' || currentUser.role === 'GRAMANIILATHARI';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>(lockedDiv || 'ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [residencyFilter, setResidencyFilter] = useState<'ACTIVE' | 'TRANSFERRED' | 'ALL'>('ACTIVE');
  const [advancedFilters, setAdvancedFilters] = useState<FamilyAdvancedFilters>(DEFAULT_FAMILY_ADVANCED_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);
  const [showChartPanel, setShowChartPanel] = useState<boolean>(false);
  const [jobKeywordInput, setJobKeywordInput] = useState<string>('');

  // Pinning State (persisted per user in localStorage)
  const pinStorageKey = `vaharai_pinned_families_${currentUser.id}`;
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(pinStorageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set<string>(parsed) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const persistPinnedIds = (next: Set<string>) => {
    setPinnedIds(next);
    try {
      localStorage.setItem(pinStorageKey, JSON.stringify(Array.from(next)));
    } catch {
      // ignore storage quota
    }
  };

  const togglePinHousehold = (id: string) => {
    const next = new Set(pinnedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistPinnedIds(next);
  };

  // Printable Name + QR Report Modal State
  const [printReportModalOpen, setPrintReportModalOpen] = useState(false);
  const [printInitialScope, setPrintInitialScope] = useState<'FILTERED' | 'PINNED'>('FILTERED');

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

  const effectiveDivisionFilter = isGnLocked ? lockedDiv : selectedDivision;

  // Division-scoped households
  const divisionHouseholds = useMemo(() => {
    if (effectiveDivisionFilter === 'ALL') return households;
    const target = normDivCode(effectiveDivisionFilter);
    return households.filter((h) => normDivCode(h.divisionCode) === target);
  }, [households, effectiveDivisionFilter]);

  // Precompute Members at a Glance + Household Metrics once per division dataset
  const divisionItemsWithMetrics = useMemo<HouseholdWithMetrics[]>(() => {
    return divisionHouseholds.map((household) => ({
      household,
      metrics: computeHouseholdMetrics(household, beneficiaries),
    }));
  }, [divisionHouseholds, beneficiaries]);

  // Unique observed Jobs within user scope for Job dropdown
  const observedJobs = useMemo(() => {
    const counts = new Map<string, number>();
    divisionItemsWithMetrics.forEach(({ metrics }) => {
      metrics.jobs.forEach((j) => {
        const clean = j.trim();
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([job]) => job)
      .slice(0, 40);
  }, [divisionItemsWithMetrics]);

  // Filtered dataset (Residency + Priority + Search + All 20 Members-at-a-Glance/Household Filters)
  const filteredItemsWithMetrics = useMemo<HouseholdWithMetrics[]>(() => {
    const q = searchQuery.toLowerCase().trim();
    return divisionItemsWithMetrics.filter(({ household: h, metrics }) => {
      if (residencyFilter === 'ACTIVE' && !isHouseholdActive(h)) return false;
      if (residencyFilter === 'TRANSFERRED' && isHouseholdActive(h)) return false;
      if (selectedPriority !== 'ALL' && String(h.priorityRank) !== selectedPriority) return false;

      if (q) {
        const matchCode = h.familyCode?.toLowerCase().includes(q);
        const matchRef = h.householdReference?.toLowerCase().includes(q);
        const matchApp = h.applicationReference?.toLowerCase().includes(q);
        const matchNameTa = h.applicantNameTa?.toLowerCase().includes(q);
        const matchNameEn = h.applicantNameEn?.toLowerCase().includes(q);
        const matchNic = h.applicantNic?.toLowerCase().includes(q);
        const matchPhone = h.phone?.includes(q);
        const matchMember = metrics.activeMembers.some(
          (m) =>
            m.nameTa?.toLowerCase().includes(q) ||
            m.nameEn?.toLowerCase().includes(q) ||
            m.nic?.toLowerCase().includes(q)
        );
        if (!matchCode && !matchRef && !matchApp && !matchNameTa && !matchNameEn && !matchNic && !matchPhone && !matchMember) {
          return false;
        }
      }

      return matchesHouseholdAdvancedFilters(h, metrics, advancedFilters, pinnedIds);
    });
  }, [divisionItemsWithMetrics, residencyFilter, selectedPriority, searchQuery, advancedFilters, pinnedIds]);

  const filteredHouseholds = useMemo(
    () => filteredItemsWithMetrics.map((item) => item.household),
    [filteredItemsWithMetrics]
  );

  // Paginated dataset (Requirement 03)
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredItemsWithMetrics.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    if (pageSize === 'ALL') return filteredItemsWithMetrics;
    const start = (effectivePage - 1) * pageSize;
    return filteredItemsWithMetrics.slice(start, start + pageSize);
  }, [filteredItemsWithMetrics, effectivePage, pageSize]);

  // Overall Statistics (Deducts transferred families automatically)
  const stats = useMemo(() => {
    const activeList = divisionHouseholds.filter(isHouseholdActive);
    const deductedCount = divisionHouseholds.length - activeList.length;
    const total = activeList.length;
    const p1Count = activeList.filter((h) => h.priorityRank === 1).length;
    const p2Count = activeList.filter((h) => h.priorityRank === 2).length;
    const p3Count = activeList.filter((h) => h.priorityRank === 3).length;
    const p4Count = activeList.filter((h) => h.priorityRank === 4).length;
    return { total, deductedCount, p1Count, p2Count, p3Count, p4Count };
  }, [divisionHouseholds]);

  // Aggregate summary across currently filtered families
  const filteredTotals = useMemo(() => {
    return filteredItemsWithMetrics.reduce(
      (acc, { household, metrics }) => {
        acc.families += 1;
        acc.totalMembers += metrics.totalMembers;
        acc.belowOL += metrics.belowOLCount;
        acc.notInSchool += metrics.notInSchool5To16Count;
        acc.chronic += metrics.chronicDiseaseCount;
        acc.disability += metrics.disabilityCount;
        acc.ckdu += metrics.ckduCount;
        acc.dependents += metrics.dependentsCount;
        acc.over70 += metrics.over70Count;
        acc.male += metrics.maleCount;
        acc.female += metrics.femaleCount;
        acc.noNic += metrics.noNicCount;
        acc.under16NoNic += metrics.under16NoNicCount;
        if (metrics.aswesumaCategory !== 'NONE') acc.aswesuma += 1;
        if (metrics.receivingSamurdhi) acc.samurdhi += 1;
        if (metrics.hasPaddyLand) acc.paddyLand += 1;
        if (metrics.hasLivestock) acc.livestock += 1;
        if (pinnedIds.has(household.id)) acc.pinnedInFiltered += 1;
        return acc;
      },
      {
        families: 0,
        totalMembers: 0,
        belowOL: 0,
        notInSchool: 0,
        chronic: 0,
        disability: 0,
        ckdu: 0,
        dependents: 0,
        over70: 0,
        male: 0,
        female: 0,
        noNic: 0,
        under16NoNic: 0,
        aswesuma: 0,
        samurdhi: 0,
        paddyLand: 0,
        livestock: 0,
        pinnedInFiltered: 0,
      }
    );
  }, [filteredItemsWithMetrics, pinnedIds]);

  const activeAdvancedFilterCount = useMemo(
    () => countActiveAdvancedFilters(advancedFilters),
    [advancedFilters]
  );

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const isTa = lang !== 'en';
    if (advancedFilters.totalMembersBand !== 'ALL') labels.push(`${isTa ? 'உறுப்பினர்' : 'Members'}: ${advancedFilters.totalMembersBand}`);
    if (advancedFilters.belowOL !== 'ALL') labels.push(`${isTa ? 'O/L கீழ்' : 'Below O/L'}: ${advancedFilters.belowOL}`);
    if (advancedFilters.notInSchool5To16 !== 'ALL') labels.push(`${isTa ? 'பள்ளி செல்லாதோர் (5-16)' : 'Not in School (5-16)'}: ${advancedFilters.notInSchool5To16}`);
    if (advancedFilters.chronicDisease !== 'ALL') labels.push(`${isTa ? 'நாள்பட்ட நோய்' : 'Chronic'}: ${advancedFilters.chronicDisease}`);
    if (advancedFilters.disability !== 'ALL') labels.push(`${isTa ? 'மாற்றுத்திறனாளி' : 'Disability'}: ${advancedFilters.disability}`);
    if (advancedFilters.ckdu !== 'ALL') labels.push(`CKDU: ${advancedFilters.ckdu}`);
    if (advancedFilters.dependents !== 'ALL') labels.push(`${isTa ? 'தங்கி வாழ்வோர்' : 'Dependents'}: ${advancedFilters.dependents}`);
    if (advancedFilters.over70 !== 'ALL') labels.push(`${isTa ? '70+ வயது' : 'Over 70'}: ${advancedFilters.over70}`);
    if (advancedFilters.male !== 'ALL') labels.push(`${isTa ? 'ஆண்' : 'Male'}: ${advancedFilters.male}`);
    if (advancedFilters.female !== 'ALL') labels.push(`${isTa ? 'பெண்' : 'Female'}: ${advancedFilters.female}`);
    if (advancedFilters.noNic !== 'ALL') labels.push(`${isTa ? 'NIC இல்லை' : 'No NIC'}: ${advancedFilters.noNic}`);
    if (advancedFilters.under16NoNic !== 'ALL') labels.push(`${isTa ? '<16 NIC இல்லை' : '<16 No NIC'}: ${advancedFilters.under16NoNic}`);
    if (advancedFilters.jobFilter !== 'ALL') labels.push(`${isTa ? 'தொழில்' : 'Job'}: ${advancedFilters.jobFilter}`);
    if (advancedFilters.houseType !== 'ALL') labels.push(`${isTa ? 'வீட்டு வகை' : 'House'}: ${HOUSE_TYPE_LABELS[advancedFilters.houseType]?.[isTa ? 'ta' : 'en'] || advancedFilters.houseType}`);
    if (advancedFilters.housingPermanency !== 'ALL') labels.push(`${isTa ? 'வீட்டு நிலை' : 'Permanency'}: ${HOUSING_PERMANENCY_LABELS[advancedFilters.housingPermanency]?.[isTa ? 'ta' : 'en'] || advancedFilters.housingPermanency}`);
    if (advancedFilters.waterSource !== 'ALL') labels.push(`${isTa ? 'குடிநீர்' : 'Water'}: ${WATER_SOURCE_LABELS[advancedFilters.waterSource]?.[isTa ? 'ta' : 'en'] || advancedFilters.waterSource}`);
    if (advancedFilters.lightingSource !== 'ALL') labels.push(`${isTa ? 'வெளிச்சம்' : 'Light'}: ${LIGHTING_SOURCE_LABELS[advancedFilters.lightingSource]?.[isTa ? 'ta' : 'en'] || advancedFilters.lightingSource}`);
    if (advancedFilters.aswesuma !== 'ALL') labels.push(`${isTa ? 'அஸ்வெசும' : 'Aswesuma'}: ${advancedFilters.aswesuma}`);
    if (advancedFilters.samurdhi !== 'ALL') labels.push(`${isTa ? 'சமூர்த்தி' : 'Samurdhi'}: ${advancedFilters.samurdhi}`);
    if (advancedFilters.paddyLand !== 'ALL') labels.push(`${isTa ? 'வயல்காணி' : 'Paddy Land'}: ${advancedFilters.paddyLand}`);
    if (advancedFilters.livestock !== 'ALL') labels.push(`${isTa ? 'கால்நடை' : 'Livestock'}: ${advancedFilters.livestock}`);
    if (advancedFilters.pinnedOnly) labels.push(isTa ? 'பின் செய்யப்பட்டவை மட்டும்' : 'Pinned Only');
    return labels;
  }, [advancedFilters, lang]);

  const updateAdvFilter = <K extends keyof FamilyAdvancedFilters>(key: K, value: FamilyAdvancedFilters[K]) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    if (!isGnLocked) setSelectedDivision('ALL');
    setSelectedPriority('ALL');
    setResidencyFilter('ACTIVE');
    setAdvancedFilters(DEFAULT_FAMILY_ADVANCED_FILTERS);
    setJobKeywordInput('');
    setCurrentPage(1);
  };

  const handlePinAllFiltered = () => {
    const next = new Set(pinnedIds);
    filteredItemsWithMetrics.forEach(({ household }) => next.add(household.id));
    persistPinnedIds(next);
  };

  const handleClearPinned = () => {
    persistPinnedIds(new Set<string>());
    if (advancedFilters.pinnedOnly) {
      updateAdvFilter('pinnedOnly', false);
    }
  };

  const handleExportFilteredCsv = (scopeItems: HouseholdWithMetrics[]) => {
    const headers = [
      'FamilyCode',
      'QRPayload',
      'GNDivision',
      'HeadNameTa',
      'HeadNameEn',
      'HeadNIC',
      'Phone',
      'Address',
      'TotalMembers',
      'Male',
      'Female',
      'BelowOL',
      'NotInSchool_5_16',
      'ChronicDisease',
      'Disability',
      'CKDU',
      'Dependents',
      'Over70',
      'NoNIC',
      'Under16_NoNIC',
      'Jobs',
      'HouseType',
      'HousePermanency',
      'WaterSource',
      'LightingSource',
      'Aswesuma',
      'Samurdhi',
      'PaddyLand',
      'Livestock',
      'Score100',
      'PriorityRank',
      'Pinned',
    ];
    const rows = scopeItems.map(({ household: h, metrics: m }) => [
      escapeCsv(h.familyCode),
      escapeCsv(h.familyQrPayload || h.familyCode),
      escapeCsv(h.divisionCode),
      escapeCsv(h.applicantNameTa),
      escapeCsv(h.applicantNameEn),
      escapeCsv(h.applicantNic),
      escapeCsv(h.phone),
      escapeCsv(h.address),
      m.totalMembers,
      m.maleCount,
      m.femaleCount,
      m.belowOLCount,
      m.notInSchool5To16Count,
      m.chronicDiseaseCount,
      m.disabilityCount,
      m.ckduCount,
      m.dependentsCount,
      m.over70Count,
      m.noNicCount,
      m.under16NoNicCount,
      escapeCsv(m.jobs.join(' | ')),
      escapeCsv(HOUSE_TYPE_LABELS[h.commonAssets.unitType]?.ta || h.commonAssets.unitType),
      escapeCsv(h.commonAssets.housingPermanency || 'SEMI_PERMANENT'),
      escapeCsv(WATER_SOURCE_LABELS[h.commonAssets.waterSource]?.ta || h.commonAssets.waterSource),
      escapeCsv(LIGHTING_SOURCE_LABELS[h.commonAssets.lightingSource]?.ta || h.commonAssets.lightingSource),
      escapeCsv(ASWESUMA_LABELS[m.aswesumaCategory]?.ta || m.aswesumaCategory),
      m.receivingSamurdhi ? 'YES' : 'NO',
      m.hasPaddyLand ? escapeCsv(PADDY_EXTENT_LABELS[m.paddyLandExtent]?.ta || 'YES') : 'NO',
      m.hasLivestock ? escapeCsv(`${m.livestockType} (${m.livestockCount})`) : 'NO',
      h.score100,
      h.priorityRank,
      pinnedIds.has(h.id) ? 'YES' : 'NO',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsvFile(csv, `vaharai_families_filtered_${new Date().toISOString().slice(0, 10)}.csv`);
    onAuditLog('EXPORT_FILTERED_FAMILIES', `Exported ${scopeItems.length} filtered families with Members at a Glance & QR details.`);
  };

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

  // Delete a single household (Super Admin only)
  const handleDeleteHousehold = (h: HouseholdData) => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'குடும்பத்தை அழிக்க சுப்பர் அட்மின் (Super Admin) அனுமதி மட்டுமே தேவை.' : 'Only Super Admin has permission to delete family records.');
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

          {onOpenMobileFieldApp && (
            <button
              type="button"
              onClick={onOpenMobileFieldApp}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-xs"
              title={lang === 'ta' ? 'ஆஃப்லைன் மொபைல் குடும்பப் பதிவு ஆப் பயன்முறைக்கு மாறு' : 'Open Offline Mobile Field App'}
            >
              <Smartphone className="w-4 h-4" />
              <span>{lang === 'ta' ? 'மொபைல் ஆப் (Offline)' : 'Mobile Field App'}</span>
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
            {lang === 'ta' ? 'செயலில் உள்ள குடும்பங்கள்' : 'Active Families'}
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
          {stats.deductedCount > 0 && (
            <div className="text-[10px] text-purple-800 font-bold mt-0.5">
              {lang === 'ta' ? `மாற்றப்பட்டு கழிக்கப்பட்டவை: ${stats.deductedCount}` : `Deducted / Transferred: ${stats.deductedCount}`}
            </div>
          )}
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
              value={effectiveDivisionFilter}
              disabled={isGnLocked}
              onChange={(e) => {
                if (!isGnLocked) {
                  setSelectedDivision(e.target.value);
                  setCurrentPage(1);
                }
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {!isGnLocked && <option value="ALL">🗺️ {t.allDivisions}</option>}
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

        {/* Second Row: Residency Filter Tabs, Chart/Filter/Pin/Print Controls & Page Size */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ACTIVE', ta: `நிரந்தர வதிவு (${stats.total})`, en: `Active / Permanent (${stats.total})` },
              { id: 'TRANSFERRED', ta: `மாற்றப்பட்டவை (${stats.deductedCount})`, en: `Transferred (${stats.deductedCount})` },
              { id: 'ALL', ta: `அனைத்தும் (${divisionHouseholds.length})`, en: `All (${divisionHouseholds.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setResidencyFilter(tab.id as 'ACTIVE' | 'TRANSFERRED' | 'ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-colors ${
                  residencyFilter === tab.id
                    ? 'bg-emerald-800 text-white border-emerald-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {lang === 'ta' ? tab.ta : tab.en}
              </button>
            ))}

            <button
              type="button"
              onClick={() => updateAdvFilter('pinnedOnly', !advancedFilters.pinnedOnly)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border flex items-center gap-1 transition-colors ${
                advancedFilters.pinnedOnly
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>
                {lang === 'ta' ? `பின் செய்யப்பட்டவை (${pinnedIds.size})` : `Pinned (${pinnedIds.size})`}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border flex items-center gap-1 transition-colors ${
                showAdvancedFilters || activeAdvancedFilterCount > 0
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {lang === 'ta' ? 'உறுப்பினர் & வீட்டு வடிகட்டி' : '20-Criteria Filter'}
                {activeAdvancedFilterCount > 0 ? ` (${activeAdvancedFilterCount})` : ''}
              </span>
              {showAdvancedFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowChartPanel((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border flex items-center gap-1 transition-colors ${
                showChartPanel
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'வரைபு (Chart)' : 'Visual Chart'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPrintInitialScope('FILTERED');
                setPrintReportModalOpen(true);
              }}
              disabled={filteredItemsWithMetrics.length === 0}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white flex items-center gap-1 transition-colors"
              title={lang === 'ta' ? 'பெயர் & QR குறியீட்டுடன் அச்சிடு' : 'Print filtered families with Name & QR'}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === 'ta' ? 'பெயர் & QR அச்சு' : 'Print Name & QR'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportFilteredCsv(filteredItemsWithMetrics)}
              disabled={filteredItemsWithMetrics.length === 0}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-800 border border-slate-300 flex items-center gap-1"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-700" />
              <span>CSV</span>
            </button>

            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
              <span className="text-xs text-slate-500 font-medium">{t.perPage}:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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

        {/* Expandable 20-Criteria Members at a Glance & Household Filter Matrix */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-700" />
                <span>
                  {lang === 'ta'
                    ? 'உறுப்பினர் சுருக்க நிலை (Members at a Glance) & குடும்ப சொத்து வடிகட்டிகள்'
                    : 'Members at a Glance & Household Criteria Filters'}
                </span>
                {isGnLocked && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                    {lang === 'ta' ? `பிரிவு வரம்பு: ${lockedDiv}` : `GN Scope: ${lockedDiv}`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {filteredItemsWithMetrics.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePinAllFiltered}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Pin className="w-3 h-3" />
                    <span>{lang === 'ta' ? `வடிகட்டிய ${filteredItemsWithMetrics.length} ஐ பின் செய்` : `Pin Filtered (${filteredItemsWithMetrics.length})`}</span>
                  </button>
                )}
                {pinnedIds.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintInitialScope('PINNED');
                        setPrintReportModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>{lang === 'ta' ? `பின் செய்தவை QR அச்சு (${pinnedIds.size})` : `Print Pinned QR (${pinnedIds.size})`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearPinned}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <PinOff className="w-3 h-3" />
                      <span>{lang === 'ta' ? 'பின் நீக்கு' : 'Clear Pins'}</span>
                    </button>
                  </>
                )}
                {(activeAdvancedFilterCount > 0 || searchQuery || selectedPriority !== 'ALL' || (!isGnLocked && selectedDivision !== 'ALL')) && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'ta' ? 'அனைத்தையும் மீட்டமை' : 'Reset Filters'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Group A: Members at a Glance (12 Member Metrics + Job) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="text-[11px] font-bold text-slate-700">
                {lang === 'ta' ? 'A. உறுப்பினர் சுருக்க நிலை (Members at a Glance):' : 'A. Members at a Glance:'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
                {/* 1. Total Members */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'மொத்த உறுப்பினர் (Total)' : 'Total Members'}
                  </label>
                  <select
                    value={advancedFilters.totalMembersBand}
                    onChange={(e) => updateAdvFilter('totalMembersBand', e.target.value as FamilyAdvancedFilters['totalMembersBand'])}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    <option value="1-2">1 – 2</option>
                    <option value="3-4">3 – 4</option>
                    <option value="5-6">5 – 6</option>
                    <option value="7+">7+</option>
                  </select>
                </div>

                {/* 2-12 Tri-state member metrics */}
                {(
                  [
                    { key: 'belowOL', ta: 'Below O/L (O/L கீழ்)', en: 'Below O/L Edu' },
                    { key: 'notInSchool5To16', ta: 'பள்ளி செல்லா (5–16)', en: 'Not in School (5–16)' },
                    { key: 'chronicDisease', ta: 'நாள்பட்ட நோய் (Chronic)', en: 'Chronic Disease' },
                    { key: 'disability', ta: 'மாற்றுத்திறனாளி (Disability)', en: 'Disability' },
                    { key: 'ckdu', ta: 'CKDU (சிறுநீரக நோய்)', en: 'CKDU' },
                    { key: 'dependents', ta: 'தங்கி வாழ்வோர் (Dep)', en: 'Dependents' },
                    { key: 'over70', ta: '70+ வயது (Over 70)', en: 'Over 70 Year' },
                    { key: 'male', ta: 'ஆண் (Male)', en: 'Male' },
                    { key: 'female', ta: 'பெண் (Female)', en: 'Female' },
                    { key: 'noNic', ta: 'NIC அற்றோர் (No NIC)', en: 'No NIC' },
                    { key: 'under16NoNic', ta: '<16 NIC அற்றோர்', en: 'Under 16 No NIC' },
                  ] as const
                ).map((item) => {
                  const val = advancedFilters[item.key];
                  return (
                    <div key={item.key}>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5 truncate" title={lang === 'ta' ? item.ta : item.en}>
                        {lang === 'ta' ? item.ta : item.en}
                      </label>
                      <select
                        value={val}
                        onChange={(e) => updateAdvFilter(item.key, e.target.value as TriFilter)}
                        className={`w-full px-2 py-1.5 border rounded-lg font-semibold ${
                          val !== 'ALL' ? 'bg-indigo-50 border-indigo-400 text-indigo-950' : 'bg-white border-slate-300'
                        }`}
                      >
                        <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                        <option value="YES">{lang === 'ta' ? 'உள்ளது (Yes)' : 'Has (Yes)'}</option>
                        <option value="NO">{lang === 'ta' ? 'இல்லை (No)' : 'None (No)'}</option>
                      </select>
                    </div>
                  );
                })}

                {/* 13. Job Filter */}
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'தொழில் (Job / Economic Activity)' : 'Job / Economic Activity'}
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={
                        advancedFilters.jobFilter === 'ALL' ||
                        advancedFilters.jobFilter === 'HAS_JOB' ||
                        advancedFilters.jobFilter === 'NO_JOB' ||
                        observedJobs.includes(advancedFilters.jobFilter)
                          ? advancedFilters.jobFilter
                          : 'CUSTOM'
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'CUSTOM') return;
                        setJobKeywordInput(v === 'ALL' || v === 'HAS_JOB' || v === 'NO_JOB' ? '' : v);
                        updateAdvFilter('jobFilter', v);
                      }}
                      className="w-1/2 px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                      <option value="HAS_JOB">{lang === 'ta' ? 'தொழில் உள்ளோர்' : 'Employed'}</option>
                      <option value="NO_JOB">{lang === 'ta' ? 'தொழில் அற்றோர்' : 'Unemployed / None'}</option>
                      {observedJobs.map((job) => (
                        <option key={job} value={job}>
                          {job}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={jobKeywordInput}
                      onChange={(e) => {
                        const txt = e.target.value;
                        setJobKeywordInput(txt);
                        updateAdvFilter('jobFilter', txt.trim() ? txt : 'ALL');
                      }}
                      placeholder={lang === 'ta' ? 'தொழில் தேடு...' : 'Type job...'}
                      className="w-1/2 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Group B: House Type, Drinking Water, Lighting, Aswesuma, Samurdhi, Paddy Land, Livestock */}
            <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="text-[11px] font-bold text-emerald-950">
                {lang === 'ta'
                  ? 'B. வீடு, குடிநீர், வெளிச்சம், அஸ்வெசும, சமூர்த்தி, வயல்காணி & கால்நடை:'
                  : 'B. Housing, Drinking Water, Lighting, Aswesuma, Samurdhi, Paddy Land & Livestock:'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[11px]">
                {/* House Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'வீட்டின் வகை (House Type)' : 'House Type'}
                  </label>
                  <select
                    value={advancedFilters.houseType}
                    onChange={(e) => updateAdvFilter('houseType', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    {Object.entries(HOUSE_TYPE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lang === 'ta' ? lbl.ta : lbl.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Housing Permanency */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'வீட்டு நிலை (Permanency)' : 'House Permanency'}
                  </label>
                  <select
                    value={advancedFilters.housingPermanency}
                    onChange={(e) => updateAdvFilter('housingPermanency', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    {Object.entries(HOUSING_PERMANENCY_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lang === 'ta' ? lbl.ta : lbl.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Water Source */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'குடிநீர் (Water)' : 'Drinking Water'}
                  </label>
                  <select
                    value={advancedFilters.waterSource}
                    onChange={(e) => updateAdvFilter('waterSource', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    {Object.entries(WATER_SOURCE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lang === 'ta' ? lbl.ta : lbl.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lighting Source */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'வெளிச்சத்தை பெறும் வழி' : 'Lighting Source'}
                  </label>
                  <select
                    value={advancedFilters.lightingSource}
                    onChange={(e) => updateAdvFilter('lightingSource', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    {Object.entries(LIGHTING_SOURCE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lang === 'ta' ? lbl.ta : lbl.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aswesuma */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'அஸ்வெசும (Aswesuma)' : 'Aswesuma'}
                  </label>
                  <select
                    value={advancedFilters.aswesuma}
                    onChange={(e) => updateAdvFilter('aswesuma', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    <option value="ANY">{lang === 'ta' ? 'பெறுவோர் (Any)' : 'Receiving (Any)'}</option>
                    <option value="NONE">{lang === 'ta' ? 'பெறாதோர் (None)' : 'Not Receiving'}</option>
                    <option value="EXTREME_POOR">{lang === 'ta' ? 'மிக ஏழ்மை' : 'Extreme Poor'}</option>
                    <option value="POOR">{lang === 'ta' ? 'ஏழ்மை' : 'Poor'}</option>
                    <option value="VULNERABLE">{lang === 'ta' ? 'இடர்படக்கூடியோர்' : 'Vulnerable'}</option>
                    <option value="TRANSIENT">{lang === 'ta' ? 'இடைக்கால உதவி' : 'Transient'}</option>
                  </select>
                </div>

                {/* Samurdhi */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'சமூர்த்தி (Samurdhi)' : 'Samurdhi'}
                  </label>
                  <select
                    value={advancedFilters.samurdhi}
                    onChange={(e) => updateAdvFilter('samurdhi', e.target.value as TriFilter)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    <option value="YES">{lang === 'ta' ? 'ஆம் (பெறுவோர்)' : 'Yes (Receiving)'}</option>
                    <option value="NO">{lang === 'ta' ? 'இல்லை (பெறாதோர்)' : 'No'}</option>
                  </select>
                </div>

                {/* Paddy Land */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'வயல்காணி (Paddy Land)' : 'Paddy Land'}
                  </label>
                  <select
                    value={advancedFilters.paddyLand}
                    onChange={(e) => updateAdvFilter('paddyLand', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    <option value="YES">{lang === 'ta' ? 'உள்ளது (Yes)' : 'Has Paddy Land'}</option>
                    <option value="NO">{lang === 'ta' ? 'இல்லை (No)' : 'No Paddy Land'}</option>
                    <option value="LESS_THAN_ONE_ACRE">{lang === 'ta' ? '< 1 ஏக்கர்' : '< 1 Acre'}</option>
                    <option value="ONE_TO_TWO_ACRES">{lang === 'ta' ? '1–2 ஏக்கர்' : '1–2 Acres'}</option>
                    <option value="MORE_THAN_TWO_ACRES">{lang === 'ta' ? '> 2 ஏக்கர்' : '> 2 Acres'}</option>
                  </select>
                </div>

                {/* Livestock */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    {lang === 'ta' ? 'கால்நடை (Livestock)' : 'Livestock'}
                  </label>
                  <select
                    value={advancedFilters.livestock}
                    onChange={(e) => updateAdvFilter('livestock', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                    <option value="ANY">{lang === 'ta' ? 'உள்ளது (Any)' : 'Has Livestock'}</option>
                    <option value="NONE">{lang === 'ta' ? 'இல்லை (None)' : 'None'}</option>
                    {Object.entries(LIVESTOCK_LABELS)
                      .filter(([k]) => k !== 'NONE')
                      .map(([k, lbl]) => (
                        <option key={k} value={k}>
                          {lang === 'ta' ? lbl.ta : lbl.en}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Live Filtered Summary Strip */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-1">
              <span className="px-2 py-1 rounded bg-slate-900 text-white font-bold font-mono">
                {lang === 'ta' ? 'குடும்பங்கள்' : 'Families'}: {filteredTotals.families}
              </span>
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-950 font-bold font-mono">
                {lang === 'ta' ? 'உறுப்பினர்' : 'Members'}: {filteredTotals.totalMembers}
              </span>
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-950 font-bold font-mono">
                {lang === 'ta' ? 'ஆண்' : 'M'}: {filteredTotals.male} | {lang === 'ta' ? 'பெண்' : 'F'}: {filteredTotals.female}
              </span>
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-950 font-bold font-mono">
                &lt;O/L: {filteredTotals.belowOL}
              </span>
              <span className="px-2 py-1 rounded bg-rose-100 text-rose-950 font-bold font-mono">
                {lang === 'ta' ? 'பள்ளி செல்லா(5-16)' : 'NoSch(5-16)'}: {filteredTotals.notInSchool}
              </span>
              <span className="px-2 py-1 rounded bg-orange-100 text-orange-950 font-bold font-mono">
                {lang === 'ta' ? 'நோய்' : 'Chronic'}: {filteredTotals.chronic}
              </span>
              <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-950 font-bold font-mono">
                {lang === 'ta' ? 'மாற்றுத்திறன்' : 'Disability'}: {filteredTotals.disability}
              </span>
              <span className="px-2 py-1 rounded bg-purple-100 text-purple-950 font-bold font-mono">
                CKDU: {filteredTotals.ckdu}
              </span>
              <span className="px-2 py-1 rounded bg-sky-100 text-sky-950 font-bold font-mono">
                {lang === 'ta' ? 'தங்கி வாழ்வோர்' : 'Dep'}: {filteredTotals.dependents}
              </span>
              <span className="px-2 py-1 rounded bg-teal-100 text-teal-950 font-bold font-mono">
                70+: {filteredTotals.over70}
              </span>
              <span className="px-2 py-1 rounded bg-slate-200 text-slate-900 font-bold font-mono">
                NoNIC: {filteredTotals.noNic} (&lt;16: {filteredTotals.under16NoNic})
              </span>
              <span className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold font-mono">
                {lang === 'ta' ? 'அஸ்வெசும' : 'Aswesuma'}: {filteredTotals.aswesuma} | {lang === 'ta' ? 'சமூர்த்தி' : 'Samurdhi'}: {filteredTotals.samurdhi}
              </span>
              <span className="px-2 py-1 rounded bg-lime-100 text-lime-950 font-bold font-mono">
                {lang === 'ta' ? 'வயல்காணி' : 'Paddy'}: {filteredTotals.paddyLand} | {lang === 'ta' ? 'கால்நடை' : 'Livestock'}: {filteredTotals.livestock}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Chart Panel */}
      {showChartPanel && (
        <FamilyAnalyticsChartPanel
          items={filteredItemsWithMetrics}
          divisions={divisions}
          filters={advancedFilters}
          isGnLocked={isGnLocked}
          lang={lang}
          onQuickToggleFilter={(key, value) => {
            updateAdvFilter(key, value as any);
          }}
        />
      )}

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
          {paginatedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {t.noData}
            </div>
          ) : (
            paginatedItems.map(({ household: h, metrics: m }) => {
              const isPinned = pinnedIds.has(h.id);
              return (
                <div
                  key={h.id}
                  className={`p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPinned
                      ? 'bg-amber-50/40 border-l-4 border-l-amber-500'
                      : !isHouseholdActive(h)
                      ? 'bg-purple-50/30'
                      : ''
                  }`}
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
                      {h.residencyStatus === 'TRANSFERRED_GN' && (
                        <span className="text-[10px] bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                          GN பிரிவு மாற்றம் ({h.transferDestination || '—'}{h.transferDate ? ` · ${h.transferDate}` : ''})
                        </span>
                      )}
                      {h.residencyStatus === 'TRANSFERRED_EXTERNAL_DS' && (
                        <span className="text-[10px] bg-purple-100 text-purple-950 border border-purple-300 px-2 py-0.5 rounded-full font-bold">
                          வெளி DS மாற்றம் ({h.transferDestination || '—'}{h.transferDate ? ` · ${h.transferDate}` : ''})
                        </span>
                      )}
                      {h.commonAssets.isSingleParent && (
                        <span className="text-[10px] bg-pink-100 text-pink-900 border border-pink-200 px-2 py-0.5 rounded-full font-bold">
                          👩‍👧 ஒற்றைப் பெற்றோர் (Single Parent)
                        </span>
                      )}
                      {isPinned && (
                        <span className="text-[10px] bg-amber-200 text-amber-950 border border-amber-400 px-2 py-0.5 rounded-full font-extrabold">
                          📌 {lang === 'ta' ? 'பின் செய்யப்பட்டது' : 'Pinned'}
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
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                        <Users className="w-3 h-3 text-emerald-700" />
                        <span>உறுப்பினர்கள்: <b>{m.totalMembers}</b> (M:{m.maleCount}/F:{m.femaleCount})</span>
                      </span>
                      {m.deductedMembersCount > 0 && (
                        <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                          கழிக்கப்பட்டோர்: {m.deductedMembersCount}
                        </span>
                      )}
                      {m.belowOLCount > 0 && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                          &lt;O/L: {m.belowOLCount}
                        </span>
                      )}
                      {m.notInSchool5To16Count > 0 && (
                        <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded font-bold">
                          பள்ளி செல்லாதோர் (5–16): {m.notInSchool5To16Count}
                        </span>
                      )}
                      {m.chronicDiseaseCount > 0 && (
                        <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-bold">
                          நாள்பட்ட நோய்: {m.chronicDiseaseCount}
                        </span>
                      )}
                      {m.disabilityCount > 0 && (
                        <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                          மாற்றுத்திறனாளி: {m.disabilityCount}
                        </span>
                      )}
                      {m.ckduCount > 0 && (
                        <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-bold">
                          CKDU: {m.ckduCount}
                        </span>
                      )}
                      {m.over70Count > 0 && (
                        <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-bold">
                          70+: {m.over70Count}
                        </span>
                      )}
                      {m.noNicCount > 0 && (
                        <span className="bg-slate-200 text-slate-900 px-2 py-0.5 rounded font-bold">
                          No NIC: {m.noNicCount}{m.under16NoNicCount > 0 ? ` (<16: ${m.under16NoNicCount})` : ''}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Home className="w-3 h-3 text-slate-500" />
                        <span>{HOUSE_TYPE_LABELS[h.commonAssets.unitType]?.[lang === 'ta' ? 'ta' : 'en'] || h.commonAssets.unitType}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        <span>{WATER_SOURCE_LABELS[h.commonAssets.waterSource]?.[lang === 'ta' ? 'ta' : 'en'] || h.commonAssets.waterSource}</span>
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        💡 {LIGHTING_SOURCE_LABELS[h.commonAssets.lightingSource]?.[lang === 'ta' ? 'ta' : 'en'] || h.commonAssets.lightingSource}
                      </span>
                      {m.aswesumaCategory !== 'NONE' && (
                        <span className="bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded font-bold">
                          அஸ்வெசும: {ASWESUMA_LABELS[m.aswesumaCategory]?.[lang === 'ta' ? 'ta' : 'en']}
                        </span>
                      )}
                      {m.receivingSamurdhi && (
                        <span className="bg-teal-100 text-teal-950 border border-teal-300 px-2 py-0.5 rounded font-bold font-mono">
                          சமூர்த்தி{h.commonAssets.welfareAssistance?.samurdhiAccountNo ? `: ${h.commonAssets.welfareAssistance.samurdhiAccountNo}` : ''}
                        </span>
                      )}
                      {m.hasPaddyLand && (
                        <span className="bg-lime-100 text-lime-950 border border-lime-300 px-2 py-0.5 rounded font-bold">
                          வயல்காணி: {PADDY_EXTENT_LABELS[m.paddyLandExtent]?.[lang === 'ta' ? 'ta' : 'en'] || 'உண்டு'}
                        </span>
                      )}
                      {m.hasLivestock && (
                        <span className="bg-yellow-100 text-yellow-950 border border-yellow-300 px-2 py-0.5 rounded font-bold">
                          கால்நடை: {LIVESTOCK_LABELS[m.livestockType]?.[lang === 'ta' ? 'ta' : 'en'] || m.livestockType} ({m.livestockCount})
                        </span>
                      )}
                      {m.jobs.length > 0 && (
                        <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded font-semibold">
                          தொழில்: {m.jobs.slice(0, 2).join(', ')}{m.jobs.length > 2 ? ` +${m.jobs.length - 2}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: 100-Point Score & Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
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
                      onClick={() => togglePinHousehold(h.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border flex items-center gap-1 transition-colors ${
                        isPinned
                          ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                          : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                      }`}
                      title={lang === 'ta' ? 'பின் செய் / பின் நீக்கு (Pin Family)' : 'Pin / Unpin family'}
                    >
                      {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      <span>{isPinned ? (lang === 'ta' ? 'பின் நீக்கு' : 'Unpin') : (lang === 'ta' ? 'பின்' : 'Pin')}</span>
                    </button>

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

                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteHousehold(h)}
                        className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                        title={lang === 'ta' ? 'இக்குடும்ப விபரத்தை நிரந்தரமாக அழி (Super Admin)' : 'Delete household permanently (Super Admin)'}
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
        assistanceRecords={assistanceRecords}
        divisions={divisions}
        lang={lang}
        povertyWeights={povertyWeights}
        canEdit={canEdit}
        isSuperAdmin={isSuperAdmin}
        lockedDivisionCode={isGnLocked ? lockedDiv : undefined}
        currentUserName={currentUser.name}
        onClose={() => {
          setDossierWindowOpen(false);
          setDossierEditingHousehold(null);
        }}
        onSaveFamily={handleSaveOfficialFamily}
      />

      {/* Printable Filtered & Pinned Families Report (with Name, QR & Chart) */}
      <PrintableFamilyFilterReportModal
        isOpen={printReportModalOpen}
        items={filteredItemsWithMetrics}
        pinnedIds={pinnedIds}
        divisions={divisions}
        currentUser={currentUser}
        activeDivisionFilter={effectiveDivisionFilter}
        activeFilterLabels={activeFilterLabels}
        lang={lang}
        initialScope={printInitialScope}
        onClose={() => setPrintReportModalOpen(false)}
        onExportCsv={handleExportFilteredCsv}
      />
    </div>
  );
};
