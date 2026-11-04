import React, { useEffect, useRef } from 'react';
import { QueueToken, Beneficiary, HouseholdData, PregnantMotherRecord } from '../types';
import { renderBarcodeSvg } from '../utils/barcode';
import { VaharaiLogo } from './VaharaiLogo';

interface ThermalPrintReceiptProps {
  token: QueueToken;
  waitingCount: number;
  serviceLabelTa: string;
  serviceLabelEn: string;
  onClose?: () => void;
  autoPrint?: boolean;
  beneficiary?: Beneficiary | null;
  household?: HouseholdData | null;
  pregnantMother?: PregnantMotherRecord | null;
  landRecordsCount?: number;
  pastAidCount?: number;
}

export const ThermalPrintReceipt: React.FC<ThermalPrintReceiptProps> = ({
  token,
  waitingCount,
  serviceLabelTa,
  serviceLabelEn,
  onClose,
  autoPrint = false,
  beneficiary,
  household,
  pregnantMother,
  landRecordsCount = 0,
  pastAidCount = 0,
}) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && token.tokenNumber) {
      renderBarcodeSvg(barcodeRef.current, token.tokenNumber, {
        height: 38,
        displayValue: false,
      });
    }

    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [token, autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(token.issuedAt).toLocaleDateString('en-GB');
  const formattedTime = new Date(token.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 sm:p-6 border border-slate-200">
        {/* Screen Header Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <VaharaiLogo size={24} className="w-6 h-6" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Thermal Receipt (58mm / 80mm)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Printable Thermal Slip Area */}
        <div id="thermal-slip" className="my-4 p-4 border border-dashed border-slate-300 bg-white text-black font-sans text-center text-xs leading-tight mx-auto max-w-[280px]">
          {/* Emblem & Official Header */}
          <div className="mb-2 flex flex-col items-center">
            <div className="mb-1">
              <VaharaiLogo size={42} className="w-10 h-10" />
            </div>
            <div className="text-[10px] tracking-wide text-slate-700">
              இலங்கை ஜனநாயக சோசலிசக் குடியரசு
            </div>
            <div className="text-[12px] font-bold text-slate-900 leading-snug mt-0.5">
              கோறளைப்பற்று வடக்கு, வாகரை பிரதேச செயலகம்
            </div>
            <div className="text-[9px] text-slate-700 uppercase mt-0.5">
              DS Office - Koralaipattu North, Vaharai
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              பொதுமக்கள் சேவை வரிசை முறைமை
            </div>
          </div>

          <div className="border-t border-b border-black border-dashed py-1.5 my-2">
            <div className="text-[11px] font-semibold">{serviceLabelTa}</div>
            <div className="text-[9px] text-slate-600 font-medium">{serviceLabelEn}</div>
          </div>

          {/* Large Token Number */}
          <div className="my-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-600">வரிசை இலக்கம் / Token No</div>
            <div className="text-4xl font-extrabold tracking-wider font-mono py-1 text-black">
              {token.tokenNumber}
            </div>
            <div className="inline-block border border-black px-2 py-0.5 text-[11px] font-bold mt-1">
              கவுண்டர் / Counter: {token.counterNo}
            </div>
          </div>

          {/* Officer to Meet (யாரை பார்க்க வேண்டும்) */}
          <div className="border border-black bg-slate-50 p-1.5 rounded my-2 text-center">
            <div className="text-[9px] font-bold text-slate-700 uppercase">
              பார்க்க வேண்டிய அலுவலர் / Officer to Meet:
            </div>
            <div className="text-[11px] font-bold text-black mt-0.5">
              {token.officerToMeet || 'அட்மின் 1 (Admin 1)'}
            </div>
          </div>

          {/* Citizen Details with 360° Welfare Profile Context */}
          {(token.citizenName || token.citizenNic || beneficiary) && (() => {
            const welfareTags: string[] = [];
            if (beneficiary?.isElderly || beneficiary?.welfareScheme === 'ELDERLY') welfareTags.push('முதியோர் (Senior)');
            if (pregnantMother || beneficiary?.isPregnantMother) welfareTags.push('கர்ப்பிணித் தாய் (Maternity)');
            if (beneficiary?.isPersonWithDisability || beneficiary?.welfareScheme === 'DISABILITY') welfareTags.push('விசேட தேவை (Disability)');
            if (beneficiary?.isSamurdhiBeneficiary || beneficiary?.welfareScheme === 'SAMURDHI') welfareTags.push('அஸ்வெசும / சமூர்த்தி');
            if (beneficiary?.isWomanHeadedHousehold) welfareTags.push('பெண் தலைமை (WHH)');
            const famCode = token.familyCode || beneficiary?.familyCode;

            return (
              <div className="text-left bg-slate-50 border border-slate-300 p-2 rounded my-2 text-[10px] space-y-0.5 leading-tight">
                <div className="font-bold text-[10px] text-slate-800 border-b border-slate-200 pb-0.5 mb-1 flex items-center justify-between">
                  <span>பிரஜை விபரம் & நலன்புரி</span>
                  <span className="font-mono text-[9px] text-slate-500">360° PROFILE</span>
                </div>
                {(token.citizenName || beneficiary?.nameTa) && (
                  <div className="truncate font-semibold text-slate-900">
                    <span className="text-slate-600 font-normal">பெயர்:</span> {token.citizenName || beneficiary?.nameTa}
                  </div>
                )}
                {(token.citizenNic || beneficiary?.nic) && (
                  <div className="font-mono">
                    <span className="text-slate-600 font-normal">NIC:</span> <strong className="text-slate-950">{token.citizenNic || beneficiary?.nic}</strong>
                  </div>
                )}
                {famCode && (
                  <div className="font-mono">
                    <span className="text-slate-600 font-normal">குடும்ப எண்:</span> <strong>{famCode}</strong>
                  </div>
                )}
                {(token.divisionCode || beneficiary?.divisionCode) && (
                  <div>
                    <span className="text-slate-600 font-normal">பிரிவு (GN):</span> {token.divisionCode || beneficiary?.divisionCode}
                  </div>
                )}
                {beneficiary?.phone && (
                  <div>
                    <span className="text-slate-600 font-normal">தொலைபேசி:</span> {beneficiary.phone}
                  </div>
                )}

                {/* Welfare Status Tags */}
                {welfareTags.length > 0 && (
                  <div className="pt-1 mt-1 border-t border-slate-200">
                    <div className="text-[9px] text-slate-600 font-medium mb-0.5">நலன்புரி நிலை / Welfare:</div>
                    <div className="flex flex-wrap gap-1">
                      {welfareTags.map((tag, idx) => (
                        <span key={idx} className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold text-[8.5px]">
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Poverty Scoring, Aid, and Land History */}
                {(household?.score100 !== undefined || pastAidCount > 0 || landRecordsCount > 0) && (
                  <div className="pt-1 mt-1 border-t border-slate-200 text-[9px] text-slate-700 flex flex-wrap gap-x-2 gap-y-0.5">
                    {household?.score100 !== undefined && (
                      <span>வறுமைப் புள்ளி: <strong>{household.score100}/100</strong></span>
                    )}
                    {pastAidCount > 0 && (
                      <span>| நிவாரணம்: <strong>{pastAidCount} முறை</strong></span>
                    )}
                    {landRecordsCount > 0 && (
                      <span>| காணி: <strong>{landRecordsCount} பதிவுகள்</strong></span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Barcode for scanner */}
          <div className="flex flex-col items-center justify-center my-2">
            <svg ref={barcodeRef} className="max-w-[200px] h-[40px]"></svg>
            <span className="font-mono text-[9px] mt-0.5 tracking-wider">{token.tokenNumber}</span>
          </div>

          <div className="border-t border-black border-dashed pt-2 mt-2 text-[9px] text-slate-600 leading-tight">
            திகதி / Date: {formattedDate} | நேரம் / Time: {formattedTime}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 text-[9px] text-slate-600 italic">
            நன்றி! உங்கள் எண் அழைக்கப்படும் வரை காத்திருக்கவும்.
            <div className="text-[8px] text-slate-400">Thank you for your patience.</div>
          </div>

          {/* Perforated tear-off section for Citizen Star Rating Feedback */}
          <div className="mt-3 pt-2 border-t-2 border-dashed border-black text-[9px] text-left">
            <div className="flex items-center justify-between font-bold mb-1 text-[10px]">
              <span>✂️ வெட்டி ஒப்படைக்கவும்</span>
              <span className="font-mono text-[9px]">FEEDBACK SLIP</span>
            </div>
            <div className="text-center font-bold text-[10px] text-slate-900 bg-slate-100 py-0.5 rounded border border-slate-300">
              சேவை திருப்தி நட்சத்திர மதிப்பீடு
            </div>
            <div className="text-[8px] text-center text-slate-600 mb-1.5">
              (Public Service Star Rating - Mark your feedback)
            </div>

            {/* 5 Star Rating Options to Mark */}
            <div className="space-y-1 bg-white p-1.5 rounded border border-slate-300 text-[9px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-3.5 border border-black rounded-xs"></span>
                  <span className="font-bold text-amber-600">⭐⭐⭐⭐⭐ 5</span>
                </span>
                <span className="text-[8px] text-slate-600 font-medium">மிகச் சிறப்பு (Excellent)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-3.5 border border-black rounded-xs"></span>
                  <span className="font-bold text-amber-600">⭐⭐⭐⭐ 4</span>
                </span>
                <span className="text-[8px] text-slate-600 font-medium">நன்று (Good)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-3.5 border border-black rounded-xs"></span>
                  <span className="font-bold text-amber-600">⭐⭐⭐ 3</span>
                </span>
                <span className="text-[8px] text-slate-600 font-medium">திருப்தி (Satisfactory)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-3.5 border border-black rounded-xs"></span>
                  <span className="font-bold text-amber-600">⭐⭐ 2</span>
                </span>
                <span className="text-[8px] text-slate-600 font-medium">பரவாயில்லை (Average)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-3.5 border border-black rounded-xs"></span>
                  <span className="font-bold text-amber-600">⭐ 1</span>
                </span>
                <span className="text-[8px] text-slate-600 font-medium">அதிருப்தி (Poor)</span>
              </div>
            </div>

            <div className="mt-2 text-[8.5px] space-y-1.5 leading-tight">
              <div>
                <span className="font-semibold">சேவையை வழங்கிய அலுவலர்:</span>{' '}
                <span className="font-bold font-mono text-[9px]">{token.officerToMeet || '_________________'}</span>
              </div>
              <div>
                <span className="font-semibold">பிரஜையின் கருத்து / குறிப்பு:</span>{' '}
                <span className="text-slate-400">_____________________________</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="font-mono text-[8px]">வரிசை எண்: {token.tokenNumber}</span>
                <span className="text-[8px]">ஒப்பம்: __________________</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons for screen */}
        <div className="flex items-center gap-3 mt-4 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>🖨️ தர்மல் பிரிண்ட் (Print)</span>
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-colors"
          >
            மூடுக (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
