import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  HouseholdData,
  HouseholdCommonAssets,
  Beneficiary,
  GNDivision,
  AssistanceRecord,
  PovertyScoringWeights,
  FamilyRelationship,
  ChronicIllness,
  CitizenStatus,
  FamilyResidencyStatus,
  TransferScope,
  calculateFamilyPovertyScore,
  computeMembersAtAGlance,
  computeAgeFromDobSafe,
} from '../types';
import { Language } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { generateQrDataUrl } from '../utils/barcode';
import { generateProvisionalNic } from '../services/storage';
import {
  X,
  Printer,
  Save,
  QrCode,
  Users,
  Plus,
  UserPlus,
  Trash2,
  Home,
  Droplets,
  Zap,
  DollarSign,
  ShieldCheck,
  FileText,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  Award,
  ArrowLeft,
  ArrowRight,
  Gift,
} from 'lucide-react';

export interface MemberDraft {
  id?: string; // existing beneficiary ID if editing
  nameTa: string;
  nameEn: string;
  nic: string;
  isProvisionalNic?: boolean;
  rel: FamilyRelationship;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  phone: string;
  educationLevel: string;
  isAttendingSchool: boolean;
  isDisability: boolean;
  disabilityNature?: string;
  isElderly: boolean;
  isPregnant: boolean;
  hasCkdu: boolean;
  isDependent: boolean;
  chronicIllness: ChronicIllness;
  economicActivity: string;
  status: CitizenStatus;
  transferScope?: TransferScope;
  transferDestination?: string;
  transferDate?: string;
  deathDate?: string;
  deathCertificateNo?: string;
  deathRemarks?: string;
  existingBeneficiary?: Beneficiary;
}

export type DossierWindowTab = 'family-entry' | 'members' | 'summary-a4';

interface OfficialFamilyDossierWindowProps {
  isOpen: boolean;
  initialTab?: DossierWindowTab;
  editingHousehold?: HouseholdData | null;
  existingHouseholdsCount: number;
  existingBeneficiaries: Beneficiary[];
  assistanceRecords?: AssistanceRecord[];
  divisions: GNDivision[];
  lang: Language;
  povertyWeights: PovertyScoringWeights;
  canEdit: boolean;
  isSuperAdmin?: boolean;
  lockedDivisionCode?: string;
  currentUserName?: string;
  onClose: () => void;
  onSaveFamily: (payload: {
    household: HouseholdData;
    savedMembers: Beneficiary[];
    removedMemberIds: string[];
    isEdit: boolean;
  }) => void;
}

const DEFAULT_ASSETS: HouseholdCommonAssets = {
  ownsLand: false,
  landExtent: 'NONE',
  ownsOtherLand: false,
  otherLandExtent: 'NONE',
  houseAndLandOwnership: 'NO_OWNERSHIP',
  receivedAsCompensation: false,
  compensationDetails: '',
  otherHouseDetails: '',
  hasHighland: false,
  highlandExtent: 'NONE',
  hasPaddyLand: false,
  paddyLandExtent: 'NONE',
  paddyLandPlAccountNo: '',
  vehicleType: 'NONE',
  machineryType: 'NONE',
  livestockType: 'NONE',
  livestockCount: 0,
  expenses: {
    food: 12000,
    water: 500,
    clothing: 1000,
    medical: 2000,
    rent: 0,
    transport: 1000,
    electricity: 700,
    fuelGas: 1200,
    telecom: 600,
    education: 1000,
    religiousLeisure: 500,
    loansDebt: 1500,
    total: 22000,
  },
  income: {
    unstableSources: 12000,
    salary: 0,
    business: 0,
    agriculture: 2000,
    rent: 0,
    pension: 0,
    samurdhi: 0,
    elderlyAid: 0,
    disabilityAid: 0,
    ckdAid: 0,
    foreignRemittance: 0,
    localRemittance: 0,
    otherGovAid: 0,
    other: 0,
    total: 14000,
  },
  electricityUnitsKwh: 24,
  unitType: 'SINGLE_1_STORY',
  housingPermanency: 'SEMI_PERMANENT',
  isSingleFloor: true,
  floorMaterial: 'CEMENT',
  roofMaterial: 'SHEET_ALUMINIUM',
  wallMaterial: 'CEMENT_BLOCK',
  houseArea: 'LESS_THAN_500_SQFT',
  exactFloorAreaSqFt: 420,
  ownsCurrentHouse: false,
  ownsOtherHouse: false,
  lightingSource: 'GRID_ELECTRICITY',
  waterSource: 'PROTECTED_WELL',
  toiletLocation: 'OUTDOOR_EXCLUSIVE',
  toiletNature: 'WATER_SEAL_PIT',
  isSingleParent: false,
  welfareAssistance: {
    aswesumaCategory: 'NONE',
    aswesumaAmount: 0,
    receivingSamurdhi: false,
    samurdhiAmount: 0,
    samurdhiAccountNo: '',
    samurdhiBankLoanAmount: 0,
  },
};

const EDUCATION_OPTIONS = [
  { value: 'NO_SCHOOLING', ta: 'பாடசாலை செல்லாதவர் (No Schooling)', en: 'No Schooling' },
  { value: 'PRESCHOOL', ta: 'முன்பள்ளி (Pre-school)', en: 'Pre-school' },
  { value: 'BELOW_OL', ta: 'சாதாரண தரத்திற்கு கீழ் (Below O/L)', en: 'Below O/L' },
  { value: 'OL_PASSED', ta: 'சாதாரண தரம் சித்தி (G.C.E. O/L Passed)', en: 'G.C.E. O/L Passed' },
  { value: 'AL_PASSED', ta: 'உயர் தரம் சித்தி (G.C.E. A/L Passed)', en: 'G.C.E. A/L Passed' },
  { value: 'DIPLOMA_DEGREE', ta: 'டிப்ளோமா / பட்டதாரி (Diploma / Degree)', en: 'Diploma / Degree' },
];

export const OfficialFamilyDossierWindow: React.FC<OfficialFamilyDossierWindowProps> = ({
  isOpen,
  initialTab = 'family-entry',
  editingHousehold,
  existingHouseholdsCount,
  existingBeneficiaries,
  assistanceRecords = [],
  divisions,
  lang,
  povertyWeights,
  canEdit,
  isSuperAdmin = false,
  lockedDivisionCode,
  currentUserName,
  onClose,
  onSaveFamily,
}) => {
  const isTa = lang !== 'en';
  const [activeTab, setActiveTab] = useState<DossierWindowTab>(initialTab);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showDetailedIncomeExpense, setShowDetailedIncomeExpense] = useState(false);
  const [formError, setFormError] = useState<string>('');

  const effectiveLockedDiv =
    lockedDivisionCode && lockedDivisionCode.trim().toUpperCase() !== 'ALL'
      ? lockedDivisionCode.trim().toUpperCase()
      : '';
  const defaultDiv = effectiveLockedDiv || divisions[0]?.code || '211';

  const [meta, setMeta] = useState({
    familyCode: '',
    householdReference: '',
    applicationReference: '',
    applicantNameTa: '',
    applicantNameEn: '',
    applicantNic: '',
    phone: '',
    address: '',
    divisionCode: defaultDiv,
    status: 'DS_ENDORSED' as HouseholdData['status'],
    residencyStatus: 'PERMANENT' as FamilyResidencyStatus,
    transferDestination: '',
    transferDate: '',
    selectedCategory: 'VULNERABLE' as HouseholdData['selectedCategory'],
    bankName: 'Peoples Bank',
    bankBranch: 'Valaichchenai',
    bankAccountNo: '',
  });

  const [assets, setAssets] = useState<HouseholdCommonAssets>(DEFAULT_ASSETS);
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [initialMemberIds, setInitialMemberIds] = useState<string[]>([]);

  // Initialize form state whenever modal opens or target household changes
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setFormError('');

    if (editingHousehold) {
      const famKey = (editingHousehold.familyCode || editingHousehold.familyQrPayload || '').trim().toUpperCase();
      const linkedMembers = existingBeneficiaries.filter(
        (b) =>
          (b.familyCode && b.familyCode.trim().toUpperCase() === famKey) ||
          (b.familyQrPayload && b.familyQrPayload.trim().toUpperCase() === famKey)
      );

      setMeta({
        familyCode: editingHousehold.familyCode,
        householdReference: editingHousehold.householdReference,
        applicationReference: editingHousehold.applicationReference,
        applicantNameTa: editingHousehold.applicantNameTa,
        applicantNameEn: editingHousehold.applicantNameEn,
        applicantNic: editingHousehold.applicantNic,
        phone: editingHousehold.phone || '',
        address: editingHousehold.address || '',
        divisionCode: effectiveLockedDiv || editingHousehold.divisionCode || defaultDiv,
        status: editingHousehold.status || 'DS_ENDORSED',
        residencyStatus: editingHousehold.residencyStatus || 'PERMANENT',
        transferDestination: editingHousehold.transferDestination || '',
        transferDate: editingHousehold.transferDate || new Date().toISOString().slice(0, 10),
        selectedCategory: editingHousehold.selectedCategory || 'VULNERABLE',
        bankName: editingHousehold.bankDetails?.bankName || 'Peoples Bank',
        bankBranch: editingHousehold.bankDetails?.branch || 'Valaichchenai',
        bankAccountNo: editingHousehold.bankDetails?.accountNumber || '',
      });

      const mergedAssets: HouseholdCommonAssets = {
        ...DEFAULT_ASSETS,
        ...editingHousehold.commonAssets,
        houseAndLandOwnership:
          editingHousehold.commonAssets.houseAndLandOwnership ||
          (editingHousehold.commonAssets.ownsCurrentHouse && editingHousehold.commonAssets.ownsLand
            ? 'OWN_BOTH'
            : editingHousehold.commonAssets.ownsCurrentHouse
            ? 'OWN_HOUSE_ONLY'
            : editingHousehold.commonAssets.ownsLand
            ? 'OWN_LAND_ONLY'
            : 'NO_OWNERSHIP'),
        housingPermanency:
          editingHousehold.commonAssets.housingPermanency ||
          (editingHousehold.commonAssets.unitType === 'SLUM_SHACK' ||
          editingHousehold.commonAssets.unitType === 'TEMPORARY_HUT' ||
          editingHousehold.commonAssets.roofMaterial === 'THATCH_PALM'
            ? 'TEMPORARY'
            : editingHousehold.commonAssets.wallMaterial === 'BRICK' ||
              editingHousehold.commonAssets.wallMaterial === 'CEMENT_BLOCK'
            ? 'PERMANENT'
            : 'SEMI_PERMANENT'),
        isSingleFloor:
          editingHousehold.commonAssets.isSingleFloor !== undefined
            ? editingHousehold.commonAssets.isSingleFloor
            : editingHousehold.commonAssets.unitType !== 'SINGLE_2_STORY',
        hasHighland: editingHousehold.commonAssets.hasHighland ?? editingHousehold.commonAssets.ownsLand,
        highlandExtent: editingHousehold.commonAssets.highlandExtent || (editingHousehold.commonAssets.ownsLand ? 'LESS_THAN_HALF_ACRE' : 'NONE'),
        hasPaddyLand: editingHousehold.commonAssets.hasPaddyLand ?? editingHousehold.commonAssets.ownsOtherLand,
        paddyLandExtent: editingHousehold.commonAssets.paddyLandExtent || (editingHousehold.commonAssets.ownsOtherLand ? 'LESS_THAN_ONE_ACRE' : 'NONE'),
        paddyLandPlAccountNo: editingHousehold.commonAssets.paddyLandPlAccountNo || '',
        welfareAssistance: {
          aswesumaCategory: editingHousehold.commonAssets.welfareAssistance?.aswesumaCategory || 'NONE',
          aswesumaAmount: editingHousehold.commonAssets.welfareAssistance?.aswesumaAmount ?? 0,
          receivingSamurdhi:
            editingHousehold.commonAssets.welfareAssistance?.receivingSamurdhi ??
            ((editingHousehold.commonAssets.income?.samurdhi || 0) > 0),
          samurdhiAmount:
            editingHousehold.commonAssets.welfareAssistance?.samurdhiAmount ??
            (editingHousehold.commonAssets.income?.samurdhi || 0),
          samurdhiAccountNo: editingHousehold.commonAssets.welfareAssistance?.samurdhiAccountNo || '',
          samurdhiBankLoanAmount: editingHousehold.commonAssets.welfareAssistance?.samurdhiBankLoanAmount ?? 0,
        },
      };
      setAssets(mergedAssets);

      const drafts: MemberDraft[] = linkedMembers.map((b) => {
        const age = computeAgeFromDobSafe(b.dob);
        return {
          id: b.id,
          nameTa: b.nameTa,
          nameEn: b.nameEn || b.nameTa,
          nic: b.nic,
          isProvisionalNic: b.isProvisionalNic,
          rel: b.familyRelationship || (b.familyHead ? 'HEAD' : 'OTHER'),
          gender: b.gender || 'MALE',
          dob: b.dob || '1985-01-01',
          phone: b.phone || '',
          educationLevel: b.educationLevel || 'BELOW_OL',
          isAttendingSchool: b.isAttendingSchool !== undefined ? b.isAttendingSchool : age >= 5 && age <= 16,
          isDisability: Boolean(b.isPersonWithDisability || b.chronicIllness === 'DISABILITY_PHYSICAL'),
          disabilityNature: b.disabilityNature || '',
          isElderly: Boolean(b.isElderly || age >= 70),
          isPregnant: Boolean(b.isPregnantMother),
          hasCkdu: Boolean(b.hasCkdu || b.chronicIllness === 'CKD_KIDNEY' || b.welfareSchemes?.includes('CHRONIC_KIDNEY')),
          isDependent: b.isDependent !== undefined ? b.isDependent : age < 18 || age >= 70,
          chronicIllness: b.chronicIllness || 'NONE',
          economicActivity: b.economicActivity || '',
          status: b.status || 'ACTIVE',
          transferScope: b.transferScope || 'INTERNAL_GN',
          transferDestination: b.transferDestination || b.transferredToDivision || '',
          transferDate: b.transferDate || b.transferredDate || new Date().toISOString().slice(0, 10),
          deathDate: b.deathDate || b.deceasedDate || new Date().toISOString().slice(0, 10),
          deathCertificateNo: b.deathCertificateNo || '',
          deathRemarks: b.deathRemarks || '',
          existingBeneficiary: b,
        };
      });

      if (drafts.length === 0) {
        drafts.push({
          nameTa: editingHousehold.applicantNameTa,
          nameEn: editingHousehold.applicantNameEn,
          nic: editingHousehold.applicantNic,
          rel: 'HEAD',
          gender: 'MALE',
          dob: '1980-01-01',
          phone: editingHousehold.phone || '',
          educationLevel: 'BELOW_OL',
          isAttendingSchool: false,
          isDisability: false,
          isElderly: false,
          isPregnant: false,
          hasCkdu: false,
          isDependent: false,
          chronicIllness: 'NONE',
          economicActivity: 'கூலி வேலை (Daily Wage)',
          status: 'ACTIVE',
          transferScope: 'INTERNAL_GN',
          transferDestination: '',
          transferDate: new Date().toISOString().slice(0, 10),
          deathDate: new Date().toISOString().slice(0, 10),
          deathCertificateNo: '',
          deathRemarks: '',
        });
      }

      setMembers(drafts);
      setInitialMemberIds(linkedMembers.map((m) => m.id));
    } else {
      const nextNum = String(existingHouseholdsCount + 1).padStart(4, '0');
      const generatedCode = `FAM-${defaultDiv}-${nextNum}`;
      setMeta({
        familyCode: generatedCode,
        householdReference: `HH-5-1-03-01-${defaultDiv}-${nextNum}`,
        applicationReference: `2026${Math.floor(Math.random() * 9000000 + 1000000)}`,
        applicantNameTa: '',
        applicantNameEn: '',
        applicantNic: '',
        phone: '',
        address: '',
        divisionCode: defaultDiv,
        status: 'DS_ENDORSED',
        residencyStatus: 'PERMANENT',
        transferDestination: '',
        transferDate: new Date().toISOString().slice(0, 10),
        selectedCategory: 'VULNERABLE',
        bankName: 'Peoples Bank',
        bankBranch: 'Valaichchenai',
        bankAccountNo: '',
      });
      setAssets(DEFAULT_ASSETS);
      setMembers([
        {
          nameTa: '',
          nameEn: '',
          nic: '',
          rel: 'HEAD',
          gender: 'MALE',
          dob: '1982-01-01',
          phone: '',
          educationLevel: 'BELOW_OL',
          isAttendingSchool: false,
          isDisability: false,
          isElderly: false,
          isPregnant: false,
          hasCkdu: false,
          isDependent: false,
          chronicIllness: 'NONE',
          economicActivity: 'கூலி வேலை (Daily Wage)',
          status: 'ACTIVE',
          transferScope: 'INTERNAL_GN',
          transferDestination: '',
          transferDate: new Date().toISOString().slice(0, 10),
          deathDate: new Date().toISOString().slice(0, 10),
          deathCertificateNo: '',
          deathRemarks: '',
        },
      ]);
      setInitialMemberIds([]);
    }
  }, [isOpen, editingHousehold, initialTab, effectiveLockedDiv]);

  // Live QR Generation from Head's familyCode
  const effectiveFamilyCode = meta.familyCode.trim() || `FAM-${meta.divisionCode}-${String(existingHouseholdsCount + 1).padStart(4, '0')}`;

  useEffect(() => {
    if (!isOpen) return;
    generateQrDataUrl(effectiveFamilyCode)
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [isOpen, effectiveFamilyCode]);

  // Convert MemberDrafts into Partial<Beneficiary> for live Glance & Poverty Score calculation
  const memberSnapshotsForCalc = useMemo<Array<Partial<Beneficiary>>>(() => {
    return members.map((m, idx) => {
      const age = computeAgeFromDobSafe(m.dob);
      const effectiveNameTa = idx === 0 && !m.nameTa.trim() ? meta.applicantNameTa : m.nameTa;
      const effectiveNic = idx === 0 && !m.nic.trim() ? meta.applicantNic : m.nic;
      return {
        id: m.id || `DRAFT-${idx}`,
        nameTa: effectiveNameTa,
        nic: effectiveNic,
        dob: m.dob,
        gender: m.gender,
        educationLevel: m.educationLevel,
        isAttendingSchool: m.isAttendingSchool,
        isPersonWithDisability: m.isDisability,
        isElderly: m.isElderly || age >= 70,
        isPregnantMother: m.isPregnant,
        hasCkdu: m.hasCkdu || m.chronicIllness === 'CKD_KIDNEY',
        isDependent: m.isDependent,
        chronicIllness: m.hasCkdu ? 'CKD_KIDNEY' : m.chronicIllness,
        economicActivity: m.economicActivity,
        status: m.status || 'ACTIVE',
      };
    });
  }, [members, meta.applicantNameTa, meta.applicantNic]);

  const membersGlance = useMemo(() => computeMembersAtAGlance(memberSnapshotsForCalc), [memberSnapshotsForCalc]);
  const liveScore = useMemo(() => calculateFamilyPovertyScore(assets, memberSnapshotsForCalc, povertyWeights), [assets, memberSnapshotsForCalc, povertyWeights]);

  // Match all DS Assistance & Relief Audit records for this household or any of its members
  const familyAssistanceHistory = useMemo(() => {
    const famKey = effectiveFamilyCode.trim().toUpperCase();
    const hhRefKey = meta.householdReference.trim().toUpperCase();
    const nicSet = new Set<string>();
    if (meta.applicantNic.trim()) nicSet.add(meta.applicantNic.trim().toUpperCase());
    members.forEach((m) => {
      if (m.nic && m.nic.trim()) nicSet.add(m.nic.trim().toUpperCase());
    });

    return assistanceRecords
      .filter((rec) => {
        const recFam = (rec.familyCode || '').trim().toUpperCase();
        const recQr = (rec.familyQrPayload || '').trim().toUpperCase();
        const recHh = (rec.householdNo || '').trim().toUpperCase();
        const recNic = (rec.beneficiaryNic || '').trim().toUpperCase();
        return (
          (famKey && (recFam === famKey || recQr === famKey)) ||
          (hhRefKey && recHh === hhRefKey) ||
          (recNic && nicSet.has(recNic))
        );
      })
      .sort((a, b) => (b.distributedDate || b.createdAt || '').localeCompare(a.distributedDate || a.createdAt || ''));
  }, [assistanceRecords, effectiveFamilyCode, meta.householdReference, meta.applicantNic, members]);

  if (!isOpen) return null;

  const handleAddMemberRows = (count: number) => {
    const newRows: MemberDraft[] = Array.from({ length: count }, () => ({
      nameTa: '',
      nameEn: '',
      nic: '',
      rel: 'SON',
      gender: 'MALE',
      dob: '2012-01-01',
      phone: meta.phone || '',
      educationLevel: 'BELOW_OL',
      isAttendingSchool: true,
      isDisability: false,
      isElderly: false,
      isPregnant: false,
      hasCkdu: false,
      isDependent: true,
      chronicIllness: 'NONE',
      economicActivity: 'மாணவர் (Student)',
      status: 'ACTIVE',
      transferScope: 'INTERNAL_GN',
      transferDestination: '',
      transferDate: new Date().toISOString().slice(0, 10),
      deathDate: new Date().toISOString().slice(0, 10),
      deathCertificateNo: '',
      deathRemarks: '',
    }));
    setMembers((prev) => [...prev, ...newRows]);
  };

  const handleRemoveMember = (idx: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOwnershipChange = (ownership: NonNullable<HouseholdCommonAssets['houseAndLandOwnership']>) => {
    const ownsHouse = ownership === 'OWN_BOTH' || ownership === 'OWN_HOUSE_ONLY';
    const ownsLand = ownership === 'OWN_BOTH' || ownership === 'OWN_LAND_ONLY' || ownership === 'CROWN_PERMIT';
    setAssets((prev) => ({
      ...prev,
      houseAndLandOwnership: ownership,
      ownsCurrentHouse: ownsHouse,
      ownsLand: ownsLand,
      landExtent: ownsLand ? (prev.landExtent === 'NONE' ? 'LESS_THAN_HALF_ACRE' : prev.landExtent) : 'NONE',
    }));
  };

  const handlePrintA4 = () => {
    if (activeTab !== 'summary-a4') {
      setActiveTab('summary-a4');
    }
    window.print();
  };

  const handleSave = () => {
    setFormError('');
    if (!meta.applicantNameTa.trim() || !meta.applicantNic.trim()) {
      setFormError(isTa ? 'தயவுசெய்து குடும்பத் தலைவரின் பெயர் மற்றும் NIC இலக்கத்தை உள்ளிடவும்.' : 'Please enter Head of Household Name and NIC.');
      setActiveTab('family-entry');
      return;
    }

    if (meta.residencyStatus !== 'PERMANENT') {
      if (!meta.transferDestination.trim()) {
        setFormError(
          isTa
            ? 'குடும்பம் மாற்றப்பட்ட இடம் ("எங்கு?") கட்டாயமாக உள்ளிடப்பட வேண்டும்.'
            : 'Transfer destination ("Where?") is required for a transferred family.'
        );
        setActiveTab('family-entry');
        return;
      }
      if (!meta.transferDate.trim()) {
        setFormError(
          isTa
            ? 'மொத்த எண்ணிக்கையிலிருந்து கழிக்கப்படும் திகதி (Deduction Date) கட்டாயமாக உள்ளிடப்பட வேண்டும்.'
            : 'Deduction / transfer date is mandatory.'
        );
        setActiveTab('family-entry');
        return;
      }
    }

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const memberLabel = (i === 0 && !m.nameTa.trim() ? meta.applicantNameTa : m.nameTa).trim() || `#${i + 1}`;
      if (m.status === 'TRANSFERRED') {
        if (!m.transferDestination?.trim() || !m.transferDate?.trim()) {
          setFormError(
            isTa
              ? `உறுப்பினர் "${memberLabel}": மாற்றப்பட்ட இடம் ("எங்கு?") மற்றும் கழிக்கப்படும் திகதி கட்டாயமாகும்.`
              : `Member "${memberLabel}": Transfer destination and date are required.`
          );
          setActiveTab('members');
          return;
        }
      }
      if (m.status === 'DECEASED' && !m.deathDate?.trim()) {
        setFormError(
          isTa
            ? `உறுப்பினர் "${memberLabel}": மரணமடைந்த / கழிக்கப்படும் திகதி கட்டாயமாகும்.`
            : `Member "${memberLabel}": Death / deduction date is required.`
        );
        setActiveTab('members');
        return;
      }
    }

    const now = new Date().toISOString();
    const divCode = effectiveLockedDiv || meta.divisionCode || '211';
    const familyCode = effectiveFamilyCode;
    const familyQrPayload = familyCode;

    const savedMembers: Beneficiary[] = members.map((m, idx) => {
      const isHead = idx === 0 || m.rel === 'HEAD';
      const rawNameTa = (idx === 0 && !m.nameTa.trim() ? meta.applicantNameTa : m.nameTa).trim() || meta.applicantNameTa.trim();
      const rawNameEn = (idx === 0 && !m.nameEn.trim() ? meta.applicantNameEn : m.nameEn).trim() || rawNameTa;
      let memberNic = (idx === 0 && !m.nic.trim() ? meta.applicantNic : m.nic).trim();
      let isProvisional = Boolean(m.isProvisionalNic);
      if (!memberNic) {
        memberNic = generateProvisionalNic(divCode);
        isProvisional = true;
      }

      const age = computeAgeFromDobSafe(m.dob);
      const effectiveChronic: ChronicIllness = m.hasCkdu
        ? 'CKD_KIDNEY'
        : m.chronicIllness !== 'NONE'
        ? m.chronicIllness
        : m.isDisability
        ? 'DISABILITY_PHYSICAL'
        : 'NONE';

      const existing = m.existingBeneficiary;
      const memberId = m.id || `VHR-${divCode}-2026-${String(existingBeneficiaries.length + idx + 1).padStart(4, '0')}`;
      const memberStatus: CitizenStatus = m.status || 'ACTIVE';
      const memberTransferScope: TransferScope | undefined =
        memberStatus === 'TRANSFERRED' ? m.transferScope || 'INTERNAL_GN' : undefined;

      return {
        ...(existing || {}),
        id: memberId,
        nic: memberNic,
        isProvisionalNic: isProvisional,
        nameTa: rawNameTa,
        nameEn: rawNameEn,
        gender: m.gender,
        dob: m.dob || '1985-01-01',
        phone: m.phone.trim() || meta.phone.trim(),
        address: meta.address.trim() || `வாகரை (${divCode})`,
        divisionCode: divCode,
        dsDivisionId: editingHousehold?.dsDivisionId || existing?.dsDivisionId,
        familyHead: isHead,
        householdNo: meta.householdReference,
        familyCode,
        familyRelationship: m.rel,
        status: memberStatus,
        deathDate: memberStatus === 'DECEASED' ? m.deathDate : undefined,
        deceasedDate: memberStatus === 'DECEASED' ? m.deathDate : undefined,
        deathCertificateNo: memberStatus === 'DECEASED' ? m.deathCertificateNo?.trim() : undefined,
        deathRemarks: memberStatus === 'DECEASED' ? m.deathRemarks?.trim() : undefined,
        transferScope: memberTransferScope,
        transferDestination: memberStatus === 'TRANSFERRED' ? m.transferDestination?.trim() : undefined,
        transferredToDivision: memberStatus === 'TRANSFERRED' ? m.transferDestination?.trim() : undefined,
        transferDate: memberStatus === 'TRANSFERRED' ? m.transferDate : undefined,
        transferredDate: memberStatus === 'TRANSFERRED' ? m.transferDate : undefined,
        previousDivisionCode:
          memberStatus === 'TRANSFERRED' ? existing?.previousDivisionCode || divCode : existing?.previousDivisionCode,
        isPregnantMother: m.isPregnant,
        isPersonWithDisability: m.isDisability,
        disabilityNature: m.disabilityNature || existing?.disabilityNature,
        isElderly: m.isElderly || age >= 70,
        isWomanHeadedHousehold: existing?.isWomanHeadedHousehold ?? (assets.isSingleParent && isHead && m.gender === 'FEMALE'),
        educationLevel: m.educationLevel,
        isAttendingSchool: m.isAttendingSchool,
        isDependent: m.isDependent,
        hasCkdu: m.hasCkdu || effectiveChronic === 'CKD_KIDNEY',
        economicActivity: m.economicActivity,
        welfareScheme: existing?.welfareScheme || (liveScore.priorityRank === 1 ? 'ASWESUMA_EXTREME' : liveScore.priorityRank === 2 ? 'ASWESUMA_POOR' : 'ASWESUMA_VULNERABLE'),
        welfareSchemes: existing?.welfareSchemes,
        welfareStatus: existing?.welfareStatus || 'ACTIVE',
        chronicIllness: effectiveChronic,
        barcode: memberNic,
        qrPayload: `ID:${memberId}|NIC:${memberNic}|FAM:${familyCode}|REL:${m.rel}`,
        familyQrPayload,
        notes: `${m.rel} | ${m.economicActivity || ''} | Edu:${m.educationLevel}`.trim(),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
    });

    const keptIds = new Set(savedMembers.map((m) => m.id));
    const removedMemberIds = initialMemberIds.filter((id) => !keptIds.has(id));
    const activeMembersCount = savedMembers.filter((m) => !m.status || m.status === 'ACTIVE').length;

    const scoreResult = calculateFamilyPovertyScore(assets, savedMembers, povertyWeights);
    const isFamTransferred = meta.residencyStatus !== 'PERMANENT';
    const famTransferScope: TransferScope | undefined =
      meta.residencyStatus === 'TRANSFERRED_GN'
        ? 'INTERNAL_GN'
        : meta.residencyStatus === 'TRANSFERRED_EXTERNAL_DS'
        ? 'EXTERNAL_DS'
        : undefined;

    const household: HouseholdData = {
      id: editingHousehold?.id || meta.householdReference || `HH-${familyCode}`,
      familyCode,
      householdReference: meta.householdReference || `HH-${familyCode}`,
      applicationReference: meta.applicationReference || `APP-${Date.now().toString().slice(-7)}`,
      applicantNameTa: meta.applicantNameTa.trim(),
      applicantNameEn: meta.applicantNameEn.trim() || meta.applicantNameTa.trim(),
      applicantNic: meta.applicantNic.trim(),
      phone: meta.phone.trim(),
      address: meta.address.trim(),
      divisionCode: divCode,
      dsDivisionId: editingHousehold?.dsDivisionId,
      status: meta.status,
      residencyStatus: meta.residencyStatus,
      transferScope: famTransferScope,
      transferDestination: isFamTransferred ? meta.transferDestination.trim() : undefined,
      transferDate: isFamTransferred ? meta.transferDate.trim() : undefined,
      previousDivisionCode: isFamTransferred ? editingHousehold?.previousDivisionCode || divCode : editingHousehold?.previousDivisionCode,
      transferRequestedBy: isFamTransferred ? editingHousehold?.transferRequestedBy || currentUserName || 'GN Officer' : undefined,
      transferRequestedAt: isFamTransferred ? editingHousehold?.transferRequestedAt || now : undefined,
      transferApprovedBy: !isFamTransferred ? editingHousehold?.transferApprovedBy : undefined,
      transferApprovedAt: !isFamTransferred ? editingHousehold?.transferApprovedAt : undefined,
      selectedCategory: meta.selectedCategory,
      bankDetails: {
        bankName: meta.bankName,
        branch: meta.bankBranch,
        accountNumber: meta.bankAccountNo,
        accountName: `${meta.applicantNameEn || meta.applicantNameTa} ${meta.applicantNic}`.trim(),
        status: meta.bankAccountNo ? 'VERIFIED' : 'PENDING',
      },
      commonAssets: assets,
      totalMembersCount: activeMembersCount,
      familyQrPayload,
      score100: scoreResult.score100,
      priorityRank: scoreResult.priorityRank,
      scoreBreakdown: scoreResult.breakdown,
      createdAt: editingHousehold?.createdAt || now,
      updatedAt: now,
    };

    onSaveFamily({
      household,
      savedMembers,
      removedMemberIds,
      isEdit: Boolean(editingHousehold),
    });
  };

  const priorityLabel = (rank: 1 | 2 | 3 | 4) => {
    if (rank === 1) return isTa ? 'முன்னுரிமை 1: தீவிர வறுமை (80–100)' : 'Priority 1: Extreme Poverty (80–100)';
    if (rank === 2) return isTa ? 'முன்னுரிமை 2: வறுமை நிலை (60–79)' : 'Priority 2: Poor (60–79)';
    if (rank === 3) return isTa ? 'முன்னுரிமை 3: இடர்படக்கூடிய நிலை (40–59)' : 'Priority 3: Vulnerable (40–59)';
    return isTa ? 'முன்னுரிமை 4: தன்னிறைவு (<40)' : 'Priority 4: Non-Vulnerable (<40)';
  };

  const ownershipLabel = (val?: string) => {
    switch (val) {
      case 'OWN_BOTH': return isTa ? 'சொந்த வீடு மற்றும் காணி' : 'Own House & Land';
      case 'OWN_HOUSE_ONLY': return isTa ? 'சொந்த வீடு மட்டும் (காணி இல்லை)' : 'Own House Only';
      case 'OWN_LAND_ONLY': return isTa ? 'சொந்தக் காணி மட்டும்' : 'Own Land Only';
      case 'CROWN_PERMIT': return isTa ? 'அரச அனுமதிப்பத்திரக் காணி (LDO)' : 'Crown / LDO Permit Land';
      case 'RENTED_LEASED': return isTa ? 'வாடகை / குத்தகை வீடு' : 'Rented / Leased';
      case 'RELATIVES_HOUSE': return isTa ? 'உறவினர் வீட்டில் வசிப்பு' : 'Living with Relatives';
      default: return isTa ? 'சொந்த வீடு / காணி இல்லை' : 'No House / Land Ownership';
    }
  };

  const housingTypeLabel = (val: string) => {
    switch (val) {
      case 'SINGLE_1_STORY': return isTa ? 'தனி வீடு / ஒரு மாடி (Single House / Single Floor)' : 'Single House / Single Floor';
      case 'SINGLE_2_STORY': return isTa ? 'தனி வீடு / இரு மாடி' : 'Single House / Two Floor';
      case 'ANNEX': return isTa ? 'இணைப்பு வீடு (Annex)' : 'Annex';
      case 'SLUM_SHACK': return isTa ? 'குடிசை / தற்காலிக கொட்டகை' : 'Shack / Temporary Shelter';
      case 'LINE_ROOM': return isTa ? 'வரிசை அறை (Line Room)' : 'Line Room';
      case 'TEMPORARY_HUT': return isTa ? 'தற்காலிக குடிசை' : 'Temporary Hut';
      default: return isTa ? 'ஏனையவை' : 'Other';
    }
  };

  const waterSourceLabel = (val: string) => {
    switch (val) {
      case 'NWSDB_TAP': return isTa ? 'தேசிய குழாய் நீர் (NWSDB Tap)' : 'NWSDB Piped Water';
      case 'PROTECTED_WELL': return isTa ? 'பாதுகாக்கப்பட்ட கிணறு' : 'Protected Well';
      case 'UNPROTECTED_WELL': return isTa ? 'பாதுகாப்பற்ற கிணறு' : 'Unprotected Well';
      case 'COMMUNITY_TAP': return isTa ? 'பொதுக் குழாய் நீர்' : 'Community Tap';
      case 'TUBE_WELL': return isTa ? 'குழாய்க் கிணறு (Tube Well)' : 'Tube Well';
      case 'RIVER_TANK': return isTa ? 'குளம் / ஆறு' : 'River / Tank';
      case 'RAINWATER': return isTa ? 'மழைநீர் சேகரிப்பு' : 'Rainwater Harvesting';
      case 'BOTTLED_RO': return isTa ? 'சுத்திகரிக்கப்பட்ட நீர் (RO)' : 'RO / Bottled Water';
      default: return val;
    }
  };

  const toiletLocationLabel = (val: string) => {
    switch (val) {
      case 'INDOOR_EXCLUSIVE': return isTa ? 'வீட்டுக்குள் தனி கழிப்பறை' : 'Indoor Exclusive';
      case 'OUTDOOR_EXCLUSIVE': return isTa ? 'வீட்டுக்கு வெளியே தனி கழிப்பறை' : 'Outdoor Exclusive';
      case 'SHARED': return isTa ? 'பிற குடும்பத்துடன் பகிரப்பட்டது' : 'Shared Facility';
      case 'PUBLIC': return isTa ? 'பொதுக் கழிப்பறை' : 'Public Toilet';
      case 'OPEN_DEFECATION': return isTa ? 'கழிப்பறை வசதி இல்லை (திறந்தவெளி)' : 'No Toilet / Open';
      default: return val;
    }
  };

  const toiletTypeLabel = (val: string) => {
    switch (val) {
      case 'WATER_SEAL_SEPTIC': return isTa ? 'நீர் முத்திரை - செப்டிக் டேங்க்' : 'Water-Seal (Septic Tank)';
      case 'WATER_SEAL_PIT': return isTa ? 'நீர் முத்திரை - குழி' : 'Water-Seal (Pit)';
      case 'POUR_FLUSH': return isTa ? 'நீர் ஊற்றும் கழிப்பறை' : 'Pour Flush';
      case 'DIRECT_PIT_SLAB': return isTa ? 'மூடியுடன் கூடிய நேரடி குழி' : 'Direct Pit with Slab';
      case 'OPEN_PIT_NO_SLAB': return isTa ? 'மூடியற்ற திறந்த குழி' : 'Open Pit (No Slab)';
      case 'NO_TOILET': return isTa ? 'கழிப்பறை இல்லை' : 'No Toilet';
      default: return val;
    }
  };

  const lightingLabel = (val: string) => {
    switch (val) {
      case 'GRID_ELECTRICITY': return isTa ? 'தேசிய மின்சார கட்டமைப்பு (CEB)' : 'National Grid Electricity';
      case 'SOLAR': return isTa ? 'சூரிய சக்தி (Solar)' : 'Solar Power';
      case 'KEROSENE': return isTa ? 'மண்ணெண்ணெய் விளக்கு' : 'Kerosene Lamp';
      case 'GENERATOR_BATTERY': return isTa ? 'மின்கல / ஜெனரேட்டர்' : 'Battery / Generator';
      default: return val;
    }
  };

  const aswesumaLabel = (val?: string) => {
    switch (val) {
      case 'POOR': return isTa ? 'வறுமை (Poor)' : 'Poor (வறுமை)';
      case 'EXTREME_POOR': return isTa ? 'மிகவறுமை (Extreme Poor)' : 'Extreme Poor (மிகவறுமை)';
      case 'TRANSIENT': return isTa ? 'Transient (தற்காலிக / நிலையற்ற)' : 'Transient';
      case 'VULNERABLE': return isTa ? 'Vulnerable (பாதிக்கப்படக்கூடிய)' : 'Vulnerable';
      default: return isTa ? 'இல்லை / பொருந்தாது (None)' : 'None';
    }
  };

  const welfare = assets.welfareAssistance || {
    aswesumaCategory: 'NONE' as const,
    aswesumaAmount: 0,
    receivingSamurdhi: false,
    samurdhiAmount: 0,
    samurdhiAccountNo: '',
    samurdhiBankLoanAmount: 0,
  };

  const divObj = divisions.find((d) => d.code === meta.divisionCode);
  const netBalance = (assets.income.total || 0) - (assets.expenses.total || 0);

  const content = (
    <div className="official-dossier-portal fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-hidden">
      {/* Top Official Government Window Bar */}
      <div className="bg-emerald-950 text-white px-4 sm:px-6 py-3 border-b-4 border-amber-500 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md no-print">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl shadow-xs">
            <VaharaiLogo size={34} className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded">
                {isTa ? 'உத்தியோகபூர்வ குடும்பப் பதிவேடு' : 'OFFICIAL HOUSEHOLD DOSSIER'}
              </span>
              <span className="font-mono text-xs font-bold text-emerald-200 bg-emerald-900 px-2 py-0.5 rounded border border-emerald-700">
                QR: {effectiveFamilyCode}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight mt-0.5">
              {isTa
                ? 'குடும்ப விபரம், உறுப்பினர்கள் & வறுமைச்சுட்டி மதிப்பீட்டுச் சமரி'
                : 'Official Family Details, Members & Poverty Index Summary'}
            </h2>
          </div>
        </div>

        {/* Live 100-Point Score Pill & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-black flex items-center gap-2 ${
            liveScore.priorityRank === 1
              ? 'bg-red-900/90 border-red-400 text-red-100'
              : liveScore.priorityRank === 2
              ? 'bg-amber-900/90 border-amber-400 text-amber-100'
              : liveScore.priorityRank === 3
              ? 'bg-yellow-900/90 border-yellow-400 text-yellow-100'
              : 'bg-emerald-900 border-emerald-400 text-emerald-100'
          }`}>
            <Award className="w-4 h-4" />
            <span>{isTa ? 'வறுமைச்சுட்டி:' : 'Poverty Score:'} {liveScore.score100}/100</span>
            <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px]">P{liveScore.priorityRank}</span>
          </div>

          <button
            type="button"
            onClick={handlePrintA4}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-800" />
            <span>{isTa ? 'A4 அச்சிடு / PDF சேமி' : 'Print / Save A4 PDF'}</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isTa ? 'சேமி (Save Family)' : 'Save Family'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 bg-emerald-900 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-emerald-700"
          >
            <X className="w-4 h-4" />
            <span>{isTa ? 'மூடு' : 'Close'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs inside Official Window */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between flex-wrap gap-2 shrink-0 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('family-entry')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeTab === 'family-entry'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>1. {isTa ? 'குடும்பவிபரம், சொத்து, வீடு & பொருளாதாரம்' : 'Family, Assets, Housing & Economy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeTab === 'members'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>2. {isTa ? `குடும்ப உறுப்பினர்கள் (${members.length}) - தலைமை QR கீழ்` : `Family Members (${members.length}) under Head QR`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary-a4')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              activeTab === 'summary-a4'
                ? 'bg-indigo-800 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. {isTa ? 'முழுமையான சமரி & A4 பிரிண்ட்' : 'Complete Summary & A4 View'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              disabled={activeTab === 'family-entry'}
              onClick={() => setActiveTab(activeTab === 'summary-a4' ? 'members' : 'family-entry')}
              className="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 bg-white hover:bg-emerald-50 text-slate-800 disabled:opacity-40 disabled:bg-transparent transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-800" />
              <span>{isTa ? 'பின்' : 'Back'}</span>
            </button>
            <button
              type="button"
              disabled={activeTab === 'summary-a4'}
              onClick={() => setActiveTab(activeTab === 'family-entry' ? 'members' : 'summary-a4')}
              className="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 bg-white hover:bg-emerald-50 text-slate-800 disabled:opacity-40 disabled:bg-transparent transition-colors shadow-2xs"
            >
              <span>{isTa ? 'முன்' : 'Forward'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-800" />
            </button>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold hidden xl:block">
            {isTa ? 'அனைத்து தரவுகளும் நேரடியாக 100-புள்ளி வறுமைச்சுட்டி கணிப்பிற்கு உட்படுத்தப்படுகின்றன' : 'All fields dynamically drive the 100-Point Poverty Index'}
          </div>
        </div>
      </div>

      {/* Main Scrollable Workspace */}
      <div className="official-dossier-scroll flex-1 overflow-y-auto p-3 sm:p-6">
        {formError && (
          <div className="max-w-6xl mx-auto mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between gap-2 no-print">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
            <button type="button" onClick={() => setFormError('')} className="text-rose-700 hover:text-rose-950 font-black px-2">✕</button>
          </div>
        )}
        {/* ================= TAB 1: FAMILY INFO, ASSETS, HOUSING, SANITATION, ECONOMIC ================= */}
        {activeTab === 'family-entry' && (
          <div className="dossier-nonprint-tab max-w-6xl mx-auto space-y-5">
            {/* Live Members at a Glance Strip */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {isTa ? 'Members at a glance (குடும்ப உறுப்பினர் சுருக்க நிலை)' : 'Members at a Glance (Auto-calculated from Members)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isTa ? 'தலைமை QR கீழ் உறுப்பினர்களை சேர் / திருத்து' : 'Add / Manage Members under Head QR'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500">Total Members</div>
                  <div className="text-lg font-black text-slate-900 font-mono">{membersGlance.totalMembers}</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-900">Below O/L Edu</div>
                  <div className="text-lg font-black text-amber-950 font-mono">{membersGlance.belowOLCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-200">
                  <div className="text-[10px] font-bold text-rose-900">Not in School (5–16)</div>
                  <div className="text-lg font-black text-rose-950 font-mono">{membersGlance.childrenNotInSchool5To16Count}</div>
                </div>
                <div className="p-2 rounded-xl bg-red-50/70 border border-red-200">
                  <div className="text-[10px] font-bold text-red-900">Chronic Disease</div>
                  <div className="text-lg font-black text-red-950 font-mono">{membersGlance.chronicDiseaseCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-900">Disability</div>
                  <div className="text-lg font-black text-blue-950 font-mono">{membersGlance.disabilityCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200">
                  <div className="text-[10px] font-bold text-purple-900">CKDU</div>
                  <div className="text-lg font-black text-purple-950 font-mono">{membersGlance.ckduCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <div className="text-[10px] font-bold text-indigo-900">Dependents</div>
                  <div className="text-lg font-black text-indigo-950 font-mono">{membersGlance.dependentsCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-teal-50/70 border border-teal-200">
                  <div className="text-[10px] font-bold text-teal-900">Over 70 Years</div>
                  <div className="text-lg font-black text-teal-950 font-mono">{membersGlance.over70Count}</div>
                </div>
              </div>
            </div>

            {/* Section 01: குடும்பவிபரம் (Family & Head of Household Details + Master QR) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white font-black text-xs flex items-center justify-center">01</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isTa ? 'குடும்பவிபரம் & குடும்பத் தலைவர் விபரம் (Family Information & Head QR)' : 'Family Information & Head of Household QR'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {isTa ? 'குடும்பத் தலைவரின் QR குறியீட்டின் கீழ் அனைத்து உறுப்பினர்களும் இணைக்கப்படுவர்' : 'All household members link under this Head QR code'}
                    </p>
                  </div>
                </div>

                {qrDataUrl && (
                  <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <img src={qrDataUrl} alt="Family QR" className="w-12 h-12 rounded bg-white p-0.5 border border-emerald-200" />
                    <div className="text-[10px]">
                      <div className="font-bold text-emerald-900 uppercase">Master Family QR</div>
                      <div className="font-mono font-black text-xs text-emerald-950">{effectiveFamilyCode}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">குடும்ப QR குறியீடு (Family QR Code) *</label>
                  <input
                    type="text"
                    value={meta.familyCode}
                    onChange={(e) => setMeta({ ...meta, familyCode: e.target.value })}
                    placeholder="FAM-211-0001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-emerald-50/40"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    கிராம அலுவலர் பிரிவு (GN Division) *{' '}
                    {effectiveLockedDiv && (
                      <span className="text-[10px] text-emerald-800 font-mono">
                        ({isTa ? 'பூட்டப்பட்டது' : 'Locked'}: {effectiveLockedDiv})
                      </span>
                    )}
                  </label>
                  <select
                    value={effectiveLockedDiv || meta.divisionCode}
                    disabled={Boolean(effectiveLockedDiv)}
                    onChange={(e) => {
                      if (!effectiveLockedDiv) {
                        setMeta({ ...meta, divisionCode: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-700 font-semibold"
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">வீட்டுப் பதிவு இலக்கம் (Household Ref)</label>
                  <input
                    type="text"
                    value={meta.householdReference}
                    onChange={(e) => setMeta({ ...meta, householdReference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">விண்ணப்ப இலக்கம் (App Ref)</label>
                  <input
                    type="text"
                    value={meta.applicationReference}
                    onChange={(e) => setMeta({ ...meta, applicationReference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">குடும்பத் தலைவர் பெயர் (தமிழ்) *</label>
                  <input
                    type="text"
                    value={meta.applicantNameTa}
                    onChange={(e) => setMeta({ ...meta, applicantNameTa: e.target.value })}
                    placeholder="உ-ம்: சின்னப்பு விஜயகுமார்"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Head Name (English)</label>
                  <input
                    type="text"
                    value={meta.applicantNameEn}
                    onChange={(e) => setMeta({ ...meta, applicantNameEn: e.target.value })}
                    placeholder="e.g. SINNAPPU VIJAYAKUMAR"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">தலைவர் NIC இலக்கம் *</label>
                  <input
                    type="text"
                    value={meta.applicantNic}
                    onChange={(e) => setMeta({ ...meta, applicantNic: e.target.value })}
                    placeholder="e.g. 891902697V"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">தொலைபேசி இலக்கம் (Phone)</label>
                  <input
                    type="text"
                    value={meta.phone}
                    onChange={(e) => setMeta({ ...meta, phone: e.target.value })}
                    placeholder="077XXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">நிரந்தர முகவரி (Address)</label>
                  <input
                    type="text"
                    value={meta.address}
                    onChange={(e) => setMeta({ ...meta, address: e.target.value })}
                    placeholder="வீட்டு இலக்கம், வீதி, கிராமம்"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ஒப்புதல் நிலை (DS Status)</label>
                  <select
                    value={meta.status}
                    onChange={(e) => setMeta({ ...meta, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="DS_ENDORSED">DS_ENDORSED (பிரதேச செயலாளர் பரிந்துரை)</option>
                    <option value="COMMITTEE_APPROVED">COMMITTEE_APPROVED (குழு அங்கீகாரம்)</option>
                    <option value="ACTIVE">ACTIVE (செயற்பாட்டில்)</option>
                    <option value="GRIEVANCE_PENDING">GRIEVANCE_PENDING (மேல்முறையீடு)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="w-full flex items-center justify-between px-3 py-2 bg-pink-50 border border-pink-200 rounded-lg cursor-pointer">
                    <span className="font-bold text-pink-900">ஒற்றைப் பெற்றோர் குடும்பம்?</span>
                    <input
                      type="checkbox"
                      checked={assets.isSingleParent}
                      onChange={(e) => setAssets({ ...assets, isSingleParent: e.target.checked })}
                      className="w-4 h-4 rounded text-pink-600"
                    />
                  </label>
                </div>
              </div>

              {/* Family Residency & Transfer Status (நிரந்தர வதிவு / GN மாற்றம் / வெளி பிரதேச செயலக மாற்றம்) */}
              <div className={`p-3.5 rounded-xl border space-y-3 text-xs ${
                meta.residencyStatus === 'PERMANENT'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : meta.residencyStatus === 'TRANSFERRED_GN'
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-purple-50/80 border-purple-300'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="font-black text-slate-900 block">
                      {isTa
                        ? 'குடும்ப வதிவிட நிலை & பிரிவு மாற்றம் (Family Residency & Transfer Status)'
                        : 'Family Residency & Transfer Status'}
                    </label>
                    <span className="text-[11px] text-slate-600">
                      {isTa
                        ? 'குடும்பம் இடமாற்றம் செய்யப்பட்டால் மொத்த எண்ணிக்கையிலிருந்து கழிக்கப்பட்டு சுப்பர் அட்மின் பரிசீலனைக்கு அனுப்பப்படும்.'
                        : 'Transferred families are deducted from active totals and routed for Super Admin approval.'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'PERMANENT' as FamilyResidencyStatus,
                      ta: 'நிரந்தர வதிவு',
                      en: 'Permanent Resident',
                      activeCls: 'bg-emerald-800 text-white border-emerald-900',
                    },
                    {
                      id: 'TRANSFERRED_GN' as FamilyResidencyStatus,
                      ta: 'கிராம உத்தியோகத்தர் பிரிவு மாற்றம்',
                      en: 'GN Division Transfer (Our DS)',
                      activeCls: 'bg-amber-700 text-white border-amber-800',
                    },
                    {
                      id: 'TRANSFERRED_EXTERNAL_DS' as FamilyResidencyStatus,
                      ta: 'வெளி பிரதேச செயலாளர் பிரிவு மாற்றம்',
                      en: 'External DS Division Transfer',
                      activeCls: 'bg-purple-800 text-white border-purple-900',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setMeta((prev) => ({
                          ...prev,
                          residencyStatus: opt.id,
                          transferDate: prev.transferDate || new Date().toISOString().slice(0, 10),
                        }))
                      }
                      className={`px-3 py-2 rounded-lg border font-bold text-left transition-all ${
                        meta.residencyStatus === opt.id
                          ? `${opt.activeCls} shadow-xs`
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isTa ? opt.ta : opt.en}
                    </button>
                  ))}
                </div>

                {meta.residencyStatus !== 'PERMANENT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-900 mb-1">
                        {meta.residencyStatus === 'TRANSFERRED_GN'
                          ? (isTa ? 'எங்கு மாற்றப்பட்டது? (புதிய கிராம உத்தியோகத்தர் பிரிவு / கிராமம்) *' : 'Where Transferred? (Target GN Division / Village) *')
                          : (isTa ? 'எங்கு மாற்றப்பட்டது? (வெளி பிரதேச செயலாளர் பிரிவு / மாவட்டம்) *' : 'Where Transferred? (External DS Division / District) *')}
                      </label>
                      <input
                        type="text"
                        value={meta.transferDestination}
                        onChange={(e) => setMeta({ ...meta, transferDestination: e.target.value })}
                        placeholder={
                          meta.residencyStatus === 'TRANSFERRED_GN'
                            ? 'உ-ம்: 212A வாகரை வடக்கு / கதிரவெளி'
                            : 'உ-ம்: கோறளைப்பற்று மத்தி / மட்டக்களப்பு'
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-900 mb-1">
                        {isTa ? 'கழிக்கப்படும் / மாற்றப்பட்ட திகதி (Deduction Date) *' : 'Deduction / Transfer Date *'}
                      </label>
                      <input
                        type="date"
                        value={meta.transferDate}
                        onChange={(e) => setMeta({ ...meta, transferDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2 p-2.5 rounded-lg bg-white/90 border border-amber-300 text-[11px] font-semibold text-slate-800">
                      {meta.residencyStatus === 'TRANSFERRED_GN'
                        ? (isTa
                            ? 'ℹ️ இக்குடும்பம் சேமிக்கப்பட்டவுடன் மொத்த எண்ணிக்கையிலிருந்து கழிக்கப்படும். பின்னர் சுப்பர் அட்மின் அனுமதியளித்து புதிய கிராம உத்தியோகத்தர் பிரிவிற்கு மாற்றும்போது அங்கு பதிவைத் தொடரலாம்.'
                            : 'ℹ️ Once saved, this family will be deducted from active counts. Super Admin can then approve and reassign it to the target GN division.')
                        : (isTa
                            ? 'ℹ️ வெளி பிரதேச செயலாளர் பிரிவிற்கு மாற்றப்படுவதால் மொத்த எண்ணிக்கையிலிருந்து கழிக்கப்பட்டு சுப்பர் அட்மினின் தனியான பகுதியில் கழிக்கப்பட்ட திகதியுடன் காண்பிக்கப்படும்.'
                            : 'ℹ️ Deducted from DS active counts and listed in the dedicated Super Admin External DS Transfers registry with the mandatory deduction date.')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 02: *Assets (சொத்து விபரங்கள்) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center">02</span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    *Assets — {isTa ? 'சொத்துக்கள் மற்றும் காணி உரிமை விபரம்' : 'Assets, Land & Property Ownership'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    House & land ownership, Compensation, Other house/building, Highland, Paddy land, Vehicle, Machinery, Livestock
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">House &amp; land ownership (வீடு &amp; காணி உரிமை)</label>
                  <select
                    value={assets.houseAndLandOwnership || 'NO_OWNERSHIP'}
                    onChange={(e) => handleOwnershipChange(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="OWN_BOTH">சொந்த வீடு &amp; காணி (Own Both)</option>
                    <option value="OWN_HOUSE_ONLY">சொந்த வீடு மட்டும் (Own House Only)</option>
                    <option value="OWN_LAND_ONLY">சொந்தக் காணி மட்டும் (Own Land Only)</option>
                    <option value="CROWN_PERMIT">அரச அனுமதிப்பத்திரக் காணி (LDO Permit)</option>
                    <option value="RENTED_LEASED">வாடகை / குத்தகை (Rented / Leased)</option>
                    <option value="RELATIVES_HOUSE">உறவினர் வீடு (Relatives House)</option>
                    <option value="NO_OWNERSHIP">உரிமை இல்லை (No Ownership)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Received As Compensation (இழப்பீடாகப் பெற்றதா?)</label>
                  <select
                    value={assets.receivedAsCompensation ? 'YES' : 'NO'}
                    onChange={(e) => setAssets({ ...assets, receivedAsCompensation: e.target.value === 'YES' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="NO">இல்லை (No)</option>
                    <option value="YES">ஆம் - இழப்பீடாகப் பெறப்பட்டது (Yes)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Other house / building (வேறு வீடு / கட்டிடம்)</label>
                  <select
                    value={assets.ownsOtherHouse ? 'YES' : 'NO'}
                    onChange={(e) => setAssets({ ...assets, ownsOtherHouse: e.target.value === 'YES' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="NO">இல்லை (No)</option>
                    <option value="YES">ஆம் - வேறு வீடு/கட்டிடம் உள்ளது (Yes)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Highland (மேட்டு நிலம்)</label>
                  <select
                    value={assets.hasHighland ? (assets.highlandExtent || 'LESS_THAN_HALF_ACRE') : 'NONE'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setAssets({
                        ...assets,
                        hasHighland: val !== 'NONE',
                        highlandExtent: val,
                        ownsLand: val !== 'NONE' || assets.ownsCurrentHouse,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="NONE">இல்லை (None)</option>
                    <option value="LESS_THAN_HALF_ACRE">0.5 ஏக்கருக்கு குறைவு (&lt;0.5 Acre)</option>
                    <option value="HALF_TO_ONE_ACRE">0.5 – 1 ஏக்கர் (0.5–1 Acre)</option>
                    <option value="MORE_THAN_ONE_ACRE">1 ஏக்கருக்கு மேல் (&gt;1 Acre)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    தாழ்நிலக் காணி / வயல் (Lowland / Paddy Land)
                  </label>
                  <select
                    value={assets.hasPaddyLand ? (assets.paddyLandExtent || 'LESS_THAN_ONE_ACRE') : 'NONE'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setAssets({
                        ...assets,
                        hasPaddyLand: val !== 'NONE',
                        paddyLandExtent: val,
                        ownsOtherLand: val !== 'NONE',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="NONE">இல்லை (None)</option>
                    <option value="LESS_THAN_ONE_ACRE">1 ஏக்கருக்கு குறைவு (&lt;1 Acre)</option>
                    <option value="ONE_TO_TWO_ACRES">1 – 2 ஏக்கர் (1–2 Acres)</option>
                    <option value="MORE_THAN_TWO_ACRES">2 ஏக்கருக்கு மேல் (&gt;2 Acres)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    தாழ்நிலக் காணி PL கணக்கு இலக்கம் (Lowland PL Account No.) {assets.hasPaddyLand ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={assets.paddyLandPlAccountNo || ''}
                    onChange={(e) => setAssets({ ...assets, paddyLandPlAccountNo: e.target.value })}
                    placeholder={assets.hasPaddyLand ? 'உ-ம்: PL-211-0458 (கட்டாயம்)' : 'தாழ்நிலக் காணி இருந்தால் PL இலக்கம்'}
                    className={`w-full px-3 py-2 border rounded-lg font-mono font-bold ${
                      assets.hasPaddyLand
                        ? 'border-amber-400 bg-amber-50/50 text-slate-900'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle (வாகனம்)</label>
                  <select
                    value={assets.vehicleType}
                    onChange={(e) => setAssets({ ...assets, vehicleType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="NONE">வாகனம் இல்லை (None)</option>
                    <option value="BICYCLE">துவிச்சக்கர வண்டி (Bicycle)</option>
                    <option value="MOTORCYCLE">மோட்டார் சைக்கிள் (Motorcycle)</option>
                    <option value="THREE_WHEELER">முச்சக்கர வண்டி (Three-Wheeler)</option>
                    <option value="HAND_TRACTOR">கை உழவு இயந்திரம் (Hand Tractor)</option>
                    <option value="FOUR_WHEEL_TRACTOR">உழவு இயந்திரம் (4-Wheel Tractor)</option>
                    <option value="CAR">கார் (Car)</option>
                    <option value="VAN_JEEP">வேன் / ஜீப் (Van / Jeep)</option>
                    <option value="LORRY">லொறி (Lorry)</option>
                    <option value="BUS">பேருந்து (Bus)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Machinery (இயந்திரங்கள் / படகு)</label>
                  <select
                    value={assets.machineryType}
                    onChange={(e) => setAssets({ ...assets, machineryType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="NONE">இயந்திரம் இல்லை (None)</option>
                    <option value="MOTOR_BOAT">இயந்திரப் படகு (Motor Boat)</option>
                    <option value="NON_MOTOR_BOAT">துடுப்புப் படகு (Non-Motor Boat)</option>
                    <option value="WATER_PUMP">நீர் இறைக்கும் இயந்திரம் (Water Pump)</option>
                    <option value="SEWING_MACHINE">தையல் இயந்திரம் (Sewing Machine)</option>
                    <option value="HARVESTER">அறுவடை இயந்திரம் (Harvester)</option>
                    <option value="OTHER_EQUIPMENT">ஏனைய இயந்திரம் (Other Equipment)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Livestock (கால்நடை)</label>
                    <select
                      value={assets.livestockType}
                      onChange={(e) => setAssets({ ...assets, livestockType: e.target.value as any })}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="NONE">இல்லை (None)</option>
                      <option value="CATTLE">மாடு (Cattle)</option>
                      <option value="GOATS">ஆடு (Goats)</option>
                      <option value="POULTRY">கோழி (Poultry)</option>
                      <option value="DUCKS">வாத்து (Ducks)</option>
                      <option value="OTHER">ஏனையவை</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">எண்ணிக்கை</label>
                    <input
                      type="number"
                      min={0}
                      value={assets.livestockCount}
                      onChange={(e) => setAssets({ ...assets, livestockCount: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {(assets.receivedAsCompensation || assets.ownsOtherHouse) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  {assets.receivedAsCompensation && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">இழப்பீட்டு விபரம் (Compensation Details)</label>
                      <input
                        type="text"
                        value={assets.compensationDetails || ''}
                        onChange={(e) => setAssets({ ...assets, compensationDetails: e.target.value })}
                        placeholder="உ-ம்: சுனாமி / மீள்குடியேற்ற வீட்டுத் திட்டம்"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}
                  {assets.ownsOtherHouse && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">மாற்று வீடு / கட்டிட விபரம் (Other House/Building Details)</label>
                      <input
                        type="text"
                        value={assets.otherHouseDetails || ''}
                        onChange={(e) => setAssets({ ...assets, otherHouseDetails: e.target.value })}
                        placeholder="இடம் / பயன்பாடு"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 03 & 04: *Housing and *Sanitation & Lighting */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Housing */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-700 text-white font-black text-xs flex items-center justify-center">03</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      *Housing — {isTa ? 'வீடமைப்பு & குடிநீர் விபரம்' : 'Housing Condition & Water Source'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Type, Permanent, Single House / Single Floor, Floor area (&lt;500 sq.ft), Source of drinking water
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Type (வீட்டின் வகை)</label>
                    <select
                      value={assets.unitType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setAssets({
                          ...assets,
                          unitType: val,
                          isSingleFloor: val !== 'SINGLE_2_STORY',
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="SINGLE_1_STORY">Single House / Single Floor (தனி ஒரு மாடி வீடு)</option>
                      <option value="SINGLE_2_STORY">Single House / Two Floor (இரு மாடி வீடு)</option>
                      <option value="ANNEX">Annex (இணைப்பு வீடு)</option>
                      <option value="LINE_ROOM">Line Room (வரிசை அறை)</option>
                      <option value="SLUM_SHACK">Shack / Slum (தற்காலிக கொட்டகை)</option>
                      <option value="TEMPORARY_HUT">Temporary Hut (குடிசை வீடு)</option>
                      <option value="OTHER">Other (ஏனையவை)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Permanent / Structure (நிரந்தரத் தன்மை)</label>
                    <select
                      value={assets.housingPermanency || 'SEMI_PERMANENT'}
                      onChange={(e) => setAssets({ ...assets, housingPermanency: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="PERMANENT">Permanent (நிரந்தர வீடு)</option>
                      <option value="SEMI_PERMANENT">Semi-Permanent (அரை நிரந்தர வீடு)</option>
                      <option value="TEMPORARY">Temporary / Non-Permanent (தற்காலிக வீடு)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Single House / Single Floor?</label>
                    <select
                      value={assets.isSingleFloor !== false ? 'YES' : 'NO'}
                      onChange={(e) => setAssets({ ...assets, isSingleFloor: e.target.value === 'YES' })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="YES">ஆம் - Single House / Single Floor</option>
                      <option value="NO">இல்லை (Multi-floor / Shared)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Floor area (தரைப் பரப்பளவு)</label>
                    <select
                      value={assets.houseArea}
                      onChange={(e) => setAssets({ ...assets, houseArea: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="LESS_THAN_500_SQFT">Less than 500 Square Feet (&lt;500 சதுர அடி)</option>
                      <option value="500_TO_1000_SQFT">500 – 1000 Square Feet</option>
                      <option value="MORE_THAN_1000_SQFT">More than 1000 Square Feet (&gt;1000 சதுர அடி)</option>
                      <option value="MORE_THAN_500_SQFT">More than 500 Square Feet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">கூரை (Roof Material)</label>
                    <select
                      value={assets.roofMaterial}
                      onChange={(e) => setAssets({ ...assets, roofMaterial: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="THATCH_PALM">ஓலை / வைக்கோல் (Thatch / Palm)</option>
                      <option value="DILAPIDATED">சிதைந்த கூரை (Dilapidated)</option>
                      <option value="SHEET_ALUMINIUM">தகரம் / அலுமினியம் (Metal Sheet)</option>
                      <option value="ASBESTOS">ஆஸ்பெஸ்டாஸ் (Asbestos)</option>
                      <option value="TILES">ஓடுகள் (Tiles)</option>
                      <option value="CONCRETE">கான்கிரீட் (Concrete)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">சுவர்கள் (Wall Material)</label>
                    <select
                      value={assets.wallMaterial}
                      onChange={(e) => setAssets({ ...assets, wallMaterial: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="CLAY_MUD">மண் சுவர் (Clay / Mud)</option>
                      <option value="PALM_LEAF">ஓலை சுவர் (Palm Leaf)</option>
                      <option value="DILAPIDATED">சிதைந்த சுவர் (Dilapidated)</option>
                      <option value="PLANK">பலகை (Plank)</option>
                      <option value="CEMENT_BLOCK">சிமென்ட் கல் (Cement Block)</option>
                      <option value="BRICK">செங்கல் (Brick)</option>
                      <option value="CABOOK">கபூக் (Cabook)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">தரை (Floor Material)</label>
                    <select
                      value={assets.floorMaterial}
                      onChange={(e) => setAssets({ ...assets, floorMaterial: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="SAND">மணல் தரை (Sand)</option>
                      <option value="CLAY">களிமண் தரை (Clay)</option>
                      <option value="DILAPIDATED">சிதைந்த தரை (Dilapidated)</option>
                      <option value="CEMENT">சிமெந்து (Cement)</option>
                      <option value="CONCRETE">கான்கிரீட் (Concrete)</option>
                      <option value="TILES">டைல்ஸ் (Tiles)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Source of drinking water (குடிநீர் மூலம்)</label>
                    <select
                      value={assets.waterSource}
                      onChange={(e) => setAssets({ ...assets, waterSource: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="NWSDB_TAP">NWSDB குழாய் நீர் (Piped Water)</option>
                      <option value="PROTECTED_WELL">பாதுகாக்கப்பட்ட கிணறு (Protected Well)</option>
                      <option value="TUBE_WELL">குழாய்க் கிணறு (Tube Well)</option>
                      <option value="COMMUNITY_TAP">பொதுக் குழாய் (Community Tap)</option>
                      <option value="RAINWATER">மழைநீர் (Rainwater)</option>
                      <option value="UNPROTECTED_WELL">பாதுகாப்பற்ற கிணறு (Unprotected Well)</option>
                      <option value="RIVER_TANK">குளம் / ஆறு (River / Tank)</option>
                      <option value="BOTTLED_RO">RO சுத்திகரிக்கப்பட்ட நீர்</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sanitation & Lighting + Economic Level */}
              <div className="space-y-5">
                {/* Sanitation & Lighting */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-7 h-7 rounded-lg bg-cyan-700 text-white font-black text-xs flex items-center justify-center">04</span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        *Sanitation &amp; lighting — {isTa ? 'சுகாதாரம் & ஒளி வசதி' : 'Sanitation & Lighting'}
                      </h3>
                      <p className="text-[11px] text-slate-500">Toilet facility, Toilet type, Source of lighting</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Toilet facility (கழிப்பறை வசதி)</label>
                      <select
                        value={assets.toiletLocation}
                        onChange={(e) => setAssets({ ...assets, toiletLocation: e.target.value as any })}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="INDOOR_EXCLUSIVE">வீட்டுக்குள் தனி (Indoor Exclusive)</option>
                        <option value="OUTDOOR_EXCLUSIVE">வெளியே தனி (Outdoor Exclusive)</option>
                        <option value="SHARED">பகிர்வு (Shared)</option>
                        <option value="PUBLIC">பொது (Public)</option>
                        <option value="OPEN_DEFECATION">வசதி இல்லை (None / Open)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Toilet type (கழிப்பறை வகை)</label>
                      <select
                        value={assets.toiletNature}
                        onChange={(e) => setAssets({ ...assets, toiletNature: e.target.value as any })}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="WATER_SEAL_SEPTIC">Water-Seal Septic (செப்டிக்)</option>
                        <option value="WATER_SEAL_PIT">Water-Seal Pit (நீர் முத்திரை குழி)</option>
                        <option value="POUR_FLUSH">Pour Flush</option>
                        <option value="DIRECT_PIT_SLAB">Direct Pit with Slab</option>
                        <option value="OPEN_PIT_NO_SLAB">Open Pit (No Slab)</option>
                        <option value="NO_TOILET">No Toilet (இல்லை)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Source of lighting (ஒளி மூலம்)</label>
                      <select
                        value={assets.lightingSource}
                        onChange={(e) => setAssets({ ...assets, lightingSource: e.target.value as any })}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="GRID_ELECTRICITY">மின்சாரம் (Grid Electricity)</option>
                        <option value="SOLAR">சூரிய சக்தி (Solar)</option>
                        <option value="GENERATOR_BATTERY">மின்கலம் / ஜெனரேட்டர்</option>
                        <option value="KEROSENE">மண்ணெண்ணெய் விளக்கு (Kerosene)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Economic Level */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-black text-xs flex items-center justify-center">05</span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          *Economic level — {isTa ? 'பொருளாதார நிலைமை' : 'Economic Level'}
                        </h3>
                        <p className="text-[11px] text-slate-500">Monthly expenditure (Rs.), Monthly income (Rs.), Electricity units / month</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDetailedIncomeExpense(!showDetailedIncomeExpense)}
                      className="text-[11px] font-bold text-indigo-700 hover:underline"
                    >
                      {showDetailedIncomeExpense ? 'சுருக்க உள்ளீடு (Simple)' : 'விரிவான பிரிவுகள் (Detailed)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Monthly expenditure (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={assets.expenses.total}
                        onChange={(e) =>
                          setAssets({
                            ...assets,
                            expenses: { ...assets.expenses, total: Math.max(0, Number(e.target.value)) },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-black text-rose-900 bg-rose-50/40"
                      />
                      <span className="text-[10px] text-slate-500">மாதாந்த செலவு (ரூபா)</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Monthly income (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={assets.income.total}
                        onChange={(e) =>
                          setAssets({
                            ...assets,
                            income: { ...assets.income, total: Math.max(0, Number(e.target.value)) },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-black text-emerald-900 bg-emerald-50/40"
                      />
                      <span className="text-[10px] text-slate-500">மாதாந்த வருமானம் (ரூபா)</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Electricity units / month (kWh)</label>
                      <input
                        type="number"
                        min={0}
                        value={assets.electricityUnitsKwh}
                        onChange={(e) => setAssets({ ...assets, electricityUnitsKwh: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-black text-amber-900 bg-amber-50/40"
                      />
                      <span className="text-[10px] text-slate-500">மாதாந்த மின்சார அலகுகள்</span>
                    </div>
                  </div>

                  {showDetailedIncomeExpense && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <label className="block font-semibold text-slate-600">உணவு செலவு (Food)</label>
                        <input
                          type="number"
                          value={assets.expenses.food}
                          onChange={(e) => {
                            const food = Math.max(0, Number(e.target.value));
                            const nextExp = { ...assets.expenses, food };
                            nextExp.total = nextExp.food + nextExp.medical + nextExp.education + nextExp.electricity + nextExp.rent + nextExp.loansDebt;
                            setAssets({ ...assets, expenses: nextExp });
                          }}
                          className="w-full px-2 py-1 border rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600">மருத்துவ செலவு (Medical)</label>
                        <input
                          type="number"
                          value={assets.expenses.medical}
                          onChange={(e) => {
                            const medical = Math.max(0, Number(e.target.value));
                            const nextExp = { ...assets.expenses, medical };
                            nextExp.total = nextExp.food + nextExp.medical + nextExp.education + nextExp.electricity + nextExp.rent + nextExp.loansDebt;
                            setAssets({ ...assets, expenses: nextExp });
                          }}
                          className="w-full px-2 py-1 border rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600">கூலி / நிலையற்ற வருமானம்</label>
                        <input
                          type="number"
                          value={assets.income.unstableSources}
                          onChange={(e) => {
                            const unstableSources = Math.max(0, Number(e.target.value));
                            const nextInc = { ...assets.income, unstableSources };
                            nextInc.total = nextInc.unstableSources + nextInc.salary + nextInc.agriculture + nextInc.samurdhi + nextInc.pension;
                            setAssets({ ...assets, income: nextInc });
                          }}
                          className="w-full px-2 py-1 border rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600">நிரந்தர சம்பளம் (Salary)</label>
                        <input
                          type="number"
                          value={assets.income.salary}
                          onChange={(e) => {
                            const salary = Math.max(0, Number(e.target.value));
                            const nextInc = { ...assets.income, salary };
                            nextInc.total = nextInc.unstableSources + nextInc.salary + nextInc.agriculture + nextInc.samurdhi + nextInc.pension;
                            setAssets({ ...assets, income: nextInc });
                          }}
                          className="w-full px-2 py-1 border rounded font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">நிகர மாதாந்த நிலை (Net Monthly Balance):</span>
                    <span className={`font-mono font-black ${netBalance < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                      Rs. {netBalance.toLocaleString()} {netBalance < 0 ? '(பற்றாக்குறை / Deficit)' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 06: நலன்புரி உதவிகள் (Welfare Assistance - Aswesuma & Samurdhi) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center">06</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      நலன்புரி உதவிகள் — {isTa ? 'அஸ்வெசும & சமூர்த்தி விபரங்கள்' : 'Welfare Assistance (Aswesuma & Samurdhi)'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      அஸ்வெசும கொடுப்பனவு (வறுமை / மிகவறுமை / Transient / Vulnerable) மற்றும் சமூர்த்தி கொடுப்பனவு, கணக்கு இலக்கம் &amp; வங்கி கடன் விபரம்
                    </p>
                  </div>
                </div>
                {welfare.aswesumaCategory !== 'NONE' && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black">
                    அஸ்வெசும: {aswesumaLabel(welfare.aswesumaCategory)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Aswesuma Card */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                    <Gift className="w-4 h-4 text-amber-700" />
                    <span>அஸ்வெசும கொடுப்பனவு (Aswesuma Allowance)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">அஸ்வெசும பிரிவு (Category)</label>
                      <select
                        value={welfare.aswesumaCategory}
                        onChange={(e) =>
                          setAssets({
                            ...assets,
                            welfareAssistance: {
                              ...welfare,
                              aswesumaCategory: e.target.value as NonNullable<HouseholdCommonAssets['welfareAssistance']>['aswesumaCategory'],
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white font-bold text-slate-900"
                      >
                        <option value="NONE">இல்லை / பொருந்தாது (None)</option>
                        <option value="POOR">வறுமை (Poor)</option>
                        <option value="EXTREME_POOR">மிகவறுமை (Extreme Poor)</option>
                        <option value="TRANSIENT">Transient (தற்காலிக / நிலையற்ற)</option>
                        <option value="VULNERABLE">Vulnerable (பாதிக்கப்படக்கூடிய)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">அஸ்வெசும மாதாந்த தொகை (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        disabled={welfare.aswesumaCategory === 'NONE'}
                        value={welfare.aswesumaAmount || 0}
                        onChange={(e) =>
                          setAssets({
                            ...assets,
                            welfareAssistance: {
                              ...welfare,
                              aswesumaAmount: Math.max(0, Number(e.target.value)),
                            },
                          })
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Samurdhi Card */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    <span>சமூர்த்தி கொடுப்பனவு &amp; வங்கி விபரம் (Samurdhi Details)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">சமூர்த்தி கொடுப்பனவு (Samurdhi Allowance)</label>
                      <select
                        value={welfare.receivingSamurdhi ? 'YES' : 'NO'}
                        onChange={(e) => {
                          const receiving = e.target.value === 'YES';
                          const nextAmount = receiving ? welfare.samurdhiAmount || 0 : 0;
                          setAssets({
                            ...assets,
                            income: { ...assets.income, samurdhi: nextAmount },
                            welfareAssistance: {
                              ...welfare,
                              receivingSamurdhi: receiving,
                              samurdhiAmount: nextAmount,
                            },
                          });
                        }}
                        className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-white font-bold text-slate-900"
                      >
                        <option value="NO">இல்லை (No)</option>
                        <option value="YES">ஆம் — பெறுகிறார் (Yes)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">சமூர்த்தி கொடுப்பனவு தொகை (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        disabled={!welfare.receivingSamurdhi}
                        value={welfare.samurdhiAmount || 0}
                        onChange={(e) => {
                          const nextAmt = Math.max(0, Number(e.target.value));
                          setAssets({
                            ...assets,
                            income: { ...assets.income, samurdhi: nextAmt },
                            welfareAssistance: {
                              ...welfare,
                              samurdhiAmount: nextAmt,
                            },
                          });
                        }}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">சமூர்த்தி கணக்கு இலக்கம் (Samurdhi A/C No.)</label>
                      <input
                        type="text"
                        value={welfare.samurdhiAccountNo || ''}
                        onChange={(e) =>
                          setAssets({
                            ...assets,
                            welfareAssistance: {
                              ...welfare,
                              samurdhiAccountNo: e.target.value,
                            },
                          })
                        }
                        placeholder="உதா: SAM-VHR-001245"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">சமூர்த்தி வங்கி கடன் பெற்ற தொகை (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={welfare.samurdhiBankLoanAmount || 0}
                        onChange={(e) =>
                          setAssets({
                            ...assets,
                            welfareAssistance: {
                              ...welfare,
                              samurdhiBankLoanAmount: Math.max(0, Number(e.target.value)),
                            },
                          })
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar in Tab 1 */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs"
              >
                <Users className="w-4 h-4" />
                <span>{isTa ? 'அடுத்தது: குடும்ப உறுப்பினர்கள் சேர்க்கை (Head QR) →' : 'Next: Add Family Members under Head QR →'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary-a4')}
                className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>{isTa ? 'முழுமையான சமரி & A4 பார்க்க →' : 'View Complete Summary & A4 →'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ADD MULTIPLE MEMBERS UNDER HEAD QR ================= */}
        {activeTab === 'members' && (
          <div className="dossier-nonprint-tab max-w-6xl mx-auto space-y-4">
            {/* Head of Household Master QR Banner */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {qrDataUrl && (
                  <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                    <img src={qrDataUrl} alt="Head Master QR" className="w-20 h-20" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-widest bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded">
                    {isTa ? 'தலைமை உறுப்பினரின் மாஸ்டர் QR' : 'HEAD OF HOUSEHOLD MASTER QR'}
                  </span>
                  <h3 className="text-lg font-black font-mono mt-1">{effectiveFamilyCode}</h3>
                  <div className="text-xs text-emerald-100 mt-0.5">
                    {isTa ? 'குடும்பத் தலைவர்:' : 'Head:'} <b>{meta.applicantNameTa || '—'}</b> · NIC: <span className="font-mono">{meta.applicantNic || '—'}</span> · {divObj ? `${divObj.code} - ${divObj.nameTa}` : meta.divisionCode}
                  </div>
                  <p className="text-[11px] text-emerald-200 mt-1">
                    {isTa
                      ? 'கீழே சேர்க்கப்படும் அனைத்து குடும்ப உறுப்பினர்களும் தானாகவே இத்தலைவரின் QR குறியீட்டின் கீழ் இணைக்கப்படுவர்.'
                      : 'Every family member added below is automatically unified under this Head of Household QR code.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => handleAddMemberRows(1)}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isTa ? '+1 உறுப்பினர் சேர்' : '+1 Member'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMemberRows(3)}
                  className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isTa ? '+3 பல உறுப்பினர் சேர்' : '+3 Members Batch'}</span>
                </button>
              </div>
            </div>

            {/* Members Entry Cards */}
            <div className="space-y-3">
              {members.map((m, idx) => {
                const age = computeAgeFromDobSafe(m.dob);
                const isSchoolAge5To16 = age >= 5 && age <= 16;
                const isOver70 = age >= 70;
                const isDeceased = m.status === 'DECEASED';
                const isTransferred = m.status === 'TRANSFERRED';

                return (
                  <div
                    key={idx}
                    className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 ${
                      isDeceased
                        ? 'border-slate-400 bg-slate-50/70'
                        : isTransferred
                        ? 'border-purple-300 bg-purple-50/30'
                        : idx === 0
                        ? 'border-emerald-400 ring-1 ring-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          isDeceased
                            ? 'bg-slate-900 text-white'
                            : isTransferred
                            ? 'bg-purple-800 text-white'
                            : idx === 0
                            ? 'bg-emerald-800 text-white'
                            : 'bg-slate-800 text-white'
                        }`}>
                          #{idx + 1} {idx === 0 ? (isTa ? 'குடும்பத் தலைவர் (Head)' : 'Head') : m.rel}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          QR: {effectiveFamilyCode}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {age} {isTa ? 'வயது' : 'yrs'}
                        </span>
                        {isDeceased && (
                          <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">
                            மரணம் (கழிக்கப்பட்டது{m.deathDate ? `: ${m.deathDate}` : ''})
                          </span>
                        )}
                        {isTransferred && (
                          <span className="text-[10px] font-black bg-purple-800 text-white px-2 py-0.5 rounded-full">
                            {m.transferScope === 'EXTERNAL_DS' ? 'வெளி DS மாற்றம்' : 'GN மாற்றம்'} (கழிக்கப்பட்டது{m.transferDate ? `: ${m.transferDate}` : ''})
                          </span>
                        )}
                        {isOver70 && (
                          <span className="text-[10px] font-black bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full border border-teal-300">
                            70+ {isTa ? 'முதியோர்' : 'Over 70'}
                          </span>
                        )}
                        {isSchoolAge5To16 && !m.isAttendingSchool && (
                          <span className="text-[10px] font-black bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full border border-rose-300">
                            ⚠ {isTa ? '5–16 பாடசாலை செல்லாத பிள்ளை' : 'Not in School (5–16)'}
                          </span>
                        )}
                      </div>

                      {(isSuperAdmin || !m.id) && idx > 0 && canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isTa ? 'நீக்கு' : 'Remove'}</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">பெயர் (தமிழ்) *</label>
                        <input
                          type="text"
                          value={idx === 0 && !m.nameTa ? meta.applicantNameTa : m.nameTa}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].nameTa = e.target.value;
                            setMembers(updated);
                            if (idx === 0) setMeta((prev) => ({ ...prev, applicantNameTa: e.target.value }));
                          }}
                          placeholder="முழுப் பெயர்"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">NIC (வெற்றிடமெனில் தற்காலிக NIC)</label>
                        <input
                          type="text"
                          value={idx === 0 && !m.nic ? meta.applicantNic : m.nic}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].nic = e.target.value;
                            setMembers(updated);
                            if (idx === 0) setMeta((prev) => ({ ...prev, applicantNic: e.target.value }));
                          }}
                          placeholder="NIC / Auto Provisional"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">உறவுமுறை (Relationship)</label>
                        <select
                          value={m.rel}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].rel = e.target.value as FamilyRelationship;
                            setMembers(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="HEAD">குடும்பத் தலைவர் (Head)</option>
                          <option value="WIFE">மனைவி (Wife)</option>
                          <option value="HUSBAND">கணவன் (Husband)</option>
                          <option value="SON">மகன் (Son)</option>
                          <option value="DAUGHTER">மகள் (Daughter)</option>
                          <option value="MOTHER">தாய் (Mother)</option>
                          <option value="FATHER">தந்தை (Father)</option>
                          <option value="GRANDMOTHER">பாட்டி (Grandmother)</option>
                          <option value="GRANDFATHER">தாத்தா (Grandfather)</option>
                          <option value="CAREGIVER">பராமரிப்பாளர் (Caregiver)</option>
                          <option value="OTHER">ஏனைய உறவினர் (Other)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">பால் (Gender)</label>
                        <select
                          value={m.gender}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].gender = e.target.value as any;
                            setMembers(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="MALE">ஆண் (Male)</option>
                          <option value="FEMALE">பெண் (Female)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">பிறந்த திகதி (DOB)</label>
                        <input
                          type="date"
                          value={m.dob}
                          onChange={(e) => {
                            const dob = e.target.value;
                            const nextAge = computeAgeFromDobSafe(dob);
                            const updated = [...members];
                            updated[idx].dob = dob;
                            updated[idx].isElderly = nextAge >= 70;
                            if (nextAge < 18 || nextAge >= 70) updated[idx].isDependent = true;
                            setMembers(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">கல்வி நிலை (Education Level)</label>
                        <select
                          value={m.educationLevel}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].educationLevel = e.target.value;
                            setMembers(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          {EDUCATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {isTa ? opt.ta : opt.en}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          பாடசாலை நிலை (5–16 வயது)
                        </label>
                        <select
                          value={m.isAttendingSchool ? 'IN_SCHOOL' : 'NOT_IN_SCHOOL'}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].isAttendingSchool = e.target.value === 'IN_SCHOOL';
                            setMembers(updated);
                          }}
                          className={`w-full px-2.5 py-1.5 border rounded-lg font-semibold ${
                            isSchoolAge5To16 && !m.isAttendingSchool
                              ? 'border-rose-400 bg-rose-50 text-rose-900'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          <option value="IN_SCHOOL">பாடசாலை செல்கிறார் / பொருத்தமற்றது</option>
                          <option value="NOT_IN_SCHOOL">பாடசாலை செல்லவில்லை (Not in School)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">நாள்பட்ட நோய் (Chronic Disease)</label>
                        <select
                          value={m.chronicIllness}
                          onChange={(e) => {
                            const val = e.target.value as ChronicIllness;
                            const updated = [...members];
                            updated[idx].chronicIllness = val;
                            updated[idx].hasCkdu = val === 'CKD_KIDNEY';
                            setMembers(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="NONE">இல்லை (None)</option>
                          <option value="CKD_KIDNEY">CKDU / சிறுநீரக நோய்</option>
                          <option value="CANCER">புற்றுநோய் (Cancer)</option>
                          <option value="HEART_DISEASE">இதய நோய் (Heart Disease)</option>
                          <option value="THALASSEMIA">தலசீமியா (Thalassemia)</option>
                          <option value="DIABETES_CHRONIC">தீவிர நீரிழிவு (Diabetes)</option>
                          <option value="MENTAL_HEALTH">மனநலம் (Mental Health)</option>
                          <option value="OTHER_CHRONIC">ஏனைய நாள்பட்ட நோய்</option>
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">தொழில் / பொருளாதார செயல்பாடு</label>
                        <input
                          type="text"
                          value={m.economicActivity}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].economicActivity = e.target.value;
                            setMembers(updated);
                          }}
                          placeholder="கூலி வேலை / கடற்றொழில் / மாணவர் / தங்கி வாழ்பவர்"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Checkboxes row: Disability, CKDU, Dependent, Over 70, Pregnant */}
                    <div className="flex items-center gap-4 flex-wrap pt-1 text-xs">
                      <label className="inline-flex items-center gap-1.5 font-bold text-blue-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.isDisability}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].isDisability = e.target.checked;
                            setMembers(updated);
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>Disability (மாற்றுத்திறனாளி)</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 font-bold text-purple-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.hasCkdu || m.chronicIllness === 'CKD_KIDNEY'}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].hasCkdu = e.target.checked;
                            if (e.target.checked) updated[idx].chronicIllness = 'CKD_KIDNEY';
                            else if (updated[idx].chronicIllness === 'CKD_KIDNEY') updated[idx].chronicIllness = 'NONE';
                            setMembers(updated);
                          }}
                          className="rounded text-purple-600"
                        />
                        <span>CKDU (சிறுநீரக நோய்)</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 font-bold text-indigo-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.isDependent}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].isDependent = e.target.checked;
                            setMembers(updated);
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span>Dependent (தங்கி வாழ்பவர்)</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 font-bold text-teal-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.isElderly || age >= 70}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].isElderly = e.target.checked;
                            setMembers(updated);
                          }}
                          className="rounded text-teal-600"
                        />
                        <span>Over 70 years (70+ முதியோர்)</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 font-bold text-pink-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={m.isPregnant}
                          onChange={(e) => {
                            const updated = [...members];
                            updated[idx].isPregnant = e.target.checked;
                            setMembers(updated);
                          }}
                          className="rounded text-pink-600"
                        />
                        <span>Pregnant (கர்ப்பிணித் தாய்)</span>
                      </label>
                    </div>

                    {/* Individual Member Lifecycle Status: நிரந்தர வதிவு / கிராம உத்தியோகத்தர் மாற்றம் / வெளி DS மாற்றம் / மரணம் */}
                    <div className={`p-3 rounded-xl border text-xs space-y-2.5 ${
                      isDeceased
                        ? 'bg-slate-100 border-slate-300'
                        : isTransferred
                        ? 'bg-purple-50/70 border-purple-200'
                        : 'bg-emerald-50/40 border-emerald-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-black text-slate-800">
                          {isTa ? 'தனிநபர் நிலை (Individual Status):' : 'Member Lifecycle Status:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'PERMANENT', labelTa: 'நிரந்தர வதிவு', labelEn: 'Permanent', cls: 'bg-emerald-700 text-white border-emerald-800' },
                            { key: 'GN_TRANSFER', labelTa: 'கிராம உத்தியோகத்தர் மாற்றம்', labelEn: 'GN Transfer', cls: 'bg-amber-700 text-white border-amber-800' },
                            { key: 'EXT_TRANSFER', labelTa: 'வெளி பிரதேச செயலக மாற்றம்', labelEn: 'External DS Transfer', cls: 'bg-purple-800 text-white border-purple-900' },
                            { key: 'DECEASED', labelTa: 'மரணம்', labelEn: 'Deceased', cls: 'bg-slate-900 text-white border-slate-950' },
                          ].map((opt) => {
                            const isSelected =
                              (opt.key === 'PERMANENT' && m.status === 'ACTIVE') ||
                              (opt.key === 'GN_TRANSFER' && m.status === 'TRANSFERRED' && m.transferScope !== 'EXTERNAL_DS') ||
                              (opt.key === 'EXT_TRANSFER' && m.status === 'TRANSFERRED' && m.transferScope === 'EXTERNAL_DS') ||
                              (opt.key === 'DECEASED' && m.status === 'DECEASED');
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  const updated = [...members];
                                  if (opt.key === 'PERMANENT') {
                                    updated[idx].status = 'ACTIVE';
                                  } else if (opt.key === 'GN_TRANSFER') {
                                    updated[idx].status = 'TRANSFERRED';
                                    updated[idx].transferScope = 'INTERNAL_GN';
                                    updated[idx].transferDate = updated[idx].transferDate || new Date().toISOString().slice(0, 10);
                                  } else if (opt.key === 'EXT_TRANSFER') {
                                    updated[idx].status = 'TRANSFERRED';
                                    updated[idx].transferScope = 'EXTERNAL_DS';
                                    updated[idx].transferDate = updated[idx].transferDate || new Date().toISOString().slice(0, 10);
                                  } else {
                                    updated[idx].status = 'DECEASED';
                                    updated[idx].deathDate = updated[idx].deathDate || new Date().toISOString().slice(0, 10);
                                  }
                                  setMembers(updated);
                                }}
                                className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition-all ${
                                  isSelected ? `${opt.cls} shadow-xs` : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {isTa ? opt.labelTa : opt.labelEn}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isTransferred && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                              {m.transferScope === 'EXTERNAL_DS'
                                ? (isTa ? 'எங்கு மாற்றப்பட்டது? (வெளி பிரதேச செயலாளர் பிரிவு) *' : 'Where? (External DS Division) *')
                                : (isTa ? 'எங்கு மாற்றப்பட்டது? (கிராம உத்தியோகத்தர் பிரிவு) *' : 'Where? (Target GN Division) *')}
                            </label>
                            <input
                              type="text"
                              value={m.transferDestination || ''}
                              onChange={(e) => {
                                const updated = [...members];
                                updated[idx].transferDestination = e.target.value;
                                setMembers(updated);
                              }}
                              placeholder={m.transferScope === 'EXTERNAL_DS' ? 'உ-ம்: மட்டக்களப்பு / வாழைச்சேனை' : 'உ-ம்: 212A வாகரை வடக்கு'}
                              className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                              {isTa ? 'கழிக்கப்படும் / மாற்றப்பட்ட திகதி *' : 'Deduction / Transfer Date *'}
                            </label>
                            <input
                              type="date"
                              value={m.transferDate || ''}
                              onChange={(e) => {
                                const updated = [...members];
                                updated[idx].transferDate = e.target.value;
                                setMembers(updated);
                              }}
                              className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {isDeceased && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                              {isTa ? 'மரணமடைந்த / கழிக்கப்படும் திகதி *' : 'Date of Death / Deduction *'}
                            </label>
                            <input
                              type="date"
                              value={m.deathDate || ''}
                              onChange={(e) => {
                                const updated = [...members];
                                updated[idx].deathDate = e.target.value;
                                setMembers(updated);
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-400 rounded-lg bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                              {isTa ? 'இறப்புச் சான்றிதழ் இலக்கம்' : 'Death Certificate No.'}
                            </label>
                            <input
                              type="text"
                              value={m.deathCertificateNo || ''}
                              onChange={(e) => {
                                const updated = [...members];
                                updated[idx].deathCertificateNo = e.target.value;
                                setMembers(updated);
                              }}
                              placeholder="DC-VHR-2026-..."
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                              {isTa ? 'குறிப்பு' : 'Remarks'}
                            </label>
                            <input
                              type="text"
                              value={m.deathRemarks || ''}
                              onChange={(e) => {
                                const updated = [...members];
                                updated[idx].deathRemarks = e.target.value;
                                setMembers(updated);
                              }}
                              placeholder="குறிப்புகள்..."
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom bar for Tab 2 */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('family-entry')}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                ← {isTa ? 'குடும்ப & சொத்து விபரங்களுக்கு' : 'Back to Family & Assets'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary-a4')}
                className="px-5 py-2.5 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>{isTa ? 'முழுமையான சமரி & A4 பிரிண்ட் பார்வையிடு →' : 'View Complete Summary & A4 Print →'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 3: COMPLETE OFFICIAL A4 PRINTABLE SUMMARY ================= */}
        <div className={activeTab === 'summary-a4' ? 'dossier-summary-wrap max-w-[210mm] mx-auto' : 'dossier-summary-wrap hidden print:block max-w-[210mm] mx-auto'}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isTa ? 'பின் (உறுப்பினர்கள்)' : 'Back (Members)'}</span>
                </button>
                <span className="text-xs font-bold text-slate-600">
                  📄 {isTa ? 'A4 அளவிலான உத்தியோகபூர்வ குடும்ப தரவு & வறுமைச்சுட்டி அறிக்கை' : 'A4 Official Household Dossier & Poverty Assessment Summary'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintA4}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isTa ? 'A4 தாளில் அச்சிடு / PDF சேமி (Print A4)' : 'Print A4 / Save PDF'}</span>
                </button>
              </div>
            </div>

            <div
              id="printable-family-summary-a4"
              className="bg-white border border-slate-300 shadow-lg p-5 sm:p-7 text-slate-900 text-[11px] leading-snug space-y-4"
            >
              {/* Official Sri Lankan Government Letterhead */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <VaharaiLogo size={48} className="w-12 h-12 shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      இலங்கை சனநாயக சோசலிசக் குடியரசு · Democratic Socialist Republic of Sri Lanka
                    </div>
                    <h1 className="text-sm sm:text-base font-black text-slate-950">
                      பிரதேச செயலகம் — கோறளைப்பற்று வடக்கு (வாகரை)
                    </h1>
                    <div className="text-xs font-bold text-emerald-900">
                      Divisional Secretariat — Koralaipattu North (Vaharai) | குடும்ப தரவு &amp; வறுமைச்சுட்டி உத்தியோகபூர்வ சமரி (A4)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {qrDataUrl && (
                    <div className="text-center border border-slate-300 p-1 rounded">
                      <img src={qrDataUrl} alt="Family QR" className="w-16 h-16 mx-auto" />
                      <div className="font-mono font-black text-[9px] mt-0.5">{effectiveFamilyCode}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* A. குடும்பவிபரம் (Family Information) */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-900 text-white px-3 py-1.5 font-extrabold text-[11px] flex items-center justify-between">
                  <span>A. குடும்பவிபரம் (FAMILY INFORMATION &amp; HEAD OF HOUSEHOLD)</span>
                  <span className="font-mono">Date: {new Date().toLocaleDateString('en-GB')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 p-3 bg-slate-50/40">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Family QR Code</span>
                    <span className="font-mono font-black text-emerald-900">{effectiveFamilyCode}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Household Ref / App Ref</span>
                    <span className="font-mono font-bold">{meta.householdReference} / {meta.applicationReference}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">GN Division</span>
                    <span className="font-bold">{divObj ? `${divObj.code} - ${divObj.nameTa}` : meta.divisionCode}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Status / Single Parent</span>
                    <span className="font-bold">
                      {meta.status} ·{' '}
                      {meta.residencyStatus === 'PERMANENT'
                        ? 'நிரந்தர வதிவு'
                        : meta.residencyStatus === 'TRANSFERRED_GN'
                        ? `GN மாற்றம் (${meta.transferDestination} | ${meta.transferDate})`
                        : `வெளி DS மாற்றம் (${meta.transferDestination} | ${meta.transferDate})`}
                      {' · '}
                      {assets.isSingleParent ? 'ஒற்றைப் பெற்றோர் (Yes)' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Head Name (Tamil)</span>
                    <span className="font-black text-slate-950">{meta.applicantNameTa || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Head Name (English)</span>
                    <span className="font-bold">{meta.applicantNameEn || meta.applicantNameTa || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Head NIC / Phone</span>
                    <span className="font-mono font-bold">{meta.applicantNic || '—'} · {meta.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Address</span>
                    <span className="font-semibold">{meta.address || '—'}</span>
                  </div>
                </div>
              </div>

              {/* B. குடும்ப உறுப்பினர் விபரம் (Family Members Table) */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-800 text-white px-3 py-1.5 font-extrabold text-[11px] flex items-center justify-between">
                  <span>B. குடும்ப உறுப்பினர் விபரம் (FAMILY MEMBERS UNDER HEAD QR: {effectiveFamilyCode})</span>
                  <span>Active: {membersGlance.totalMembers} / Recorded: {members.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                        <th className="py-1.5 px-2 border-r border-slate-200">#</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">பெயர் (Name)</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">NIC</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">உறவு (Rel)</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">வயது (Age)</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">கல்வி (Edu)</th>
                        <th className="py-1.5 px-2 border-r border-slate-200">School 5–16</th>
                        <th className="py-1.5 px-2">மருத்துவ / வதிவிட நிலை (Health / Status)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {members.map((m, idx) => {
                        const age = computeAgeFromDobSafe(m.dob);
                        const eduOpt = EDUCATION_OPTIONS.find((e) => e.value === m.educationLevel);
                        const tags: string[] = [];
                        if (m.status === 'DECEASED') tags.push(`மரணம் (${m.deathDate || ''})`);
                        else if (m.status === 'TRANSFERRED') tags.push(`மாற்றம்: ${m.transferDestination || ''} (${m.transferDate || ''})`);
                        if (m.hasCkdu || m.chronicIllness === 'CKD_KIDNEY') tags.push('CKDU');
                        else if (m.chronicIllness && m.chronicIllness !== 'NONE' && m.chronicIllness !== 'DISABILITY_PHYSICAL') tags.push(m.chronicIllness);
                        if (m.isDisability) tags.push('Disability');
                        if (m.isDependent) tags.push('Dependent');
                        if (age >= 70 || m.isElderly) tags.push('70+');
                        if (m.isPregnant) tags.push('Pregnant');

                        return (
                          <tr key={idx} className={m.status !== 'ACTIVE' ? 'bg-slate-100 text-slate-500' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-1 px-2 border-r border-slate-200 font-mono font-bold">{idx + 1}</td>
                            <td className="py-1 px-2 border-r border-slate-200 font-bold">
                              {(idx === 0 && !m.nameTa ? meta.applicantNameTa : m.nameTa) || '—'}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 font-mono">
                              {(idx === 0 && !m.nic ? meta.applicantNic : m.nic) || 'Provisional'}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200">{m.rel}</td>
                            <td className="py-1 px-2 border-r border-slate-200 font-mono">{age}</td>
                            <td className="py-1 px-2 border-r border-slate-200">{eduOpt ? eduOpt.en : m.educationLevel}</td>
                            <td className="py-1 px-2 border-r border-slate-200">
                              {age >= 5 && age <= 16 ? (m.isAttendingSchool ? 'Yes' : 'NO (Drop-out)') : 'N/A'}
                            </td>
                            <td className="py-1 px-2 font-semibold">{tags.length > 0 ? tags.join(', ') : 'Normal'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* C. Members at a glance */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-800 text-white px-3 py-1.5 font-extrabold text-[11px]">
                  C. MEMBERS AT A GLANCE (உறுப்பினர் சுருக்க அட்டவணை)
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-y divide-slate-200 text-center bg-white">
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">Total Members</div>
                    <div className="text-sm font-black font-mono">{membersGlance.totalMembers}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">Below O/L education</div>
                    <div className="text-sm font-black font-mono">{membersGlance.belowOLCount}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">Children not in school (5–16)</div>
                    <div className="text-sm font-black font-mono text-rose-700">{membersGlance.childrenNotInSchool5To16Count}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">Chronic disease</div>
                    <div className="text-sm font-black font-mono">{membersGlance.chronicDiseaseCount}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">Disability</div>
                    <div className="text-sm font-black font-mono">{membersGlance.disabilityCount}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">CKDU</div>
                    <div className="text-sm font-black font-mono text-purple-800">{membersGlance.ckduCount}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">Dependents</div>
                    <div className="text-sm font-black font-mono">{membersGlance.dependentsCount}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] font-bold text-slate-600">Over 70 years</div>
                    <div className="text-sm font-black font-mono">{membersGlance.over70Count}</div>
                  </div>
                </div>
              </div>

              {/* D & E. Assets + Housing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* *Assets */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1 font-extrabold text-[11px]">
                    D. *ASSETS (சொத்து விபரங்கள்)
                  </div>
                  <div className="p-2.5 space-y-1 text-[10px]">
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">House &amp; land ownership:</span>
                      <span className="font-bold">{ownershipLabel(assets.houseAndLandOwnership)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Received As Compensation:</span>
                      <span className="font-bold">{assets.receivedAsCompensation ? `Yes (${assets.compensationDetails || 'Compensation'})` : 'No'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Other house / building:</span>
                      <span className="font-bold">{assets.ownsOtherHouse ? `Yes (${assets.otherHouseDetails || 'Owned'})` : 'No'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Highland:</span>
                      <span className="font-bold">{assets.hasHighland ? assets.highlandExtent : 'None'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Lowland / Paddy land (தாழ்நிலக் காணி):</span>
                      <span className="font-bold">
                        {assets.hasPaddyLand
                          ? `${assets.paddyLandExtent}${assets.paddyLandPlAccountNo ? ` | PL A/C: ${assets.paddyLandPlAccountNo}` : ''}`
                          : assets.paddyLandPlAccountNo
                          ? `PL A/C: ${assets.paddyLandPlAccountNo}`
                          : 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Vehicle:</span>
                      <span className="font-bold">{assets.vehicleType}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Machinery:</span>
                      <span className="font-bold">{assets.machineryType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">Livestock:</span>
                      <span className="font-bold">{assets.livestockType === 'NONE' ? 'None' : `${assets.livestockType} (${assets.livestockCount})`}</span>
                    </div>
                  </div>
                </div>

                {/* *Housing */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1 font-extrabold text-[11px]">
                    E. *HOUSING (வீடமைப்பு &amp; குடிநீர்)
                  </div>
                  <div className="p-2.5 space-y-1 text-[10px]">
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Type:</span>
                      <span className="font-bold">{housingTypeLabel(assets.unitType)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Permanent:</span>
                      <span className="font-bold">{assets.housingPermanency || 'SEMI_PERMANENT'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Single House / Single Floor:</span>
                      <span className="font-bold">{assets.isSingleFloor !== false ? 'Yes (Single Floor)' : 'No'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Floor area:</span>
                      <span className="font-bold">
                        {assets.houseArea === 'LESS_THAN_500_SQFT' ? 'Less than 500 Square Feet' : assets.houseArea}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Roof / Wall / Floor:</span>
                      <span className="font-bold">{assets.roofMaterial} / {assets.wallMaterial} / {assets.floorMaterial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">Source of drinking water:</span>
                      <span className="font-bold">{waterSourceLabel(assets.waterSource)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* F & G. Sanitation & Lighting + Economic Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1 font-extrabold text-[11px]">
                    F. *SANITATION &amp; LIGHTING (சுகாதாரம் &amp; ஒளி)
                  </div>
                  <div className="p-2.5 space-y-1 text-[10px]">
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Toilet facility:</span>
                      <span className="font-bold">{toiletLocationLabel(assets.toiletLocation)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Toilet type:</span>
                      <span className="font-bold">{toiletTypeLabel(assets.toiletNature)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">Source of lighting:</span>
                      <span className="font-bold">{lightingLabel(assets.lightingSource)}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1 font-extrabold text-[11px]">
                    G. *ECONOMIC LEVEL (பொருளாதார நிலை)
                  </div>
                  <div className="p-2.5 space-y-1 text-[10px]">
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Monthly expenditure (Rs.):</span>
                      <span className="font-mono font-black text-rose-800">Rs. {(assets.expenses.total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-bold text-slate-600">Monthly income (Rs.):</span>
                      <span className="font-mono font-black text-emerald-800">Rs. {(assets.income.total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-600">Electricity units / month:</span>
                      <span className="font-mono font-black">{assets.electricityUnitsKwh || 0} kWh</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* H. நலன்புரி உதவிகள் (Welfare Assistance - Aswesuma & Samurdhi) */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-amber-800 text-white px-3 py-1.5 font-extrabold text-[11px]">
                  H. நலன்புரி உதவிகள் (WELFARE ASSISTANCE — அஸ்வெசும &amp; சமூர்த்தி)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 p-2.5 text-[10px] bg-amber-50/30">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">அஸ்வெசும கொடுப்பனவு (Aswesuma)</span>
                    <span className="font-black text-amber-950">{aswesumaLabel(welfare.aswesumaCategory)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">அஸ்வெசும தொகை (Aswesuma Amount)</span>
                    <span className="font-mono font-bold">
                      {welfare.aswesumaCategory !== 'NONE' && (welfare.aswesumaAmount || 0) > 0
                        ? `Rs. ${(welfare.aswesumaAmount || 0).toLocaleString()}`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">சமூர்த்தி கொடுப்பனவு (Samurdhi)</span>
                    <span className="font-bold">
                      {welfare.receivingSamurdhi
                        ? `ஆம் (Yes)${(welfare.samurdhiAmount || 0) > 0 ? ` — Rs. ${(welfare.samurdhiAmount || 0).toLocaleString()}` : ''}`
                        : 'இல்லை (No)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">சமூர்த்தி கணக்கு இலக்கம் (Samurdhi A/C No.)</span>
                    <span className="font-mono font-bold">{welfare.samurdhiAccountNo?.trim() || '—'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">சமூர்த்தி வங்கி கடன் பெற்ற தொகை (Samurdhi Bank Loan)</span>
                    <span className="font-mono font-black text-emerald-900">
                      {(welfare.samurdhiBankLoanAmount || 0) > 0
                        ? `Rs. ${(welfare.samurdhiBankLoanAmount || 0).toLocaleString()}`
                        : 'Rs. 0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* I. Poverty Index Scoring Matrix */}
              <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
                <div className="bg-slate-900 text-white px-3 py-1.5 font-extrabold text-[11px] flex items-center justify-between">
                  <span>I. வறுமைச்சுட்டி புள்ளி மதிப்பீடு (MULTI-DIMENSIONAL POVERTY INDEX RESULT)</span>
                  <span className="font-mono text-sm font-black text-amber-300">
                    TOTAL SCORE: {liveScore.score100} / 100 · {priorityLabel(liveScore.priorityRank)}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                      <div className="font-bold text-slate-600">Housing (Max {povertyWeights.housingMax})</div>
                      <div className="font-mono font-black text-sm">{liveScore.breakdown.housingScore}</div>
                    </div>
                    <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                      <div className="font-bold text-slate-600">Sanitation (Max {povertyWeights.sanitationMax})</div>
                      <div className="font-mono font-black text-sm">{liveScore.breakdown.sanitationScore}</div>
                    </div>
                    <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                      <div className="font-bold text-slate-600">Members/Demo (Max {povertyWeights.demographicsMax})</div>
                      <div className="font-mono font-black text-sm">{liveScore.breakdown.demographicsScore}</div>
                    </div>
                    <div className="p-1.5 bg-slate-100 rounded border border-slate-200">
                      <div className="font-bold text-slate-600">Economic/Assets (Max {povertyWeights.economicMax})</div>
                      <div className="font-mono font-black text-sm">{liveScore.breakdown.economicScore}</div>
                    </div>
                  </div>

                  {liveScore.breakdown.itemizedFactors && liveScore.breakdown.itemizedFactors.length > 0 && (
                    <div className="text-[9px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="font-bold mb-1 uppercase text-slate-600">புள்ளி வழங்கப்பட்ட காரணிகள் (Itemized Scoring Basis):</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5">
                        {liveScore.breakdown.itemizedFactors.map((f, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-dotted border-slate-300">
                            <span className="truncate pr-1">{isTa ? f.labelTa : f.labelEn}</span>
                            <span className={`font-mono font-bold ${f.points < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                              {f.points > 0 ? `+${f.points}` : f.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* J. இதுவரை பிரதேச செயலகத்தின் மூலம் பெற்ற உதவிகள் (Assistance Audit History) */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-emerald-900 text-white px-3 py-1.5 font-extrabold text-[11px] flex items-center justify-between">
                  <span>J. இதுவரை பிரதேச செயலகத்தின் மூலம் பெற்ற உதவிகள் (DS ASSISTANCE RECEIVED — ASSISTANCE AUDIT REGISTRY)</span>
                  <span className="font-mono">Total Records: {familyAssistanceHistory.length}</span>
                </div>
                {familyAssistanceHistory.length === 0 ? (
                  <div className="p-3 text-[10px] text-slate-600 bg-slate-50">
                    {isTa
                      ? 'உதவி தணிக்கை பதிவில் இக்குடும்பத்திற்கான உதவிகள் எதுவும் இதுவரை பதிவு செய்யப்படவில்லை.'
                      : 'No Divisional Secretariat assistance records found for this family in the Assistance Audit registry.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                          <th className="py-1.5 px-2 border-r border-slate-200">#</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">திகதி (Date)</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">உதவி வகை &amp; விபரம் (Aid Category &amp; Details)</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">பெறுமதி (Value)</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">வழங்கிய பிரிவு / நிறுவனம் (Donor / Unit)</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">உத்தியோகத்தர் (Officer)</th>
                          <th className="py-1.5 px-2">நிலை (Status)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {familyAssistanceHistory.map((aid, idx) => (
                          <tr key={aid.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-1 px-2 border-r border-slate-200 font-mono font-bold">{idx + 1}</td>
                            <td className="py-1 px-2 border-r border-slate-200 font-mono whitespace-nowrap">
                              {aid.distributedDate || aid.createdAt?.slice(0, 10) || '—'}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 font-semibold">
                              <div>{aid.aidDescription || aid.aidCategory}</div>
                              <div className="text-[9px] text-slate-500 font-mono">{aid.aidCategory}</div>
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 font-mono font-bold text-emerald-900">
                              {aid.amountOrValue || '—'}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200">{aid.donorOrOrganization || 'DS Office'}</td>
                            <td className="py-1 px-2 border-r border-slate-200">{aid.officerName || '—'}</td>
                            <td className="py-1 px-2 font-bold">
                              <span className={aid.status === 'REJECTED_DUPLICATE' ? 'text-rose-700' : 'text-emerald-800'}>
                                {aid.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Official Certification & Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10px]">
                <div>
                  <div className="border-t border-slate-500 pt-1 font-bold">குடும்பத் தலைவர் கையொப்பம்</div>
                  <div className="text-[9px] text-slate-500">Signature of Head of Household</div>
                </div>
                <div>
                  <div className="border-t border-slate-500 pt-1 font-bold">கிராம அலுவலர் சான்று</div>
                  <div className="text-[9px] text-slate-500">Grama Niladhari Certification</div>
                </div>
                <div>
                  <div className="border-t border-slate-500 pt-1 font-bold">பிரதேச செயலாளர் / அதிகாரப்பூர்வ முத்திரை</div>
                  <div className="text-[9px] text-slate-500">Divisional Secretary Approval</div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
