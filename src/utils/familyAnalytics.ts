import {
  Beneficiary,
  HouseholdData,
  computeAgeFromDobSafe,
  computeMembersAtAGlance,
  isBeneficiaryActive,
} from '../types';

export type TriFilter = 'ALL' | 'YES' | 'NO';

export interface FamilyAdvancedFilters {
  totalMembersBand: 'ALL' | '1-2' | '3-4' | '5-6' | '7+';
  belowOL: TriFilter;
  notInSchool5To16: TriFilter;
  chronicDisease: TriFilter;
  disability: TriFilter;
  ckdu: TriFilter;
  dependents: TriFilter;
  over70: TriFilter;
  male: TriFilter;
  female: TriFilter;
  noNic: TriFilter;
  under16NoNic: TriFilter;
  jobFilter: string; // 'ALL' | 'HAS_JOB' | 'NO_JOB' | keyword
  houseType: string; // 'ALL' | unitType
  housingPermanency: string; // 'ALL' | 'PERMANENT' | 'SEMI_PERMANENT' | 'TEMPORARY'
  waterSource: string; // 'ALL' | waterSource
  lightingSource: string; // 'ALL' | lightingSource
  aswesuma: string; // 'ALL' | 'ANY' | 'NONE' | 'EXTREME_POOR' | 'POOR' | 'VULNERABLE' | 'TRANSIENT'
  samurdhi: TriFilter;
  paddyLand: string; // 'ALL' | 'YES' | 'NO' | 'LESS_THAN_ONE_ACRE' | 'ONE_TO_TWO_ACRES' | 'MORE_THAN_TWO_ACRES'
  livestock: string; // 'ALL' | 'ANY' | 'NONE' | 'CATTLE' | 'GOATS' | 'PIGS' | 'POULTRY' | 'DUCKS' | 'OTHER'
  pinnedOnly: boolean;
}

export const DEFAULT_FAMILY_ADVANCED_FILTERS: FamilyAdvancedFilters = {
  totalMembersBand: 'ALL',
  belowOL: 'ALL',
  notInSchool5To16: 'ALL',
  chronicDisease: 'ALL',
  disability: 'ALL',
  ckdu: 'ALL',
  dependents: 'ALL',
  over70: 'ALL',
  male: 'ALL',
  female: 'ALL',
  noNic: 'ALL',
  under16NoNic: 'ALL',
  jobFilter: 'ALL',
  houseType: 'ALL',
  housingPermanency: 'ALL',
  waterSource: 'ALL',
  lightingSource: 'ALL',
  aswesuma: 'ALL',
  samurdhi: 'ALL',
  paddyLand: 'ALL',
  livestock: 'ALL',
  pinnedOnly: false,
};

export interface HouseholdComputedMetrics {
  activeMembers: Beneficiary[];
  deductedMembersCount: number;
  totalMembers: number;
  belowOLCount: number;
  notInSchool5To16Count: number;
  chronicDiseaseCount: number;
  disabilityCount: number;
  ckduCount: number;
  dependentsCount: number;
  over70Count: number;
  maleCount: number;
  femaleCount: number;
  noNicCount: number;
  under16NoNicCount: number;
  jobs: string[];
  hasEmployedMember: boolean;
  aswesumaCategory: 'NONE' | 'EXTREME_POOR' | 'POOR' | 'VULNERABLE' | 'TRANSIENT';
  receivingSamurdhi: boolean;
  hasPaddyLand: boolean;
  paddyLandExtent: string;
  hasLivestock: boolean;
  livestockType: string;
  livestockCount: number;
}

const NON_EARNING_JOB_TOKENS = [
  'NONE',
  'NIL',
  'N/A',
  '-',
  'UNEMPLOYED',
  'STUDENT',
  'DEPENDENT',
  'CHILD',
  'INFANT',
  'ELDERLY',
  'HOUSEWIFE',
  'இல்லை',
  'தொழில் இல்லை',
  'வேலை இல்லை',
  'மாணவர்',
  'தங்கி வாழ்பவர்',
  'முதியவர்',
  'குழந்தை',
];

export const isMemberNoNic = (m: Partial<Beneficiary>): boolean => {
  const nic = (m.nic || '').trim().toUpperCase();
  return Boolean(
    m.isProvisionalNic ||
      !nic ||
      nic.startsWith('TNIC-') ||
      nic.startsWith('TEMP-') ||
      nic === 'NO NIC' ||
      nic === 'NONE'
  );
};

export const isMeaningfulJob = (activity?: string): boolean => {
  const clean = (activity || '').trim();
  if (!clean) return false;
  const upper = clean.toUpperCase();
  return !NON_EARNING_JOB_TOKENS.some((tok) => upper === tok || upper === tok.toUpperCase());
};

export const computeHouseholdMetrics = (
  household: HouseholdData,
  allBeneficiaries: Beneficiary[]
): HouseholdComputedMetrics => {
  const famKey = (household.familyCode || household.familyQrPayload || '').trim().toUpperCase();
  const linkedAll = famKey
    ? allBeneficiaries.filter(
        (b) =>
          (b.familyCode && b.familyCode.trim().toUpperCase() === famKey) ||
          (b.familyQrPayload && b.familyQrPayload.trim().toUpperCase() === famKey)
      )
    : [];

  const activeMembers = linkedAll.filter(isBeneficiaryActive);
  const deductedMembersCount = linkedAll.length - activeMembers.length;
  const glance = computeMembersAtAGlance(activeMembers);

  let maleCount = 0;
  let femaleCount = 0;
  let noNicCount = 0;
  let under16NoNicCount = 0;
  const jobSet = new Set<string>();
  let hasEmployedMember = false;

  for (const m of activeMembers) {
    if (m.gender === 'MALE') maleCount++;
    else if (m.gender === 'FEMALE') femaleCount++;

    const noNic = isMemberNoNic(m);
    if (noNic) noNicCount++;

    const hasValidDob = Boolean(m.dob && !isNaN(new Date(m.dob).getTime()));
    const age = hasValidDob ? computeAgeFromDobSafe(m.dob) : -1;
    if (noNic && age >= 0 && age < 16) {
      under16NoNicCount++;
    }

    const jobText = (m.economicActivity || '').trim();
    if (jobText) {
      jobSet.add(jobText);
      if (isMeaningfulJob(jobText)) {
        hasEmployedMember = true;
      }
    }
  }

  const totalMembers = linkedAll.length > 0 ? activeMembers.length : household.totalMembersCount || 0;

  let aswesumaCategory: HouseholdComputedMetrics['aswesumaCategory'] =
    household.commonAssets?.welfareAssistance?.aswesumaCategory || 'NONE';
  if (!household.commonAssets?.welfareAssistance && activeMembers.length > 0) {
    const schemes = activeMembers.flatMap((m) => m.welfareSchemes || []);
    if (schemes.includes('ASWESUMA_EXTREME')) aswesumaCategory = 'EXTREME_POOR';
    else if (schemes.includes('ASWESUMA_POOR')) aswesumaCategory = 'POOR';
    else if (schemes.includes('ASWESUMA_VULNERABLE')) aswesumaCategory = 'VULNERABLE';
    else if (schemes.includes('ASWESUMA_TRANSITIONAL')) aswesumaCategory = 'TRANSIENT';
  }

  const receivingSamurdhi = Boolean(
    household.commonAssets?.welfareAssistance?.receivingSamurdhi ||
      household.commonAssets?.welfareAssistance?.samurdhiAccountNo?.trim() ||
      activeMembers.some((m) => m.isSamurdhiBeneficiary || m.welfareSchemes?.includes('SAMURDHI'))
  );

  const paddyLandExtent = household.commonAssets?.paddyLandExtent || 'NONE';
  const hasPaddyLand = Boolean(
    household.commonAssets?.hasPaddyLand ||
      (paddyLandExtent && paddyLandExtent !== 'NONE') ||
      household.commonAssets?.paddyLandPlAccountNo?.trim()
  );

  const livestockType = household.commonAssets?.livestockType || 'NONE';
  const livestockCount = household.commonAssets?.livestockCount || 0;
  const hasLivestock = Boolean((livestockType && livestockType !== 'NONE') || livestockCount > 0);

  return {
    activeMembers,
    deductedMembersCount,
    totalMembers,
    belowOLCount: glance.belowOLCount,
    notInSchool5To16Count: glance.childrenNotInSchool5To16Count,
    chronicDiseaseCount: glance.chronicDiseaseCount,
    disabilityCount: glance.disabilityCount,
    ckduCount: glance.ckduCount,
    dependentsCount: glance.dependentsCount,
    over70Count: glance.over70Count,
    maleCount,
    femaleCount,
    noNicCount,
    under16NoNicCount,
    jobs: Array.from(jobSet),
    hasEmployedMember,
    aswesumaCategory,
    receivingSamurdhi,
    hasPaddyLand,
    paddyLandExtent,
    hasLivestock,
    livestockType,
    livestockCount,
  };
};

const matchTri = (filter: TriFilter, count: number): boolean => {
  if (filter === 'ALL') return true;
  if (filter === 'YES') return count > 0;
  return count === 0;
};

export const matchesHouseholdAdvancedFilters = (
  household: HouseholdData,
  metrics: HouseholdComputedMetrics,
  filters: FamilyAdvancedFilters,
  pinnedIds: Set<string>
): boolean => {
  if (filters.pinnedOnly && !pinnedIds.has(household.id)) return false;

  if (filters.totalMembersBand !== 'ALL') {
    const n = metrics.totalMembers;
    if (filters.totalMembersBand === '1-2' && (n < 1 || n > 2)) return false;
    if (filters.totalMembersBand === '3-4' && (n < 3 || n > 4)) return false;
    if (filters.totalMembersBand === '5-6' && (n < 5 || n > 6)) return false;
    if (filters.totalMembersBand === '7+' && n < 7) return false;
  }

  if (!matchTri(filters.belowOL, metrics.belowOLCount)) return false;
  if (!matchTri(filters.notInSchool5To16, metrics.notInSchool5To16Count)) return false;
  if (!matchTri(filters.chronicDisease, metrics.chronicDiseaseCount)) return false;
  if (!matchTri(filters.disability, metrics.disabilityCount)) return false;
  if (!matchTri(filters.ckdu, metrics.ckduCount)) return false;
  if (!matchTri(filters.dependents, metrics.dependentsCount)) return false;
  if (!matchTri(filters.over70, metrics.over70Count)) return false;
  if (!matchTri(filters.male, metrics.maleCount)) return false;
  if (!matchTri(filters.female, metrics.femaleCount)) return false;
  if (!matchTri(filters.noNic, metrics.noNicCount)) return false;
  if (!matchTri(filters.under16NoNic, metrics.under16NoNicCount)) return false;

  if (filters.jobFilter !== 'ALL') {
    if (filters.jobFilter === 'HAS_JOB') {
      if (!metrics.hasEmployedMember) return false;
    } else if (filters.jobFilter === 'NO_JOB') {
      if (metrics.hasEmployedMember) return false;
    } else {
      const q = filters.jobFilter.trim().toLowerCase();
      if (!metrics.jobs.some((j) => j.toLowerCase().includes(q))) return false;
    }
  }

  if (filters.houseType !== 'ALL' && household.commonAssets?.unitType !== filters.houseType) {
    return false;
  }

  if (
    filters.housingPermanency !== 'ALL' &&
    (household.commonAssets?.housingPermanency || 'SEMI_PERMANENT') !== filters.housingPermanency
  ) {
    return false;
  }

  if (filters.waterSource !== 'ALL' && household.commonAssets?.waterSource !== filters.waterSource) {
    return false;
  }

  if (filters.lightingSource !== 'ALL' && household.commonAssets?.lightingSource !== filters.lightingSource) {
    return false;
  }

  if (filters.aswesuma !== 'ALL') {
    if (filters.aswesuma === 'ANY' && metrics.aswesumaCategory === 'NONE') return false;
    else if (filters.aswesuma === 'NONE' && metrics.aswesumaCategory !== 'NONE') return false;
    else if (
      filters.aswesuma !== 'ANY' &&
      filters.aswesuma !== 'NONE' &&
      metrics.aswesumaCategory !== filters.aswesuma
    ) {
      return false;
    }
  }

  if (filters.samurdhi === 'YES' && !metrics.receivingSamurdhi) return false;
  if (filters.samurdhi === 'NO' && metrics.receivingSamurdhi) return false;

  if (filters.paddyLand !== 'ALL') {
    if (filters.paddyLand === 'YES' && !metrics.hasPaddyLand) return false;
    else if (filters.paddyLand === 'NO' && metrics.hasPaddyLand) return false;
    else if (
      filters.paddyLand !== 'YES' &&
      filters.paddyLand !== 'NO' &&
      (!metrics.hasPaddyLand || metrics.paddyLandExtent !== filters.paddyLand)
    ) {
      return false;
    }
  }

  if (filters.livestock !== 'ALL') {
    if (filters.livestock === 'ANY' && !metrics.hasLivestock) return false;
    else if (filters.livestock === 'NONE' && metrics.hasLivestock) return false;
    else if (
      filters.livestock !== 'ANY' &&
      filters.livestock !== 'NONE' &&
      metrics.livestockType !== filters.livestock
    ) {
      return false;
    }
  }

  return true;
};

export const countActiveAdvancedFilters = (filters: FamilyAdvancedFilters): number => {
  let count = 0;
  if (filters.totalMembersBand !== 'ALL') count++;
  if (filters.belowOL !== 'ALL') count++;
  if (filters.notInSchool5To16 !== 'ALL') count++;
  if (filters.chronicDisease !== 'ALL') count++;
  if (filters.disability !== 'ALL') count++;
  if (filters.ckdu !== 'ALL') count++;
  if (filters.dependents !== 'ALL') count++;
  if (filters.over70 !== 'ALL') count++;
  if (filters.male !== 'ALL') count++;
  if (filters.female !== 'ALL') count++;
  if (filters.noNic !== 'ALL') count++;
  if (filters.under16NoNic !== 'ALL') count++;
  if (filters.jobFilter !== 'ALL') count++;
  if (filters.houseType !== 'ALL') count++;
  if (filters.housingPermanency !== 'ALL') count++;
  if (filters.waterSource !== 'ALL') count++;
  if (filters.lightingSource !== 'ALL') count++;
  if (filters.aswesuma !== 'ALL') count++;
  if (filters.samurdhi !== 'ALL') count++;
  if (filters.paddyLand !== 'ALL') count++;
  if (filters.livestock !== 'ALL') count++;
  if (filters.pinnedOnly) count++;
  return count;
};

// Shared Tamil + English Label Dictionaries
export const HOUSE_TYPE_LABELS: Record<string, { ta: string; en: string }> = {
  SINGLE_1_STORY: { ta: 'தனி ஒரு மாடி வீடு', en: 'Single 1-Story House' },
  SINGLE_2_STORY: { ta: 'தனி இரு மாடி வீடு', en: 'Single 2-Story House' },
  ANNEX: { ta: 'இணைப்பு வீடு (Annex)', en: 'Annex' },
  SLUM_SHACK: { ta: 'சேரி / தகரக் குடிசை', en: 'Slum / Shack' },
  LINE_ROOM: { ta: 'லயன் அறை (Line Room)', en: 'Line Room' },
  TEMPORARY_HUT: { ta: 'தற்காலிக குடிசை', en: 'Temporary Hut' },
  OTHER: { ta: 'ஏனையவை', en: 'Other' },
};

export const HOUSING_PERMANENCY_LABELS: Record<string, { ta: string; en: string }> = {
  PERMANENT: { ta: 'நிரந்தர வீடு', en: 'Permanent' },
  SEMI_PERMANENT: { ta: 'அரை நிரந்தர வீடு', en: 'Semi-Permanent' },
  TEMPORARY: { ta: 'தற்காலிக வீடு', en: 'Temporary' },
};

export const WATER_SOURCE_LABELS: Record<string, { ta: string; en: string }> = {
  PROTECTED_WELL: { ta: 'பாதுகாப்பான கிணறு', en: 'Protected Well' },
  UNPROTECTED_WELL: { ta: 'பாதுகாப்பற்ற கிணறு', en: 'Unprotected Well' },
  NWSDB_TAP: { ta: 'குழாய் நீர் (NWSDB)', en: 'Piped Water (NWSDB)' },
  COMMUNITY_TAP: { ta: 'பொதுக் குழாய்', en: 'Community Tap' },
  TUBE_WELL: { ta: 'குழாய் கிணறு', en: 'Tube Well' },
  RIVER_TANK: { ta: 'ஆறு / குளம்', en: 'River / Tank' },
  RAINWATER: { ta: 'மழைநீர்', en: 'Rainwater' },
  BOTTLED_RO: { ta: 'போத்தல் / RO நீர்', en: 'Bottled / RO Water' },
};

export const LIGHTING_SOURCE_LABELS: Record<string, { ta: string; en: string }> = {
  GRID_ELECTRICITY: { ta: 'தேசிய மின்சாரம்', en: 'Grid Electricity' },
  SOLAR: { ta: 'சூரிய சக்தி (Solar)', en: 'Solar Power' },
  KEROSENE: { ta: 'மண்ணெண்ணெய்', en: 'Kerosene' },
  GENERATOR_BATTERY: { ta: 'ஜெனரேட்டர் / மின்கலம்', en: 'Generator / Battery' },
};

export const ASWESUMA_LABELS: Record<string, { ta: string; en: string }> = {
  NONE: { ta: 'பெறவில்லை', en: 'None' },
  EXTREME_POOR: { ta: 'மிக ஏழ்மை', en: 'Extreme Poor' },
  POOR: { ta: 'ஏழ்மை', en: 'Poor' },
  VULNERABLE: { ta: 'இடர்படக்கூடியோர்', en: 'Vulnerable' },
  TRANSIENT: { ta: 'இடைக்கால உதவி', en: 'Transient' },
};

export const PADDY_EXTENT_LABELS: Record<string, { ta: string; en: string }> = {
  NONE: { ta: 'இல்லை', en: 'None' },
  LESS_THAN_ONE_ACRE: { ta: '1 ஏக்கருக்கும் குறைவு', en: '< 1 Acre' },
  ONE_TO_TWO_ACRES: { ta: '1 – 2 ஏக்கர்', en: '1 – 2 Acres' },
  MORE_THAN_TWO_ACRES: { ta: '2 ஏக்கருக்கு மேல்', en: '> 2 Acres' },
};

export const LIVESTOCK_LABELS: Record<string, { ta: string; en: string }> = {
  NONE: { ta: 'இல்லை', en: 'None' },
  CATTLE: { ta: 'மாடு (Cattle)', en: 'Cattle' },
  GOATS: { ta: 'ஆடு (Goats)', en: 'Goats' },
  PIGS: { ta: 'பன்றி (Pigs)', en: 'Pigs' },
  POULTRY: { ta: 'கோழி (Poultry)', en: 'Poultry' },
  DUCKS: { ta: 'வாத்து (Ducks)', en: 'Ducks' },
  OTHER: { ta: 'ஏனையவை', en: 'Other' },
};
