import React, { useState } from 'react';
import {
  GNDivision,
  User,
  DSDivision,
  BATTICALOA_DS_DIVISIONS,
} from '../types';
import { Language, translations } from '../translations/i18n';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Home,
  Phone,
  Hash,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface GnDivisionsManagementViewProps {
  currentUser: User;
  divisions: GNDivision[];
  users: User[];
  currentDsDivision?: DSDivision;
  lang: Language;
  onUpdateDivisions: (divisions: GNDivision[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const GnDivisionsManagementView: React.FC<GnDivisionsManagementViewProps> = ({
  currentUser,
  divisions,
  users,
  currentDsDivision,
  lang,
  onUpdateDivisions,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Effective DS division ID
  const effectiveDsId = currentDsDivision?.id || currentUser.dsDivisionId || 'DS_VAHARAI';
  const effectiveDs = BATTICALOA_DS_DIVISIONS.find((d) => d.id === effectiveDsId) || BATTICALOA_DS_DIVISIONS[6]; // default Vaharai

  // Filter divisions to this DS division
  const dsDivisions = divisions.filter((d) => d.dsDivisionId === effectiveDsId);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDivision, setEditingDivision] = useState<GNDivision | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form Fields
  const [code, setCode] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [gnOfficerName, setGnOfficerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [population, setPopulation] = useState<number>(0);
  const [households, setHouseholds] = useState<number>(0);
  const [formError, setFormError] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleOpenAdd = () => {
    setCode('');
    setNameTa('');
    setNameEn('');
    setGnOfficerName('');
    setContactNumber('');
    setPopulation(0);
    setHouseholds(0);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (div: GNDivision) => {
    setEditingDivision(div);
    setCode(div.code);
    setNameTa(div.nameTa);
    setNameEn(div.nameEn);
    setGnOfficerName(div.gnOfficerName || '');
    setContactNumber(div.contactNumber || '');
    setPopulation(div.population || 0);
    setHouseholds(div.households || 0);
    setFormError('');
  };

  // Submit Create New GN Division
  const handleCreateDivision = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError(lang === 'ta' ? 'தனித்துவ GN இலக்கம் / குறியீடு அவசியம்!' : 'Unique GN Code is required!');
      return;
    }
    if (!nameTa.trim() || !nameEn.trim()) {
      setFormError(lang === 'ta' ? 'பிரிவின் தமிழ் மற்றும் ஆங்கில பெயர்கள் அவசியம்!' : 'Tamil and English names are required!');
      return;
    }

    // Check uniqueness of code
    const isDuplicateCode = divisions.some(
      (d) => d.code.toUpperCase() === cleanCode
    );
    if (isDuplicateCode) {
      setFormError(
        lang === 'ta'
          ? `இந்த GN குறியீடு (${cleanCode}) ஏற்கனவே பயன்பாட்டில் உள்ளது! தயவுசெய்து புதிய தனித்துவ இலக்கத்தை உள்ளிடவும்.`
          : `GN Code (${cleanCode}) already exists! Please use a unique number.`
      );
      return;
    }

    const newDivision: GNDivision = {
      code: cleanCode,
      nameTa: nameTa.trim(),
      nameEn: nameEn.trim(),
      dsDivisionId: effectiveDsId,
      gnOfficerName: gnOfficerName.trim(),
      contactNumber: contactNumber.trim(),
      population: Number(population) || 0,
      households: Number(households) || 0,
    };

    const updated = [...divisions, newDivision];
    onUpdateDivisions(updated);
    onAuditLog(
      'CREATE_GN_DIVISION',
      `Super Admin created GN Division ${newDivision.nameTa} (${newDivision.code}) under ${effectiveDs.nameEn}`
    );

    setShowAddModal(false);
    showToast(
      lang === 'ta'
        ? `புதிய கிராம அலுவலர் பிரிவு ${newDivision.nameTa} (${newDivision.code}) உருவாக்கப்பட்டது!`
        : `New GN Division ${newDivision.nameEn} (${newDivision.code}) created successfully!`
    );
  };

  // Submit Edit GN Division
  const handleUpdateDivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDivision) return;
    setFormError('');

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !nameTa.trim() || !nameEn.trim()) {
      setFormError(lang === 'ta' ? 'அனைத்து தேவையான விபரங்களையும் பூர்த்தி செய்க' : 'Fill all required fields');
      return;
    }

    // If code changed, check uniqueness
    if (cleanCode !== editingDivision.code.toUpperCase()) {
      const isDuplicate = divisions.some(
        (d) => d.code.toUpperCase() === cleanCode && d.code.toUpperCase() !== editingDivision.code.toUpperCase()
      );
      if (isDuplicate) {
        setFormError(lang === 'ta' ? `குறியீடு ${cleanCode} ஏற்கனவே உள்ளது!` : `Code ${cleanCode} already in use!`);
        return;
      }
    }

    const updated = divisions.map((d) => {
      if (d.code === editingDivision.code) {
        return {
          ...d,
          code: cleanCode,
          nameTa: nameTa.trim(),
          nameEn: nameEn.trim(),
          gnOfficerName: gnOfficerName.trim(),
          contactNumber: contactNumber.trim(),
          population: Number(population) || 0,
          households: Number(households) || 0,
        };
      }
      return d;
    });

    onUpdateDivisions(updated);
    onAuditLog(
      'UPDATE_GN_DIVISION',
      `Super Admin updated GN Division ${cleanCode} under ${effectiveDs.nameEn}`
    );

    setEditingDivision(null);
    showToast(
      lang === 'ta'
        ? `கிராம அலுவலர் பிரிவு (${cleanCode}) விபரங்கள் திருத்தப்பட்டன!`
        : `GN Division (${cleanCode}) updated successfully!`
    );
  };

  // Delete GN Division
  const handleDeleteDivision = (divToDelete: GNDivision) => {
    if (
      !confirm(
        lang === 'ta'
          ? `உறுதியாக கிராம அலுவலர் பிரிவு "${divToDelete.nameTa} (${divToDelete.code})" ஐ நீக்க விரும்புகிறீர்களா?`
          : `Are you sure you want to delete GN Division "${divToDelete.nameEn} (${divToDelete.code})"?`
      )
    ) {
      return;
    }

    const updated = divisions.filter((d) => d.code !== divToDelete.code);
    onUpdateDivisions(updated);
    onAuditLog(
      'DELETE_GN_DIVISION',
      `Super Admin deleted GN Division ${divToDelete.nameTa} (${divToDelete.code})`
    );

    showToast(
      lang === 'ta'
        ? `கிராம அலுவலர் பிரிவு (${divToDelete.code}) நீக்கப்பட்டது!`
        : `GN Division (${divToDelete.code}) deleted!`
    );
  };

  // Filtered by Search
  const filtered = dsDivisions.filter(
    (d) =>
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.nameTa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.gnOfficerName && d.gnOfficerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Total metrics for this DS division
  const totalPop = dsDivisions.reduce((acc, d) => acc + (d.population || 0), 0);
  const totalHh = dsDivisions.reduce((acc, d) => acc + (d.households || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  {effectiveDs.code} · {effectiveDs.id}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {lang === 'ta' ? effectiveDs.nameEn : effectiveDs.nameTa}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {lang === 'ta' ? effectiveDs.nameTa : effectiveDs.nameEn} · {t.gnDivisionsTitle}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'சுப்பர் அட்மினின் அதிகாரத்தின் கீழ் தமது பிரதேச செயலகத்திற்கான கிராம உத்தியோகத்தர் பிரிவுகளை அதன் தனித்துவ இலக்கங்களோடு உருவாக்குதல் மற்றும் நிர்வகித்தல்.'
              : 'Super Admin authority to create and administer unique Grama Niladhari divisions under this Divisional Secretariat.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ta' ? 'புதிய GN பிரிவு உருவாக்கு' : 'Create New GN Division'}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'ta' ? 'பதிவான பிரிவுகள்' : 'Registered GNs'}</span>
            <Layers className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {dsDivisions.length}
            <span className="text-xs text-slate-400 font-normal"> / {effectiveDs.allocatedGnCount}</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            {Math.round((dsDivisions.length / effectiveDs.allocatedGnCount) * 100)}% {lang === 'ta' ? 'பூர்த்தியாகியுள்ளது' : 'completed'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'ta' ? 'அங்கீகரிக்கப்பட்ட ஒதுக்கீடு' : 'Gazette Allocation'}</span>
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{effectiveDs.allocatedGnCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'அதிகாரபூர்வ இலக்கு' : 'Gazette Target'}</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'ta' ? 'மொத்த மக்கள் தொகை' : 'Total Population'}</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{totalPop.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'பதிவான பிரஜைகள்' : 'Across GN divisions'}</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{lang === 'ta' ? 'மொத்த குடும்பங்கள்' : 'Total Households'}</span>
            <Home className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{totalHh.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'குடும்பங்கள்' : 'Households'}</div>
        </div>
      </div>

      {/* Main GN Divisions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {dsDivisions.length} {lang === 'ta' ? 'பிரிவுகள்' : 'Divisions'}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={lang === 'ta' ? 'GN இலக்கம் / பெயர் தேடுக...' : 'Search GN Code / Name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{lang === 'ta' ? 'தனித்துவ GN இலக்கம்' : 'GN Code'}</th>
                <th className="py-3 px-4">{lang === 'ta' ? 'பிரிவு பெயர் (தமிழ் & ஆங்கிலம்)' : 'Division Name'}</th>
                <th className="py-3 px-4">{lang === 'ta' ? 'கிராம உத்தியோகத்தர் & தொடர்பு' : 'Officer & Phone'}</th>
                <th className="py-3 px-4">{lang === 'ta' ? 'மக்கள் தொகை' : 'Population'}</th>
                <th className="py-3 px-4">{lang === 'ta' ? 'குடும்பங்கள்' : 'Households'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    {lang === 'ta'
                      ? 'எந்த கிராம அலுவலர் பிரிவும் கிடைக்கவில்லை. புதிய பிரிவை உருவாக்க மேலே உள்ள பொத்தானை அழுத்தவும்.'
                      : 'No GN divisions found. Click Create New GN Division above.'}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  // Find if there is a matching GN staff user
                  const gnUser = users.find(
                    (u) => u.role === 'GRAMANIILATHARI' && u.division === d.code
                  );

                  return (
                    <tr key={d.code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                          {d.code}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{d.nameTa}</div>
                        <div className="text-[11px] text-slate-500">{d.nameEn}</div>
                      </td>

                      <td className="py-3 px-4">
                        {d.gnOfficerName ? (
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{d.gnOfficerName}</span>
                          </div>
                        ) : gnUser ? (
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                            <span>{gnUser.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {lang === 'ta' ? 'நியமிக்கப்படவில்லை' : 'Unassigned'}
                          </span>
                        )}
                        {d.contactNumber && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{d.contactNumber}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {d.population ? d.population.toLocaleString() : '-'}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {d.households ? d.households.toLocaleString() : '-'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
                            title={lang === 'ta' ? 'திருத்து' : 'Edit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDivision(d)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                            title={lang === 'ta' ? 'நீக்கு' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit GN Division Modal */}
      {(showAddModal || editingDivision) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Layers className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingDivision
                    ? (lang === 'ta' ? 'கிராம அலுவலர் பிரிவு விபரங்களை திருத்து' : 'Edit GN Division')
                    : (lang === 'ta' ? 'புதிய கிராம அலுவலர் பிரிவை உருவாக்கு' : 'Create New GN Division')}
                </h3>
                <p className="text-xs text-slate-500">
                  {effectiveDs.nameTa} ({effectiveDs.nameEn})
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={editingDivision ? handleUpdateDivision : handleCreateDivision} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-800" />
                  <span>{lang === 'ta' ? 'தனித்துவ GN இலக்கம் / குறியீடு (Unique GN Code) *' : 'Unique GN Code *'}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'ta' ? 'உ-ம்: 211A, 212, MN-01, 185' : 'e.g. 211A, 212, MN-01, 185'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'பிரிவு பெயர் (தமிழ்) *' : 'Division Name (Tamil) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'ta' ? 'உ-ம்: வாகரை வடக்கு' : 'e.g. Vaharai North'}
                    value={nameTa}
                    onChange={(e) => setNameTa(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'பிரிவு பெயர் (ஆங்கிலம்) *' : 'Division Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vaharai North"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'கிராம உத்தியோகத்தர் பெயர்' : 'GN Officer Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'ta' ? 'உ-ம்: கே. சிவகுமார்' : 'e.g. K. Sivakumar'}
                    value={gnOfficerName}
                    onChange={(e) => setGnOfficerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'தொடர்பு தொலைபேசி' : 'Contact Phone'}
                  </label>
                  <input
                    type="text"
                    placeholder="077xxxxxxx"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'மக்கள் தொகை' : 'Population'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={population || ''}
                    onChange={(e) => setPopulation(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'ta' ? 'குடும்பங்களின் எண்ணிக்கை' : 'Households'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={households || ''}
                    onChange={(e) => setHouseholds(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingDivision(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  {lang === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {editingDivision
                    ? (lang === 'ta' ? 'விபரங்களை புதுப்பி' : 'Update Division')
                    : (lang === 'ta' ? 'பிரிவை உருவாக்கு' : 'Create Division')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
