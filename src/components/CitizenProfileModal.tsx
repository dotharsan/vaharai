import React, { useEffect, useRef, useState } from 'react';
import {
  Beneficiary,
  GNDivision,
  QueueToken,
  AssistanceRecord,
  PregnantMotherRecord,
  LandRecord,
  HouseholdData,
  ALL_WELFARE_SCHEMES_LIST,
} from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { renderBarcodeSvg, generateQrDataUrl } from '../utils/barcode';
import { calculateAge } from '../services/storage';
import { getRelationshipTamilLabel } from '../services/csv';
import {
  Users,
  History,
  Gift,
  Baby,
  HeartHandshake,
  Accessibility,
  MapPin,
  Printer,
  ShieldCheck,
  Building,
  CheckCircle2,
  Ticket,
} from 'lucide-react';

interface CitizenProfileModalProps {
  beneficiary?: Beneficiary | null;
  token?: QueueToken | null;
  division?: GNDivision;
  allBeneficiaries?: Beneficiary[];
  allTokens?: QueueToken[];
  allAssistance?: AssistanceRecord[];
  allPregnantMothers?: PregnantMotherRecord[];
  allLandRecords?: LandRecord[];
  allHouseholds?: HouseholdData[];
  lang: Language;
  onClose: () => void;
  onPrintCard?: () => void;
  onPrintThermal?: () => void;
}

export const CitizenProfileModal: React.FC<CitizenProfileModalProps> = ({
  beneficiary,
  token,
  division,
  allBeneficiaries = [],
  allTokens = [],
  allAssistance = [],
  allPregnantMothers = [],
  allLandRecords = [],
  allHouseholds = [],
  lang,
  onClose,
  onPrintCard,
  onPrintThermal,
}) => {
  const t = translations[lang];
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [qrSrc, setQrSrc] = useState<string>('');

  const barcodeVal = beneficiary?.barcode || beneficiary?.nic || token?.citizenNic || token?.tokenNumber || '';
  const age = beneficiary ? calculateAge(beneficiary.dob, beneficiary.nic) : null;

  // Active family unit members matching the same family code
  const familyCode = beneficiary?.familyCode || token?.familyCode;
  const familyMembers = React.useMemo(() => {
    if (!familyCode) return [];
    return allBeneficiaries.filter((b) => b.familyCode === familyCode);
  }, [familyCode, allBeneficiaries]);

  // Complete DS past tokens history for this citizen's NIC
  const citizenNic = beneficiary?.nic || token?.citizenNic;
  const pastCitizenTokens = React.useMemo(() => {
    if (!citizenNic) return [];
    return allTokens.filter(
      (tok) => (tok.citizenNic || '').toLowerCase().trim() === citizenNic.toLowerCase().trim()
    );
  }, [citizenNic, allTokens]);

  // Complete relief assistance history for this citizen or family
  const pastCitizenAid = React.useMemo(() => {
    if (!citizenNic && !familyCode) return [];
    return allAssistance.filter((aid) => {
      const matchNic = citizenNic && (aid.beneficiaryNic || '').toLowerCase().trim() === citizenNic.toLowerCase().trim();
      const matchFam = familyCode && aid.familyCode && aid.familyCode.toLowerCase().trim() === familyCode.toLowerCase().trim();
      return matchNic || matchFam;
    });
  }, [citizenNic, familyCode, allAssistance]);

  // Maternity & Nutrition Stamp Records (matching Universal Citizen Search)
  const citizenMaternity = React.useMemo(() => {
    if (!citizenNic && !familyCode) return [];
    return allPregnantMothers.filter((m) => {
      const matchNic = citizenNic && (m.nic || '').toLowerCase().trim() === citizenNic.toLowerCase().trim();
      const matchFam = familyCode && m.familyCode && m.familyCode.toLowerCase().trim() === familyCode.toLowerCase().trim();
      return matchNic || matchFam;
    });
  }, [citizenNic, familyCode, allPregnantMothers]);

  // Land Records matching citizen NIC or family
  const citizenLand = React.useMemo(() => {
    if (!citizenNic && !familyCode) return [];
    return allLandRecords.filter((l) => {
      const matchNic = citizenNic && (l.ownerNic || '').toLowerCase().trim() === citizenNic.toLowerCase().trim();
      const matchFam = familyCode && l.familyCode && l.familyCode.toLowerCase().trim() === familyCode.toLowerCase().trim();
      return matchNic || matchFam;
    });
  }, [citizenNic, familyCode, allLandRecords]);

  // Household & Poverty Score
  const citizenHousehold = React.useMemo(() => {
    if (!familyCode) return null;
    return allHouseholds.find((h) => h.familyCode === familyCode) || null;
  }, [familyCode, allHouseholds]);

  // Senior Citizen & Disability Welfare determination
  const isElderlyCitizen = beneficiary ? (beneficiary.isElderly || (age !== null && age >= 60) || beneficiary.welfareScheme === 'ELDERLY') : false;
  const isDisabilityCitizen = beneficiary ? (beneficiary.isPersonWithDisability || beneficiary.welfareScheme === 'DISABILITY' || beneficiary.chronicIllness === 'DISABILITY_PHYSICAL') : false;

  useEffect(() => {
    if (barcodeRef.current && barcodeVal) {
      renderBarcodeSvg(barcodeRef.current, barcodeVal, {
        height: 38,
        displayValue: true,
        fontSize: 10,
      });
    }

    const payload = beneficiary
      ? `VHR-DS|ID:${beneficiary.id}|NIC:${beneficiary.nic}|DIV:${beneficiary.divisionCode}|FAM:${beneficiary.familyCode || 'NONE'}|MED:${beneficiary.chronicIllness}|SCHEME:${beneficiary.welfareScheme}`
      : `TOKEN:${token?.tokenNumber}|NIC:${token?.citizenNic}|NAME:${token?.citizenName}`;

    generateQrDataUrl(payload).then((url) => setQrSrc(url));
  }, [barcodeVal, beneficiary, token]);

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 border border-slate-200 my-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <VaharaiLogo size={36} className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {lang === 'ta' ? 'ஒருங்கிணைந்த பிரஜை முழு விபரம் (360° Dossier)' : 'Universal Citizen 360° Dossier'}
                </span>
                {token && (
                  <span className="font-mono text-xs bg-slate-900 text-emerald-400 px-2 py-0.5 rounded font-bold">
                    {token.tokenNumber}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight mt-0.5">
                {beneficiary?.nameTa || token?.citizenName || 'பிரஜை விபரம்'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDossier}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              title="Print full dossier"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'அச்சிடுக' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 text-lg leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Complete Dossier Content */}
        <div id="printable-citizen-dossier" className="my-4 space-y-4">
          {/* Identity Header Strip */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-slate-50 to-amber-50/40 border border-emerald-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-2xl shadow-inner shrink-0">
                {beneficiary?.gender === 'FEMALE' ? '👩' : '👨'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    {beneficiary?.nameTa || token?.citizenName || 'பிரஜை'}
                  </h4>
                  {beneficiary?.status === 'DECEASED' && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded text-[10px] font-bold">
                      ⚰️ மரணப்பதிவு ({beneficiary.deceasedDate || 'Deceased'})
                    </span>
                  )}
                  {beneficiary?.status === 'TRANSFERRED' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold">
                      ✈️ பதிவுமாற்றம் ({beneficiary.transferDestination || 'Transferred'})
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  {beneficiary?.nameEn || token?.citizenName}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    NIC: {beneficiary?.nic || token?.citizenNic || 'No NIC'}
                  </span>
                  {beneficiary?.isProvisionalNic && (
                    <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                      {t.provisionalNicBadge}
                    </span>
                  )}
                  {familyCode && (
                    <span className="text-[10px] bg-blue-100 text-blue-900 font-bold font-mono px-2 py-0.5 rounded border border-blue-200">
                      குடும்ப அலகு: {familyCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-mono">System ID:</div>
              <div className="text-xs font-mono font-bold text-slate-800">
                {beneficiary?.id || 'UNREGISTERED'}
              </div>
              {age !== null && (
                <div className="mt-1">
                  <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${age === 16 ? 'bg-amber-300 text-slate-950' : 'bg-slate-100 text-slate-700'}`}>
                    {age} {t.yearsOld} {age === 16 ? '(NIC தேவை)' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Active Token Visit Info */}
          {token && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1">
                  <span>📌</span>
                  <span>{t.officerToMeet}:</span>
                </span>
                <span className="font-bold font-mono text-amber-900 bg-white px-2.5 py-0.5 rounded border border-amber-200">
                  {token.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
                <div>
                  <span>வரிசை எண்:</span> <strong className="font-mono text-slate-900">{token.tokenNumber}</strong>
                </div>
                <div>
                  <span>கவுண்டர்:</span> <strong className="font-mono text-slate-900">Counter {token.counterNo}</strong>
                </div>
                <div>
                  <span>சேவை:</span> <strong className="text-slate-900">{token.counterName || token.serviceType}</strong>
                </div>
                <div>
                  <span>நிலை:</span> <strong className="text-emerald-800">{token.status}</strong>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: Demographic Profile */}
          {beneficiary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  இருப்பிட & பிரிவு விபரங்கள் / Residential
                </div>
                <div>
                  <span className="text-slate-500">பிரிவு:</span>{' '}
                  <strong className="text-slate-900 font-mono">{beneficiary.divisionCode}</strong> - {division?.nameTa || beneficiary.divisionCode}
                </div>
                <div>
                  <span className="text-slate-500">குடும்ப எண்:</span>{' '}
                  <strong className="text-slate-900 font-mono">{beneficiary.householdNo}</strong>{' '}
                  {beneficiary.familyHead && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">(தலைவர்)</span>}
                </div>
                <div>
                  <span className="text-slate-500">முகவரி:</span>{' '}
                  <span className="text-slate-800">{beneficiary.address || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">தொலைபேசி:</span>{' '}
                  <span className="text-slate-800 font-mono">{beneficiary.phone || '-'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  நலன்புரி & விசேட தகைமைகள் / Welfare & Schemes
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">நலன்புரி உதவிகள் (Welfare Checklist):</span>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const active = (beneficiary.welfareSchemes && beneficiary.welfareSchemes.length > 0)
                        ? beneficiary.welfareSchemes
                        : (beneficiary.welfareScheme && beneficiary.welfareScheme !== 'NONE' ? [beneficiary.welfareScheme] : []);
                      if (active.length === 0) {
                        return <span className="text-slate-400 text-xs font-semibold">நலத்திட்டம் எதுவும் இல்லை</span>;
                      }
                      return active.map((sch) => {
                        const def = ALL_WELFARE_SCHEMES_LIST.find((s) => s.id === sch);
                        return (
                          <span
                            key={sch}
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              def?.badgeColor || 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {def ? (lang === 'ta' ? def.labelTa.split('(')[0] : def.labelEn) : sch}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">உதவி நிலை:</span>{' '}
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                    {beneficiary.welfareStatus}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200 space-y-1">
                  {beneficiary.isWomanHeadedHousehold && (
                    <div className="text-purple-700 font-bold text-[11px]">
                      👩‍👧 பெண் தலைமைத்துவ குடும்பம்
                    </div>
                  )}
                  {beneficiary.chronicIllness && beneficiary.chronicIllness !== 'NONE' && (
                    <div className="text-red-700 font-bold text-[11px]">
                      🏥 நாள்பட்ட நோய்: {beneficiary.chronicIllness.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
              இந்த டோக்கன் பிரஜை இன்னும் முழுமையான பிரஜைகள் அட்டவணையில் இணைக்கப்படவில்லை.
            </div>
          )}

          {/* SECTION 2: Specialized Welfare Portals Status (Maternity, Elderly, Disability) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Maternity & Nutrition Stamp Status */}
            <div className={`p-3.5 rounded-xl border ${
              citizenMaternity.length > 0 ? 'bg-pink-50/70 border-pink-200' : 'bg-slate-50/70 border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-2 font-bold text-xs text-pink-900">
                <Baby className="w-4 h-4 text-pink-700" />
                <span>கர்ப்பிணித் தாய் & போசணை முத்திரை</span>
              </div>
              {citizenMaternity.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {citizenMaternity.map((m) => {
                    const collected = m.monthlyCollections ? m.monthlyCollections.filter((c) => c.collected).length : 0;
                    return (
                      <div key={m.id} className="p-2 bg-white rounded-lg border border-pink-200 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>முத்திரை இலக்கம்:</span>
                          <strong className="font-mono text-pink-700">#{m.stampNumber || 'Pending'}</strong>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>பிரசவ முறை:</span>
                          <span>{m.pregnancyNumber} வது குழந்தை</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>முன்னேற்றம்:</span>
                          <strong className="font-mono text-emerald-800">{collected}/10 மாதங்கள்</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-100 font-mono">
                          முடிவு: {m.expectedCompletionDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1">கர்ப்பிணித் தாய் பதிவுகள் இல்லை.</p>
              )}
            </div>

            {/* Senior Citizen / Elderly Welfare Card */}
            <div className={`p-3.5 rounded-xl border ${
              isElderlyCitizen ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50/70 border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-2 font-bold text-xs text-amber-900">
                <HeartHandshake className="w-4 h-4 text-amber-700" />
                <span>முதியோர் நலன்புரி விபரம்</span>
              </div>
              {isElderlyCitizen && beneficiary ? (
                <div className="p-2 bg-white rounded-lg border border-amber-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">கொடுப்பனவு நிலை:</span>
                    <strong className="text-amber-900 font-bold">
                      {beneficiary.elderlyAllowanceStatus === 'RECEIVING' ? 'கொடுப்பனவு பெறுகிறார்' : 'விண்ணப்பிக்கவில்லை'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">வசிக்கும் நிலை:</span>
                    <span>{beneficiary.elderlyLivingStatus === 'ALONE' ? 'தனியாக வசிப்பவர்' : 'குடும்பத்துடன்'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">இயங்குதிறன்:</span>
                    <span>{beneficiary.elderlyMobilityStatus || 'சாதாரண நடை'}</span>
                  </div>
                  {beneficiary.elderlyCaretakerName && (
                    <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                      பராமரிப்பாளர்: {beneficiary.elderlyCaretakerName}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1">சிரேஷ்ட பிரஜை விபரங்கள் இல்லை (வயது 60 க்குட்பட்டவர்).</p>
              )}
            </div>

            {/* Disability Welfare Card */}
            <div className={`p-3.5 rounded-xl border ${
              isDisabilityCitizen ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50/70 border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-2 font-bold text-xs text-blue-900">
                <Accessibility className="w-4 h-4 text-blue-700" />
                <span>மாற்றுத்திறனாளிகள் நலன்புரி</span>
              </div>
              {isDisabilityCitizen && beneficiary ? (
                <div className="p-2 bg-white rounded-lg border border-blue-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">குறைபாட்டின் வகை:</span>
                    <strong className="text-blue-950">{beneficiary.disabilityNature || beneficiary.disabilityType || 'உடல் ஊனம்'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">காரணம்:</span>
                    <span>{beneficiary.disabilityCause || 'பிறப்பு / விபத்து'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">கொடுப்பனவு:</span>
                    <span className="font-semibold text-emerald-800">
                      {beneficiary.welfareScheme === 'DISABILITY' ? 'உதவித்தொகை பெறுகிறார்' : 'பரிசீலனையில்'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1">மாற்றுத்திறனாளி விபரங்கள் எதுவும் இல்லை.</p>
              )}
            </div>
          </div>

          {/* SECTION 3: Land Permits & Records */}
          {citizenLand.length > 0 && (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-emerald-950">
                <div className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <span>காணி அனுமதிப்பத்திர பதிவுகள் (Land Permits / LDO Records: {citizenLand.length})</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {citizenLand.map((l) => (
                  <div key={l.id} className="p-2 bg-white rounded-lg border border-emerald-200 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-emerald-950">அனுமதிப்பத்திரம்: #{l.permitNo}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-mono">
                        {l.permitStatus}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      துண்டு எண்: Lot {l.lotNo} · வரைபடம்: {l.planNo} · பரப்பு: {l.extent}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      வகை: {l.landType} · வரி நிலை: {l.annualTaxStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: Family Poverty Score & Household Info */}
          {citizenHousehold && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between text-xs gap-3">
              <div>
                <span className="font-bold text-amber-950">100 புள்ளி வறுமை மதிப்பீடு (Poverty Score):</span>
                <span className="font-mono font-bold text-amber-900 ml-1.5 text-sm">
                  {citizenHousehold.score100 ?? 'N/A'}/100
                </span>
                <span className="text-[11px] text-slate-600 ml-2">
                  முன்னுரிமை நிலை: <strong className="text-slate-900">{citizenHousehold.priorityRank || 'Normal'}</strong>
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                குடும்ப வகை: {citizenHousehold.commonAssets?.isSingleParent ? 'தனி பெற்றோர் (Single Parent)' : 'குடும்பம்'}
              </span>
            </div>
          )}

          {/* SECTION 5: Linked Family Members */}
          {familyCode && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs">
                  <Users className="w-4 h-4 text-blue-700" />
                  <span>இணைக்கப்பட்ட குடும்ப விபரம் (Family Unit: {familyCode})</span>
                </div>
                <span className="text-[10px] font-mono text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 font-bold">
                  {familyMembers.length} குடும்ப உறுப்பினர்கள்
                </span>
              </div>

              {beneficiary?.familyQrPayload && (
                <div className="p-2 bg-white rounded-lg border border-blue-200 font-mono text-[10px] text-blue-900 break-all">
                  <span className="font-bold text-slate-500 block text-[9px]">குடும்ப அலகு பிரத்தியேக கிவ் ஆர் (Family Master QR):</span>
                  {beneficiary.familyQrPayload}
                </div>
              )}

              {familyMembers.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {familyMembers.map((fm) => {
                    const memberSchemes = (fm.welfareSchemes && fm.welfareSchemes.length > 0)
                      ? fm.welfareSchemes
                      : (fm.welfareScheme && fm.welfareScheme !== 'NONE' ? [fm.welfareScheme] : []);

                    return (
                      <div key={fm.id} className="p-2 bg-white rounded-lg border border-blue-100 flex items-center justify-between text-xs gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-slate-900">{fm.nameTa}</strong>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                              {getRelationshipTamilLabel(fm.familyRelationship || (fm.familyHead ? 'HEAD' : 'OTHER'))}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            NIC: {fm.nic} · {calculateAge(fm.dob, fm.nic)} வயது
                          </div>
                        </div>
                        <div className="text-right flex flex-wrap gap-1 justify-end max-w-[180px]">
                          {memberSchemes.map((sch) => {
                            const def = ALL_WELFARE_SCHEMES_LIST.find((s) => s.id === sch);
                            return (
                              <span key={sch} className="text-[9px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                {def ? def.labelTa.split('(')[0] : sch}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  குடும்பத்தின் ஏனைய உறுப்பினர்கள் இன்னும் தனியாக பதிவு செய்யப்படவில்லை.
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: Past DS Office Visits & Queue Tokens */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-emerald-700" />
                <span>பிரதேச செயலக வருகை & டோக்கன் வரலாறு (Past Visits: {pastCitizenTokens.length})</span>
              </div>
            </div>

            {pastCitizenTokens.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {pastCitizenTokens.map((tok) => (
                  <div key={tok.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{tok.tokenNumber}</span> ·{' '}
                      <span className="font-semibold text-slate-800">{tok.officerToMeet}</span>{' '}
                      <span className="text-slate-500">(Counter {tok.counterNo})</span>
                      <div className="text-[10px] text-slate-400">
                        {new Date(tok.issuedAt).toLocaleDateString()} {new Date(tok.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {tok.notes || 'வழக்கமான சேவை'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${tok.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                      {tok.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                இதுவே இந்த பிரஜையின் முதலாவது உத்தியோகபூர்வ வருகை.
              </div>
            )}
          </div>

          {/* SECTION 7: Complete Relief Assistance History */}
          <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-purple-950">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-purple-700" />
                <span>பெறப்பட்ட நிவாரண உதவிகள் (Relief & Assistance History: {pastCitizenAid.length})</span>
              </div>
            </div>

            {pastCitizenAid.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {pastCitizenAid.map((aid) => (
                  <div key={aid.id} className="p-2 bg-white rounded-lg border border-purple-100 flex items-center justify-between text-[11px]">
                    <div>
                      <strong className="text-purple-950 block">{aid.aidDescription}</strong>
                      <span className="text-[10px] text-slate-500">
                        {aid.distributedDate} · {aid.donorOrOrganization}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-purple-900 block">{aid.amountOrValue}</span>
                      <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded">{aid.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                இப்பிரஜைக்கு / குடும்பத்திற்கு இதுவரை எந்த நிவாரண உதவிகளும் வழங்கப்படவில்லை.
              </div>
            )}
          </div>

          {/* Barcode and QR display */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex flex-col items-center flex-1">
              <svg ref={barcodeRef} className="max-w-[220px] h-[40px]"></svg>
            </div>
            {qrSrc && (
              <img
                src={qrSrc}
                alt="Citizen QR"
                className="w-14 h-14 border border-slate-200 p-0.5 rounded bg-white shrink-0"
              />
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 flex-wrap">
          {onPrintCard && beneficiary && (
            <button
              onClick={onPrintCard}
              className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              🪪 {t.printIdCard}
            </button>
          )}
          {onPrintThermal && token && (
            <button
              onClick={onPrintThermal}
              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              🖨️ {t.printThermalReceipt}
            </button>
          )}
          <button
            onClick={onClose}
            className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
