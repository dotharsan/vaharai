import React, { useState, useMemo } from 'react';
import {
  HouseholdData,
  Beneficiary,
  GNDivision,
  User,
  normDivCode,
} from '../types';
import { Language } from '../translations/i18n';
import { calculateAge } from '../services/storage';
import { downloadCsvFile, escapeCsv } from '../services/csv';
import {
  ArrowRightLeft,
  Building2,
  Skull,
  Search,
  CheckCircle2,
  RotateCcw,
  Download,
  Calendar,
  MapPin,
  Users,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface SuperAdminTransfersDeathsViewProps {
  households: HouseholdData[];
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateHouseholds: (items: HouseholdData[]) => void;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

type AdminSectionTab = 'INTERNAL_GN' | 'EXTERNAL_DS' | 'DECEASED';

export const SuperAdminTransfersDeathsView: React.FC<SuperAdminTransfersDeathsViewProps> = ({
  households,
  beneficiaries,
  divisions,
  currentUser,
  lang,
  onUpdateHouseholds,
  onUpdateBeneficiaries,
  onAuditLog,
}) => {
  const isTa = lang !== 'en';
  const [activeTab, setActiveTab] = useState<AdminSectionTab>('INTERNAL_GN');
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [targetDivisionMap, setTargetDivisionMap] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  // Smart default target GN division helper (tries to match typed destination text against division codes/names)
  const inferTargetDivision = (currentDiv: string, destination?: string): string => {
    const destNorm = (destination || '').trim().toUpperCase();
    if (destNorm) {
      const codeMatch = divisions.find(
        (d) =>
          normDivCode(d.code) !== normDivCode(currentDiv) &&
          (destNorm.includes(normDivCode(d.code)) ||
            destNorm.includes((d.nameTa || '').trim().toUpperCase()) ||
            destNorm.includes((d.nameEn || '').trim().toUpperCase()))
      );
      if (codeMatch) return codeMatch.code;
    }
    const fallback = divisions.find((d) => normDivCode(d.code) !== normDivCode(currentDiv) && d.code !== 'GENERAL');
    return fallback?.code || divisions[0]?.code || currentDiv;
  };

  // 1. Internal GN Division Transfers (Pending Super Admin Approval & GN Reassignment)
  const internalGnFamilies = useMemo(() => {
    return households.filter((h) => h.residencyStatus === 'TRANSFERRED_GN');
  }, [households]);

  const internalGnIndividuals = useMemo(() => {
    return beneficiaries.filter((b) => b.status === 'TRANSFERRED' && b.transferScope !== 'EXTERNAL_DS');
  }, [beneficiaries]);

  // 2. External DS Division Transfers (Mandatory deduction date)
  const externalDsFamilies = useMemo(() => {
    return households.filter((h) => h.residencyStatus === 'TRANSFERRED_EXTERNAL_DS');
  }, [households]);

  const externalDsIndividuals = useMemo(() => {
    return beneficiaries.filter((b) => b.status === 'TRANSFERRED' && b.transferScope === 'EXTERNAL_DS');
  }, [beneficiaries]);

  // 3. Deceased Citizens Registry
  const deceasedCitizens = useMemo(() => {
    return beneficiaries.filter((b) => b.status === 'DECEASED');
  }, [beneficiaries]);

  // Filter helper
  const matchesFilter = (item: {
    name?: string;
    nic?: string;
    familyCode?: string;
    divisionCode?: string;
    destination?: string;
  }) => {
    if (divisionFilter !== 'ALL' && normDivCode(item.divisionCode) !== normDivCode(divisionFilter)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.nic || '').toLowerCase().includes(q) ||
      (item.familyCode || '').toLowerCase().includes(q) ||
      (item.destination || '').toLowerCase().includes(q)
    );
  };

  const filteredInternalFamilies = useMemo(
    () =>
      internalGnFamilies.filter((h) =>
        matchesFilter({
          name: `${h.applicantNameTa} ${h.applicantNameEn}`,
          nic: h.applicantNic,
          familyCode: h.familyCode,
          divisionCode: h.divisionCode,
          destination: h.transferDestination,
        })
      ),
    [internalGnFamilies, divisionFilter, searchQuery]
  );

  const filteredInternalIndividuals = useMemo(
    () =>
      internalGnIndividuals.filter((b) =>
        matchesFilter({
          name: `${b.nameTa} ${b.nameEn}`,
          nic: b.nic,
          familyCode: b.familyCode,
          divisionCode: b.divisionCode,
          destination: b.transferDestination || b.transferredToDivision,
        })
      ),
    [internalGnIndividuals, divisionFilter, searchQuery]
  );

  const filteredExternalFamilies = useMemo(
    () =>
      externalDsFamilies.filter((h) =>
        matchesFilter({
          name: `${h.applicantNameTa} ${h.applicantNameEn}`,
          nic: h.applicantNic,
          familyCode: h.familyCode,
          divisionCode: h.divisionCode,
          destination: h.transferDestination,
        })
      ),
    [externalDsFamilies, divisionFilter, searchQuery]
  );

  const filteredExternalIndividuals = useMemo(
    () =>
      externalDsIndividuals.filter((b) =>
        matchesFilter({
          name: `${b.nameTa} ${b.nameEn}`,
          nic: b.nic,
          familyCode: b.familyCode,
          divisionCode: b.divisionCode,
          destination: b.transferDestination || b.transferredToDivision,
        })
      ),
    [externalDsIndividuals, divisionFilter, searchQuery]
  );

  const filteredDeceased = useMemo(
    () =>
      deceasedCitizens.filter((b) =>
        matchesFilter({
          name: `${b.nameTa} ${b.nameEn}`,
          nic: b.nic,
          familyCode: b.familyCode,
          divisionCode: b.divisionCode,
          destination: b.deathCertificateNo,
        })
      ),
    [deceasedCitizens, divisionFilter, searchQuery]
  );

  const getDivLabel = (code?: string) => {
    const d = divisions.find((item) => normDivCode(item.code) === normDivCode(code));
    return d ? `${d.code} - ${isTa ? d.nameTa : d.nameEn}` : code || '—';
  };

  // Super Admin Action: Approve & Reassign Transferred Family to New GN Division
  const handleApproveAndReassignFamily = (h: HouseholdData) => {
    const key = `FAM-${h.id}`;
    const targetDiv = targetDivisionMap[key] || inferTargetDivision(h.divisionCode, h.transferDestination);
    if (!targetDiv) {
      showBanner('error', isTa ? 'புதிய கிராம உத்தியோகத்தர் பிரிவைத் தெரிவுசெய்க.' : 'Select a target GN division.');
      return;
    }

    const now = new Date().toISOString();
    const famKey = (h.familyCode || '').trim().toUpperCase();

    const updatedHouseholds = households.map((item) => {
      if (item.id !== h.id) return item;
      return {
        ...item,
        previousDivisionCode: item.divisionCode,
        divisionCode: targetDiv,
        residencyStatus: 'PERMANENT' as const,
        transferTargetDivisionCode: targetDiv,
        transferApprovedBy: currentUser.name,
        transferApprovedAt: now,
        updatedAt: now,
      };
    });

    const updatedBeneficiaries = beneficiaries.map((b) => {
      const bFamKey = (b.familyCode || b.familyQrPayload || '').trim().toUpperCase();
      if (!famKey || bFamKey !== famKey) return b;
      const shouldReactivate = b.status === 'TRANSFERRED' && b.transferScope !== 'EXTERNAL_DS';
      return {
        ...b,
        previousDivisionCode: b.divisionCode,
        divisionCode: targetDiv,
        status: shouldReactivate ? ('ACTIVE' as const) : b.status,
        transferTargetDivisionCode: targetDiv,
        transferApprovedBy: currentUser.name,
        transferApprovedAt: now,
        updatedAt: now,
      };
    });

    onUpdateHouseholds(updatedHouseholds);
    onUpdateBeneficiaries(updatedBeneficiaries);
    onAuditLog(
      'APPROVE_FAMILY_GN_TRANSFER',
      `Super Admin ${currentUser.name} approved & reassigned family ${h.familyCode} (${h.applicantNameTa}) from GN ${h.divisionCode} to GN ${targetDiv}`
    );
    showBanner(
      'success',
      isTa
        ? `✅ குடும்பம் ${h.familyCode} அனுமதிக்கப்பட்டு GN பிரிவு ${targetDiv} இற்கு மாற்றப்பட்டது! அப்பிரிவு உத்தியோகத்தர் இப்போது பதிவைத் தொடரலாம்.`
        : `✅ Family ${h.familyCode} approved & reassigned to GN Division ${targetDiv}.`
    );
  };

  // Super Admin Action: Restore a Transferred Family back to Active in its current GN Division
  const handleRestoreFamily = (h: HouseholdData) => {
    const now = new Date().toISOString();
    const updatedHouseholds = households.map((item) => {
      if (item.id !== h.id) return item;
      return {
        ...item,
        residencyStatus: 'PERMANENT' as const,
        transferApprovedBy: currentUser.name,
        transferApprovedAt: now,
        updatedAt: now,
      };
    });
    onUpdateHouseholds(updatedHouseholds);
    onAuditLog(
      'RESTORE_TRANSFERRED_FAMILY',
      `Super Admin ${currentUser.name} restored family ${h.familyCode} (${h.applicantNameTa}) to Permanent Resident in GN ${h.divisionCode}`
    );
    showBanner(
      'success',
      isTa
        ? `✅ குடும்பம் ${h.familyCode} மீண்டும் நிரந்தர வதிவாக (GN ${h.divisionCode}) மீட்டமைக்கப்பட்டது.`
        : `✅ Family ${h.familyCode} restored to Permanent Resident in GN ${h.divisionCode}.`
    );
  };

  // Super Admin Action: Approve & Reassign Individual Member to New GN Division
  const handleApproveAndReassignIndividual = (b: Beneficiary) => {
    const key = `IND-${b.id}`;
    const targetDiv =
      targetDivisionMap[key] ||
      inferTargetDivision(b.divisionCode, b.transferDestination || b.transferredToDivision);
    if (!targetDiv) return;

    const now = new Date().toISOString();
    const updated = beneficiaries.map((item) => {
      if (item.id !== b.id) return item;
      return {
        ...item,
        previousDivisionCode: item.divisionCode,
        divisionCode: targetDiv,
        status: 'ACTIVE' as const,
        transferTargetDivisionCode: targetDiv,
        transferApprovedBy: currentUser.name,
        transferApprovedAt: now,
        updatedAt: now,
      };
    });
    onUpdateBeneficiaries(updated);
    onAuditLog(
      'APPROVE_CITIZEN_GN_TRANSFER',
      `Super Admin ${currentUser.name} approved & reassigned citizen ${b.nameTa} (${b.nic}) from GN ${b.divisionCode} to GN ${targetDiv}`
    );
    showBanner(
      'success',
      isTa
        ? `✅ ${b.nameTa} அனுமதிக்கப்பட்டு GN பிரிவு ${targetDiv} இற்கு மாற்றப்பட்டார்.`
        : `✅ ${b.nameTa} approved & reassigned to GN Division ${targetDiv}.`
    );
  };

  // Super Admin Action: Restore Deceased or Transferred Individual back to ACTIVE
  const handleRestoreIndividual = (b: Beneficiary) => {
    const now = new Date().toISOString();
    const updated = beneficiaries.map((item) => {
      if (item.id !== b.id) return item;
      return {
        ...item,
        status: 'ACTIVE' as const,
        updatedAt: now,
      };
    });
    onUpdateBeneficiaries(updated);
    onAuditLog(
      'RESTORE_CITIZEN_ACTIVE',
      `Super Admin ${currentUser.name} restored citizen ${b.nameTa} (${b.nic}) from ${b.status} back to ACTIVE in GN ${b.divisionCode}`
    );
    showBanner(
      'success',
      isTa
        ? `✅ ${b.nameTa} (${b.nic}) மீண்டும் நிரந்தர வதிவு (ACTIVE) நிலைக்கு மீட்டமைக்கப்பட்டார்.`
        : `✅ ${b.nameTa} (${b.nic}) restored to ACTIVE status.`
    );
  };

  const handleExportSectionCsv = () => {
    if (activeTab === 'EXTERNAL_DS') {
      const headers = ['Type', 'Code / ID', 'Name', 'NIC', 'Source GN', 'External DS Destination', 'Deduction Date'];
      const rows = [
        headers.join(','),
        ...filteredExternalFamilies.map((h) =>
          [
            'FAMILY',
            escapeCsv(h.familyCode),
            escapeCsv(h.applicantNameTa),
            escapeCsv(h.applicantNic),
            escapeCsv(h.divisionCode),
            escapeCsv(h.transferDestination || ''),
            escapeCsv(h.transferDate || ''),
          ].join(',')
        ),
        ...filteredExternalIndividuals.map((b) =>
          [
            'INDIVIDUAL',
            escapeCsv(b.familyCode || b.id),
            escapeCsv(b.nameTa),
            escapeCsv(b.nic),
            escapeCsv(b.divisionCode),
            escapeCsv(b.transferDestination || b.transferredToDivision || ''),
            escapeCsv(b.transferDate || b.transferredDate || ''),
          ].join(',')
        ),
      ];
      downloadCsvFile(rows.join('\n'), 'external_ds_transfers_registry.csv');
      return;
    }

    if (activeTab === 'DECEASED') {
      const headers = ['System ID', 'Family Code', 'Name', 'NIC', 'Gender', 'GN Division', 'Death Date', 'Certificate No', 'Remarks'];
      const rows = [
        headers.join(','),
        ...filteredDeceased.map((b) =>
          [
            escapeCsv(b.id),
            escapeCsv(b.familyCode || ''),
            escapeCsv(b.nameTa),
            escapeCsv(b.nic),
            escapeCsv(b.gender),
            escapeCsv(b.divisionCode),
            escapeCsv(b.deathDate || b.deceasedDate || ''),
            escapeCsv(b.deathCertificateNo || ''),
            escapeCsv(b.deathRemarks || ''),
          ].join(',')
        ),
      ];
      downloadCsvFile(rows.join('\n'), 'deceased_citizens_registry.csv');
      return;
    }

    const headers = ['Type', 'Code / ID', 'Name', 'NIC', 'Current GN', 'Requested Destination', 'Transfer Date'];
    const rows = [
      headers.join(','),
      ...filteredInternalFamilies.map((h) =>
        [
          'FAMILY',
          escapeCsv(h.familyCode),
          escapeCsv(h.applicantNameTa),
          escapeCsv(h.applicantNic),
          escapeCsv(h.divisionCode),
          escapeCsv(h.transferDestination || ''),
          escapeCsv(h.transferDate || ''),
        ].join(',')
      ),
      ...filteredInternalIndividuals.map((b) =>
        [
          'INDIVIDUAL',
          escapeCsv(b.familyCode || b.id),
          escapeCsv(b.nameTa),
          escapeCsv(b.nic),
          escapeCsv(b.divisionCode),
          escapeCsv(b.transferDestination || b.transferredToDivision || ''),
          escapeCsv(b.transferDate || b.transferredDate || ''),
        ].join(',')
      ),
    ];
    downloadCsvFile(rows.join('\n'), 'internal_gn_transfers_pending.csv');
  };

  const internalTotal = internalGnFamilies.length + internalGnIndividuals.length;
  const externalTotal = externalDsFamilies.length + externalDsIndividuals.length;
  const deceasedTotal = deceasedCitizens.length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-emerald-800/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-amber-400/20 rounded-lg text-amber-300">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-amber-300">
                SUPER ADMIN · TRANSFERS &amp; DECEASED REGISTRY
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isTa
                ? 'பிரிவு மாற்ற அனுமதி, வெளி பிரதேச செயலக மாற்றம் & மரணப் பதிவேடு'
                : 'GN Transfer Approvals, External DS Transfers & Deceased Registry'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              {isTa
                ? 'உள் கிராம உத்தியோகத்தர் பிரிவு மாற்றங்களுக்கு அனுமதியளித்து புதிய பிரிவை ஒதுக்கவும்; வெளி பிரதேச செயலகத்திற்கு மாற்றப்பட்டோர் மற்றும் மரணமடைந்தோர் விபரங்களை கழிக்கப்பட்ட திகதியுடன் தனித்தனியே கண்காணிக்கவும்.'
                : 'Approve internal GN transfers and reassign target GN divisions; track External DS transfers with mandatory deduction dates and review the dedicated Deceased Registry.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportSectionCsv}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm self-start md:self-center shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isTa ? 'CSV பதிவிறக்கு' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="px-2 font-black">
            ✕
          </button>
        </div>
      )}

      {/* 3 Dedicated Super Admin Menu Cards / Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('INTERNAL_GN')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'INTERNAL_GN'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <span className="font-mono text-2xl font-black text-amber-900">{internalTotal}</span>
          </div>
          <div className="mt-2.5 text-sm font-black text-slate-900">
            {isTa ? '1. உள் GN பிரிவு மாற்ற அனுமதி' : '1. Internal GN Transfers (Pending)'}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            {isTa
              ? `குடும்பங்கள்: ${internalGnFamilies.length} · தனிநபர்கள்: ${internalGnIndividuals.length} — புதிய GN பிரிவை மாற்றி வழங்கலாம்`
              : `Families: ${internalGnFamilies.length} · Individuals: ${internalGnIndividuals.length}`}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EXTERNAL_DS')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'EXTERNAL_DS'
              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
              <Building2 className="w-5 h-5" />
            </span>
            <span className="font-mono text-2xl font-black text-purple-900">{externalTotal}</span>
          </div>
          <div className="mt-2.5 text-sm font-black text-slate-900">
            {isTa ? '2. வெளி பிரதேச செயலக மாற்றங்கள்' : '2. External DS Division Transfers'}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            {isTa
              ? `குடும்பங்கள்: ${externalDsFamilies.length} · தனிநபர்கள்: ${externalDsIndividuals.length} — கழிக்கப்பட்ட திகதியுடன்`
              : `Families: ${externalDsFamilies.length} · Individuals: ${externalDsIndividuals.length}`}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DECEASED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'DECEASED'
              ? 'bg-slate-900 text-white border-slate-950 ring-2 ring-slate-400 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`p-2 rounded-xl ${
                activeTab === 'DECEASED' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-800'
              }`}
            >
              <Skull className="w-5 h-5" />
            </span>
            <span
              className={`font-mono text-2xl font-black ${
                activeTab === 'DECEASED' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {deceasedTotal}
            </span>
          </div>
          <div
            className={`mt-2.5 text-sm font-black ${
              activeTab === 'DECEASED' ? 'text-white' : 'text-slate-900'
            }`}
          >
            {isTa ? '3. மரணப் பதிவேடு (Deceased)' : '3. Deceased Citizens Registry'}
          </div>
          <div
            className={`text-[11px] mt-0.5 ${
              activeTab === 'DECEASED' ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {isTa
              ? 'மொத்த எண்ணிக்கையிலிருந்து கழிக்கப்பட்ட மரணப் பதிவுகள்'
              : 'Deceased individuals deducted from active counts'}
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isTa
                ? 'பெயர், NIC, குடும்ப QR, மாற்றப்பட்ட இடம் மூலம் தேடுக...'
                : 'Search by Name, NIC, Family Code, Destination...'
            }
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>
        <div>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
          >
            <option value="ALL">{isTa ? 'அனைத்து GN பிரிவுகள்' : 'All GN Divisions'}</option>
            {divisions.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} - {isTa ? d.nameTa : d.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= TAB 1: INTERNAL GN DIVISION TRANSFERS (SUPER ADMIN APPROVAL & REASSIGN) ================= */}
      {activeTab === 'INTERNAL_GN' && (
        <div className="space-y-5">
          {/* Families awaiting GN reassignment */}
          <div className="bg-white border border-amber-300 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-800" />
                <h2 className="text-sm font-black text-amber-950">
                  {isTa
                    ? `கிராம உத்தியோகத்தர் பிரிவு மாற்றத்திற்காக காத்திருக்கும் குடும்பங்கள் (${filteredInternalFamilies.length})`
                    : `Families Awaiting GN Division Reassignment (${filteredInternalFamilies.length})`}
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-amber-900">
                {isTa
                  ? 'புதிய GN பிரிவைத் தெரிவுசெய்து அனுமதி வழங்கியவுடன் அப்பிரிவு உத்தியோகத்தரிடம் பதிவு தொடரும்.'
                  : 'Approving transfers the family & its members to the target GN division officer.'}
              </span>
            </div>

            {filteredInternalFamilies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {isTa
                  ? 'உள் GN பிரிவு மாற்றத்திற்காக காத்திருக்கும் குடும்பங்கள் எதுவும் இல்லை.'
                  : 'No families pending internal GN division transfer.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInternalFamilies.map((h) => {
                  const key = `FAM-${h.id}`;
                  const selectedTarget =
                    targetDivisionMap[key] || inferTargetDivision(h.divisionCode, h.transferDestination);
                  const memberCount = beneficiaries.filter((b) => b.familyCode === h.familyCode).length;

                  return (
                    <div
                      key={h.id}
                      className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-amber-50/30"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 border border-emerald-200">
                            {h.familyCode}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {isTa ? 'தற்போதைய பிரிவு:' : 'From:'} {getDivLabel(h.divisionCode)}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {isTa ? 'எங்கு:' : 'To:'} {h.transferDestination || '—'}
                            </span>
                          </span>
                          {h.transferDate && (
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{h.transferDate}</span>
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-black text-slate-900">
                          {h.applicantNameTa}{' '}
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            · NIC: {h.applicantNic} · {isTa ? 'உறுப்பினர்கள்:' : 'Members:'}{' '}
                            {memberCount || h.totalMembersCount}
                          </span>
                        </div>

                        {h.transferRequestedBy && (
                          <div className="text-[11px] text-slate-500">
                            {isTa ? 'கோரிய அலுவலர்:' : 'Requested by:'} {h.transferRequestedBy}
                          </div>
                        )}
                      </div>

                      {/* Super Admin GN Division Reassignment Controls */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={selectedTarget}
                          onChange={(e) =>
                            setTargetDivisionMap((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="px-3 py-2 border border-amber-400 rounded-lg text-xs font-bold bg-white text-slate-900"
                        >
                          {divisions
                            .filter((d) => d.code !== 'GENERAL')
                            .map((d) => (
                              <option key={d.code} value={d.code}>
                                {d.code} - {isTa ? d.nameTa : d.nameEn}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleApproveAndReassignFamily(h)}
                          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isTa ? 'GN பிரிவை மாற்றி அனுமதி வழங்கு' : 'Approve & Assign GN'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestoreFamily(h)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1"
                          title={isTa ? 'பழைய பிரிவிலேயே நிரந்தர வதிவாக மீட்டமை' : 'Restore to original GN'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isTa ? 'மீளப்பெறு' : 'Restore'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Individuals awaiting GN reassignment */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-black text-slate-900">
                {isTa
                  ? `கிராம உத்தியோகத்தர் பிரிவு மாற்றத்திற்கான தனிநபர்கள் (${filteredInternalIndividuals.length})`
                  : `Individual Citizens Pending GN Transfer (${filteredInternalIndividuals.length})`}
              </h2>
            </div>

            {filteredInternalIndividuals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {isTa
                  ? 'GN பிரிவு மாற்றத்திற்கான தனிநபர் பதிவுகள் இல்லை.'
                  : 'No individual citizens pending internal GN transfer.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInternalIndividuals.map((b) => {
                  const key = `IND-${b.id}`;
                  const dest = b.transferDestination || b.transferredToDivision || '';
                  const selectedTarget =
                    targetDivisionMap[key] || inferTargetDivision(b.divisionCode, dest);

                  return (
                    <div
                      key={b.id}
                      className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {b.nic}
                          </span>
                          {b.familyCode && (
                            <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {b.familyCode}
                            </span>
                          )}
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {getDivLabel(b.divisionCode)}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                            {isTa ? 'எங்கு:' : 'To:'} {dest || '—'}
                          </span>
                          {(b.transferDate || b.transferredDate) && (
                            <span className="text-xs font-mono font-bold text-slate-600">
                              📅 {b.transferDate || b.transferredDate}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black text-slate-900">{b.nameTa}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={selectedTarget}
                          onChange={(e) =>
                            setTargetDivisionMap((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                        >
                          {divisions
                            .filter((d) => d.code !== 'GENERAL')
                            .map((d) => (
                              <option key={d.code} value={d.code}>
                                {d.code} - {isTa ? d.nameTa : d.nameEn}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleApproveAndReassignIndividual(b)}
                          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isTa ? 'GN பிரிவிற்கு மாற்று' : 'Approve & Reassign'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestoreIndividual(b)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isTa ? 'மீளப்பெறு' : 'Restore'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: EXTERNAL DS TRANSFERS (DEDICATED SUPER ADMIN SECTION) ================= */}
      {activeTab === 'EXTERNAL_DS' && (
        <div className="space-y-5">
          {/* External DS Families */}
          <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-black text-purple-950">
                {isTa
                  ? `வெளி பிரதேச செயலாளர் பிரிவிற்கு மாற்றப்பட்ட குடும்பங்கள் (${filteredExternalFamilies.length})`
                  : `Families Transferred to External DS Divisions (${filteredExternalFamilies.length})`}
              </h2>
              <span className="text-[11px] font-bold text-purple-900">
                {isTa ? 'மொத்த எண்ணிக்கையிலிருந்து கழிக்கப்பட்டது' : 'Deducted from DS Active Totals'}
              </span>
            </div>

            {filteredExternalFamilies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {isTa
                  ? 'வெளி பிரதேச செயலாளர் பிரிவிற்கு மாற்றப்பட்ட குடும்பங்கள் எதுவும் இல்லை.'
                  : 'No families transferred to external DS divisions.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">{isTa ? 'குடும்ப QR' : 'Family Code'}</th>
                      <th className="py-2.5 px-3">{isTa ? 'குடும்பத் தலைவர் & NIC' : 'Head & NIC'}</th>
                      <th className="py-2.5 px-3">{isTa ? 'முன்னைய GN பிரிவு' : 'Source GN'}</th>
                      <th className="py-2.5 px-3">{isTa ? 'வெளி பிரதேச செயலாளர் பிரிவு' : 'External DS Destination'}</th>
                      <th className="py-2.5 px-3">{isTa ? 'கழிக்கப்படும் திகதி' : 'Deduction Date'}</th>
                      <th className="py-2.5 px-3 text-right">{isTa ? 'நடவடிக்கை' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExternalFamilies.map((h) => (
                      <tr key={h.id} className="hover:bg-purple-50/30">
                        <td className="py-3 px-3 font-mono font-black text-purple-950">{h.familyCode}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{h.applicantNameTa}</div>
                          <div className="font-mono text-[11px] text-slate-500">{h.applicantNic}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold">{getDivLabel(h.divisionCode)}</td>
                        <td className="py-3 px-3 font-bold text-purple-900">
                          {h.transferDestination || '—'}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-rose-800">
                          {h.transferDate || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRestoreFamily(h)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isTa ? 'மீளப்பெறு' : 'Restore'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* External DS Individuals */}
          <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-black text-purple-950">
                {isTa
                  ? `வெளி பிரதேச செயலாளர் பிரிவிற்கு மாற்றப்பட்ட தனிநபர்கள் (${filteredExternalIndividuals.length})`
                  : `Individuals Transferred to External DS Divisions (${filteredExternalIndividuals.length})`}
              </h2>
            </div>

            {filteredExternalIndividuals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {isTa
                  ? 'வெளி பிரதேச செயலாளர் பிரிவிற்கு மாற்றப்பட்ட தனிநபர்கள் எவரும் இல்லை.'
                  : 'No individuals transferred to external DS divisions.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">NIC / ID</th>
                      <th className="py-2.5 px-3">{isTa ? 'பெயர் & குடும்பம்' : 'Name & Family'}</th>
                      <th className="py-2.5 px-3">{isTa ? 'முன்னைய GN பிரிவு' : 'Source GN'}</th>
                      <th className="py-2.5 px-3">{isTa ? 'வெளி பிரதேச செயலகம்' : 'External DS'}</th>
                      <th className="py-2.5 px-3">{isTa ? 'கழிக்கப்படும் திகதி' : 'Deduction Date'}</th>
                      <th className="py-2.5 px-3 text-right">{isTa ? 'நடவடிக்கை' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExternalIndividuals.map((b) => (
                      <tr key={b.id} className="hover:bg-purple-50/30">
                        <td className="py-3 px-3 font-mono font-bold">{b.nic}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{b.nameTa}</div>
                          {b.familyCode && (
                            <div className="font-mono text-[10px] text-slate-500">{b.familyCode}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold">{getDivLabel(b.divisionCode)}</td>
                        <td className="py-3 px-3 font-bold text-purple-900">
                          {b.transferDestination || b.transferredToDivision || '—'}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-rose-800">
                          {b.transferDate || b.transferredDate || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRestoreIndividual(b)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isTa ? 'மீளப்பெறு' : 'Restore'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: DECEASED CITIZENS REGISTRY (DEDICATED SUPER ADMIN MENU) ================= */}
      {activeTab === 'DECEASED' && (
        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-amber-300" />
              <h2 className="text-sm font-black">
                {isTa
                  ? `மரணமடைந்தோர் பதிவேடு — மொத்த எண்ணிக்கையிலிருந்து கழிக்கப்பட்டது (${filteredDeceased.length})`
                  : `Deceased Citizens Registry (${filteredDeceased.length})`}
              </h2>
            </div>
            <span className="text-[11px] text-slate-300">
              {isTa
                ? 'மரணம் என மாற்றப்பட்ட அனைவரும் தானாகவே செயலில் உள்ள எண்ணிக்கையிலிருந்து கழிக்கப்படுவர்.'
                : 'All deceased individuals are automatically deducted from active totals.'}
            </span>
          </div>

          {filteredDeceased.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              {isTa ? 'மரணப் பதிவுகள் எதுவும் இல்லை.' : 'No deceased records found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">NIC / ID</th>
                    <th className="py-2.5 px-3">{isTa ? 'பெயர்' : 'Name'}</th>
                    <th className="py-2.5 px-3">{isTa ? 'வயது / பால்' : 'Age / Gender'}</th>
                    <th className="py-2.5 px-3">{isTa ? 'குடும்ப QR' : 'Family Code'}</th>
                    <th className="py-2.5 px-3">{isTa ? 'GN பிரிவு' : 'GN Division'}</th>
                    <th className="py-2.5 px-3">{isTa ? 'மரணமடைந்த / கழிக்கப்பட்ட திகதி' : 'Death / Deduction Date'}</th>
                    <th className="py-2.5 px-3">{isTa ? 'சான்றிதழ் / குறிப்பு' : 'Certificate / Remarks'}</th>
                    <th className="py-2.5 px-3 text-right">{isTa ? 'நடவடிக்கை' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeceased.map((b) => {
                    const age = calculateAge(b.dob, b.nic);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{b.nic}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{b.nameTa}</div>
                          {b.nameEn && b.nameEn !== b.nameTa && (
                            <div className="text-[10px] text-slate-500">{b.nameEn}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {age} {isTa ? 'வயது' : 'yrs'} · {b.gender === 'MALE' ? 'ஆண்' : 'பெண்'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-900">
                          {b.familyCode || '—'}
                        </td>
                        <td className="py-3 px-3 font-semibold">{getDivLabel(b.divisionCode)}</td>
                        <td className="py-3 px-3 font-mono font-black text-rose-800">
                          {b.deathDate || b.deceasedDate || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {b.deathCertificateNo && (
                            <div className="font-mono font-bold text-slate-800">{b.deathCertificateNo}</div>
                          )}
                          {b.deathRemarks && <div className="text-[11px]">{b.deathRemarks}</div>}
                          {!b.deathCertificateNo && !b.deathRemarks && '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRestoreIndividual(b)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isTa ? 'மீளப்பெறு' : 'Restore Active'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
