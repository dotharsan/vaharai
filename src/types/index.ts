export type Role = 
  | 'DISTRICT_ADMIN' // தலைமை அட்மின் - மட்டக்களப்பு மாவட்ட செயலகம் (Batticaloa District Master Admin)
  | 'SUPERADMIN' // சுப்பர் அட்மின் - பிரதேச செயலாளர் (Divisional Secretariat Super Admin)
  | 'ADMIN 1' 
  | 'ADMIN 2' 
  | 'GRAMANIILATHARI' 
  | 'DATAENRY OFFCER' 
  | 'Reception Registrar' 
  | 'NORMAL' // Dedicated role for Public Live Counter Display TV screen
  | 'ECDO' // Early Childhood Development Officer (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)
  | 'MATERNITY_OFFICER' // கர்ப்பிணித் தாய்மார்கள் & முத்திரை பதிவாளர் (Pregnant Mothers & Nutrition Stamps Officer)
  | 'ELDERLY_OFFICER' // முதியோர் நலன்புரி உத்தியோகத்தர் (Senior Citizens Welfare Officer)
  | 'DISABILITY_OFFICER' // அங்கவீனர் பதிவாளர் (Disability Rights Officer)
  | 'WHH_OFFICER' // பெண் தலைமைத்துவ குடும்பங்கள் பதிவாளர் (Women-Headed Household Officer)
  | 'SAMURDHI_OFFICER' // சமுர்த்தி அபிவிருத்தி உத்தியோகத்தர் (Samurdhi Development Officer)
  | 'LAND_OFFICER'; // காணி உத்தியோகத்தர் (Land Branch Officer)

export type UserRole = Role;

// 14 Divisional Secretariats of Batticaloa District (மட்டக்களப்பு மாவட்டத்தின் 14 பிரதேச செயலகப் பிரிவுகள்)
export interface DSDivision {
  id: string; // e.g. "DS_VAHARAI", "DS_MANMUNAI_NORTH", etc.
  code: string; // "01" to "14"
  nameTa: string; // e.g. "மண்முனை வடக்கு (மட்டக்களப்பு)"
  nameEn: string; // e.g. "Manmunai North (Batticaloa Town)"
  allocatedGnCount: number; // Official GN Division allocation from District Gazette (e.g. 48, 39, 18, 16...)
  superAdminId: string; // Unique User ID of the Super Admin for this DS
  superAdminNameTa: string;
  superAdminNameEn: string;
  defaultPassword?: string;
  headquartersTa?: string;
  headquartersEn?: string;
  logoUrl?: string; // Custom uploaded logo (data URL or image URL) managed by Super Admin / District Admin
}

export const BATTICALOA_DS_DIVISIONS: DSDivision[] = [
  {
    id: 'DS_MANMUNAI_NORTH',
    code: '01',
    nameTa: 'மண்முனை வடக்கு (மட்டக்களப்பு)',
    nameEn: 'Manmunai North (Batticaloa Town)',
    allocatedGnCount: 48,
    superAdminId: 'ds_manmunainorth',
    superAdminNameTa: 'பிரதேச செயலாளர் - மண்முனை வடக்கு',
    superAdminNameEn: 'Divisional Secretary - Manmunai North',
    defaultPassword: 'admin123',
    headquartersTa: 'மட்டக்களப்பு நகரம்',
    headquartersEn: 'Batticaloa Town',
  },
  {
    id: 'DS_ERAVUR_PATTU',
    code: '02',
    nameTa: 'ஏறாவூர்ப்பற்று (செங்கலடி)',
    nameEn: 'Eravur Pattu (Chenkalady)',
    allocatedGnCount: 39,
    superAdminId: 'ds_eravurpattu',
    superAdminNameTa: 'பிரதேச செயலாளர் - ஏறாவூர்ப்பற்று',
    superAdminNameEn: 'Divisional Secretary - Eravur Pattu',
    defaultPassword: 'admin123',
    headquartersTa: 'செங்கலடி',
    headquartersEn: 'Chenkalady',
  },
  {
    id: 'DS_KORALAI_PATTU_SOUTH',
    code: '03',
    nameTa: 'கோறளைப்பற்று தெற்கு (கிரான்)',
    nameEn: 'Koralaipattu South (Kiran)',
    allocatedGnCount: 18,
    superAdminId: 'ds_koralaisouth',
    superAdminNameTa: 'பிரதேச செயலாளர் - கோறளைப்பற்று தெற்கு',
    superAdminNameEn: 'Divisional Secretary - Koralaipattu South',
    defaultPassword: 'admin123',
    headquartersTa: 'கிரான்',
    headquartersEn: 'Kiran',
  },
  {
    id: 'DS_KORALAI_PATTU',
    code: '04',
    nameTa: 'கோறளைப்பற்று (வாழைச்சேனை)',
    nameEn: 'Koralaipattu (Valaichchenai)',
    allocatedGnCount: 12,
    superAdminId: 'ds_koralai',
    superAdminNameTa: 'பிரதேச செயலாளர் - வாழைச்சேனை',
    superAdminNameEn: 'Divisional Secretary - Koralaipattu Valaichchenai',
    defaultPassword: 'admin123',
    headquartersTa: 'வாழைச்சேனை',
    headquartersEn: 'Valaichchenai',
  },
  {
    id: 'DS_KORALAI_PATTU_CENTRAL',
    code: '05',
    nameTa: 'கோறளைப்பற்று மத்தி (ஓட்டமாவடி)',
    nameEn: 'Koralaipattu Central (Oddamavadi)',
    allocatedGnCount: 8,
    superAdminId: 'ds_koralaicentral',
    superAdminNameTa: 'பிரதேச செயலாளர் - கோறளைப்பற்று மத்தி',
    superAdminNameEn: 'Divisional Secretary - Koralaipattu Central',
    defaultPassword: 'admin123',
    headquartersTa: 'ஓட்டமாவடி',
    headquartersEn: 'Oddamavadi',
  },
  {
    id: 'DS_KORALAI_PATTU_WEST',
    code: '06',
    nameTa: 'கோறளைப்பற்று மேற்கு',
    nameEn: 'Koralaipattu West',
    allocatedGnCount: 8,
    superAdminId: 'ds_koralaiwest',
    superAdminNameTa: 'பிரதேச செயலாளர் - கோறளைப்பற்று மேற்கு',
    superAdminNameEn: 'Divisional Secretary - Koralaipattu West',
    defaultPassword: 'admin123',
    headquartersTa: 'கோறளைப்பற்று மேற்கு',
    headquartersEn: 'Koralaipattu West',
  },
  {
    id: 'DS_VAHARAI',
    code: '07',
    nameTa: 'கோறளைப்பற்று வடக்கு (வாகரை)',
    nameEn: 'Koralaipattu North (Vaharai)',
    allocatedGnCount: 16,
    superAdminId: '93008148555',
    superAdminNameTa: 'பிரதேச செயலாளர் - கோறளைப்பற்று வடக்கு (வாகரை)',
    superAdminNameEn: 'Divisional Secretary - Koralaipattu North (Vaharai)',
    defaultPassword: '19930108',
    headquartersTa: 'வாகரை',
    headquartersEn: 'Vaharai',
  },
  {
    id: 'DS_ERAVUR_TOWN',
    code: '08',
    nameTa: 'ஏறாவூர் நகர்',
    nameEn: 'Eravur Town',
    allocatedGnCount: 15,
    superAdminId: 'ds_eravurtown',
    superAdminNameTa: 'பிரதேச செயலாளர் - ஏறாவூர் நகர்',
    superAdminNameEn: 'Divisional Secretary - Eravur Town',
    defaultPassword: 'admin123',
    headquartersTa: 'ஏறாவூர்',
    headquartersEn: 'Eravur',
  },
  {
    id: 'DS_MANMUNAI_WEST',
    code: '09',
    nameTa: 'மண்முனை மேற்கு (வவுணதீவு)',
    nameEn: 'Manmunai West (Vavunatheevu)',
    allocatedGnCount: 24,
    superAdminId: 'ds_manmunaiwest',
    superAdminNameTa: 'பிரதேச செயலாளர் - மண்முனை மேற்கு',
    superAdminNameEn: 'Divisional Secretary - Manmunai West',
    defaultPassword: 'admin123',
    headquartersTa: 'வவுணதீவு',
    headquartersEn: 'Vavunatheevu',
  },
  {
    id: 'DS_KATTANKUDY',
    code: '10',
    nameTa: 'காத்தான்குடி',
    nameEn: 'Kattankudy',
    allocatedGnCount: 18,
    superAdminId: 'ds_kattankudy',
    superAdminNameTa: 'பிரதேச செயலாளர் - காத்தான்குடி',
    superAdminNameEn: 'Divisional Secretary - Kattankudy',
    defaultPassword: 'admin123',
    headquartersTa: 'காத்தான்குடி',
    headquartersEn: 'Kattankudy',
  },
  {
    id: 'DS_MANMUNAI_PATTU',
    code: '11',
    nameTa: 'மண்முனை பற்று (ஆரையம்பதி)',
    nameEn: 'Manmunai Pattu (Arayampathy)',
    allocatedGnCount: 27,
    superAdminId: 'ds_manmunaipattu',
    superAdminNameTa: 'பிரதேச செயலாளர் - மண்முனை பற்று',
    superAdminNameEn: 'Divisional Secretary - Manmunai Pattu',
    defaultPassword: 'admin123',
    headquartersTa: 'ஆரையம்பதி',
    headquartersEn: 'Arayampathy',
  },
  {
    id: 'DS_MANMUNAI_SOUTH_WEST',
    code: '12',
    nameTa: 'மண்முனை தென்மேற்கு (பட்டிப்பளை)',
    nameEn: 'Manmunai South West (Pattipalai)',
    allocatedGnCount: 24,
    superAdminId: 'ds_manmunaisouthwest',
    superAdminNameTa: 'பிரதேச செயலாளர் - மண்முனை தென்மேற்கு',
    superAdminNameEn: 'Divisional Secretary - Manmunai South West',
    defaultPassword: 'admin123',
    headquartersTa: 'பட்டிப்பளை',
    headquartersEn: 'Pattipalai',
  },
  {
    id: 'DS_MANMUNAI_SOUTH_ERUVIL',
    code: '13',
    nameTa: 'மண்முனை தெற்கு & எருவில்பற்று (களுவாஞ்சிகுடி)',
    nameEn: 'Manmunai South & Eruvil Pattu (Kaluwanchikudy)',
    allocatedGnCount: 45,
    superAdminId: 'ds_manmunaiseruvil',
    superAdminNameTa: 'பிரதேச செயலாளர் - களுவாஞ்சிகுடி',
    superAdminNameEn: 'Divisional Secretary - Kaluwanchikudy',
    defaultPassword: 'admin123',
    headquartersTa: 'களுவாஞ்சிகுடி',
    headquartersEn: 'Kaluwanchikudy',
  },
  {
    id: 'DS_PORATIVU_PATTU',
    code: '14',
    nameTa: 'போரதீவுப்பற்று (வெல்லாவெளி)',
    nameEn: 'Porativu Pattu (Vellavely)',
    allocatedGnCount: 43,
    superAdminId: 'ds_porativupattu',
    superAdminNameTa: 'பிரதேச செயலாளர் - போரதீவுப்பற்று',
    superAdminNameEn: 'Divisional Secretary - Porativu Pattu',
    defaultPassword: 'admin123',
    headquartersTa: 'வெல்லாவெளி',
    headquartersEn: 'Vellavely',
  },
];

export interface User {
  id: string; // e.g. "123", "456", "93008148555", "dist_admin", etc.
  password: string; // Unique password
  name: string;
  role: Role;
  division?: string; // GN Division code or "ALL"
  dsDivisionId?: string; // Linked Divisional Secretariat (e.g. "DS_VAHARAI", "DS_MANMUNAI_NORTH", or "DISTRICT_HQ" for District Master Admin)
  createdBySuperAdminId?: string; // The Super Admin who created this staff user (for strict tenant isolation)
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLogin?: string;
  email?: string;
  phone?: string;
}

export interface GNDivision {
  code: string; // Unique GN Code (e.g. "211", "211A", "MN-01", "185B", etc.)
  nameTa: string; // e.g. "வாகரை வடக்கு"
  nameEn: string; // e.g. "Vaharai North"
  dsDivisionId?: string; // Link to parent Divisional Secretariat (e.g. "DS_VAHARAI", "DS_MANMUNAI_NORTH")
  gnOfficerName?: string;
  contactNumber?: string;
  population?: number;
  households?: number;
}

export type ChronicIllness = 
  | 'NONE'
  | 'CKD_KIDNEY'         // சிறுநீரக நோய் (Chronic Kidney Disease)
  | 'CANCER'             // புற்றுநோய்
  | 'THALASSEMIA'        // தலசீமியா
  | 'HEART_DISEASE'      // இதய நோய்
  | 'DIABETES_CHRONIC'   // தீவிர நீரிழிவு
  | 'DISABILITY_PHYSICAL'// உடல் ஊனம்
  | 'MENTAL_HEALTH'      // மனநலம்
  | 'OTHER_CHRONIC';     // ஏனைய நாள்பட்ட நோய்

export type WelfareScheme = 
  | 'NONE'
  | 'ASWESUMA_EXTREME'      // அஸ்வெசும - மிக ஏழ்மை (Extreme Poverty)
  | 'ASWESUMA_POOR'         // அஸ்வெசும - ஏழ்மை (Poverty)
  | 'ASWESUMA_VULNERABLE'   // அஸ்வெசும - இடர்படக்கூடியோர் (Vulnerable)
  | 'ASWESUMA_TRANSITIONAL' // அஸ்வெசும - இடைக்கால உதவி (Transitional)
  | 'SAMURDHI'              // சமுர்த்தி (Samurdhi)
  | 'ELDERLY'               // முதியோர் உதவிக்கொடுப்பனவு (Senior Citizen)
  | 'DISABILITY'            // மாற்றுத்திறனாளிகள் கொடுப்பனவு (Disability)
  | 'PREGNANT_NUTRITION'    // கர்ப்பிணித் தாய்மார் போசணை முத்திரை (Maternal Nutrition Stamp)
  | 'CHRONIC_KIDNEY'        // சிறுநீரக நோயாளர் நிதி உதவி (Kidney Patient Aid)
  | 'FARMER_SUBSIDY'        // விவசாய மானியம் & உரம் (Agrarian Subsidy)
  | 'FISHERY_AID'           // கடற்றொழிலாளர் உதவி & எரிபொருள் (Fishery Aid)
  | 'DISASTER_RELIEF'       // அனர்த்த நிவாரண உலர் உணவு (Disaster Relief)
  | 'EDUCATION_AID'         // கல்வி கற்றல் உபகரண உதவி (School Educational Aid)
  | 'SELF_EMPLOYMENT';      // சுயதொழில் வாழ்வாதார உதவி (Livelihood Grant)

export type WelfareStatus = 'ACTIVE' | 'PENDING' | 'WAITLIST' | 'REJECTED';

export type FamilyRelationship = 
  | 'FATHER'        // தந்தை (Father)
  | 'MOTHER'        // தாய் (Mother)
  | 'SON'           // மகன் (Son)
  | 'DAUGHTER'      // மகள் (Daughter)
  | 'HUSBAND'       // கணவன் (Husband)
  | 'WIFE'          // மனைவி (Wife)
  | 'GRANDFATHER'   // தாத்தா (Grandfather)
  | 'GRANDMOTHER'   // பாட்டி (Grandmother)
  | 'GRANDSON'      // பேரன் (Grandson)
  | 'GRANDDAUGHTER' // பேத்தி (Granddaughter)
  | 'CAREGIVER'     // பராமரிப்பாளர் (Caregiver)
  | 'HEAD'          // குடும்பத் தலைவர் (Head of Household)
  | 'SPOUSE'        // துணைவர் (Spouse)
  | 'CHILD'         // குழந்தை / பிள்ளை (Child)
  | 'PARENT'        // பெற்றோர் (Parent)
  | 'OTHER';        // ஏனைய உறவினர் (Other)

export const FAMILY_RELATIONSHIP_OPTIONS: { value: FamilyRelationship; labelTa: string; labelEn: string; icon: string }[] = [
  { value: 'FATHER', labelTa: 'தந்தை (Father)', labelEn: 'Father', icon: '👨' },
  { value: 'MOTHER', labelTa: 'தாய் (Mother)', labelEn: 'Mother', icon: '👩' },
  { value: 'SON', labelTa: 'மகன் (Son)', labelEn: 'Son', icon: '👦' },
  { value: 'DAUGHTER', labelTa: 'மகள் (Daughter)', labelEn: 'Daughter', icon: '👧' },
  { value: 'HUSBAND', labelTa: 'கணவன் (Husband)', labelEn: 'Husband', icon: '👨' },
  { value: 'WIFE', labelTa: 'மனைவி (Wife)', labelEn: 'Wife', icon: '👩' },
  { value: 'GRANDFATHER', labelTa: 'தாத்தா (Grandfather)', labelEn: 'Grandfather', icon: '👴' },
  { value: 'GRANDMOTHER', labelTa: 'பாட்டி (Grandmother)', labelEn: 'Grandmother', icon: '👵' },
  { value: 'GRANDSON', labelTa: 'பேரன் (Grandson)', labelEn: 'Grandson', icon: '👦' },
  { value: 'GRANDDAUGHTER', labelTa: 'பேத்தி (Granddaughter)', labelEn: 'Granddaughter', icon: '👧' },
  { value: 'HEAD', labelTa: 'குடும்பத் தலைவர் (Head)', labelEn: 'Family Head', icon: '👑' },
  { value: 'CAREGIVER', labelTa: 'பராமரிப்பாளர் (Caregiver)', labelEn: 'Caregiver', icon: '🤝' },
  { value: 'OTHER', labelTa: 'ஏனைய உறவினர் (Other Relative)', labelEn: 'Other Relative', icon: '👥' },
];

export interface WelfareSchemeItem {
  id: WelfareScheme;
  code: WelfareScheme;
  labelTa: string;
  labelEn: string;
  category: string;
  badgeColor: string;
  badgeClass: string;
}

export const ALL_WELFARE_SCHEMES_LIST: WelfareSchemeItem[] = [
  { id: 'ASWESUMA_EXTREME', code: 'ASWESUMA_EXTREME', labelTa: 'அஸ்வெசும - மிக ஏழ்மை (Extreme Poverty)', labelEn: 'Aswesuma Extreme Poverty', category: 'ASWESUMA', badgeColor: 'bg-red-100 text-red-800 border-red-200', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'ASWESUMA_POOR', code: 'ASWESUMA_POOR', labelTa: 'அஸ்வெசும - ஏழ்மை (Poverty)', labelEn: 'Aswesuma Poor', category: 'ASWESUMA', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'ASWESUMA_VULNERABLE', code: 'ASWESUMA_VULNERABLE', labelTa: 'அஸ்வெசும - இடர்படக்கூடியோர் (Vulnerable)', labelEn: 'Aswesuma Vulnerable', category: 'ASWESUMA', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'ASWESUMA_TRANSITIONAL', code: 'ASWESUMA_TRANSITIONAL', labelTa: 'அஸ்வெசும - இடைக்கால உதவி (Transitional)', labelEn: 'Aswesuma Transitional', category: 'ASWESUMA', badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'SAMURDHI', code: 'SAMURDHI', labelTa: 'சமுர்த்தி கொடுப்பனவு (Samurdhi)', labelEn: 'Samurdhi Allowance', category: 'SAMURDHI', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'ELDERLY', code: 'ELDERLY', labelTa: 'முதியோர் உதவிக்கொடுப்பனவு (Senior Citizen)', labelEn: 'Senior Citizen Allowance', category: 'ELDERLY', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'DISABILITY', code: 'DISABILITY', labelTa: 'மாற்றுத்திறனாளிகள் கொடுப்பனவு (Disability)', labelEn: 'Disability Allowance', category: 'DISABILITY', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'PREGNANT_NUTRITION', code: 'PREGNANT_NUTRITION', labelTa: 'கர்ப்பிணித் தாய்மார் போசணை முத்திரை (Nutrition Stamp)', labelEn: 'Pregnant Mother Nutrition Stamp', category: 'MATERNITY', badgeColor: 'bg-pink-100 text-pink-800 border-pink-200', badgeClass: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'CHRONIC_KIDNEY', code: 'CHRONIC_KIDNEY', labelTa: 'சிறுநீரக நோயாளர் நிதி உதவி (Kidney Patient Aid)', labelEn: 'Chronic Kidney Disease Aid', category: 'HEALTH', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'FARMER_SUBSIDY', code: 'FARMER_SUBSIDY', labelTa: 'விவசாய மானியம் & உரம் (Agrarian Subsidy)', labelEn: 'Farmer Fertilizer & Agri Subsidy', category: 'LIVELIHOOD', badgeColor: 'bg-lime-100 text-lime-800 border-lime-200', badgeClass: 'bg-lime-100 text-lime-800 border-lime-200' },
  { id: 'FISHERY_AID', code: 'FISHERY_AID', labelTa: 'கடற்றொழிலாளர் உதவி & மண்ணெண்ணெய் (Fishery Aid)', labelEn: 'Fishery Fuel & Equipment Aid', category: 'LIVELIHOOD', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'DISASTER_RELIEF', code: 'DISASTER_RELIEF', labelTa: 'அனர்த்த நிவாரண உலர் உணவு (Disaster Relief)', labelEn: 'Disaster Emergency Relief', category: 'EMERGENCY', badgeColor: 'bg-slate-100 text-slate-800 border-slate-200', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' },
  { id: 'EDUCATION_AID', code: 'EDUCATION_AID', labelTa: 'கல்வி கற்றல் உபகரண உதவி (School Stationery Aid)', labelEn: 'School Educational Aid', category: 'EDUCATION', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'SELF_EMPLOYMENT', code: 'SELF_EMPLOYMENT', labelTa: 'சுயதொழில் வாழ்வாதார உதவி (Livelihood Grant)', labelEn: 'Self-Employment Livelihood Grant', category: 'LIVELIHOOD', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
];

export type CitizenStatus = 'ACTIVE' | 'DECEASED' | 'TRANSFERRED';

export type DisabilityCause = 'ACCIDENT' | 'BIRTH' | 'WAR' | 'ILLNESS' | 'OTHER';

export interface Beneficiary {
  id: string; // System-generated Citizen Registration Number (e.g. "VHR-211-2026-0042")
  nic: string; // Official NIC or Computer-generated Provisional NIC (e.g. "TNIC-211-2026-84920")
  isProvisionalNic: boolean; // Flag indicating computer-generated NIC for citizens without card
  nameTa: string;
  nameEn: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  phone: string;
  address: string;
  divisionCode: string; // e.g. "211", "212A", etc. or "GENERAL"
  dsDivisionId?: string; // Link to Divisional Secretariat (e.g. "DS_VAHARAI", "DS_MANMUNAI_NORTH")
  familyHead: boolean;
  householdNo: string;
  familyCode?: string; // Unified Family / Household Group ID (e.g. "FAM-211-042")
  familyRelationship?: FamilyRelationship;
  status?: CitizenStatus; // 'ACTIVE' | 'DECEASED' (மரணப்பதிவு) | 'TRANSFERRED' (பதிவுமாற்றம்)
  deceasedDate?: string; // திகதி
  deathDate?: string; // திகதி (Deceased date alias)
  deathCertificateNo?: string; // இறப்பு சான்றிதழ் இலக்கம்
  deathRemarks?: string;
  transferDate?: string; // மாற்றம் செய்யப்பட்ட திகதி
  transferredDate?: string; // மாற்றம் செய்யப்பட்ட திகதி (Transfer date alias)
  transferDestination?: string; // இடமாற்றம் செய்யப்பட்ட பிரதேசம் / மாவட்டம்
  transferredToDivision?: string; // இடமாற்றம் செய்யப்பட்ட பிரதேசம் / மாவட்டம் (Transfer destination alias)
  transferReason?: string; // காரணங்கள்
  isPregnantMother?: boolean; // ECDO: கர்ப்பிணித் தாய்
  pregnancyStageMonths?: number; // கர்ப்ப காலம் (மாதங்கள் 1-9)
  isPersonWithDisability?: boolean; // அங்கவீனர் / மாற்றுத்திறனாளி
  disabilityType?: string; // ஊனத்தின் வகை / தன்மை
  disabilityNature?: string; // அங்கவீனத்தின் தன்மை (உடல் ஊனம், பார்வை, கேள்வி/பேச்சு, உள நலம், பலதரப்பட்ட)
  disabilityCause?: DisabilityCause; // உருவானது: விபத்து, பிறப்பு, யுத்தம், நோய், ஏனையவை
  disabilityRegistrationDate?: string;
  isWomanHeadedHousehold?: boolean; // பெண் தலைமைத்துவ குடும்பம்
  isSamurdhiBeneficiary?: boolean; // சமுர்த்தி பயனாளி
  isElderly?: boolean; // முதியோர் (Senior Citizen)
  elderlyAllowanceStatus?: 'RECEIVING' | 'WAITLIST' | 'NOT_APPLIED'; // முதியோர் கொடுப்பனவு நிலை
  elderlyLivingStatus?: 'WITH_FAMILY' | 'ALONE' | 'ELDER_CARE_HOME'; // வசிக்கும் நிலை
  elderlyCaretakerName?: string; // பராமரிப்பாளர் பெயர்
  elderlyCaretakerPhone?: string; // பராமரிப்பாளர் தொலைபேசி
  elderlyMobilityStatus?: 'NORMAL' | 'WALKER_CANE' | 'WHEELCHAIR' | 'BEDRIDDEN'; // இயங்குதிறன்
  manualQrCode?: string; // பயனரால் சுயமாக வழங்கப்படும் QR / அட்டை குறியீடு (Manual QR provided by officers)
  educationLevel?: string; // e.g. 'NO_SCHOOLING' | 'PRESCHOOL' | 'BELOW_OL' | 'OL_PASSED' | 'AL_PASSED' | 'DIPLOMA_DEGREE'
  isAttendingSchool?: boolean; // For ages 5-16: false => Children not in school (5-16)
  isDependent?: boolean; // தங்கி வாழ்வோர் (Dependent member)
  hasCkdu?: boolean; // நாள்பட்ட சிறுநீரக நோய் (CKDU)
  economicActivity?: string; // பொருளாதார செயல்பாடு / தொழில்
  welfareScheme: WelfareScheme; // Primary scheme (for backwards compatibility)
  welfareSchemes?: WelfareScheme[]; // Multiple welfare aid checklist (Requirement 02)
  welfareStatus: WelfareStatus;
  chronicIllness: ChronicIllness;
  barcode: string; // Barcode representation of NIC or System ID
  qrPayload: string;
  familyQrPayload?: string; // Single Unified QR Payload shared by ALL members of this household
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDefinition {
  id: string; // e.g. "SRV-WELFARE", "SRV-LAND", or "SRV-CUSTOM-..."
  code: string; // e.g. "WELFARE_SCHEME", "LAND_PERMIT", "AGRI_PERMIT", etc.
  nameTa: string; // Service name in Tamil
  nameEn: string; // Service name in English
  counterNo: number; // Counter number e.g. 1-33
  prefix: string; // Token prefix e.g. "W", "L", "AG"
  defaultOfficerTa: string; // Default officer in Tamil
  defaultOfficerEn: string; // Default officer in English
  descriptionTa?: string;
  descriptionEn?: string;
  floor?: string;
  isActive: boolean;
  isCustom?: boolean;
  createdAt: string;
}

export type ServiceType = string;

export type TokenStatus = 'WAITING' | 'CALLING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';

export interface TokenForwardRecord {
  fromOfficer: string;
  toOfficer: string;
  forwardedAt: string;
  reason?: string;
}

export interface QueueToken {
  id: string;
  tokenNumber: string;
  serviceType: ServiceType;
  counterNo: number; // 01 to 33 based on office layout
  counterName?: string;
  floorLevel?: string; // 'Ground Floor (தரைத்தளம்)' | 'First Floor (முதலாம் மாடி)'
  officerToMeet: string; // யாரை பார்க்க வேண்டும்
  citizenName: string;
  citizenNic: string;
  citizenAddress?: string;
  citizenPhone?: string;
  divisionCode: string; // GN Division code or "GENERAL" (பொது)
  dsDivisionId?: string; // Link to Divisional Secretariat (e.g. "DS_VAHARAI", "DS_MANMUNAI_NORTH")
  status: TokenStatus;
  issuedAt: string;
  calledAt?: string;
  completedAt?: string;
  notes?: string;
  barcode: string;
  forwardedFrom?: string;
  forwardHistory?: TokenForwardRecord[];
  servedByOfficerId?: string;
  servedByOfficerName?: string;
  rating?: number;
  ratingFeedback?: string;
  serviceDurationMinutes?: number;
  familyCode?: string;
  familyQrPayload?: string;
}

export interface DriveBackupItem {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  recordsCount?: number;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface AiReportResponse {
  success: boolean;
  report: string;
  note?: string;
}

// ================= ASSISTANCE / RELIEF DISTRIBUTION TYPES ================= //
export type AidCategory = 
  | 'DRY_RATIONS' // உலர் உணவுப் பொதி (Dry Rations)
  | 'CASH_GRANT' // பண உதவி (Cash Assistance)
  | 'AGRICULTURE_SEEDS' // விவசாய விதை / உரம் (Agriculture Seed/Fertilizer)
  | 'DISASTER_FLOOD' // அனர்த்த நிவாரணம் / வெள்ள நிவாரணம் (Disaster / Flood Relief)
  | 'HOUSING_REPAIR' // வீட்டு புனரமைப்பு உதவி (Housing Aid)
  | 'MEDICAL_ASSISTANCE' // மருத்துவ சிகிச்சை உதவி (Medical Aid)
  | 'EDUCATION_STATIONERY' // கல்வி கற்றல் உபகரணங்கள் (School Stationery)
  | 'LIVELIHOOD_TOOL' // வாழ்வாதார உபகரணங்கள் (தையல் இயந்திரம், படகு வலை)
  | 'OTHER';

export interface AssistanceRecord {
  id: string; // e.g. "AID-2026-0001"
  familyCode: string; // e.g. "FAM-211-042" (Unique family code)
  familyQrPayload: string; // Strictly unique Family QR payload
  beneficiaryNic: string;
  beneficiaryName: string;
  divisionCode: string;
  dsDivisionId?: string; // Link to Divisional Secretariat (e.g. "DS_VAHARAI", "DS_MANMUNAI_NORTH")
  householdNo?: string;
  aidCategory: AidCategory;
  aidDescription: string; // e.g. "25kg உலர் உணவுப் பொதி (25kg Dry Rations)"
  amountOrValue: string; // e.g. "Rs. 7,500" or "1 Bag"
  donorOrOrganization: string; // e.g. "பிரதேச செயலக அனர்த்த நிவாரணப் பிரிவு"
  distributedDate: string; // YYYY-MM-DD
  officerName: string;
  officerId: string;
  status: 'DISTRIBUTED' | 'APPROVED' | 'REJECTED_DUPLICATE';
  isDuplicate?: boolean;
  duplicateWarningReason?: string;
  notes?: string;
  createdAt: string;
}

export interface DuplicateAidCheckResult {
  hasDuplicateRisk: boolean;
  duplicateCount: number;
  lastDistributedDate?: string;
  daysSinceLastAid?: number;
  previousRecords: AssistanceRecord[];
  warningMessageTa: string;
  warningMessageEn: string;
  severity: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface FamilyCsvRecord {
  familyCode: string;
  uniqueFamilyQr: string;
  divisionCode: string;
  householdNo: string;
  familyHeadNic: string;
  familyHeadNameTa: string;
  familyHeadNameEn: string;
  phone: string;
  address: string;
  totalMembers: number;
  isWomanHeadedHousehold: boolean;
  isSamurdhiBeneficiary: boolean;
  hasPregnantMother: boolean;
  hasPersonWithDisability: boolean;
  notes?: string;
}

export interface MonthlyStampCollection {
  monthIndex: number; // 1 to 10
  monthLabelTa: string; // e.g. "மாதம் 01 (Month 1)"
  monthLabelEn: string; // e.g. "Month 01"
  collected: boolean;
  collectedDate?: string;
  collectedByOfficer?: string;
  notes?: string;
}

export interface PregnantMotherRecord {
  id: string; // e.g. "MAT-211-2026-001"
  name: string; // பெயர்
  nic: string; // தேசிய அடையாள அட்டை இலக்கம்
  divisionCode: string; // கிராம உத்தியோகத்தர் பிரிவு
  dsDivisionId?: string; // e.g. "DS_VAHARAI"
  phone: string; // தொலைபேசி
  familyCode?: string; // குடும்ப QR / குறியீடு (Family Code)
  familyRelationship?: FamilyRelationship; // தாய் / மனைவி / etc.
  welfareSchemes?: WelfareScheme[]; // பல நலன்புரி உதவிகள் (Checklist)
  registrationDate: string; // பதிவு செய்த திகதி (YYYY-MM-DD)
  expectedCompletionDate: string; // முடிவடையும் திகதி 10 மாதங்களின் பின் (YYYY-MM-DD)
  stampIssueDate?: string; // முத்திரை வழங்கப்பட்ட திகதி
  stampNumber?: string; // முத்திரை இலக்கம்
  stampValue: number; // முத்திரையின் பெறுமதி (e.g. 4500)
  pregnancyNumber: number; // 01, 02, 03, 04 வது குழந்தை/பிரசவம்
  monthlyCollections: MonthlyStampCollection[]; // 10 மாதங்களும் முத்திரைக்கான பொருளை பெற்றதை அடையாளமிடும் இடம்
  isCompleted: boolean; // 10 மாதங்கள் அடையாளம் இட்ட பின் முடிவு பகுதிக்கு செல்லும் வசதி
  completedDate?: string;
  status: 'WAITING_STAMP' | 'ACTIVE_COLLECTING' | 'COMPLETED'; // காத்திருப்பு வரிசை / பொருட்கள் பெறும் நிலை / முடிவுற்றவை
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ================= LAND BRANCH MANAGEMENT TYPES (Requirement 05) ================= //
export type LandType = 
  | 'CROWN_PERMIT'      // அரச அனுமதிப்பத்திர காணி (LDO Permit Land)
  | 'AGRICULTURAL'      // விவசாய மானாவாரி / நீர்ப்பாசன காணி
  | 'RESIDENTIAL'       // குடியிருப்பு காணி
  | 'COMMERCIAL'        // வர்த்தக காணி
  | 'PADDY_FIELD'       // நன்செய் வயல் காணி
  | 'DISPUTED_LAND';    // பிணக்குக்குரிய காணி

export type LandPermitStatus = 
  | 'PERMIT_ISSUED'      // அனுமதிப்பத்திரம் வழங்கப்பட்டது (Permit Granted)
  | 'PENDING_APPROVAL'   // அனுமதிக்கு காத்திருப்பு (Pending DS Approval)
  | 'IN_DISPUTE'         // காணி பிணக்கு நிலுவையில் (Land Dispute Active)
  | 'SETTLEMENT_STAGE'   // காணி கச்சேரி / தீர்வு கட்டம் (Land Kachcheri Settlement)
  | 'CANCELLED';         // ரத்து செய்யப்பட்டது

export interface LandRecord {
  id: string; // e.g. "LND-211-2026-001"
  permitNo: string; // e.g. "LDO/211/2024/089"
  lotNo: string; // காணித் துண்டு இலக்கம்
  planNo: string; // வரைபட இலக்கம்
  extent: string; // விஸ்தீரணம் (e.g. "0A-1R-20P" or "0.5 Acres")
  landType: LandType;
  divisionCode: string; // GN Division e.g. "211"
  dsDivisionId?: string; // e.g. "DS_VAHARAI"
  ownerNic: string; // உரிமையாளர் NIC
  ownerNameTa: string; // உரிமையாளர் பெயர் (தமிழ்)
  ownerNameEn: string; // உரிமையாளர் பெயர் (ஆங்கிலம்)
  ownerPhone?: string;
  familyCode?: string; // குடும்ப குறியீடு (FAM-xxx)
  permitStatus: LandPermitStatus;
  issueDate?: string;
  annualTaxStatus?: 'PAID' | 'DUE' | 'EXEMPT';
  boundaries?: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ================= HOUSEHOLD DATA & 100-POINT POVERTY SCORING ENGINE (Requirements 02, 04, 08) ================= //
export interface HouseholdCommonAssets {
  // Section 02: நிலம் மற்றும் கட்டிட சொத்துக்கள்
  ownsLand: boolean; // 2.1
  landExtent: 'LESS_THAN_HALF_ACRE' | 'MORE_THAN_HALF_ACRE' | 'NONE';
  ownsOtherLand: boolean; // 2.2
  otherLandExtent: 'LESS_THAN_ONE_ACRE' | 'MORE_THAN_ONE_ACRE' | 'NONE';
  // Extended Official Asset Fields
  houseAndLandOwnership?: 'OWN_BOTH' | 'OWN_HOUSE_ONLY' | 'OWN_LAND_ONLY' | 'RENTED_LEASED' | 'CROWN_PERMIT' | 'RELATIVES_HOUSE' | 'NO_OWNERSHIP';
  receivedAsCompensation?: boolean;
  compensationDetails?: string;
  otherHouseDetails?: string;
  hasHighland?: boolean;
  highlandExtent?: 'NONE' | 'LESS_THAN_HALF_ACRE' | 'HALF_TO_ONE_ACRE' | 'MORE_THAN_ONE_ACRE';
  hasPaddyLand?: boolean;
  paddyLandExtent?: 'NONE' | 'LESS_THAN_ONE_ACRE' | 'ONE_TO_TWO_ACRES' | 'MORE_THAN_TWO_ACRES';

  // Section 03: பிற சொத்துக்கள்
  vehicleType: 'NONE' | 'BICYCLE' | 'MOTORCYCLE' | 'THREE_WHEELER' | 'CAR' | 'VAN_JEEP' | 'BUS' | 'LORRY' | 'HAND_TRACTOR' | 'FOUR_WHEEL_TRACTOR'; // 3.1
  machineryType: 'NONE' | 'MOTOR_BOAT' | 'NON_MOTOR_BOAT' | 'HARVESTER' | 'WATER_PUMP' | 'SEWING_MACHINE' | 'OTHER_EQUIPMENT'; // 3.2
  livestockType: 'NONE' | 'CATTLE' | 'GOATS' | 'PIGS' | 'POULTRY' | 'DUCKS' | 'OTHER'; // 3.3
  livestockCount: number;

  // Section 04: கடந்த மாத செலவுகள் (Expenses Rs.)
  expenses: {
    food: number;
    water: number;
    clothing: number;
    medical: number;
    rent: number;
    transport: number;
    electricity: number;
    fuelGas: number;
    telecom: number;
    education: number;
    religiousLeisure: number;
    loansDebt: number;
    total: number;
  };

  // Section 05: கடந்த மாத வருமானம் (Income Rs.)
  income: {
    unstableSources: number;
    salary: number;
    business: number;
    agriculture: number;
    rent: number;
    pension: number;
    samurdhi: number;
    elderlyAid: number;
    disabilityAid: number;
    ckdAid: number;
    foreignRemittance: number;
    localRemittance: number;
    otherGovAid: number;
    other: number;
    total: number;
  };

  // Section 06: மின்சார அலகுகள் (kWh)
  electricityUnitsKwh: number;

  // Section 07: வீடு பற்றிய விபரங்கள்
  unitType: 'SINGLE_1_STORY' | 'SINGLE_2_STORY' | 'ANNEX' | 'SLUM_SHACK' | 'LINE_ROOM' | 'TEMPORARY_HUT' | 'OTHER'; // 7.1
  housingPermanency?: 'PERMANENT' | 'SEMI_PERMANENT' | 'TEMPORARY';
  isSingleFloor?: boolean;
  floorMaterial: 'CEMENT' | 'TILES' | 'CONCRETE' | 'CLAY' | 'SAND' | 'DILAPIDATED'; // 7.2
  roofMaterial: 'TILES' | 'ASBESTOS' | 'CONCRETE' | 'SHEET_ALUMINIUM' | 'THATCH_PALM' | 'DILAPIDATED'; // 7.3
  wallMaterial: 'BRICK' | 'CABOOK' | 'CEMENT_BLOCK' | 'CLAY_MUD' | 'PLANK' | 'PALM_LEAF' | 'DILAPIDATED'; // 7.4
  houseArea: 'LESS_THAN_500_SQFT' | '500_TO_1000_SQFT' | 'MORE_THAN_1000_SQFT' | 'MORE_THAN_500_SQFT'; // 7.5
  exactFloorAreaSqFt?: number;
  ownsCurrentHouse: boolean; // 8.1
  ownsOtherHouse: boolean; // 8.2

  // Section 09: ஒளி பெறும் முறை
  lightingSource: 'KEROSENE' | 'GRID_ELECTRICITY' | 'SOLAR' | 'GENERATOR_BATTERY';

  // Section 10: குடிநீர் ஆதாரம்
  waterSource: 'PROTECTED_WELL' | 'UNPROTECTED_WELL' | 'NWSDB_TAP' | 'COMMUNITY_TAP' | 'TUBE_WELL' | 'RIVER_TANK' | 'RAINWATER' | 'BOTTLED_RO';

  // Section 11 & 12: கழிப்பறை
  toiletLocation: 'INDOOR_EXCLUSIVE' | 'SHARED' | 'OUTDOOR_EXCLUSIVE' | 'PUBLIC' | 'OPEN_DEFECATION';
  toiletNature: 'WATER_SEAL_SEPTIC' | 'WATER_SEAL_PIT' | 'POUR_FLUSH' | 'DIRECT_PIT_SLAB' | 'OPEN_PIT_NO_SLAB' | 'NO_TOILET';

  // Section 13: தாய் அல்லது தந்தை மாத்திரம் உள்ள குடும்பம் (Single Parent)
  isSingleParent: boolean;
}

export interface BankDetails {
  bankName: string;
  branch: string;
  accountNumber: string;
  accountName: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
}

export interface PovertyScoreFactorItem {
  category: 'DEMOGRAPHICS' | 'HOUSING' | 'SANITATION' | 'ECONOMIC';
  labelTa: string;
  labelEn: string;
  points: number;
}

export interface HouseholdData {
  id: string; // e.g. "HH-5-1-03-01-010-00435"
  familyCode: string; // e.g. "FAM-211-042"
  householdReference: string; // Official reference
  applicationReference: string; // e.g. "20250515-4622119"
  applicantNameTa: string; // e.g. "சின்னப்பு விஜயகுமார்"
  applicantNameEn: string; // e.g. "SINNAPPU VIJAYAKUMAR"
  applicantNic: string; // e.g. "891902697V"
  phone: string; // e.g. "0760539158"
  address: string; // e.g. "SELVAPURAM KAYANKERNI"
  divisionCode: string; // e.g. "211A"
  dsDivisionId?: string; // e.g. "DS_VAHARAI"
  status: 'DS_ENDORSED' | 'COMMITTEE_APPROVED' | 'GRIEVANCE_PENDING' | 'ACTIVE';
  selectedCategory: 'VULNERABLE' | 'EXTREME_POOR' | 'POOR' | 'TRANSITIONAL' | 'NON_VULNERABLE';
  objectionsStatus?: string; // e.g. "OC-08-10-2025-69523 [Completed]"
  appealsStatus?: string;
  bankDetails: BankDetails;
  commonAssets: HouseholdCommonAssets;
  totalMembersCount: number;
  familyQrPayload: string;
  // 100-Point Poverty Assessment Result
  score100: number; // 0 to 100
  priorityRank: 1 | 2 | 3 | 4; // 1 = Highest Priority (Emergency/Extreme), 4 = Non-vulnerable
  scoreBreakdown: {
    housingScore: number; // max 25
    sanitationScore: number; // max 20
    demographicsScore: number; // max 25
    economicScore: number; // max 30
    itemizedFactors?: PovertyScoreFactorItem[];
  };
  createdAt: string;
  updatedAt: string;
}

// Configurable Poverty Weights Schema for Super Admin
export interface PovertyScoringWeights {
  housingMax: number; // default 25
  sanitationMax: number; // default 20
  demographicsMax: number; // default 25
  economicMax: number; // default 30
  // Item weights
  thatchRoofPoints: number; // 8
  mudWallPoints: number; // 7
  sandFloorPoints: number; // 5
  smallHouseAreaPoints: number; // 5
  noLandPoints: number; // 5
  noToiletPoints: number; // 8
  unprotectedWaterPoints: number; // 6
  keroseneLightingPoints: number; // 6
  singleParentPoints: number; // 8
  disabilityMemberPoints: number; // 7
  chronicIllnessPoints: number; // 5
  elderlyMemberPoints: number; // 5
  lowIncomePoints: number; // 15
  noVehiclePoints: number; // 5
  dailyWageLaborPoints: number; // 10
  // Extended multi-dimensional weights
  ckduPoints?: number; // 6
  childrenNotInSchoolPoints?: number; // 5
  belowOLPoints?: number; // 3
  dependentsPoints?: number; // 4
  nonPermanentHousePoints?: number; // 6
  expenditureDeficitPoints?: number; // 4
  lowElectricityUnitsPoints?: number; // 4
  noProductiveAssetsPoints?: number; // 5
}

export const DEFAULT_POVERTY_WEIGHTS: PovertyScoringWeights = {
  housingMax: 25,
  sanitationMax: 20,
  demographicsMax: 25,
  economicMax: 30,
  thatchRoofPoints: 6,
  mudWallPoints: 5,
  sandFloorPoints: 4,
  smallHouseAreaPoints: 5,
  noLandPoints: 5,
  noToiletPoints: 8,
  unprotectedWaterPoints: 6,
  keroseneLightingPoints: 6,
  singleParentPoints: 5,
  disabilityMemberPoints: 5,
  chronicIllnessPoints: 4,
  elderlyMemberPoints: 4,
  lowIncomePoints: 12,
  noVehiclePoints: 4,
  dailyWageLaborPoints: 6,
  ckduPoints: 6,
  childrenNotInSchoolPoints: 5,
  belowOLPoints: 3,
  dependentsPoints: 4,
  nonPermanentHousePoints: 6,
  expenditureDeficitPoints: 4,
  lowElectricityUnitsPoints: 4,
  noProductiveAssetsPoints: 5,
};

export interface MembersAtAGlanceSummary {
  totalMembers: number;
  belowOLCount: number;
  childrenNotInSchool5To16Count: number;
  chronicDiseaseCount: number;
  disabilityCount: number;
  ckduCount: number;
  dependentsCount: number;
  over70Count: number;
}

export const computeAgeFromDobSafe = (dob?: string): number => {
  if (!dob) return 0;
  const parsed = new Date(dob);
  if (isNaN(parsed.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const m = today.getMonth() - parsed.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

export const isEducationBelowOL = (educationLevel?: string): boolean => {
  if (!educationLevel) return false;
  const val = educationLevel.trim().toUpperCase();
  if (
    val === 'NO_SCHOOLING' ||
    val === 'BELOW_OL' ||
    val === 'PRIMARY' ||
    val === 'JUNIOR_SECONDARY' ||
    val === 'PRESCHOOL'
  ) {
    return true;
  }
  if (val === 'OL_PASSED' || val === 'AL_PASSED' || val === 'DIPLOMA_DEGREE' || val === 'GRADUATE') {
    return false;
  }
  // Free text Tamil/English patterns like "தரம் 8", "Grade 5", "O/L கீழ்"
  const gradeMatch = val.match(/(?:GRADE|தரம்)\s*(\d+)/);
  if (gradeMatch && Number(gradeMatch[1]) < 11) return true;
  if (val.includes('BELOW') || val.includes('கீழ்') || val.includes('படிக்காத') || val.includes('இல்லை')) return true;
  return false;
};

export const computeMembersAtAGlance = (members: Array<Partial<Beneficiary>> = []): MembersAtAGlanceSummary => {
  let belowOLCount = 0;
  let childrenNotInSchool5To16Count = 0;
  let chronicDiseaseCount = 0;
  let disabilityCount = 0;
  let ckduCount = 0;
  let dependentsCount = 0;
  let over70Count = 0;

  for (const m of members) {
    const age = computeAgeFromDobSafe(m.dob);

    // Over 70 years
    if (age >= 70 || (m.isElderly && age === 0)) {
      over70Count++;
    }

    // Below O/L education (for members aged >= 16 or explicitly marked)
    if (isEducationBelowOL(m.educationLevel) && (age >= 16 || age === 0 || m.educationLevel === 'BELOW_OL' || m.educationLevel === 'NO_SCHOOLING')) {
      belowOLCount++;
    }

    // Children not in school (5-16)
    if (age >= 5 && age <= 16 && m.isAttendingSchool === false) {
      childrenNotInSchool5To16Count++;
    }

    // CKDU
    const hasCkdu = Boolean(m.hasCkdu || m.chronicIllness === 'CKD_KIDNEY' || m.welfareSchemes?.includes('CHRONIC_KIDNEY') || m.welfareScheme === 'CHRONIC_KIDNEY');
    if (hasCkdu) {
      ckduCount++;
    }

    // Chronic disease (includes CKDU or any other chronic illness except physical-disability-only)
    const hasChronic = Boolean(
      hasCkdu ||
      (m.chronicIllness && m.chronicIllness !== 'NONE' && m.chronicIllness !== 'DISABILITY_PHYSICAL')
    );
    if (hasChronic) {
      chronicDiseaseCount++;
    }

    // Disability
    if (m.isPersonWithDisability || m.chronicIllness === 'DISABILITY_PHYSICAL') {
      disabilityCount++;
    }

    // Dependents (explicit flag OR child < 18 OR elderly >= 70 OR disabled non-earner)
    const autoDependent = age > 0 && (age < 18 || age >= 70);
    if (m.isDependent === true || (m.isDependent !== false && autoDependent)) {
      dependentsCount++;
    }
  }

  return {
    totalMembers: members.length,
    belowOLCount,
    childrenNotInSchool5To16Count,
    chronicDiseaseCount,
    disabilityCount,
    ckduCount,
    dependentsCount,
    over70Count,
  };
};

// 100-Point Scoring Function (All-inclusive Multi-Dimensional Poverty Assessment)
export const calculateFamilyPovertyScore = (
  common: HouseholdCommonAssets,
  members: Array<Partial<Beneficiary>> = [],
  weights: PovertyScoringWeights = DEFAULT_POVERTY_WEIGHTS
): {
  score100: number;
  priorityRank: 1 | 2 | 3 | 4;
  breakdown: {
    housingScore: number;
    sanitationScore: number;
    demographicsScore: number;
    economicScore: number;
    itemizedFactors: PovertyScoreFactorItem[];
  };
} => {
  const w = { ...DEFAULT_POVERTY_WEIGHTS, ...weights };
  const glance = computeMembersAtAGlance(members);
  const itemizedFactors: PovertyScoreFactorItem[] = [];

  // 1. Housing & Living Conditions Score (Max w.housingMax e.g. 25)
  let rawHousing = 0;

  const isTemporaryOrNonPermanent =
    common.housingPermanency === 'TEMPORARY' ||
    common.unitType === 'SLUM_SHACK' ||
    common.unitType === 'TEMPORARY_HUT' ||
    common.unitType === 'LINE_ROOM';
  const isSemiPermanent = common.housingPermanency === 'SEMI_PERMANENT';
  const nonPermPts = w.nonPermanentHousePoints ?? 6;

  if (isTemporaryOrNonPermanent) {
    rawHousing += nonPermPts;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'தற்காலிக / நிரந்தரமற்ற வீடு', labelEn: 'Temporary / Non-permanent House', points: nonPermPts });
  } else if (isSemiPermanent) {
    const pts = Math.round(nonPermPts * 0.5);
    rawHousing += pts;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'அரை நிரந்தர வீடு', labelEn: 'Semi-permanent House', points: pts });
  }

  if (common.roofMaterial === 'THATCH_PALM' || common.roofMaterial === 'DILAPIDATED') {
    rawHousing += w.thatchRoofPoints;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'ஓலை / சிதைந்த கூரை', labelEn: 'Thatch / Dilapidated Roof', points: w.thatchRoofPoints });
  } else if (common.roofMaterial === 'SHEET_ALUMINIUM') {
    const pts = Math.round(w.thatchRoofPoints * 0.5);
    rawHousing += pts;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'தகரக் கூரை', labelEn: 'Metal Sheet Roof', points: pts });
  }

  if (common.wallMaterial === 'CLAY_MUD' || common.wallMaterial === 'PALM_LEAF' || common.wallMaterial === 'DILAPIDATED') {
    rawHousing += w.mudWallPoints;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'மண் / ஓலைச் சுவர்', labelEn: 'Mud / Palm Leaf Wall', points: w.mudWallPoints });
  } else if (common.wallMaterial === 'PLANK') {
    const pts = Math.round(w.mudWallPoints * 0.5);
    rawHousing += pts;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'பலகைச் சுவர்', labelEn: 'Plank Wall', points: pts });
  }

  if (common.floorMaterial === 'CLAY' || common.floorMaterial === 'SAND' || common.floorMaterial === 'DILAPIDATED') {
    rawHousing += w.sandFloorPoints;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'மண் / மணல் தரை', labelEn: 'Clay / Sand Floor', points: w.sandFloorPoints });
  }

  if (common.houseArea === 'LESS_THAN_500_SQFT') {
    rawHousing += w.smallHouseAreaPoints;
    itemizedFactors.push({ category: 'HOUSING', labelTa: '500 சதுர அடிக்கும் குறைவான வீடு', labelEn: 'Floor area < 500 sq.ft', points: w.smallHouseAreaPoints });
  }

  const noOwnership =
    common.houseAndLandOwnership === 'NO_OWNERSHIP' ||
    common.houseAndLandOwnership === 'RENTED_LEASED' ||
    common.houseAndLandOwnership === 'RELATIVES_HOUSE' ||
    (!common.ownsLand && !common.ownsCurrentHouse);
  if (noOwnership) {
    rawHousing += w.noLandPoints;
    itemizedFactors.push({ category: 'HOUSING', labelTa: 'சொந்த வீடு / காணி உரிமையின்மை', labelEn: 'No House & Land Ownership', points: w.noLandPoints });
  }

  const housingScore = Math.min(w.housingMax, Math.max(0, rawHousing));

  // 2. Sanitation, Water & Lighting Score (Max w.sanitationMax e.g. 20)
  let rawSanitation = 0;
  if (common.toiletLocation === 'OPEN_DEFECATION' || common.toiletNature === 'NO_TOILET') {
    rawSanitation += w.noToiletPoints;
    itemizedFactors.push({ category: 'SANITATION', labelTa: 'கழிப்பறை வசதி இல்லை', labelEn: 'No Toilet Facility', points: w.noToiletPoints });
  } else if (
    common.toiletLocation === 'SHARED' ||
    common.toiletLocation === 'PUBLIC' ||
    common.toiletNature === 'OPEN_PIT_NO_SLAB' ||
    common.toiletNature === 'DIRECT_PIT_SLAB'
  ) {
    const pts = Math.round(w.noToiletPoints * 0.5);
    rawSanitation += pts;
    itemizedFactors.push({ category: 'SANITATION', labelTa: 'பகிர்ந்த / அடிப்படைக் கழிப்பறை', labelEn: 'Shared / Basic Pit Toilet', points: pts });
  }

  if (common.waterSource === 'UNPROTECTED_WELL' || common.waterSource === 'RIVER_TANK') {
    rawSanitation += w.unprotectedWaterPoints;
    itemizedFactors.push({ category: 'SANITATION', labelTa: 'பாதுகாப்பற்ற குடிநீர் மூலம்', labelEn: 'Unprotected Drinking Water Source', points: w.unprotectedWaterPoints });
  } else if (common.waterSource === 'COMMUNITY_TAP' || common.waterSource === 'RAINWATER') {
    const pts = Math.round(w.unprotectedWaterPoints * 0.5);
    rawSanitation += pts;
    itemizedFactors.push({ category: 'SANITATION', labelTa: 'பொதுக் குழாய் / மழைநீர் குடிநீர்', labelEn: 'Community Tap / Rainwater', points: pts });
  }

  if (common.lightingSource === 'KEROSENE') {
    rawSanitation += w.keroseneLightingPoints;
    itemizedFactors.push({ category: 'SANITATION', labelTa: 'மண்ணெண்ணெய் விளக்கு (மின்சாரம் இல்லை)', labelEn: 'Kerosene Lighting (No Grid Power)', points: w.keroseneLightingPoints });
  } else if (common.lightingSource === 'GENERATOR_BATTERY') {
    const pts = Math.round(w.keroseneLightingPoints * 0.5);
    rawSanitation += pts;
    itemizedFactors.push({ category: 'SANITATION', labelTa: 'மின்கல / ஜெனரேட்டர் ஒளி', labelEn: 'Battery / Generator Lighting', points: pts });
  }
  const sanitationScore = Math.min(w.sanitationMax, Math.max(0, rawSanitation));

  // 3. Demographics & Members-at-a-Glance Score (Max w.demographicsMax e.g. 25)
  let rawDemo = 0;
  if (common.isSingleParent) {
    rawDemo += w.singleParentPoints;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: 'ஒற்றைப் பெற்றோர் குடும்பம்', labelEn: 'Single Parent Household', points: w.singleParentPoints });
  }
  if (glance.ckduCount > 0) {
    const pts = w.ckduPoints ?? 6;
    rawDemo += pts;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: `சிறுநீரக நோய் (CKDU: ${glance.ckduCount})`, labelEn: `CKDU Patient (${glance.ckduCount})`, points: pts });
  }
  if (glance.disabilityCount > 0) {
    rawDemo += w.disabilityMemberPoints;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: `மாற்றுத்திறனாளி (${glance.disabilityCount})`, labelEn: `Person with Disability (${glance.disabilityCount})`, points: w.disabilityMemberPoints });
  }
  if (glance.chronicDiseaseCount > 0) {
    rawDemo += w.chronicIllnessPoints;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: `நாள்பட்ட நோயாளர் (${glance.chronicDiseaseCount})`, labelEn: `Chronic Disease (${glance.chronicDiseaseCount})`, points: w.chronicIllnessPoints });
  }
  if (glance.over70Count > 0) {
    rawDemo += w.elderlyMemberPoints;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: `70 வயதுக்கு மேற்பட்டோர் (${glance.over70Count})`, labelEn: `Over 70 Years (${glance.over70Count})`, points: w.elderlyMemberPoints });
  }
  if (glance.childrenNotInSchool5To16Count > 0) {
    const pts = w.childrenNotInSchoolPoints ?? 5;
    rawDemo += pts;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: `பாடசாலை செல்லாத பிள்ளைகள் 5–16 (${glance.childrenNotInSchool5To16Count})`, labelEn: `Children 5–16 Not in School (${glance.childrenNotInSchool5To16Count})`, points: pts });
  }
  if (glance.belowOLCount > 0) {
    const pts = w.belowOLPoints ?? 3;
    rawDemo += pts;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: `O/L கீழ் கல்வி நிலை (${glance.belowOLCount})`, labelEn: `Below O/L Education (${glance.belowOLCount})`, points: pts });
  }
  const dependencyRatio = glance.totalMembers > 0 ? glance.dependentsCount / glance.totalMembers : 0;
  if (glance.dependentsCount >= 3 || dependencyRatio >= 0.5) {
    const pts = w.dependentsPoints ?? 4;
    rawDemo += pts;
    itemizedFactors.push({ category: 'DEMOGRAPHICS', labelTa: `அதிக தங்கி வாழ்வோர் (${glance.dependentsCount}/${glance.totalMembers})`, labelEn: `High Dependents (${glance.dependentsCount}/${glance.totalMembers})`, points: pts });
  }
  const demographicsScore = Math.min(w.demographicsMax, Math.max(0, rawDemo));

  // 4. Economic Level & Assets Score (Max w.economicMax e.g. 30)
  let rawEcon = 0;
  const totalIncome = common.income.total || (
    common.income.unstableSources + common.income.salary + common.income.business + common.income.agriculture + common.income.samurdhi + common.income.pension
  );
  const totalExpenses = common.expenses.total || (
    common.expenses.food + common.expenses.water + common.expenses.clothing + common.expenses.medical + common.expenses.rent + common.expenses.transport + common.expenses.electricity + common.expenses.education
  );

  if (totalIncome <= 15000) {
    rawEcon += w.lowIncomePoints;
    itemizedFactors.push({ category: 'ECONOMIC', labelTa: `மிகக் குறைந்த மாத வருமானம் (Rs. ${totalIncome.toLocaleString()})`, labelEn: `Very Low Monthly Income (Rs. ${totalIncome.toLocaleString()})`, points: w.lowIncomePoints });
  } else if (totalIncome <= 30000) {
    const pts = Math.round(w.lowIncomePoints * 0.6);
    rawEcon += pts;
    itemizedFactors.push({ category: 'ECONOMIC', labelTa: `குறைந்த மாத வருமானம் (Rs. ${totalIncome.toLocaleString()})`, labelEn: `Low Monthly Income (Rs. ${totalIncome.toLocaleString()})`, points: pts });
  }

  if (totalExpenses > totalIncome && totalIncome > 0) {
    const pts = w.expenditureDeficitPoints ?? 4;
    rawEcon += pts;
    itemizedFactors.push({ category: 'ECONOMIC', labelTa: 'வருமானத்தை விட மாதச் செலவு அதிகம்', labelEn: 'Monthly Expenditure Exceeds Income', points: pts });
  }

  const kwh = Number(common.electricityUnitsKwh || 0);
  if (kwh <= 30) {
    const pts = w.lowElectricityUnitsPoints ?? 4;
    rawEcon += pts;
    itemizedFactors.push({ category: 'ECONOMIC', labelTa: `குறைந்த மின்சாரப் பயன்பாடு (${kwh} அலகுகள்/மாதம்)`, labelEn: `Low Electricity Usage (${kwh} units/month)`, points: pts });
  }

  if (common.vehicleType === 'NONE' || common.vehicleType === 'BICYCLE') {
    rawEcon += w.noVehiclePoints;
    itemizedFactors.push({ category: 'ECONOMIC', labelTa: 'மோட்டார் வாகனம் இல்லை', labelEn: 'No Motor Vehicle Owned', points: w.noVehiclePoints });
  }

  if (common.income.unstableSources > 0 || common.machineryType === 'NONE') {
    rawEcon += w.dailyWageLaborPoints;
    itemizedFactors.push({ category: 'ECONOMIC', labelTa: 'நிலையற்ற வருமானம் / இயந்திரம் இல்லை', labelEn: 'Unstable Income / No Machinery', points: w.dailyWageLaborPoints });
  }

  const hasProductiveLandOrAssets = Boolean(
    common.ownsOtherHouse ||
    common.hasHighland ||
    common.hasPaddyLand ||
    common.ownsOtherLand ||
    (common.livestockCount && common.livestockCount >= 5)
  );
  if (!hasProductiveLandOrAssets) {
    const pts = w.noProductiveAssetsPoints ?? 5;
    rawEcon += pts;
    itemizedFactors.push({ category: 'ECONOMIC', labelTa: 'மேட்டு நிலம் / வயல் / மாற்று வீடு / கால்நடை சொத்து இல்லை', labelEn: 'No Highland / Paddy / Other House / Livestock Assets', points: pts });
  } else {
    // Asset wealth offsets (owning high-value assets lowers poverty score)
    if (common.ownsOtherHouse) {
      rawEcon -= 6;
      itemizedFactors.push({ category: 'ECONOMIC', labelTa: 'மாற்று வீடு / கட்டிடம் உள்ளது (கழிவு)', labelEn: 'Owns Other House / Building (Offset)', points: -6 });
    }
    if (common.vehicleType === 'CAR' || common.vehicleType === 'VAN_JEEP' || common.vehicleType === 'BUS' || common.vehicleType === 'LORRY') {
      rawEcon -= 8;
      itemizedFactors.push({ category: 'ECONOMIC', labelTa: 'பெரிய / தனிப்பட்ட வாகனம் உள்ளது (கழிவு)', labelEn: 'Owns Car / Van / Commercial Vehicle (Offset)', points: -8 });
    }
  }

  const economicScore = Math.min(w.economicMax, Math.max(0, rawEcon));
  const totalScore = Math.min(100, Math.max(0, housingScore + sanitationScore + demographicsScore + economicScore));

  let priorityRank: 1 | 2 | 3 | 4 = 4;
  if (totalScore >= 80) priorityRank = 1;
  else if (totalScore >= 60) priorityRank = 2;
  else if (totalScore >= 40) priorityRank = 3;
  else priorityRank = 4;

  return {
    score100: totalScore,
    priorityRank,
    breakdown: {
      housingScore,
      sanitationScore,
      demographicsScore,
      economicScore,
      itemizedFactors,
    },
  };
};

// ================= PUBLIC REQUESTS & COMPLAINTS / GRIEVANCE REDRESS (Requirement 07) ================= //
export type PetitionDepartment =
  | 'LAND'                // காணிப் பிரிவு (Land Branch)
  | 'ASWESUMA_SAMURDHI'   // அஸ்வெசும & சமுர்த்தி (Aswesuma & Samurdhi)
  | 'ELDERLY'             // முதியோர் நலன்புரி பிரிவு (Elderly Welfare)
  | 'DISABILITY'          // மாற்றுத்திறனாளிகள் நலன்புரி பிரிவு (Disability Welfare)
  | 'MATERNITY'           // கர்ப்பிணித் தாய்மார் & போசணை பிரிவு (Maternity & Nutrition)
  | 'GRAMA_NILADHARI'     // கிராம அலுவலர் நிர்வாகம் (Grama Niladhari Unit)
  | 'PLANNING'            // திட்டமிடல் கிளை (Planning Branch)
  | 'GENERAL_ADMIN';      // பொது நிர்வாகம் / பிரதேச செயலாளர் (Divisional Secretary / General)

export type PetitionStatus =
  | 'PENDING'             // நிலுவையில் (Pending / Received)
  | 'INQUIRY'             // விசாரணை (Under Inquiry / Hearing)
  | 'FIELD_INSPECTION'    // கள ஆய்வு (Field Inspection)
  | 'RESOLVED'            // தீர்க்கப்பட்டது (Resolved)
  | 'REJECTED';           // நிராகரிக்கப்பட்டது (Rejected)

export type PetitionType = 'REQUEST' | 'COMPLAINT'; // கோரிக்கை அல்லது முறைப்பாடு

export interface PublicPetition {
  id: string; // e.g. "PET-2026-001"
  tokenNumber?: string;
  citizenNic: string;
  citizenName: string;
  phone?: string;
  address?: string;
  divisionCode: string; // e.g. "211"
  dsDivisionId?: string; // e.g. "DS_VAHARAI"
  targetDepartment: PetitionDepartment;
  requestType: PetitionType;
  subject: string;
  description: string;
  submittedDate: string;
  status: PetitionStatus;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  assignedOfficer?: string;
  assignedOfficerRole?: string;
  inquiryDate?: string;
  inquiryNotes?: string;
  fieldInspectionDate?: string;
  fieldInspectionOfficer?: string;
  fieldInspectionFindings?: string;
  resolutionDecision?: string;
  resolvedDate?: string;
  resolvedBy?: string;
  letterPhotoUrl?: string; // Captured photo / uploaded image of the citizen petition letter
  scannedViaAi?: boolean;
  aiExtractionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

