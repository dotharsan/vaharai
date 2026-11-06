import React, { useState, useEffect } from 'react';
import {
  User,
  DSDivision,
  BATTICALOA_DS_DIVISIONS,
  GNDivision,
  Beneficiary,
  QueueToken,
  HouseholdData,
  PublicPetition,
} from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import {
  loadDsDivisions,
  saveDsDivisions,
  calculateAge,
} from '../services/storage';
import { PrintableFilteredReportModal } from './PrintableFilteredReportModal';
import { CitizenProfileModal } from './CitizenProfileModal';
import {
  ShieldCheck,
  Building2,
  Users,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Eye,
  BarChart3,
  Search,
  Sparkles,
  MapPin,
  Layers,
  FileText,
  Clock,
  Phone,
  Mail,
  Printer,
  PlusCircle,
  Filter,
  X,
  XCircle,
  ChevronRight,
  Info,
  ExternalLink,
  Shield,
  LayoutDashboard,
  UserCheck,
} from 'lucide-react';

interface DistrictMasterAdminViewProps {
  currentUser: User;
  users: User[];
  divisions: GNDivision[];
  beneficiaries: Beneficiary[];
  tokens: QueueToken[];
  households: HouseholdData[];
  petitions?: PublicPetition[];
  lang: Language;
  onUpdateUsers: (users: User[]) => void;
  onAuditLog: (action: string, details: string) => void;
  onSelectDivisionToInspect?: (dsDivisionId: string) => void;
  onSelectDsDivision?: (dsDivisionId: string) => void;
}

export const DistrictMasterAdminView: React.FC<DistrictMasterAdminViewProps> = ({
  currentUser,
  users,
  divisions,
  beneficiaries,
  tokens,
  households,
  petitions = [],
  lang,
  onUpdateUsers,
  onAuditLog,
  onSelectDivisionToInspect,
  onSelectDsDivision,
}) => {
  const t = translations[lang];

  // Sub-menu Tab State: 'dashboard' | 'superadmins' | 'oversight'
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'superadmins' | 'oversight'>('dashboard');

  // DS Divisions loaded from persistent storage
  const [dsList, setDsList] = useState<DSDivision[]>(() => loadDsDivisions());

  // Search & Filter for Super Admins Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Password Reset Modal State
  const [resetModalSuperAdmin, setResetModalSuperAdmin] = useState<{ ds: DSDivision; user: User } | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Add New DS Division Modal State
  const [showAddDsModal, setShowAddDsModal] = useState(false);
  const [newDsCode, setNewDsCode] = useState('');
  const [newDsNameTa, setNewDsNameTa] = useState('');
  const [newDsNameEn, setNewDsNameEn] = useState('');
  const [newDsHeadquarters, setNewDsHeadquarters] = useState('');
  const [newDsGnCount, setNewDsGnCount] = useState<number>(20);
  const [newSuperAdminId, setNewSuperAdminId] = useState('');
  const [newSuperAdminName, setNewSuperAdminName] = useState('');
  const [newSuperAdminPassword, setNewSuperAdminPassword] = useState('admin123');
  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState('');
  const [newSuperAdminPhone, setNewSuperAdminPhone] = useState('');

  // Citizen Oversight Filters
  const [oversightDsFilter, setOversightDsFilter] = useState<string>('ALL');
  const [oversightGnFilter, setOversightGnFilter] = useState<string>('ALL');
  const [oversightWelfareFilter, setOversightWelfareFilter] = useState<string>('ALL');
  const [oversightSearch, setOversightSearch] = useState<string>('');

  // Modals for Citizen Oversight
  const [selectedCitizenForModal, setSelectedCitizenForModal] = useState<Beneficiary | null>(null);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSelectDivision = (dsId: string) => {
    if (onSelectDivisionToInspect) onSelectDivisionToInspect(dsId);
    if (onSelectDsDivision) onSelectDsDivision(dsId);
  };

  // Keep dsList synced if changed
  useEffect(() => {
    setDsList(loadDsDivisions());
  }, []);

  // Total District Targets
  const totalAllocatedGns = dsList.reduce((acc, d) => acc + d.allocatedGnCount, 0);
  const totalRegisteredGns = divisions.length;
  const totalCitizens = beneficiaries.length;
  const totalTokens = tokens.length;
  const totalHouseholds = households.length;
  const totalPetitions = petitions.length;

  // Find user for a given Super Admin ID
  const getSuperAdminUser = (superAdminId: string, dsId: string): User | undefined => {
    return users.find(
      (u) =>
        u.id === superAdminId ||
        (u.role === 'SUPERADMIN' && (u.dsDivisionId === dsId || u.id === superAdminId))
    );
  };

  // Active / Block toggle for a Super Admin
  const toggleSuperAdminStatus = (ds: DSDivision) => {
    const targetUser = getSuperAdminUser(ds.superAdminId, ds.id);
    if (!targetUser) {
      showToast(
        lang === 'ta'
          ? `${ds.nameTa} சுப்பர் அட்மின் கணக்கு இன்னும் உருவாக்கப்படவில்லை.`
          : `Super Admin account for ${ds.nameEn} not found.`
      );
      return;
    }

    const nextStatus: 'ACTIVE' | 'INACTIVE' = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updatedUsers = users.map((u) => {
      if (u.id === targetUser.id) {
        return { ...u, status: nextStatus };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    const actionLabel = nextStatus === 'ACTIVE' ? 'ACTIVATED' : 'BLOCKED';
    onAuditLog(
      `DISTRICT_ADMIN_${actionLabel}_SUPERADMIN`,
      `District Master Admin ${nextStatus === 'ACTIVE' ? 'activated' : 'blocked'} Super Admin ${targetUser.name} (${ds.nameEn})`
    );

    showToast(
      lang === 'ta'
        ? `${ds.nameTa} பிரதேச செயலாளர் கணக்கு ${nextStatus === 'ACTIVE' ? 'செயற்படுத்தப்பட்டது (Active)' : 'முடக்கப்பட்டது (Blocked)'}!`
        : `${ds.nameEn} Super Admin account has been ${nextStatus === 'ACTIVE' ? 'activated' : 'blocked'}!`
    );
  };

  // Handle Save Password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalSuperAdmin || !newPasswordVal.trim()) return;

    const updatedUsers = users.map((u) => {
      if (u.id === resetModalSuperAdmin.user.id) {
        return { ...u, password: newPasswordVal.trim() };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    onAuditLog(
      'DISTRICT_ADMIN_RESET_PASSWORD',
      `District Master Admin reset password for Super Admin ${resetModalSuperAdmin.user.name} (${resetModalSuperAdmin.ds.nameEn})`
    );

    setResetModalSuperAdmin(null);
    setNewPasswordVal('');
    showToast(
      lang === 'ta'
        ? `${resetModalSuperAdmin.ds.nameTa} பிரதேச செயலாளரின் கடவுச்சொல் மாற்றப்பட்டது!`
        : `Password updated for ${resetModalSuperAdmin.ds.nameEn} Super Admin!`
    );
  };

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let res = '';
    for (let i = 0; i < 9; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordVal(res);
  };

  const generateNewDsPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let res = '';
    for (let i = 0; i < 9; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewSuperAdminPassword(res);
  };

  // Handle Add New DS Division
  const handleCreateNewDsDivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDsNameTa.trim() || !newDsNameEn.trim() || !newSuperAdminId.trim()) {
      showToast(lang === 'ta' ? 'அனைத்து கட்டாய விபரங்களையும் நிரப்புக.' : 'Please fill all required fields.');
      return;
    }

    // Generate safe IDs
    const dsId = `DS_${newDsCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_') || Date.now()}`;
    const code = newDsCode.trim().toUpperCase() || `DS_${dsList.length + 1}`;

    // Check duplicate
    if (dsList.some((d) => d.id === dsId || d.code.toUpperCase() === code.toUpperCase())) {
      showToast(lang === 'ta' ? 'இக்குறியீட்டில் ஏற்கனவே பிரதேச செயலகம் உள்ளது!' : 'DS Division with this code already exists!');
      return;
    }

    const cleanSuperAdminId = newSuperAdminId.trim().toLowerCase().replace(/\s+/g, '_');
    if (users.some((u) => u.id.toLowerCase() === cleanSuperAdminId)) {
      showToast(lang === 'ta' ? 'இப்பயனர் ID ஏற்கனவே பயன்பாட்டில் உள்ளது!' : 'Super Admin User ID already exists!');
      return;
    }

    const newDs: DSDivision = {
      id: dsId,
      code,
      nameTa: newDsNameTa.trim(),
      nameEn: newDsNameEn.trim(),
      allocatedGnCount: Number(newDsGnCount) || 20,
      headquartersTa: newDsHeadquarters.trim() || newDsNameTa.trim(),
      headquartersEn: newDsHeadquarters.trim() || newDsNameEn.trim(),
      superAdminId: cleanSuperAdminId,
      superAdminNameTa: newSuperAdminName.trim() || `பிரதேச செயலாளர் (${newDsNameTa.trim()})`,
      superAdminNameEn: `Divisional Secretary (${newDsNameEn.trim()})`,
    };

    const newSuperAdminUser: User = {
      id: cleanSuperAdminId,
      name: newSuperAdminName.trim() || `Divisional Secretary - ${newDsNameEn.trim()}`,
      role: 'SUPERADMIN',
      status: 'ACTIVE',
      password: newSuperAdminPassword.trim() || 'admin123',
      dsDivisionId: dsId,
      email: newSuperAdminEmail.trim() || `${cleanSuperAdminId}@batticaloa.dist.gov.lk`,
      phone: newSuperAdminPhone.trim() || '065-2222222',
      createdAt: new Date().toISOString(),
    };

    const updatedDsList = [...dsList, newDs];
    setDsList(updatedDsList);
    saveDsDivisions(updatedDsList);

    const updatedUsers = [...users, newSuperAdminUser];
    onUpdateUsers(updatedUsers);

    onAuditLog(
      'DISTRICT_ADMIN_CREATE_DS_DIVISION',
      `District Master Admin created new DS Division ${newDs.nameEn} (${newDs.code}) and Super Admin ${newSuperAdminUser.id}`
    );

    // Reset Form & Close
    setNewDsCode('');
    setNewDsNameTa('');
    setNewDsNameEn('');
    setNewDsHeadquarters('');
    setNewDsGnCount(20);
    setNewSuperAdminId('');
    setNewSuperAdminName('');
    setNewSuperAdminPassword('admin123');
    setNewSuperAdminEmail('');
    setNewSuperAdminPhone('');
    setShowAddDsModal(false);

    showToast(
      lang === 'ta'
        ? `புதிய பிரதேச செயலகப் பிரிவு "${newDs.nameTa}" வெற்றிகரமாக உருவாக்கப்பட்டது!`
        : `New DS Division "${newDs.nameEn}" successfully added!`
    );
  };

  // Filtered Divisions for Super Admins Tab
  const filteredDivisions = dsList.filter((ds) => {
    const matchesSearch =
      ds.nameTa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ds.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ds.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ds.superAdminId.toLowerCase().includes(searchTerm.toLowerCase());

    const superUser = getSuperAdminUser(ds.superAdminId, ds.id);
    const currentStatus = superUser?.status || 'ACTIVE';
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && currentStatus === 'ACTIVE') ||
      (statusFilter === 'INACTIVE' && currentStatus === 'INACTIVE');

    return matchesSearch && matchesStatus;
  });

  // Welfare Scheme Checkers
  const checkIsAswesuma = (b: Beneficiary) =>
    Boolean(b.welfareScheme?.startsWith('ASWESUMA') || b.welfareSchemes?.some((s) => s.startsWith('ASWESUMA')));

  const checkIsElderly = (b: Beneficiary) =>
    Boolean(b.isElderly || b.welfareScheme === 'ELDERLY' || b.welfareSchemes?.includes('ELDERLY'));

  const checkIsDisability = (b: Beneficiary) =>
    Boolean(b.isPersonWithDisability || b.welfareScheme === 'DISABILITY' || b.welfareSchemes?.includes('DISABILITY'));

  const checkIsPregnant = (b: Beneficiary) =>
    Boolean(b.isPregnantMother || b.welfareScheme === 'PREGNANT_NUTRITION' || b.welfareSchemes?.includes('PREGNANT_NUTRITION'));

  const checkIsSamurdhi = (b: Beneficiary) =>
    Boolean(b.isSamurdhiBeneficiary || b.welfareScheme === 'SAMURDHI' || b.welfareSchemes?.includes('SAMURDHI'));

  const checkIsKidney = (b: Beneficiary) =>
    Boolean(b.chronicIllness === 'CKD_KIDNEY' || b.welfareScheme === 'CHRONIC_KIDNEY' || b.welfareSchemes?.includes('CHRONIC_KIDNEY'));

  // Filtered Citizens for Citizen Oversight Tab (Strict Read-Only)
  const filteredCitizens = beneficiaries.filter((b) => {
    // DS Division Filter
    if (oversightDsFilter !== 'ALL') {
      const bDsId = b.dsDivisionId || 'DS_VAHARAI';
      if (bDsId !== oversightDsFilter) return false;
    }

    // GN Division Filter
    if (oversightGnFilter !== 'ALL' && b.divisionCode !== oversightGnFilter) {
      return false;
    }

    // Welfare Category Filter
    if (oversightWelfareFilter !== 'ALL') {
      const wf = oversightWelfareFilter;
      if (wf === 'ASWESUMA' && !checkIsAswesuma(b)) return false;
      if (wf === 'ELDERLY' && !checkIsElderly(b)) return false;
      if (wf === 'DISABILITY' && !checkIsDisability(b)) return false;
      if (wf === 'PREGNANT' && !checkIsPregnant(b)) return false;
      if (wf === 'SAMURDHI' && !checkIsSamurdhi(b)) return false;
      if (wf === 'KIDNEY' && !checkIsKidney(b)) return false;
    }

    // Search Query (NIC, Name, Phone, Family Number)
    if (oversightSearch.trim()) {
      const q = oversightSearch.toLowerCase().trim();
      const matchNic = b.nic?.toLowerCase().includes(q);
      const matchName = b.nameEn?.toLowerCase().includes(q) || b.nameTa?.toLowerCase().includes(q);
      const matchPhone = b.phone?.includes(q);
      const famId = b.familyCode || b.householdNo;
      const matchFam = famId?.toLowerCase().includes(q);
      if (!matchNic && !matchName && !matchPhone && !matchFam) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Official Apex Header Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-[radial-gradient(ellipse_at_top_right,#10b981_0%,transparent_70%)] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-2 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <VaharaiLogo size={52} className="w-13 h-13" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  {lang === 'ta' ? 'இலங்கை அரசாங்கம் · மாவட்ட செயலக தலைமை தளம்' : 'Government of Sri Lanka · District HQ Portal'}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  {dsList.length} DS DIVISIONS
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
                {lang === 'ta' ? 'மட்டக்களப்பு மாவட்ட செயலகம்' : 'Batticaloa District Secretariat'}
              </h1>
              <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
                {lang === 'ta'
                  ? 'மாவட்டத்தின் 14 பிரதேச செயலகங்கள், சுப்பர் அட்மின்கள் கட்டுப்பாடு (Active/Block), மேற்பார்வை பகுப்பாய்வு மற்றும் உத்தியோகபூர்வ ஒருங்கிணைப்பு தளம்.'
                  : 'Central apex portal overseeing Batticaloa District with 14 Divisional Secretariats, Super Admins Active/Block controls, and cross-divisional oversight analytics.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-black/30 p-2.5 rounded-xl border border-white/10 shrink-0">
            <div className="text-right px-3 py-1">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                {lang === 'ta' ? 'தலைமை அட்மின்' : 'Master Admin'}
              </div>
              <div className="text-xs font-mono font-bold text-amber-300">
                {currentUser.name}
              </div>
            </div>
          </div>
        </div>

        {/* 4 District Core Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">{lang === 'ta' ? 'பிரதேச செயலகங்கள்' : 'Divisional Secretariats'}</span>
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white">{dsList.length} <span className="text-xs font-normal text-slate-400">/ 14</span></div>
            <div className="text-[10px] text-emerald-400 mt-0.5">100% {lang === 'ta' ? 'இணைக்கப்பட்டுள்ளது' : 'Covered'}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">{lang === 'ta' ? 'கிராம அலுவலர் பிரிவுகள்' : 'GN Divisions'}</span>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white">
              {totalRegisteredGns} <span className="text-xs font-normal text-slate-400">/ {totalAllocatedGns}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{totalAllocatedGns} {lang === 'ta' ? 'அங்கீகரிக்கப்பட்ட பிரிவுகள்' : 'Gazette Total'}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">{lang === 'ta' ? 'பதிவான பிரஜைகள்' : 'Total Citizens'}</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-white">{totalCitizens}</div>
            <div className="text-[10px] text-cyan-300 mt-0.5">{totalHouseholds} {lang === 'ta' ? 'குடும்பங்கள்' : 'Households'}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">{lang === 'ta' ? 'இன்றைய டோக்கன்கள்' : 'Today Tokens'}</span>
              <FileText className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-black text-white">{totalTokens}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{totalPetitions} {lang === 'ta' ? 'முறைப்பாடுகள்' : 'Petitions'}</div>
          </div>
        </div>
      </div>

      {/* District Admin Sub-Menu Navigation Bar (Directly fulfills user request) */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'dashboard'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{lang === 'ta' ? 'மாவட்ட டேஷ்போர்டு & மேலோட்டம்' : 'District Dashboard & Overview'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('superadmins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'superadmins'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{lang === 'ta' ? '14 பிரதேச செயலக பயனர்கள் & அட்மின்கள்' : '14 DS Super Admins & Divisions'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'superadmins' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
            {dsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('oversight')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'oversight'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>{lang === 'ta' ? 'பிரஜைகள் மேற்பார்வை, பில்டர் & அச்சு' : 'Citizens Oversight, Filters & Print'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'oversight' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
            {beneficiaries.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: DISTRICT DASHBOARD & OVERVIEW */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-800" />
                <span>{lang === 'ta' ? 'மட்டக்களப்பு மாவட்ட பிரதேச செயலகங்களின் மேலோட்டம்' : 'Batticaloa District Secretariats Breakdown'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ta'
                  ? 'ஒவ்வொரு பிரதேச செயலகத்தின் பதிவு நிலவரங்கள், கிராம அலுவலர் பிரிவுகள் மற்றும் சேவை பரிவர்த்தனைகள்.'
                  : 'Real-time performance, registered citizen metrics, and token operations across all Divisional Secretariats.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('superadmins')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'ta' ? 'பயனர் கட்டுப்பாடு (Active/Block)' : 'Manage Super Admins'}</span>
              </button>
              <button
                onClick={() => setShowAddDsModal(true)}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{lang === 'ta' ? '+ புதிய பிரதேச செயலகம் சேர்க்க' : '+ Add New DS Division'}</span>
              </button>
            </div>
          </div>

          {/* 14 DS Division Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dsList.map((ds) => {
              const superUser = getSuperAdminUser(ds.superAdminId, ds.id);
              const isActive = superUser?.status !== 'INACTIVE';
              const dsGns = divisions.filter((d) => d.dsDivisionId === ds.id);
              const dsCitizens = beneficiaries.filter((b) => b.dsDivisionId === ds.id || (!b.dsDivisionId && ds.id === 'DS_VAHARAI'));
              const dsTokens = tokens.filter((t) => t.dsDivisionId === ds.id || (!t.dsDivisionId && ds.id === 'DS_VAHARAI'));
              const dsStaffCount = users.filter((u) => u.dsDivisionId === ds.id && u.role !== 'SUPERADMIN').length;
              const coveragePct = Math.min(100, Math.round((dsGns.length / (ds.allocatedGnCount || 1)) * 100));

              return (
                <div
                  key={ds.id}
                  className={`bg-white rounded-xl border transition-all p-4.5 shadow-xs hover:shadow-md flex flex-col justify-between ${
                    !isActive ? 'border-red-200 bg-red-50/20' : 'border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <div>
                    {/* Header: Code & Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {ds.code}
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Blocked</span>
                        </span>
                      )}
                    </div>

                    {/* DS Name */}
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {lang === 'ta' ? ds.nameTa : ds.nameEn}
                    </h3>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{ds.headquartersTa || ds.headquartersEn || ds.nameEn}</span>
                      <span>·</span>
                      <span className="text-slate-600 font-medium">{lang === 'ta' ? ds.nameEn : ds.nameTa}</span>
                    </div>

                    {/* Super Admin Info */}
                    <div className="bg-slate-50 rounded-lg p-2.5 mt-3 border border-slate-100 text-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        {lang === 'ta' ? 'சுப்பர் அட்மின்' : 'Super Admin'}
                      </div>
                      <div className="font-semibold text-slate-800 truncate mt-0.5">
                        {superUser?.name || ds.superAdminNameTa}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                        ID: {ds.superAdminId}
                      </div>
                    </div>

                    {/* Progress & Metrics */}
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{lang === 'ta' ? 'GN பிரிவுகள் பதிவு' : 'GN Units'}</span>
                          <span className="font-bold text-slate-800">
                            {dsGns.length} / {ds.allocatedGnCount} ({coveragePct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${coveragePct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div className="bg-slate-50/70 rounded-lg py-1 px-1.5">
                          <div className="text-xs font-black text-slate-900">{dsCitizens.length}</div>
                          <div className="text-[9px] text-slate-500 uppercase">{lang === 'ta' ? 'பிரஜைகள்' : 'Citizens'}</div>
                        </div>
                        <div className="bg-slate-50/70 rounded-lg py-1 px-1.5">
                          <div className="text-xs font-black text-slate-900">{dsTokens.length}</div>
                          <div className="text-[9px] text-slate-500 uppercase">{lang === 'ta' ? 'டோக்கன்' : 'Tokens'}</div>
                        </div>
                        <div className="bg-slate-50/70 rounded-lg py-1 px-1.5">
                          <div className="text-xs font-black text-slate-900">{dsStaffCount}</div>
                          <div className="text-[9px] text-slate-500 uppercase">{lang === 'ta' ? 'அலுவலர்' : 'Staff'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleSuperAdminStatus(ds)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? 'text-amber-800 hover:bg-amber-100 bg-amber-50 border border-amber-200'
                          : 'text-emerald-800 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200'
                      }`}
                      title={isActive ? 'Block Super Admin' : 'Activate Super Admin'}
                    >
                      {isActive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{isActive ? (lang === 'ta' ? 'முடக்கு' : 'Block') : (lang === 'ta' ? 'செயற்படுத்து' : 'Activate')}</span>
                    </button>

                    <button
                      onClick={() => handleSelectDivision(ds.id)}
                      className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span>{lang === 'ta' ? 'மேற்பார்வை' : 'Inspect'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 14 DS SUPER ADMINS & DIVISIONS GOVERNANCE */}
      {activeSubTab === 'superadmins' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table Filter & Action Strip */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                  <h2 className="text-base font-bold text-slate-900">
                    {lang === 'ta'
                      ? '14 பிரதேச செயலாளர்கள் மேலாண்மை & பயனர் கட்டுப்பாடு'
                      : '14 Divisional Super Admins Access & Governance'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'ta'
                    ? 'மாவட்ட செயலக தலைமை அட்மினின் ஊடாக 14 சுப்பர் அட்மின்களை செயற்படுத்தவும் (Active) அல்லது முடக்கவும் (Block) முடியும். புதிய பிரதேச செயலகப் பிரிவுகளையும் இணைக்கலாம்.'
                    : 'District Master Admin controls Active/Blocked status, resets passwords, and can add new Divisional Secretariat divisions.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={lang === 'ta' ? 'பிரதேசம் / ID தேடுக...' : 'Search division / ID...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="ALL">{lang === 'ta' ? 'அனைத்து நிலைகளும்' : 'All Status'}</option>
                  <option value="ACTIVE">{lang === 'ta' ? 'செயற்பாட்டில் (Active)' : 'Active'}</option>
                  <option value="INACTIVE">{lang === 'ta' ? 'முடக்கப்பட்டது (Blocked)' : 'Blocked'}</option>
                </select>

                {/* Add New DS Division Button */}
                <button
                  onClick={() => setShowAddDsModal(true)}
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? '+ புதிய பிரதேச செயலகம் சேர்க்க' : '+ Add New DS'}</span>
                </button>
              </div>
            </div>

            {/* Super Admins Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4"># குறியீடு</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'பிரதேச செயலகம் & தலைமையகம்' : 'Divisional Secretariat & HQ'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'சுப்பர் அட்மின் பயனர் ID' : 'Super Admin ID'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'GN பிரிவுகள் (பதிவு / ஒதுக்கீடு)' : 'GN Divisions'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'பிரஜைகள்' : 'Citizens'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'யூசர் நிலை (Active / Block)' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{lang === 'ta' ? 'நிர்வாக அதிகார நடவடிக்கைகள்' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDivisions.map((ds) => {
                    const superUser = getSuperAdminUser(ds.superAdminId, ds.id);
                    const isActive = superUser?.status !== 'INACTIVE';
                    const dsGns = divisions.filter((d) => d.dsDivisionId === ds.id);
                    const dsCitizens = beneficiaries.filter((b) => b.dsDivisionId === ds.id || (!b.dsDivisionId && ds.id === 'DS_VAHARAI'));
                    const dsStaffCount = users.filter((u) => u.dsDivisionId === ds.id && u.role !== 'SUPERADMIN').length;

                    return (
                      <tr key={ds.id} className={`hover:bg-slate-50/80 transition-colors ${!isActive ? 'bg-red-50/40' : ''}`}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">
                          {ds.code}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {lang === 'ta' ? ds.nameTa : ds.nameEn}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{lang === 'ta' ? ds.nameEn : ds.nameTa}</span>
                            <span>·</span>
                            <span className="text-slate-600 font-semibold">{ds.headquartersTa || ds.headquartersEn || ds.nameEn}</span>
                            <span>·</span>
                            <span className="text-emerald-700 font-semibold">{dsStaffCount} {lang === 'ta' ? 'அலுவலர்கள்' : 'Staff'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ds.superAdminId}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {superUser?.name || ds.superAdminNameTa}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {dsGns.length}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="font-semibold text-slate-600">
                              {ds.allocatedGnCount}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {Math.round((dsGns.length / (ds.allocatedGnCount || 1)) * 100)}%
                            </span>
                          </div>
                          <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.round((dsGns.length / (ds.allocatedGnCount || 1)) * 100))}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{dsCitizens.length}</span>
                          <span className="text-[10px] text-slate-400 block">{lang === 'ta' ? 'பதிவுகள்' : 'records'}</span>
                        </td>

                        <td className="py-3 px-4">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              <span>{lang === 'ta' ? 'செயற்பாட்டில்' : 'Active'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              <Lock className="w-3 h-3" />
                              <span>{lang === 'ta' ? 'முடக்கப்பட்டது' : 'Blocked'}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Active / Block Toggle Button */}
                            <button
                              onClick={() => toggleSuperAdminStatus(ds)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                isActive
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                              }`}
                              title={isActive ? 'Block Super Admin Account' : 'Activate Super Admin Account'}
                            >
                              {isActive ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-amber-800" />
                                  <span>{lang === 'ta' ? 'முடக்கு' : 'Block'}</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>{lang === 'ta' ? 'செயற்படுத்து' : 'Activate'}</span>
                                </>
                              )}
                            </button>

                            {/* Reset Password Button */}
                            {superUser && (
                              <button
                                onClick={() => {
                                  setResetModalSuperAdmin({ ds, user: superUser });
                                  setNewPasswordVal(superUser.password || 'admin123');
                                }}
                                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title={lang === 'ta' ? 'கடவுச்சொல் மாற்று' : 'Reset Password'}
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Inspect / Jump to Division Button */}
                            <button
                              onClick={() => handleSelectDivision(ds.id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title={lang === 'ta' ? 'இப்பிரதேச தரவுகளை மேற்பார்வையிடு' : 'Inspect Division Data'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">{lang === 'ta' ? 'மேற்பார்வை' : 'Inspect'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CITIZEN OVERSIGHT, FILTERS & OFFICIAL PRINT (STRICT READ-ONLY) */}
      {activeSubTab === 'oversight' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Official District Oversight Mode Notice Banner */}
          <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
            <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-amber-950 flex items-center gap-2">
                <span>{lang === 'ta' ? 'மாவட்ட செயலக மேற்பார்வை & அறிக்கையிடல் முறைமை' : 'District Secretariat Oversight & Reporting Mode'}</span>
                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  READ-ONLY / மேற்பார்வை மட்டும்
                </span>
              </div>
              <p className="mt-1 text-amber-800">
                {lang === 'ta'
                  ? 'மாவட்ட செயலகத்திற்கு எந்தவொரு பிரஜையையும் சேர்க்கும் அல்லது திருத்தும் அதிகாரம் தேவையில்லை. குறித்த பிரதேச செயலக தரவை அந்தந்த பிரதேச செயலக சுப்பர் அட்மினால் மட்டுமே மாற்ற இயலும். இங்கு 14 பிரதேச செயலகங்களின் தரவுகளை முழுமையாக மேற்பார்வையிடவும் (Oversight), வடிகட்டவும் (Filter), மற்றும் உத்தியோகபூர்வ அரச அறிக்கையாக அச்சிடவும் (Print) மட்டுமே முடியும்.'
                  : 'The District Secretariat operates strictly in Oversight Mode without citizen creation or modification rights. Divisional records can only be mutated by their respective Divisional Secretariat Super Admin. Master Admin has complete search, filtering, and official printing capabilities.'}
              </p>
            </div>
          </div>

          {/* Filters & Print Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 flex-1">
                {/* 1. DS Division Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {lang === 'ta' ? 'பிரதேச செயலகம்' : 'DS Division'}
                  </label>
                  <select
                    value={oversightDsFilter}
                    onChange={(e) => {
                      setOversightDsFilter(e.target.value);
                      setOversightGnFilter('ALL');
                    }}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்து பிரதேச செயலகங்களும் (All 14)' : 'All Divisional Secretariats'}</option>
                    {dsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {lang === 'ta' ? d.nameTa : d.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. GN Division Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {lang === 'ta' ? 'GN பிரிவு' : 'GN Division'}
                  </label>
                  <select
                    value={oversightGnFilter}
                    onChange={(e) => setOversightGnFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்து GN பிரிவுகளும்' : 'All GN Divisions'}</option>
                    {divisions
                      .filter((d) => oversightDsFilter === 'ALL' || d.dsDivisionId === oversightDsFilter)
                      .map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {lang === 'ta' ? d.nameTa : d.nameEn}
                        </option>
                      ))}
                  </select>
                </div>

                {/* 3. Welfare Category Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {lang === 'ta' ? 'நலன்புரி திட்டம்' : 'Welfare Scheme'}
                  </label>
                  <select
                    value={oversightWelfareFilter}
                    onChange={(e) => setOversightWelfareFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="ALL">{lang === 'ta' ? 'அனைத்து நலன்புரி திட்டங்களும்' : 'All Welfare Schemes'}</option>
                    <option value="ASWESUMA">{lang === 'ta' ? 'அஸ்வெசும (Aswesuma)' : 'Aswesuma'}</option>
                    <option value="ELDERLY">{lang === 'ta' ? 'முதியோர் கொடுப்பனவு (70+)' : 'Elderly Allowance'}</option>
                    <option value="DISABILITY">{lang === 'ta' ? 'மாற்றுத்திறனாளிகள் (Disability)' : 'Disability Scheme'}</option>
                    <option value="PREGNANT">{lang === 'ta' ? 'கர்ப்பிணித் தாய்மார் (Maternity)' : 'Pregnant Mothers'}</option>
                    <option value="SAMURDHI">{lang === 'ta' ? 'சமூர்த்தி (Samurdhi)' : 'Samurdhi'}</option>
                    <option value="KIDNEY">{lang === 'ta' ? 'சிறுநீரக நோய் உதவி (Kidney)' : 'Kidney Relief'}</option>
                  </select>
                </div>

                {/* 4. Search Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {lang === 'ta' ? 'NIC / பெயர் / தொலைபேசி' : 'Search Citizen'}
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder={lang === 'ta' ? 'தேடுக...' : 'Search...'}
                      value={oversightSearch}
                      onChange={(e) => setOversightSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Clear & Print */}
              <div className="flex items-center gap-2 pt-2 lg:pt-4 shrink-0">
                {(oversightDsFilter !== 'ALL' || oversightGnFilter !== 'ALL' || oversightWelfareFilter !== 'ALL' || oversightSearch) && (
                  <button
                    onClick={() => {
                      setOversightDsFilter('ALL');
                      setOversightGnFilter('ALL');
                      setOversightWelfareFilter('ALL');
                      setOversightSearch('');
                    }}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{lang === 'ta' ? 'நீக்கு' : 'Reset'}</span>
                  </button>
                )}

                <button
                  onClick={() => setShowPrintReportModal(true)}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'ta' ? 'அறிக்கை அச்சிடுக (Print PDF)' : 'Print Official Report'}</span>
                  <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono ml-1">
                    {filteredCitizens.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Results count text */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <div>
                <span>{lang === 'ta' ? 'கண்டறியப்பட்ட பிரஜைகள்:' : 'Filtered Citizens:'} </span>
                <span className="font-bold text-slate-900">{filteredCitizens.length}</span>
                <span className="text-slate-400"> / {beneficiaries.length}</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold">
                {lang === 'ta' ? 'அரசாங்க மாவட்ட செயலக நேரலை தரவுத்தளம்' : 'Live District Secretariat Database'}
              </div>
            </div>
          </div>

          {/* Read-Only Citizen Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4"># NIC / ID</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'பிரஜை பெயர்' : 'Citizen Name'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'பிரதேச செயலகம்' : 'Divisional Secretariat'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'GN பிரிவு' : 'GN Division'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'நலன்புரி நிலவரம்' : 'Welfare Schemes'}</th>
                    <th className="py-3 px-4">{lang === 'ta' ? 'தொடர்பு / குடும்பம்' : 'Contact & Family'}</th>
                    <th className="py-3 px-4 text-right">{lang === 'ta' ? 'மேற்பார்வை' : 'Oversight'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCitizens.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                        <div className="text-sm font-semibold text-slate-700">
                          {lang === 'ta' ? 'பொருத்தமான பிரஜைகள் காணப்படவில்லை' : 'No citizens found matching criteria'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {lang === 'ta' ? 'வடிகட்டிகளை மாற்றி மீண்டும் முயற்சிக்கவும்.' : 'Please adjust your filter settings or search query.'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCitizens.slice(0, 100).map((b) => {
                      const bDsId = b.dsDivisionId || 'DS_VAHARAI';
                      const dsObj = dsList.find((d) => d.id === bDsId);
                      const gnObj = divisions.find((g) => g.code === b.divisionCode);
                      const citizenAge = calculateAge(b.dob, b.nic);

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono">
                            <div className="font-bold text-slate-900">{b.nic || 'NO-NIC'}</div>
                            <div className="text-[10px] text-slate-400">ID: {b.id.slice(-6)}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {lang === 'ta' ? b.nameTa || b.nameEn : b.nameEn || b.nameTa}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{b.gender === 'FEMALE' ? (lang === 'ta' ? 'பெண்' : 'Female') : (lang === 'ta' ? 'ஆண்' : 'Male')}</span>
                              <span>·</span>
                              <span>{citizenAge} {lang === 'ta' ? 'வயது' : 'yrs'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              <Building2 className="w-3 h-3 text-emerald-700" />
                              <span>{dsObj ? (lang === 'ta' ? dsObj.nameTa : dsObj.nameEn) : bDsId}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">
                              {b.divisionCode}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {gnObj ? (lang === 'ta' ? gnObj.nameTa : gnObj.nameEn) : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {checkIsAswesuma(b) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  {lang === 'ta' ? 'அஸ்வெசும' : 'Aswesuma'}
                                </span>
                              )}
                              {checkIsElderly(b) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                  {lang === 'ta' ? '70+ முதியோர்' : 'Senior'}
                                </span>
                              )}
                              {checkIsPregnant(b) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-900 border border-pink-200">
                                  {lang === 'ta' ? 'கர்ப்பிணி' : 'Maternity'}
                                </span>
                              )}
                              {checkIsDisability(b) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  {lang === 'ta' ? 'அங்கவீனம்' : 'Disability'}
                                </span>
                              )}
                              {checkIsSamurdhi(b) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  {lang === 'ta' ? 'சமூர்த்தி' : 'Samurdhi'}
                                </span>
                              )}
                              {!checkIsAswesuma(b) && !checkIsElderly(b) && !checkIsPregnant(b) && !checkIsDisability(b) && !checkIsSamurdhi(b) && (
                                <span className="text-[11px] text-slate-400 italic">
                                  {lang === 'ta' ? 'வழக்கமான பிரஜை' : 'Standard'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-800 font-mono text-[11px]">{b.phone || '-'}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                              {(b.familyCode || b.householdNo) ? `${lang === 'ta' ? 'குடும்பம்' : 'Fam'}: ${b.familyCode || b.householdNo}` : (b.address || '-')}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedCitizenForModal(b)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                              title={lang === 'ta' ? 'பிரஜை விபரம் பார்வை' : 'View Citizen Dossier'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{lang === 'ta' ? 'பார்வை' : 'View'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredCitizens.length > 100 && (
              <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
                {lang === 'ta'
                  ? `முதல் 100 பிரஜைகள் காட்டப்படுகிறார்கள் (மொத்தம் ${filteredCitizens.length}). முழுமையான அனைத்து தரவுகளையும் அச்சிட "அறிக்கை அச்சிடுக" பொத்தானை அழுத்தவும்.`
                  : `Showing first 100 citizens (total ${filteredCitizens.length}). Click "Print Official Report" to export the complete records.`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW DS DIVISION */}
      {showAddDsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-800" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === 'ta' ? 'புதிய பிரதேச செயலகப் பிரிவு சேர்த்தல்' : 'Add New Divisional Secretariat'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ta'
                      ? 'மட்டக்களப்பு மாவட்டத்தின் கீழ் புதிய பிரதேச செயலகத்தையும் அதன் சுப்பர் அட்மினையும் பதிவு செய்க.'
                      : 'Register a new Divisional Secretariat division and assign its Super Admin credentials.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDsDivision} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'குறியீடு (Code) *' : 'Division Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="எ.கா: DS_15 அல்லது KW"
                    value={newDsCode}
                    onChange={(e) => setNewDsCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'GN எண்ணிக்கை (Target) *' : 'Allocated GN Units *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={newDsGnCount}
                    onChange={(e) => setNewDsGnCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ta' ? 'பிரதேச செயலக பெயர் (தமிழ்) *' : 'Divisional Secretariat Name (Tamil) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="எ.கா: கோறளைப்பற்று மேற்கு (ஓட்டமாவடி)"
                  value={newDsNameTa}
                  onChange={(e) => setNewDsNameTa(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ta' ? 'பிரதேச செயலக பெயர் (English) *' : 'Divisional Secretariat Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koralaipattu West (Oddamavadi)"
                  value={newDsNameEn}
                  onChange={(e) => setNewDsNameEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ta' ? 'தலைமையக அமைவிடம் (Headquarters)' : 'Headquarters Location'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oddamavadi"
                  value={newDsHeadquarters}
                  onChange={(e) => setNewDsHeadquarters(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Super Admin Section */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>{lang === 'ta' ? 'சுப்பர் அட்மின் நிர்வாக கணக்கு விபரம்' : 'Super Admin Account Credentials'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'ta' ? 'சுப்பர் அட்மின் User ID *' : 'Super Admin ID *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="superadmin_..."
                      value={newSuperAdminId}
                      onChange={(e) => setNewSuperAdminId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'ta' ? 'அதிகாரி பெயர்' : 'Officer Name'}
                    </label>
                    <input
                      type="text"
                      placeholder="பிரதேச செயலாளர்"
                      value={newSuperAdminName}
                      onChange={(e) => setNewSuperAdminName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {lang === 'ta' ? 'தொடக்க கடவுச்சொல் (Password) *' : 'Initial Password *'}
                    </label>
                    <button
                      type="button"
                      onClick={generateNewDsPassword}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{lang === 'ta' ? 'தானாக உருவாக்கு' : 'Auto-Generate'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newSuperAdminPassword}
                    onChange={(e) => setNewSuperAdminPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'ta' ? 'மின்னஞ்சல் (Email)' : 'Email'}
                    </label>
                    <input
                      type="email"
                      placeholder="ds@batticaloa.dist.gov.lk"
                      value={newSuperAdminEmail}
                      onChange={(e) => setNewSuperAdminEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'ta' ? 'தொலைபேசி (Phone)' : 'Phone'}
                    </label>
                    <input
                      type="text"
                      placeholder="065-222..."
                      value={newSuperAdminPhone}
                      onChange={(e) => setNewSuperAdminPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDsModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  {lang === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'சேமித்து இணைக்குக' : 'Save & Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PASSWORD RESET FOR SUPER ADMIN */}
      {resetModalSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <KeyRound className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'ta' ? 'சுப்பர் அட்மின் கடவுச்சொல் மாற்றம்' : 'Reset Super Admin Password'}
                </h3>
                <p className="text-xs text-slate-500">
                  {resetModalSuperAdmin.ds.nameTa} ({resetModalSuperAdmin.ds.nameEn})
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'ta' ? 'பயனர் ID' : 'User ID'}
                </label>
                <input
                  type="text"
                  disabled
                  value={resetModalSuperAdmin.user.id}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {lang === 'ta' ? 'புதிய கடவுச்சொல்' : 'New Password'}
                  </label>
                  <button
                    type="button"
                    onClick={generateSecurePassword}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{lang === 'ta' ? 'தானாக உருவாக்கு' : 'Auto-Generate'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalSuperAdmin(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  {lang === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'சேமிக்குக' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CITIZEN PROFILE DOSSIER (READ-ONLY) */}
      {selectedCitizenForModal && (
        <CitizenProfileModal
          beneficiary={selectedCitizenForModal}
          division={divisions.find((d) => d.code === selectedCitizenForModal.divisionCode)}
          allBeneficiaries={beneficiaries}
          allTokens={tokens}
          allHouseholds={households}
          lang={lang}
          onClose={() => setSelectedCitizenForModal(null)}
        />
      )}

      {/* MODAL 4: PRINTABLE FILTERED REPORT MODAL */}
      {showPrintReportModal && (
        <PrintableFilteredReportModal
          beneficiaries={filteredCitizens}
          divisions={divisions}
          activeDivision={oversightGnFilter}
          activeWelfare={oversightWelfareFilter}
          activeIllness="ALL"
          activeYouth16={false}
          searchQuery={oversightSearch}
          lang={lang}
          onClose={() => setShowPrintReportModal(false)}
          organizationTitleTa="மட்டக்களப்பு மாவட்ட செயலகம் · பிரஜைகள் மேற்பார்வை அறிக்கை"
          organizationTitleEn="Batticaloa District Secretariat · Citizens Oversight Report"
        />
      )}
    </div>
  );
};
