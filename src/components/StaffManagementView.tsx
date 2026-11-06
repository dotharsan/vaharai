import React, { useState } from 'react';
import { User, Role, GNDivision, BATTICALOA_DS_DIVISIONS, DSDivision } from '../types';
import { Language, translations } from '../translations/i18n';
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Layers,
  Filter,
} from 'lucide-react';

interface StaffManagementViewProps {
  users: User[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateUsers: (users: User[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  users,
  divisions,
  currentUser,
  lang,
  onUpdateUsers,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Access: SUPERADMIN or DISTRICT_ADMIN
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isDistrictAdmin = currentUser.role === 'DISTRICT_ADMIN';

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPasswordUser, setEditingPasswordUser] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // District Admin Division Filter
  const [selectedDsFilter, setSelectedDsFilter] = useState<string>(
    currentUser.dsDivisionId && currentUser.dsDivisionId !== 'DISTRICT_HQ'
      ? currentUser.dsDivisionId
      : 'ALL'
  );

  if (!isSuperAdmin && !isDistrictAdmin) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs my-8">
        <span className="text-4xl block mb-2">🚫</span>
        <h3 className="text-base font-bold text-red-800">
          {t.accessDenied}
        </h3>
        <p className="text-xs text-slate-500 mt-2">
          {lang === 'ta'
            ? 'அலுவலர் கணக்குகள் மற்றும் கடவுச்சொற்களை முகாமை செய்யும் அதிகாரம் பிரதேச செயலக தலைமை நிர்வாகிக்கு (Super Admin) மட்டுமே வழங்கப்பட்டுள்ளது.'
            : 'Staff administration and credentials are strictly reserved for the Super Admin.'}
        </p>
      </div>
    );
  }

  // Active Divisional Secretariat for Super Admin (locked to their DS division)
  const currentDsId = isSuperAdmin
    ? (currentUser.dsDivisionId || 'DS_VAHARAI')
    : (selectedDsFilter === 'ALL' ? 'DS_VAHARAI' : selectedDsFilter);

  const currentDs = BATTICALOA_DS_DIVISIONS.find((d) => d.id === currentDsId) || BATTICALOA_DS_DIVISIONS[6];

  // Strict Tenant Isolation:
  // Super Admin ONLY sees staff belonging to their own DS division!
  // "ஒரு அட்மின் நிர்வாகம் மற்றய அட்மினுக்கு தாக்கம் செலுத்தவோ காண்பிக்கவோ கூடாது"
  const visibleUsers = users.filter((u) => {
    if (isSuperAdmin) {
      if (u.role === 'DISTRICT_ADMIN') return false;
      if (u.role === 'SUPERADMIN') return u.id === currentUser.id;
      return u.dsDivisionId === currentDsId || (!u.dsDivisionId && currentDsId === 'DS_VAHARAI');
    }
    // District Admin view
    if (selectedDsFilter === 'ALL') return true;
    return u.dsDivisionId === selectedDsFilter || (!u.dsDivisionId && selectedDsFilter === 'DS_VAHARAI');
  });

  // Available GN Divisions for this DS division
  const availableDivisions = divisions.filter(
    (d) => d.dsDivisionId === currentDsId || (!d.dsDivisionId && currentDsId === 'DS_VAHARAI')
  );

  // New User Form State
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('GRAMANIILATHARI');
  const [newDivision, setNewDivision] = useState(availableDivisions[0]?.code || '211');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleOpenAdd = () => {
    setNewId('');
    setNewName('');
    setNewRole('GRAMANIILATHARI');
    setNewDivision(availableDivisions[0]?.code || '211');
    setNewPassword(generateRandomPassword());
    setFormError('');
    setShowAddModal(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newId.trim() || !newName.trim() || !newPassword.trim()) {
      setFormError(lang === 'ta' ? 'அனைத்து தேவையான விபரங்களையும் உள்ளிடவும்' : 'All fields are required');
      return;
    }

    if (users.some((u) => u.id === newId.trim())) {
      setFormError(lang === 'ta' ? 'இந்த பயனர் இலக்கம் ஏற்கனவே உள்ளது!' : 'This User ID already exists!');
      return;
    }

    // Created staff user is strictly tagged with current DS division and creator ID
    const created: User = {
      id: newId.trim(),
      password: newPassword.trim(),
      name: newName.trim(),
      role: newRole,
      division: newRole === 'GRAMANIILATHARI' ? newDivision : 'ALL',
      dsDivisionId: currentDsId,
      createdBySuperAdminId: currentUser.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, created];
    onUpdateUsers(updated);
    onAuditLog(
      'CREATE_USER',
      `Super Admin created staff user ${created.name} (ID: ${created.id}, Role: ${created.role}) under ${currentDs.nameEn}`
    );

    setShowAddModal(false);
    setNewId('');
    setNewName('');
    setNewPassword('');
    setSuccessMsg(
      lang === 'ta'
        ? `புதிய அலுவலர் (${created.name}) ${currentDs.nameTa} பிரிவில் வெற்றிகரமாக சேர்க்கப்பட்டார்!`
        : `New staff member (${created.name}) registered under ${currentDs.nameEn}!`
    );
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordUser || !newPasswordVal.trim()) return;

    const updated = users.map((u) => {
      if (u.id === editingPasswordUser.id) {
        return { ...u, password: newPasswordVal.trim() };
      }
      return u;
    });

    onUpdateUsers(updated);
    onAuditLog('UPDATE_PASSWORD', `Updated unique password for user ID: ${editingPasswordUser.id}`);

    setEditingPasswordUser(null);
    setNewPasswordVal('');
    setSuccessMsg(lang === 'ta' ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password changed successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const toggleUserStatus = (userId: string) => {
    if (userId === currentUser.id) {
      alert(lang === 'ta' ? 'தங்கள் சொந்த கணக்கை முடக்க முடியாது!' : 'Cannot deactivate your own active account!');
      return;
    }

    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        return { ...u, status: nextStatus as 'ACTIVE' | 'INACTIVE' };
      }
      return u;
    });

    onUpdateUsers(updated);
    onAuditLog('TOGGLE_STATUS', `Toggled status for user ID: ${userId}`);
  };

  // Filtered by Search
  const filteredUsers = visibleUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.division && u.division.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner with Strict Tenant Identity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  {currentDs.code} · {currentDs.nameEn}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {lang === 'ta' ? currentDs.nameTa : currentDs.nameEn}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {t.staffTitle} · {lang === 'ta' ? currentDs.nameTa : currentDs.nameEn}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'தனித்துவ பிரதேச நிர்வாகம்: சுப்பர் அட்மின் உருவாக்கும் அனைத்து உத்தியோகத்தர் கணக்குகளும் இப்பிரிவிற்கு மட்டுமே தனித்துவமானவை.'
              : 'Strict tenancy isolation: Staff created under this Divisional Secretariat are strictly segregated from other divisions.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* District Admin Switcher */}
          {isDistrictAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedDsFilter}
                onChange={(e) => setSelectedDsFilter(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
              >
                <option value="ALL">{lang === 'ta' ? 'அனைத்து பிரதேசங்களும்' : 'All Divisions'}</option>
                {BATTICALOA_DS_DIVISIONS.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.code} - {lang === 'ta' ? ds.nameTa : ds.nameEn}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.addUser}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Staff Users Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {visibleUsers.length} {t.records}
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              · {lang === 'ta' ? 'பிரதேச தனித்துவ கணக்குகள்' : 'Isolated Division Accounts'}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={lang === 'ta' ? 'அலுவலர் பெயர் / ID தேடுக...' : 'Search staff / ID...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">{t.nameEnglish}</th>
                <th className="py-3 px-4">{t.role}</th>
                <th className="py-3 px-4">{t.division}</th>
                <th className="py-3 px-4">{lang === 'ta' ? 'பிரதேச செயலகம்' : 'DS Division'}</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    {lang === 'ta' ? 'அலுவலர்கள் எவரும் கிடைக்கவில்லை.' : 'No staff members found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const userDs = BATTICALOA_DS_DIVISIONS.find((d) => d.id === u.dsDivisionId) || currentDs;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {u.id}
                        {isCurrent && (
                          <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-sans font-bold">
                            {lang === 'ta' ? 'நீங்களே' : 'You'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {u.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                          u.role === 'SUPERADMIN' ? 'bg-red-100 text-red-900 border border-red-200' :
                          u.role === 'DISTRICT_ADMIN' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          u.role === 'ADMIN 1' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                          u.role === 'ADMIN 2' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                          u.role === 'NORMAL' ? 'bg-amber-300 text-slate-950 border border-amber-400' :
                          u.role === 'GRAMANIILATHARI' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                          u.role === 'LAND_OFFICER' ? 'bg-lime-100 text-lime-900 border border-lime-200' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {u.division === 'ALL' ? (
                          <span className="text-slate-400 font-sans italic">{lang === 'ta' ? 'முழு பிரதேசம்' : 'All Divisions'}</span>
                        ) : (
                          <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {u.division}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-700 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                          {lang === 'ta' ? userDs.nameTa : userDs.nameEn}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'}`} />
                          <span>{u.status === 'ACTIVE' ? (lang === 'ta' ? 'செயலில்' : 'Active') : (lang === 'ta' ? 'முடக்கப்பட்டது' : 'Blocked')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active / Block */}
                          {!isCurrent && (
                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.status === 'ACTIVE'
                                  ? 'hover:bg-amber-50 text-amber-700 border-amber-200'
                                  : 'hover:bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                            >
                              {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Change Password */}
                          <button
                            onClick={() => {
                              setEditingPasswordUser(u);
                              setNewPasswordVal(u.password || generateRandomPassword());
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                            title={t.changePassword}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <UserPlus className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.addUser}</h3>
                <p className="text-xs text-slate-500">
                  {currentDs.nameTa} ({currentDs.nameEn})
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User ID (தனித்துவ பயனர் இலக்கம்) *
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'ta' ? 'உ-ம்: 701, gn_211, etc.' : 'e.g. 701, gn_211'}
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.nameEnglish} (உத்தியோகத்தர் பெயர்) *
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'ta' ? 'உ-ம்: எஸ். ரமேஷ்' : 'e.g. S. Ramesh'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.role} (பணி நிலை) *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                >
                  <option value="GRAMANIILATHARI">{t.roleGN} (Grama Niladhari)</option>
                  <option value="ADMIN 1">{t.roleAdmin1} (Admin 1)</option>
                  <option value="ADMIN 2">{t.roleAdmin2} (Admin 2)</option>
                  <option value="DATAENRY OFFCER">{t.roleDataEntry} (Data Entry)</option>
                  <option value="Reception Registrar">{t.roleReception} (Reception)</option>
                  <option value="LAND_OFFICER">காணி பிரிவு உத்தியோகத்தர் (Land Officer)</option>
                  <option value="ELDERLY_OFFICER">முதியோர் நலன்புரி உத்தியோகத்தர் (Elderly Officer)</option>
                  <option value="MATERNITY_OFFICER">கர்ப்பிணித் தாய்மார் & முத்திரை பதிவாளர் (Maternity Officer)</option>
                  <option value="DISABILITY_OFFICER">மாற்றுத்திறனாளிகள் நலன்புரி உத்தியோகத்தர் (Disability Officer)</option>
                  <option value="SAMURDHI_OFFICER">சமுர்த்தி அபிவிருத்தி உத்தியோகத்தர் (Samurdhi Officer)</option>
                  <option value="NORMAL">{t.roleNormal} (TV Screen)</option>
                </select>
              </div>

              {/* GN Division Dropdown - strictly filtered to this DS division */}
              {newRole === 'GRAMANIILATHARI' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.division} (கிராம அலுவலர் பிரிவு) *
                  </label>
                  <select
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-mono"
                  >
                    {availableDivisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa} ({d.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {t.password} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{lang === 'ta' ? 'தானாக உருவாக்கு' : 'Auto-Generate'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  {lang === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'அலுவலரை சேர்' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <KeyRound className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.changePassword}</h3>
                <p className="text-xs text-slate-500">
                  {editingPasswordUser.name} ({editingPasswordUser.id})
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {t.newPassword}
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordVal(generateRandomPassword())}
                    className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 hover:underline"
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
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPasswordUser(null)}
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
    </div>
  );
};
