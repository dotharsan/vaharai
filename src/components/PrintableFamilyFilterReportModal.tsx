import React, { useEffect, useMemo, useState } from 'react';
import { GNDivision, HouseholdData, User } from '../types';
import { Language } from '../translations/i18n';
import { generateQrDataUrl } from '../utils/barcode';
import {
  ASWESUMA_LABELS,
  HouseholdComputedMetrics,
  HOUSE_TYPE_LABELS,
  LIGHTING_SOURCE_LABELS,
  LIVESTOCK_LABELS,
  PADDY_EXTENT_LABELS,
  WATER_SOURCE_LABELS,
} from '../utils/familyAnalytics';
import { Printer, X, QrCode, Pin, FileDown } from 'lucide-react';

export interface HouseholdWithMetrics {
  household: HouseholdData;
  metrics: HouseholdComputedMetrics;
}

interface PrintableFamilyFilterReportModalProps {
  isOpen: boolean;
  items: HouseholdWithMetrics[];
  pinnedIds: Set<string>;
  divisions: GNDivision[];
  currentUser: User;
  activeDivisionFilter: string;
  activeFilterLabels: string[];
  lang: Language;
  initialScope?: 'FILTERED' | 'PINNED';
  onClose: () => void;
  onExportCsv: (scopeItems: HouseholdWithMetrics[]) => void;
}

export const PrintableFamilyFilterReportModal: React.FC<PrintableFamilyFilterReportModalProps> = ({
  isOpen,
  items,
  pinnedIds,
  divisions,
  currentUser,
  activeDivisionFilter,
  activeFilterLabels,
  lang,
  initialScope = 'FILTERED',
  onClose,
  onExportCsv,
}) => {
  const isTa = lang !== 'en';
  const [printScope, setPrintScope] = useState<'FILTERED' | 'PINNED'>(initialScope);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [includeChartInPrint, setIncludeChartInPrint] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setPrintScope(initialScope);
    }
  }, [isOpen, initialScope]);

  const pinnedItems = useMemo(
    () => items.filter((item) => pinnedIds.has(item.household.id)),
    [items, pinnedIds]
  );

  const reportItems = useMemo(
    () => (printScope === 'PINNED' ? pinnedItems : items),
    [printScope, pinnedItems, items]
  );

  // Generate QR images for report families
  useEffect(() => {
    if (!isOpen || reportItems.length === 0) return;
    let cancelled = false;
    const subset = reportItems.slice(0, 150);
    Promise.all(
      subset.map(async ({ household }) => {
        const payload = household.familyQrPayload || household.familyCode;
        const url = await generateQrDataUrl(payload);
        return [household.id, url] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      entries.forEach(([id, url]) => {
        if (url) next[id] = url;
      });
      setQrMap(next);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, reportItems]);

  const aggregate = useMemo(() => {
    return reportItems.reduce(
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
        if (metrics.aswesumaCategory !== 'NONE') acc.aswesumaFamilies += 1;
        if (metrics.receivingSamurdhi) acc.samurdhiFamilies += 1;
        if (metrics.hasPaddyLand) acc.paddyFamilies += 1;
        if (metrics.hasLivestock) acc.livestockFamilies += 1;
        if (household.priorityRank === 1) acc.p1Families += 1;
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
        aswesumaFamilies: 0,
        samurdhiFamilies: 0,
        paddyFamilies: 0,
        livestockFamilies: 0,
        p1Families: 0,
      }
    );
  }, [reportItems]);

  if (!isOpen) return null;

  const getDivLabel = (code: string) => {
    const found = divisions.find((d) => d.code === code);
    return found ? `${found.code} - ${isTa ? found.nameTa : found.nameEn}` : code;
  };

  const nowDate = new Date().toLocaleDateString('en-GB');
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const chartRows = [
    { label: isTa ? 'மொத்த உறுப்பினர்கள்' : 'Total Members', val: aggregate.totalMembers, color: '#0f766e' },
    { label: isTa ? 'ஆண் (Male)' : 'Male', val: aggregate.male, color: '#2563eb' },
    { label: isTa ? 'பெண் (Female)' : 'Female', val: aggregate.female, color: '#db2777' },
    { label: isTa ? 'O/L கீழ் கல்வி' : 'Below O/L Edu', val: aggregate.belowOL, color: '#d97706' },
    { label: isTa ? 'பள்ளி செல்லாதோர் (5–16)' : 'Not in School (5–16)', val: aggregate.notInSchool, color: '#e11d48' },
    { label: isTa ? 'நாள்பட்ட நோய்' : 'Chronic Disease', val: aggregate.chronic, color: '#ea580c' },
    { label: isTa ? 'மாற்றுத்திறனாளி' : 'Disability', val: aggregate.disability, color: '#4f46e5' },
    { label: 'CKDU', val: aggregate.ckdu, color: '#7c3aed' },
    { label: isTa ? 'தங்கி வாழ்வோர்' : 'Dependents', val: aggregate.dependents, color: '#0284c7' },
    { label: isTa ? '70+ வயது' : 'Over 70 Year', val: aggregate.over70, color: '#059669' },
    { label: isTa ? 'NIC அற்றோர்' : 'No NIC', val: aggregate.noNic, color: '#475569' },
    { label: isTa ? '16 வயதுக்குட்பட்ட NIC அற்றோர்' : 'Under 16 No NIC', val: aggregate.under16NoNic, color: '#b45309' },
  ];
  const maxChartVal = Math.max(1, ...chartRows.map((r) => r.val));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full border border-slate-200 my-4 max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (hidden on print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50 no-print">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-700" />
              <span>
                {isTa
                  ? 'குடும்பங்கள் & QR குறியீடு அச்சுப் பதிவேடு (Print with Name & QR)'
                  : 'Filtered & Pinned Families Report (with Name & QR)'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTa
                ? 'பெயர், QR குறியீடு, உறுப்பினர் சுருக்க நிலை மற்றும் வீட்டு விபரங்களுடன் A4 அச்சு / PDF எடுக்கலாம்.'
                : 'Ready for A4 printing / PDF export with family head name, scannable QR code, and key indicators.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPrintScope('FILTERED')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  printScope === 'FILTERED' ? 'bg-emerald-800 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isTa ? `வடிகட்டியவை (${items.length})` : `Filtered (${items.length})`}
              </button>
              <button
                type="button"
                onClick={() => setPrintScope('PINNED')}
                className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-colors ${
                  printScope === 'PINNED' ? 'bg-amber-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>{isTa ? `பின் செய்யப்பட்டவை (${pinnedItems.length})` : `Pinned (${pinnedItems.length})`}</span>
              </button>
            </div>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeChartInPrint}
                onChange={(e) => setIncludeChartInPrint(e.target.checked)}
                className="rounded text-emerald-700"
              />
              <span>{isTa ? 'வரைபு சேர்' : 'Include Chart'}</span>
            </label>

            <button
              type="button"
              onClick={() => onExportCsv(reportItems)}
              disabled={reportItems.length === 0}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={reportItems.length === 0}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{isTa ? 'PDF / அச்சிடுக' : 'Print / PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div id="printable-report-area" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white text-black text-xs space-y-4">
          {/* Official Header */}
          <div className="text-center pb-3 border-b-2 border-emerald-900">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
              இலங்கை ஜனநாயக சோசலிசக் குடியரசு · Democratic Socialist Republic of Sri Lanka
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
              {isTa
                ? 'குடும்பத் தரவு மையம் — உறுப்பினர் சுருக்க நிலை & QR அறிக்கை'
                : 'Family Data Center — Members at a Glance & QR Registry Report'}
            </h1>
            <div className="text-[11px] font-semibold text-emerald-900 mt-0.5">
              {isTa ? 'பயனர்:' : 'Officer:'} {currentUser.name} ({currentUser.role}) ·{' '}
              {isTa ? 'பிரிவு:' : 'Division:'}{' '}
              {activeDivisionFilter === 'ALL' ? (isTa ? 'அனைத்து பிரிவுகளும்' : 'All Divisions') : getDivLabel(activeDivisionFilter)}
            </div>
          </div>

          {/* Filter Criteria & Totals Metadata */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-2 text-[11px]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-slate-900">
                {printScope === 'PINNED'
                  ? isTa
                    ? 'பின் செய்யப்பட்ட குடும்பங்கள் பட்டியல் (Pinned Shortlist)'
                    : 'Pinned Families Shortlist'
                  : isTa
                  ? 'வடிகட்டப்பட்ட குடும்பங்கள் பட்டியல் (Filtered Registry)'
                  : 'Filtered Families Registry'}
                : <span className="font-mono text-emerald-900">{aggregate.families}</span> {isTa ? 'குடும்பங்கள்' : 'Families'} /{' '}
                <span className="font-mono text-emerald-900">{aggregate.totalMembers}</span> {isTa ? 'உறுப்பினர்கள்' : 'Members'}
              </div>
              <div className="font-mono text-[10px] text-slate-600">
                {nowDate} {nowTime}
              </div>
            </div>

            {activeFilterLabels.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">{isTa ? 'வடிகட்டிகள்:' : 'Filters:'}</span>
                {activeFilterLabels.map((lbl, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold">
                    {lbl}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1.5 border-t border-slate-200 text-[10px]">
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500 block">{isTa ? 'ஆண் / பெண்' : 'Male / Female'}</span>
                <strong className="font-mono text-slate-900">{aggregate.male} / {aggregate.female}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500 block">{isTa ? '70+ / மாற்றுத்திறன்' : '70+ / Disability'}</span>
                <strong className="font-mono text-slate-900">{aggregate.over70} / {aggregate.disability}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500 block">{isTa ? 'CKDU / நாள்பட்ட நோய்' : 'CKDU / Chronic'}</span>
                <strong className="font-mono text-slate-900">{aggregate.ckdu} / {aggregate.chronic}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500 block">{isTa ? 'NIC இல்லை / <16' : 'No NIC / <16'}</span>
                <strong className="font-mono text-slate-900">{aggregate.noNic} / {aggregate.under16NoNic}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500 block">{isTa ? 'அஸ்வெசும / சமூர்த்தி' : 'Aswesuma / Samurdhi'}</span>
                <strong className="font-mono text-slate-900">{aggregate.aswesumaFamilies} / {aggregate.samurdhiFamilies}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-500 block">{isTa ? 'வயல்காணி / கால்நடை' : 'Paddy / Livestock'}</span>
                <strong className="font-mono text-slate-900">{aggregate.paddyFamilies} / {aggregate.livestockFamilies}</strong>
              </div>
            </div>
          </div>

          {/* Optional Printable Chart */}
          {includeChartInPrint && reportItems.length > 0 && (
            <div className="border border-slate-300 rounded-lg p-3 bg-white">
              <div className="font-extrabold text-[11px] text-slate-900 mb-2 uppercase tracking-wide">
                {isTa
                  ? 'உறுப்பினர் சுருக்க நிலை வரைபு (Members at a Glance Visual Chart)'
                  : 'Members at a Glance Visual Distribution'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {chartRows.map((row) => {
                  const pct = Math.max(2, Math.round((row.val / maxChartVal) * 100));
                  return (
                    <div key={row.label} className="flex items-center gap-2 text-[10px]">
                      <div className="w-40 truncate font-semibold text-slate-700">{row.label}</div>
                      <div className="flex-1 bg-slate-100 h-3 rounded overflow-hidden border border-slate-200">
                        <svg className="w-full h-full" preserveAspectRatio="none">
                          <rect x="0" y="0" width={`${row.val === 0 ? 0 : pct}%`} height="100%" fill={row.color} />
                        </svg>
                      </div>
                      <div className="w-8 text-right font-mono font-bold text-slate-900">{row.val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Families Table with Name & QR */}
          {reportItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
              {printScope === 'PINNED'
                ? isTa
                  ? 'இதுவரை எந்த குடும்பமும் பின் செய்யப்படவில்லை.'
                  : 'No families are currently pinned.'
                : isTa
                ? 'வடிகட்டலுக்குப் பொருந்தும் குடும்பங்கள் எதுவும் இல்லை.'
                : 'No families match the current filters.'}
            </div>
          ) : (
            <table className="w-full text-left text-[10px] border border-slate-300 divide-y divide-slate-200">
              <thead className="bg-slate-100 font-bold uppercase text-[9px] text-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-300 w-7">#</th>
                  <th className="p-2 border-r border-slate-300 w-24 text-center">QR &amp; Code</th>
                  <th className="p-2 border-r border-slate-300">
                    {isTa ? 'பெயர் / NIC / தொலைபேசி / பிரிவு' : 'Head Name / NIC / Phone / GN'}
                  </th>
                  <th className="p-2 border-r border-slate-300">
                    {isTa ? 'உறுப்பினர் சுருக்க நிலை & தொழில்' : 'Members at a Glance & Jobs'}
                  </th>
                  <th className="p-2">
                    {isTa ? 'வீடு, குடிநீர், ஒளி, நலன்புரி, வயல் & கால்நடை' : 'Housing, Water, Light, Welfare & Assets'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportItems.map(({ household: h, metrics }, idx) => {
                  const qrImg = qrMap[h.id];
                  const houseLbl = HOUSE_TYPE_LABELS[h.commonAssets.unitType]?.[isTa ? 'ta' : 'en'] || h.commonAssets.unitType;
                  const waterLbl = WATER_SOURCE_LABELS[h.commonAssets.waterSource]?.[isTa ? 'ta' : 'en'] || h.commonAssets.waterSource;
                  const lightLbl = LIGHTING_SOURCE_LABELS[h.commonAssets.lightingSource]?.[isTa ? 'ta' : 'en'] || h.commonAssets.lightingSource;
                  const aswLbl = ASWESUMA_LABELS[metrics.aswesumaCategory]?.[isTa ? 'ta' : 'en'] || metrics.aswesumaCategory;
                  const paddyLbl = metrics.hasPaddyLand
                    ? PADDY_EXTENT_LABELS[metrics.paddyLandExtent]?.[isTa ? 'ta' : 'en'] || (isTa ? 'உண்டு' : 'Yes')
                    : isTa
                    ? 'இல்லை'
                    : 'No';
                  const liveLbl = metrics.hasLivestock
                    ? `${LIVESTOCK_LABELS[metrics.livestockType]?.[isTa ? 'ta' : 'en'] || metrics.livestockType} (${metrics.livestockCount})`
                    : isTa
                    ? 'இல்லை'
                    : 'No';

                  return (
                    <tr key={h.id} className="break-inside-avoid align-top">
                      <td className="p-2 border-r border-slate-300 font-mono font-bold text-center">
                        {idx + 1}
                        {pinnedIds.has(h.id) && <div className="text-amber-600 mt-0.5">📌</div>}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center">
                        {qrImg ? (
                          <img src={qrImg} alt={h.familyCode} className="w-16 h-16 mx-auto border border-slate-200 p-0.5 bg-white" />
                        ) : (
                          <div className="w-16 h-16 mx-auto border border-dashed border-slate-300 flex items-center justify-center text-[8px] font-mono">
                            QR
                          </div>
                        )}
                        <div className="font-mono font-extrabold text-[9px] text-emerald-950 mt-1 break-all">
                          {h.familyCode}
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-300 space-y-0.5">
                        <div className="font-extrabold text-[11px] text-slate-900">{h.applicantNameTa}</div>
                        {h.applicantNameEn && <div className="text-[9px] text-slate-600">{h.applicantNameEn}</div>}
                        <div className="font-mono text-[10px] font-bold text-slate-800">NIC: {h.applicantNic}</div>
                        {h.phone && <div className="font-mono text-[10px] text-slate-700">Tel: {h.phone}</div>}
                        <div className="text-[9px] text-slate-600">{h.address}</div>
                        <div className="inline-block bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold text-[9px]">
                          {getDivLabel(h.divisionCode)}
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-300 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded font-bold">
                            {isTa ? 'உறுப்பினர்' : 'Total'}: {metrics.totalMembers}
                          </span>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-900 rounded font-bold">
                            M: {metrics.maleCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-pink-50 text-pink-900 rounded font-bold">
                            F: {metrics.femaleCount}
                          </span>
                          {metrics.belowOLCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-900 rounded font-bold">
                              &lt;O/L: {metrics.belowOLCount}
                            </span>
                          )}
                          {metrics.notInSchool5To16Count > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 rounded font-bold">
                              NoSch(5-16): {metrics.notInSchool5To16Count}
                            </span>
                          )}
                          {metrics.chronicDiseaseCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-900 rounded font-bold">
                              Chronic: {metrics.chronicDiseaseCount}
                            </span>
                          )}
                          {metrics.disabilityCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-900 rounded font-bold">
                              Disability: {metrics.disabilityCount}
                            </span>
                          )}
                          {metrics.ckduCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 rounded font-bold">
                              CKDU: {metrics.ckduCount}
                            </span>
                          )}
                          {metrics.dependentsCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-sky-50 text-sky-900 rounded font-bold">
                              Dep: {metrics.dependentsCount}
                            </span>
                          )}
                          {metrics.over70Count > 0 && (
                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-900 rounded font-bold">
                              70+: {metrics.over70Count}
                            </span>
                          )}
                          {metrics.noNicCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-900 rounded font-bold">
                              NoNIC: {metrics.noNicCount} (&lt;16: {metrics.under16NoNicCount})
                            </span>
                          )}
                        </div>
                        {metrics.jobs.length > 0 && (
                          <div className="text-[9px] text-slate-700">
                            <strong>{isTa ? 'தொழில்:' : 'Jobs:'}</strong> {metrics.jobs.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="p-2 space-y-0.5 text-[9.5px]">
                        <div>
                          <strong>{isTa ? 'வீடு:' : 'House:'}</strong> {houseLbl} ({h.commonAssets.housingPermanency || 'SEMI_PERMANENT'})
                        </div>
                        <div>
                          <strong>{isTa ? 'குடிநீர்:' : 'Water:'}</strong> {waterLbl}
                        </div>
                        <div>
                          <strong>{isTa ? 'ஒளி:' : 'Light:'}</strong> {lightLbl}
                        </div>
                        <div>
                          <strong>{isTa ? 'அஸ்வெசும:' : 'Aswesuma:'}</strong> {aswLbl} ·{' '}
                          <strong>{isTa ? 'சமூர்த்தி:' : 'Samurdhi:'}</strong>{' '}
                          {metrics.receivingSamurdhi ? (isTa ? 'ஆம்' : 'Yes') : isTa ? 'இல்லை' : 'No'}
                        </div>
                        <div>
                          <strong>{isTa ? 'வயல்காணி:' : 'Paddy:'}</strong> {paddyLbl} ·{' '}
                          <strong>{isTa ? 'கால்நடை:' : 'Livestock:'}</strong> {liveLbl}
                        </div>
                        <div className="font-mono font-bold text-slate-900 pt-0.5">
                          Score: {h.score100}/100 (P{h.priorityRank})
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Official Signature Footer */}
          <div className="mt-6 pt-5 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-700 break-inside-avoid">
            <div>
              <div className="h-8" />
              <div className="border-t border-slate-400 mx-4 pt-1 font-bold">
                {isTa ? 'தயாரித்த உத்தியோகத்தர்' : 'Prepared Officer'}
              </div>
            </div>
            <div>
              <div className="h-8" />
              <div className="border-t border-slate-400 mx-4 pt-1 font-bold">
                {isTa ? 'கிராம உத்தியோகத்தர்' : 'Grama Niladhari'}
              </div>
            </div>
            <div>
              <div className="h-8" />
              <div className="border-t border-slate-400 mx-4 pt-1 font-bold">
                {isTa ? 'பிரதேச செயலாளர்' : 'Divisional Secretary'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
