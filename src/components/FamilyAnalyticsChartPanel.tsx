import React, { useMemo } from 'react';
import { GNDivision } from '../types';
import { Language } from '../translations/i18n';
import {
  FamilyAdvancedFilters,
  HOUSE_TYPE_LABELS,
  LIGHTING_SOURCE_LABELS,
  WATER_SOURCE_LABELS,
} from '../utils/familyAnalytics';
import { HouseholdWithMetrics } from './PrintableFamilyFilterReportModal';
import { BarChart3, Home, Droplets, Zap, Layers } from 'lucide-react';

interface FamilyAnalyticsChartPanelProps {
  items: HouseholdWithMetrics[];
  divisions: GNDivision[];
  filters: FamilyAdvancedFilters;
  onQuickToggleFilter: (key: keyof FamilyAdvancedFilters, value: string) => void;
  isGnLocked: boolean;
  lang: Language;
}

export const FamilyAnalyticsChartPanel: React.FC<FamilyAnalyticsChartPanelProps> = ({
  items,
  divisions,
  filters,
  onQuickToggleFilter,
  isGnLocked,
  lang,
}) => {
  const isTa = lang !== 'en';

  const summary = useMemo(() => {
    const agg = {
      families: items.length,
      totalMembers: 0,
      male: 0,
      female: 0,
      belowOL: 0,
      notInSchool: 0,
      chronic: 0,
      disability: 0,
      ckdu: 0,
      dependents: 0,
      over70: 0,
      noNic: 0,
      under16NoNic: 0,
      employedFamilies: 0,
      aswesumaFamilies: 0,
      samurdhiFamilies: 0,
      paddyFamilies: 0,
      livestockFamilies: 0,
    };

    const houseTypeCounts: Record<string, number> = {};
    const waterCounts: Record<string, number> = {};
    const lightingCounts: Record<string, number> = {};
    const divisionCounts: Record<string, { families: number; members: number }> = {};
    const priorityCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    for (const { household: h, metrics: m } of items) {
      agg.totalMembers += m.totalMembers;
      agg.male += m.maleCount;
      agg.female += m.femaleCount;
      agg.belowOL += m.belowOLCount;
      agg.notInSchool += m.notInSchool5To16Count;
      agg.chronic += m.chronicDiseaseCount;
      agg.disability += m.disabilityCount;
      agg.ckdu += m.ckduCount;
      agg.dependents += m.dependentsCount;
      agg.over70 += m.over70Count;
      agg.noNic += m.noNicCount;
      agg.under16NoNic += m.under16NoNicCount;

      if (m.hasEmployedMember) agg.employedFamilies++;
      if (m.aswesumaCategory !== 'NONE') agg.aswesumaFamilies++;
      if (m.receivingSamurdhi) agg.samurdhiFamilies++;
      if (m.hasPaddyLand) agg.paddyFamilies++;
      if (m.hasLivestock) agg.livestockFamilies++;

      const unit = h.commonAssets?.unitType || 'OTHER';
      houseTypeCounts[unit] = (houseTypeCounts[unit] || 0) + 1;

      const water = h.commonAssets?.waterSource || 'PROTECTED_WELL';
      waterCounts[water] = (waterCounts[water] || 0) + 1;

      const light = h.commonAssets?.lightingSource || 'GRID_ELECTRICITY';
      lightingCounts[light] = (lightingCounts[light] || 0) + 1;

      const div = h.divisionCode || 'UNKNOWN';
      if (!divisionCounts[div]) divisionCounts[div] = { families: 0, members: 0 };
      divisionCounts[div].families += 1;
      divisionCounts[div].members += m.totalMembers;

      priorityCounts[h.priorityRank] = (priorityCounts[h.priorityRank] || 0) + 1;
    }

    return { agg, houseTypeCounts, waterCounts, lightingCounts, divisionCounts, priorityCounts };
  }, [items]);

  const memberBars: Array<{
    labelTa: string;
    labelEn: string;
    value: number;
    color: string;
    filterKey?: keyof FamilyAdvancedFilters;
    activeVal?: string;
  }> = [
    { labelTa: 'மொத்த உறுப்பினர்கள் (Total)', labelEn: 'Total Members', value: summary.agg.totalMembers, color: '#0f766e' },
    { labelTa: 'ஆண் (Male)', labelEn: 'Male', value: summary.agg.male, color: '#2563eb', filterKey: 'male', activeVal: 'YES' },
    { labelTa: 'பெண் (Female)', labelEn: 'Female', value: summary.agg.female, color: '#db2777', filterKey: 'female', activeVal: 'YES' },
    { labelTa: 'O/L கீழ் கல்வி (Below O/L)', labelEn: 'Below O/L Edu', value: summary.agg.belowOL, color: '#d97706', filterKey: 'belowOL', activeVal: 'YES' },
    { labelTa: 'பள்ளி செல்லாதோர் (5–16)', labelEn: 'Not in School (5–16)', value: summary.agg.notInSchool, color: '#e11d48', filterKey: 'notInSchool5To16', activeVal: 'YES' },
    { labelTa: 'நாள்பட்ட நோய் (Chronic)', labelEn: 'Chronic Disease', value: summary.agg.chronic, color: '#ea580c', filterKey: 'chronicDisease', activeVal: 'YES' },
    { labelTa: 'மாற்றுத்திறனாளி (Disability)', labelEn: 'Disability', value: summary.agg.disability, color: '#4f46e5', filterKey: 'disability', activeVal: 'YES' },
    { labelTa: 'சிறுநீரக நோய் (CKDU)', labelEn: 'CKDU', value: summary.agg.ckdu, color: '#7c3aed', filterKey: 'ckdu', activeVal: 'YES' },
    { labelTa: 'தங்கி வாழ்வோர் (Dependents)', labelEn: 'Dependents', value: summary.agg.dependents, color: '#0284c7', filterKey: 'dependents', activeVal: 'YES' },
    { labelTa: '70 வயதுக்கு மேல் (Over 70)', labelEn: 'Over 70 Year', value: summary.agg.over70, color: '#059669', filterKey: 'over70', activeVal: 'YES' },
    { labelTa: 'NIC அற்றோர் (No NIC)', labelEn: 'No NIC', value: summary.agg.noNic, color: '#475569', filterKey: 'noNic', activeVal: 'YES' },
    { labelTa: '16 வயதுக்குட்பட்ட NIC அற்றோர்', labelEn: 'Under 16 No NIC', value: summary.agg.under16NoNic, color: '#b45309', filterKey: 'under16NoNic', activeVal: 'YES' },
  ];

  const maxMemberVal = Math.max(1, ...memberBars.map((b) => b.value));
  const totalFam = Math.max(1, summary.agg.families);

  const familyConditionBars = [
    {
      labelTa: 'அஸ்வெசும பெறும் குடும்பம்',
      labelEn: 'Aswesuma Families',
      count: summary.agg.aswesumaFamilies,
      color: '#d97706',
      filterKey: 'aswesuma' as const,
      activeVal: 'ANY',
    },
    {
      labelTa: 'சமூர்த்தி பெறும் குடும்பம்',
      labelEn: 'Samurdhi Families',
      count: summary.agg.samurdhiFamilies,
      color: '#0d9488',
      filterKey: 'samurdhi' as const,
      activeVal: 'YES',
    },
    {
      labelTa: 'வயல்காணி உள்ள குடும்பம்',
      labelEn: 'Paddy Land Families',
      count: summary.agg.paddyFamilies,
      color: '#65a30d',
      filterKey: 'paddyLand' as const,
      activeVal: 'YES',
    },
    {
      labelTa: 'கால்நடை வளர்க்கும் குடும்பம்',
      labelEn: 'Livestock Families',
      count: summary.agg.livestockFamilies,
      color: '#ca8a04',
      filterKey: 'livestock' as const,
      activeVal: 'ANY',
    },
    {
      labelTa: 'தொழில் / வருமானம் உள்ள குடும்பம்',
      labelEn: 'Employed Member Families',
      count: summary.agg.employedFamilies,
      color: '#2563eb',
      filterKey: 'jobFilter' as const,
      activeVal: 'HAS_JOB',
    },
  ];

  const topHouseTypes = Object.entries(summary.houseTypeCounts).sort((a, b) => b[1] - a[1]);
  const topWaters = Object.entries(summary.waterCounts).sort((a, b) => b[1] - a[1]);
  const topLights = Object.entries(summary.lightingCounts).sort((a, b) => b[1] - a[1]);
  const divRows = Object.entries(summary.divisionCounts).sort((a, b) => b[1].families - a[1].families);
  const maxDivFam = Math.max(1, ...divRows.map(([, v]) => v.families));

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {isTa
                ? 'உறுப்பினர் சுருக்க நிலை & குடும்ப விபர வரைபு (Visual Chart Analytics)'
                : 'Members at a Glance & Household Distribution Charts'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isTa
                ? `தற்போதைய வடிகட்டலில் ${summary.agg.families} குடும்பங்கள் (${summary.agg.totalMembers} உறுப்பினர்கள்) — எந்தப் பட்டையையும் கிளிக் செய்து விரைவாக பில்டர் செய்யலாம்.`
                : `Showing ${summary.agg.families} filtered families (${summary.agg.totalMembers} members) — click any bar to quick-filter.`}
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: Members at a Glance Bar Chart + Welfare/Assets Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Members at a Glance Bars */}
        <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="text-xs font-extrabold text-slate-800 mb-2">
            {isTa ? '1. உறுப்பினர் சுருக்க நிலை (Members at a Glance)' : '1. Members at a Glance Metrics'}
          </div>
          <div className="space-y-1.5">
            {memberBars.map((bar) => {
              const pct = Math.max(bar.value > 0 ? 3 : 0, Math.round((bar.value / maxMemberVal) * 100));
              const isActive = bar.filterKey ? filters[bar.filterKey] === bar.activeVal : false;
              return (
                <button
                  key={bar.labelEn}
                  type="button"
                  disabled={!bar.filterKey}
                  onClick={() => {
                    if (bar.filterKey && bar.activeVal) {
                      onQuickToggleFilter(bar.filterKey, isActive ? 'ALL' : bar.activeVal);
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 text-left px-2 py-1 rounded-lg transition-colors ${
                    bar.filterKey ? 'hover:bg-white cursor-pointer' : 'cursor-default'
                  } ${isActive ? 'bg-amber-50 ring-1 ring-amber-400' : ''}`}
                >
                  <div className="w-44 sm:w-52 text-[11px] font-bold text-slate-700 truncate">
                    {isTa ? bar.labelTa : bar.labelEn}
                  </div>
                  <div className="flex-1 h-4 bg-white border border-slate-200 rounded-md overflow-hidden">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <rect x="0" y="0" width={`${pct}%`} height="100%" fill={bar.color} rx="2" />
                    </svg>
                  </div>
                  <div className="w-12 text-right font-mono text-xs font-extrabold text-slate-900">
                    {bar.value}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Welfare, Livelihood & Assets Bars */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-extrabold text-slate-800">
            {isTa
              ? '2. நலன்புரி, வயல்காணி, கால்நடை & தொழில் (குடும்பங்கள்)'
              : '2. Welfare, Paddy Land, Livestock & Employment (Families)'}
          </div>
          <div className="space-y-2">
            {familyConditionBars.map((bar) => {
              const pct = Math.round((bar.count / totalFam) * 100);
              const isActive = filters[bar.filterKey] === bar.activeVal;
              return (
                <button
                  key={bar.labelEn}
                  type="button"
                  onClick={() => onQuickToggleFilter(bar.filterKey, isActive ? 'ALL' : bar.activeVal)}
                  className={`w-full text-left p-2 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-amber-50 border-amber-400'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
                    <span>{isTa ? bar.labelTa : bar.labelEn}</span>
                    <span className="font-mono">
                      {bar.count} / {summary.agg.families} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <rect x="0" y="0" width={`${bar.count > 0 ? Math.max(3, pct) : 0}%`} height="100%" fill={bar.color} />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: House Type, Drinking Water, Lighting & Division/Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* House Type Chart */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-indigo-700" />
            <span>{isTa ? 'வீட்டின் வகை (House Type)' : 'House Type'}</span>
          </div>
          <div className="space-y-1.5">
            {topHouseTypes.map(([code, cnt]) => {
              const pct = Math.round((cnt / totalFam) * 100);
              const active = filters.houseType === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onQuickToggleFilter('houseType', active ? 'ALL' : code)}
                  className={`w-full text-left text-[10px] p-1.5 rounded border ${
                    active ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                    <span className="truncate">{HOUSE_TYPE_LABELS[code]?.[isTa ? 'ta' : 'en'] || code}</span>
                    <span className="font-mono ml-1">{cnt} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <rect x="0" y="0" width={`${Math.max(3, pct)}%`} height="100%" fill="#4f46e5" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drinking Water Chart */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            <span>{isTa ? 'குடிநீர் (Water Source)' : 'Drinking Water'}</span>
          </div>
          <div className="space-y-1.5">
            {topWaters.map(([code, cnt]) => {
              const pct = Math.round((cnt / totalFam) * 100);
              const active = filters.waterSource === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onQuickToggleFilter('waterSource', active ? 'ALL' : code)}
                  className={`w-full text-left text-[10px] p-1.5 rounded border ${
                    active ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                    <span className="truncate">{WATER_SOURCE_LABELS[code]?.[isTa ? 'ta' : 'en'] || code}</span>
                    <span className="font-mono ml-1">{cnt} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <rect x="0" y="0" width={`${Math.max(3, pct)}%`} height="100%" fill="#2563eb" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lighting Source Chart */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>{isTa ? 'வெளிச்சத்தை பெறும் வழி' : 'Lighting Source'}</span>
          </div>
          <div className="space-y-1.5">
            {topLights.map(([code, cnt]) => {
              const pct = Math.round((cnt / totalFam) * 100);
              const active = filters.lightingSource === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onQuickToggleFilter('lightingSource', active ? 'ALL' : code)}
                  className={`w-full text-left text-[10px] p-1.5 rounded border ${
                    active ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                    <span className="truncate">{LIGHTING_SOURCE_LABELS[code]?.[isTa ? 'ta' : 'en'] || code}</span>
                    <span className="font-mono ml-1">{cnt} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <rect x="0" y="0" width={`${Math.max(3, pct)}%`} height="100%" fill="#d97706" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* GN Division Breakdown or Priority Distribution */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>
              {isGnLocked || divRows.length <= 1
                ? isTa
                  ? 'முன்னுரிமை நிலைப் பகிர்வு'
                  : 'Priority Rank Breakdown'
                : isTa
                ? 'பிரிவு வாரியான குடும்ப எண்ணிக்கை'
                : 'By GN Division'}
            </span>
          </div>

          {isGnLocked || divRows.length <= 1 ? (
            <div className="space-y-1.5">
              {[
                { rank: 1, ta: 'முன்னுரிமை 1 (80-100)', en: 'Priority 1 (80-100)', color: '#dc2626' },
                { rank: 2, ta: 'முன்னுரிமை 2 (60-79)', en: 'Priority 2 (60-79)', color: '#d97706' },
                { rank: 3, ta: 'முன்னுரிமை 3 (40-59)', en: 'Priority 3 (40-59)', color: '#ca8a04' },
                { rank: 4, ta: 'முன்னுரிமை 4 (<40)', en: 'Priority 4 (<40)', color: '#059669' },
              ].map((p) => {
                const cnt = summary.priorityCounts[p.rank] || 0;
                const pct = Math.round((cnt / totalFam) * 100);
                return (
                  <div key={p.rank} className="text-[10px] p-1.5 rounded bg-white border border-slate-200">
                    <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                      <span>{isTa ? p.ta : p.en}</span>
                      <span className="font-mono">{cnt} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                      <svg className="w-full h-full" preserveAspectRatio="none">
                        <rect x="0" y="0" width={`${cnt > 0 ? Math.max(3, pct) : 0}%`} height="100%" fill={p.color} />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {divRows.map(([code, info]) => {
                const pct = Math.max(3, Math.round((info.families / maxDivFam) * 100));
                const divObj = divisions.find((d) => d.code === code);
                return (
                  <div key={code} className="text-[10px] p-1.5 rounded bg-white border border-slate-200">
                    <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                      <span className="truncate">
                        {code} {divObj ? `- ${isTa ? divObj.nameTa : divObj.nameEn}` : ''}
                      </span>
                      <span className="font-mono ml-1">
                        {info.families} ({info.members})
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                      <svg className="w-full h-full" preserveAspectRatio="none">
                        <rect x="0" y="0" width={`${pct}%`} height="100%" fill="#059669" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
