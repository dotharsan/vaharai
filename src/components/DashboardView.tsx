import React, { useState } from 'react';
import {
  Beneficiary,
  QueueToken,
  GNDivision,
  User,
  SystemAuditLog,
  AssistanceRecord,
  PregnantMotherRecord,
  LandRecord,
  HouseholdData,
} from '../types';
import { Language, translations } from '../translations/i18n';
import { calculateAge, getDsDivisionById, logAuditAction } from '../services/storage';
import { VaharaiLogo } from './VaharaiLogo';
import { LogoSettingsModal } from './LogoSettingsModal';
import { ImagePlus } from 'lucide-react';

interface DashboardViewProps {
  beneficiaries: Beneficiary[];
  tokens: QueueToken[];
  divisions: GNDivision[];
  users: User[];
  auditLogs: SystemAuditLog[];
  assistanceRecords?: AssistanceRecord[];
  pregnantMothers?: PregnantMotherRecord[];
  landRecords?: LandRecord[];
  households?: HouseholdData[];
  currentUser: User;
  lang: Language;
  onNavigate: (tab: string) => void;
  selectedDsDivisionId?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  beneficiaries,
  tokens,
  divisions,
  users,
  auditLogs,
  assistanceRecords = [],
  pregnantMothers = [],
  landRecords = [],
  households = [],
  currentUser,
  lang,
  onNavigate,
  selectedDsDivisionId,
}) => {
  const t = translations[lang];
  const [showLogoModal, setShowLogoModal] = useState(false);

  // Dynamic DS Division resolution
  const isDistrictAdmin = currentUser.role === 'DISTRICT_ADMIN';
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const effectiveDsId = isDistrictAdmin
    ? (selectedDsDivisionId && selectedDsDivisionId !== 'ALL' ? selectedDsDivisionId : null)
    : (currentUser.dsDivisionId || 'DS_VAHARAI');

  const currentDs = effectiveDsId ? getDsDivisionById(effectiveDsId) : null;

  const dashboardTitle = isDistrictAdmin
    ? (currentDs
        ? (lang === 'ta' ? `${currentDs.nameTa} பிரதேச செயலகம்` : `${currentDs.nameEn} Divisional Secretariat`)
        : (lang === 'ta' ? 'மட்டக்களப்பு மாவட்ட செயலகம்' : 'Batticaloa District Secretariat'))
    : (currentDs
        ? (lang === 'ta' ? `${currentDs.nameTa} பிரதேச செயலகம்` : `${currentDs.nameEn} Divisional Secretariat`)
        : (lang === 'ta' ? 'பிரதேச செயலகம்' : 'Divisional Secretariat'));

  const dashboardSubtitle = isDistrictAdmin
    ? (currentDs
        ? (lang === 'ta' ? `மட்டக்களப்பு மாவட்டம் · ${currentDs.allocatedGnCount} கிராம அலுவலர் பிரிவுகள் · மேற்பார்வை நிலைப்பலகை` : `Batticaloa District · ${currentDs.allocatedGnCount} GN Divisions · Oversight Dashboard`)
        : (lang === 'ta' ? '14 பிரதேச செயலகங்கள் மற்றும் 345 கிராம அலுவலர் பிரிவுகளின் தலைமை நிலைப்பலகை' : 'Apex District Administration for 14 Secretariats & 345 GN Divisions'))
    : (currentDs
        ? (lang === 'ta' ? `மட்டக்களப்பு மாவட்டம் · ${currentDs.allocatedGnCount} கிராம அலுவலர் பிரிவுகள்` : `Batticaloa District · ${currentDs.allocatedGnCount} GN Divisions`)
        : t.appSubTitle);

  // If GN Officer, filter data relevant to their division (case-insensitive normalized)
  const isGN = currentUser.role === 'GRAMANIILATHARI';
  const divisionCode = (currentUser.division || '211').trim();
  const normDiv = (code?: string) => (code || '').trim().toUpperCase();
  const normalizedOfficerDiv = normDiv(divisionCode);

  const relevantBeneficiaries = isGN
    ? beneficiaries.filter((b) => normDiv(b.divisionCode) === normalizedOfficerDiv)
    : beneficiaries;

  const relevantTokens = isGN
    ? tokens.filter((tok) => normDiv(tok.divisionCode) === normalizedOfficerDiv)
    : tokens;

  const relevantAssistance = isGN
    ? assistanceRecords.filter((a) => normDiv(a.divisionCode) === normalizedOfficerDiv)
    : assistanceRecords;

  const relevantPregnant = isGN
    ? pregnantMothers.filter((m) => normDiv(m.divisionCode) === normalizedOfficerDiv)
    : pregnantMothers;

  const relevantLand = isGN
    ? landRecords.filter((l) => normDiv(l.divisionCode) === normalizedOfficerDiv)
    : landRecords;

  const relevantHouseholds = isGN
    ? households.filter((h) => normDiv(h.divisionCode) === normalizedOfficerDiv)
    : households;

  // Key Counts
  const totalCitizens = relevantBeneficiaries.length;
  const derivedFamilies = new Set(
    relevantBeneficiaries.map((b) => b.familyCode || b.householdNo).filter(Boolean)
  ).size;
  const totalFamilies = Math.max(derivedFamilies, relevantHouseholds.length);
  const waitingTokensCount = relevantTokens.filter((tItem) => tItem.status === 'WAITING').length;
  const aswesumaCount = relevantBeneficiaries.filter(
    (b) => b.welfareScheme?.startsWith('ASWESUMA') || b.welfareSchemes?.some((s) => s.startsWith('ASWESUMA'))
  ).length;
  const samurdhiCount = relevantBeneficiaries.filter(
    (b) => b.welfareScheme === 'SAMURDHI' || b.welfareSchemes?.includes('SAMURDHI') || b.isSamurdhiBeneficiary
  ).length;
  const chronicIllnessCount = relevantBeneficiaries.filter((b) => b.chronicIllness && b.chronicIllness !== 'NONE').length;
  const youth16Count = relevantBeneficiaries.filter((b) => calculateAge(b.dob, b.nic) === 16).length;
  const activePregnantCount = relevantPregnant.filter(
    (m) => m.status === 'ACTIVE_COLLECTING' || m.status === 'WAITING_STAMP'
  ).length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 max-w-2xl">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 border-2 border-amber-400 flex items-center justify-center shrink-0 shadow-lg">
              <VaharaiLogo
                size={54}
                className="w-12 h-12 sm:w-14 sm:h-14"
                dsDivisionId={effectiveDsId || 'DISTRICT_HQ'}
              />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-amber-300 font-bold mb-1">
                {lang === 'ta' ? 'அதிகாரப்பூர்வ நிர்வாக தளம்' : 'Official Administration Portal'}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {dashboardTitle}
              </h1>
              <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                {dashboardSubtitle}
              </p>

              <div className="flex items-center gap-2.5 mt-3 flex-wrap text-xs">
                <span className="bg-emerald-950/70 border border-emerald-700/60 px-3 py-1 rounded-lg">
                  👤 {t.loggedAs}: <strong className="font-semibold text-white">{currentUser.name}</strong>
                </span>
                <span className="bg-emerald-950/70 border border-emerald-700/60 px-3 py-1 rounded-lg">
                  🛡️ {t.role}: <strong className="font-mono text-amber-300">{currentUser.role}</strong>
                </span>
                {isGN && (
                  <span className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg font-bold font-mono">
                    GN {divisionCode}
                  </span>
                )}
                {isGN && beneficiaries.length > relevantBeneficiaries.length && (
                  <span className="bg-emerald-950/80 border border-amber-400/50 text-amber-200 px-2.5 py-1 rounded-lg text-[11px]">
                    {lang === 'ta'
                      ? `மொத்த செயலகம்: ${beneficiaries.length} · உங்கள் பிரிவு: ${relevantBeneficiaries.length}`
                      : `DS Total: ${beneficiaries.length} · Your GN: ${relevantBeneficiaries.length}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(isSuperAdmin || isDistrictAdmin) && (
            <div className="shrink-0 self-start md:self-center">
              <button
                onClick={() => setShowLogoModal(true)}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                title={lang === 'ta' ? 'செயலக லோகோவை மாற்றுக' : 'Change Secretariat Logo'}
              >
                <ImagePlus className="w-4 h-4" />
                <span>{lang === 'ta' ? 'செயலக லோகோ மாற்றுக' : 'Customize Logo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logo Management Modal for Super Admin / District Admin */}
      {(isSuperAdmin || isDistrictAdmin) && (
        <LogoSettingsModal
          isOpen={showLogoModal}
          onClose={() => setShowLogoModal(false)}
          targetId={effectiveDsId || 'DISTRICT_HQ'}
          targetNameTa={
            currentDs
              ? `${currentDs.nameTa} பிரதேச செயலகம்`
              : 'மட்டக்களப்பு மாவட்ட செயலகம்'
          }
          targetNameEn={
            currentDs
              ? `${currentDs.nameEn} Divisional Secretariat`
              : 'Batticaloa District Secretariat'
          }
          lang={lang}
          onAuditLog={(action, details) => logAuditAction(currentUser.id, currentUser.name, action, details)}
        />
      )}

      {/* Metrics Grid (Responsive 2x3 or 3x2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Citizens */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">{t.totalBeneficiaries}</span>
            <span>👥</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalCitizens}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {isGN ? `GN Div ${divisionCode}` : (lang === 'ta' ? `${divisions.length} கிராம பிரிவுகள்` : `${divisions.length} GN Divs`)}
          </div>
        </div>

        {/* Total Households */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">{t.totalFamilies}</span>
            <span>🏡</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalFamilies}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {lang === 'ta' ? 'பதிவான குடும்பங்கள்' : 'Households'}
          </div>
        </div>

        {/* Waiting Queue Today */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">{t.waitingQueue}</span>
            <span>⏱️</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-amber-600 tabular-nums">
            {waitingTokensCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {lang === 'ta' ? 'வரிசையில்' : 'Waiting in Queue'}
          </div>
        </div>

        {/* Welfare Beneficiaries */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">அஸ்வெசும / சமுர்த்தி</span>
            <span>🌾</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-800 tabular-nums">
            {aswesumaCount + samurdhiCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {aswesumaCount} Asw · {samurdhiCount} Sam
          </div>
        </div>

        {/* Chronic Illness Cases (NEW) */}
        <div className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-red-700 text-xs font-semibold">
            <span className="truncate">நாள்பட்ட நோய்கள்</span>
            <span>🏥</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-red-700 tabular-nums">
            {chronicIllnessCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {lang === 'ta' ? 'CKD, புற்றுநோய், ஊனம்' : 'CKD, Cancer, Disability'}
          </div>
        </div>

        {/* 16-Year-Old Youth (NIC Applications) (NEW) */}
        <div className="bg-white border border-amber-300 bg-amber-50/30 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-amber-900 text-xs font-semibold">
            <span className="truncate">16 வயது (NIC)</span>
            <span>🎯</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {youth16Count}
          </div>
          <div className="mt-0.5 text-[10px] text-amber-800 font-medium">
            {lang === 'ta' ? 'அடையாள அட்டை தேவை' : 'NIC Required'}
          </div>
        </div>
      </div>

      {/* Module Coverage Summary Cards (Households, Land, Maternity, Relief Aid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('family-center')}
          className="bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 shadow-xs text-left transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="truncate">{lang === 'ta' ? 'குடும்ப தரவு மையம்' : 'Family Data Center'}</span>
            <span>🏘️</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-900 tabular-nums">
            {relevantHouseholds.length}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {lang === 'ta' ? 'மதிப்பிடப்பட்ட குடும்ப அலகுகள்' : 'Scored Household Units'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('land')}
          className="bg-white hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 rounded-xl p-3.5 shadow-xs text-left transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="truncate">{lang === 'ta' ? 'காணிப் பதிவுகள் (Land)' : 'Land Records'}</span>
            <span>🗺️</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900 tabular-nums">
            {relevantLand.length}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {lang === 'ta' ? 'அனுமதிப்பத்திரம் / LDO ஆவணங்கள்' : 'Permits & LDO Grants'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('maternity')}
          className="bg-white hover:bg-pink-50/40 border border-slate-200 hover:border-pink-300 rounded-xl p-3.5 shadow-xs text-left transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="truncate">{lang === 'ta' ? 'கர்ப்பிணித் தாய்மார்' : 'Pregnant Mothers'}</span>
            <span>🤰</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-pink-800 tabular-nums">
            {relevantPregnant.length}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {lang === 'ta' ? `${activePregnantCount} செயலில் உள்ள முத்திரை` : `${activePregnantCount} Active Stamps`}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('assistance')}
          className="bg-white hover:bg-rose-50/40 border border-slate-200 hover:border-rose-300 rounded-xl p-3.5 shadow-xs text-left transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="truncate">{lang === 'ta' ? 'நிவாரண உதவிகள்' : 'Relief Distributions'}</span>
            <span>🎁</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-rose-800 tabular-nums">
            {relevantAssistance.length}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {lang === 'ta' ? 'பதிவான உதவி விநியோகங்கள்' : 'Recorded Aid Distributions'}
          </div>
        </button>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          {lang === 'ta' ? 'விரைவுச் செயல்பாடுகள்' : 'Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">➕</div>
            <div className="text-xs font-bold">{t.addBeneficiary}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'தானியங்கி ID & பார்கோட்' : 'System ID & Barcode'}</div>
          </button>

          <button
            onClick={() => onNavigate('reception')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">🖨️</div>
            <div className="text-xs font-bold">{t.issueNewToken}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'தர்மல் ரசீது அச்சிடல்' : 'Thermal Print 58/80mm'}</div>
          </button>

          <button
            onClick={() => onNavigate('assistance')}
            className="p-3 bg-rose-50/70 hover:bg-rose-100/80 text-rose-950 border border-rose-200 hover:border-rose-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">🎁</div>
            <div className="text-xs font-bold">{lang === 'ta' ? 'உதவி வழங்கல் & இரட்டை உதவி தடுப்பு' : 'Relief & Anti-Duplication'}</div>
            <div className="text-[10px] text-rose-800 mt-0.5">{lang === 'ta' ? 'சிஎஸ்வி மாதிரி & குடும்ப QR' : 'CSV Model & Family QR'}</div>
          </button>

          <button
            onClick={() => onNavigate('ai-report')}
            className="p-3 bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border border-amber-200 hover:border-amber-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">✨</div>
            <div className="text-xs font-bold">{t.navAiReport}</div>
            <div className="text-[10px] text-amber-800 mt-0.5">{lang === 'ta' ? 'தேவைகள் பகுப்பாய்வு' : 'AI Needs Assessment'}</div>
          </button>

          <button
            onClick={() => onNavigate('drive')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">☁️</div>
            <div className="text-xs font-bold">{t.navDrive}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'மேமிப்பகம் & மீட்டல்' : 'Cloud Sync'}</div>
          </button>
        </div>
      </div>

      {/* Two Column Section: 16 GN Divisions & Live Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 16 GN Divisions of Vaharai */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === 'ta'
                ? `${currentDs ? currentDs.nameTa : 'பிரதேச செயலக'} கிராம அலுவலர் பிரிவுகள் (${divisions.length})`
                : `${divisions.length} GN Divisions (${currentDs ? currentDs.nameEn : 'DS Division'})`}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">{divisions.length} Divisions</span>
          </div>

          <div className="w-full overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full min-w-[500px] text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">குறியீடு / Code</th>
                  <th className="py-2.5 px-3">பிரிவுப் பெயர் / Name</th>
                  <th className="py-2.5 px-3">கிராம அலுவலர் / Officer</th>
                  <th className="py-2.5 px-3 text-right">பிரஜைகள் / Citizens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {divisions.map((d) => {
                  const divCitizens = beneficiaries.filter((b) => normDiv(b.divisionCode) === normDiv(d.code)).length;
                  const isCurrentOfficerDiv = isGN && normalizedOfficerDiv === normDiv(d.code);
                  return (
                    <tr
                      key={d.code}
                      className={`hover:bg-slate-50 ${isCurrentOfficerDiv ? 'bg-emerald-50/70 font-semibold' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {d.code}
                        {isCurrentOfficerDiv && (
                          <span className="ml-1.5 text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-sans">
                            {lang === 'ta' ? 'உங்கள் பிரிவு' : 'Your Div'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900">{d.nameTa}</span>
                        <span className="text-[11px] text-slate-500 ml-1.5">({d.nameEn})</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{d.gnOfficerName || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-emerald-800">
                        {divCitizens}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Audit Log / System Activity */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.navAudit}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Live</span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 text-xs">
            {auditLogs.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                {lang === 'ta' ? 'தணிக்கைப் பதிவுகள் எதுவும் இல்லை' : 'No recent system events.'}
              </div>
            ) : (
              auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="pb-2.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-semibold text-slate-600">{log.userName}</span>
                  </div>
                  <div className="text-slate-800 font-medium mt-0.5 leading-snug">
                    {log.details}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
