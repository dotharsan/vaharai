import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../translations/i18n';
import { getDsLogo, saveDsLogo } from '../services/storage';
import { VaharaiLogo } from './VaharaiLogo';
import {
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';

interface LogoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string; // 'DISTRICT_HQ' or a DSDivision.id (e.g. 'DS_VAHARAI')
  targetNameTa: string;
  targetNameEn: string;
  lang: Language;
  onLogoUpdated?: (newLogoUrl: string | null) => void;
  onAuditLog?: (action: string, details: string) => void;
}

const MAX_DIMENSION = 256;

const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('INVALID_TYPE'));
      return;
    }

    // For small SVGs, read directly as data URL to keep crisp vector quality
    if (file.type === 'image/svg+xml' && file.size <= 120 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('READ_FAILED'));
        }
      };
      reader.onerror = () => reject(new Error('READ_FAILED'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('READ_FAILED'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width || MAX_DIMENSION;
          let height = img.height || MAX_DIMENSION;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width >= height) {
              height = Math.max(1, Math.round((height * MAX_DIMENSION) / width));
              width = MAX_DIMENSION;
            } else {
              width = Math.max(1, Math.round((width * MAX_DIMENSION) / height));
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Use PNG to preserve transparency for official emblems/seals
          const optimized = canvas.toDataURL('image/png', 0.92);
          resolve(optimized);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
};

export const LogoSettingsModal: React.FC<LogoSettingsModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetNameTa,
  targetNameEn,
  lang,
  onLogoUpdated,
  onAuditLog,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(getDsLogo(targetId));
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, targetId]);

  if (!isOpen) return null;

  const isDistrict = targetId === 'DISTRICT_HQ' || targetId === 'DISTRICT' || targetId === 'ALL';

  const handleFileSelected = async (file: File) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);
    try {
      const optimized = await processImageFile(file);
      setPreviewUrl(optimized);
    } catch (err: any) {
      if (err?.message === 'INVALID_TYPE') {
        setErrorMsg(
          lang === 'ta'
            ? 'தயவுசெய்து PNG, JPG, WebP அல்லது SVG படக் கோப்பை மட்டும் தெரிவுசெய்யவும்.'
            : 'Please select a valid image file (PNG, JPG, WebP, or SVG).'
        );
      } else {
        setErrorMsg(
          lang === 'ta'
            ? 'படத்தை செயலாக்குவதில் பிழை ஏற்பட்டது. வேறொரு படத்தை முயற்சிக்கவும்.'
            : 'Could not process the selected image. Please try another file.'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleSave = () => {
    saveDsLogo(targetId, previewUrl);
    if (onAuditLog) {
      onAuditLog(
        previewUrl ? 'UPDATE_ORGANIZATION_LOGO' : 'RESET_ORGANIZATION_LOGO',
        `${previewUrl ? 'Updated' : 'Reset'} official logo for ${targetNameEn} (${targetId})`
      );
    }
    if (onLogoUpdated) {
      onLogoUpdated(previewUrl);
    }
    setSuccessMsg(
      lang === 'ta'
        ? 'அலுவலக லோகோ வெற்றிகரமாக புதுப்பிக்கப்பட்டது!'
        : 'Official secretariat logo updated successfully!'
    );
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleResetToDefault = () => {
    setPreviewUrl(null);
    setErrorMsg('');
    saveDsLogo(targetId, null);
    if (onAuditLog) {
      onAuditLog(
        'RESET_ORGANIZATION_LOGO',
        `Reset official logo to default emblem for ${targetNameEn} (${targetId})`
      );
    }
    if (onLogoUpdated) {
      onLogoUpdated(null);
    }
    setSuccessMsg(
      lang === 'ta'
        ? 'இயல்புநிலை அரச லோகோவிற்கு மீட்டமைக்கப்பட்டது!'
        : 'Logo reset to the default official emblem!'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150 my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
              <VaharaiLogo size={36} className="w-9 h-9" dsDivisionId={targetId} customLogoUrl={previewUrl} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>
                  {isDistrict
                    ? (lang === 'ta' ? 'மாவட்ட செயலக தலைமை அட்மின்' : 'District Secretariat Master Admin')
                    : (lang === 'ta' ? 'பிரதேச செயலக சுப்பர் அட்மின்' : 'Divisional Secretariat Super Admin')}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold truncate">
                {lang === 'ta' ? 'செயலக லோகோ மாற்றம் & அமைப்பு' : 'Secretariat Logo Management'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Organization Target Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {lang === 'ta' ? 'தெரிவு செய்யப்பட்ட செயலகம்' : 'Target Secretariat'}
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">{targetNameTa}</div>
            <div className="text-xs text-slate-600">{targetNameEn}</div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Live Preview Row */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-24 h-24 rounded-full bg-white border-2 border-emerald-700 shadow-md flex items-center justify-center p-1.5">
                <VaharaiLogo
                  size={84}
                  className="w-20 h-20"
                  dsDivisionId={targetId}
                  customLogoUrl={previewUrl}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {previewUrl
                  ? (lang === 'ta' ? 'புதிய / தனிப்பயன் லோகோ' : 'Custom Logo')
                  : (lang === 'ta' ? 'இயல்புநிலை லோகோ' : 'Default Emblem')}
              </span>
            </div>

            {/* Dropzone & Upload Button */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/40 bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
                {isProcessing ? (
                  <ImageIcon className="w-5 h-5 animate-pulse" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-800">
                {isProcessing
                  ? (lang === 'ta' ? 'படம் தயாராகிறது...' : 'Processing image...')
                  : (lang === 'ta' ? 'புதிய லோகோ படத்தை பதிவேற்ற கிளிக் செய்யவும்' : 'Click or drop a logo image to upload')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {lang === 'ta'
                  ? 'PNG, JPG, WebP அல்லது SVG (தானாக 256×256 அளவிற்கு ஒழுங்கமைக்கப்படும்)'
                  : 'PNG, JPG, WebP, or SVG (auto-optimized to 256×256)'}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {lang === 'ta'
              ? 'இந்த லோகோ தலைப்புப் பட்டை, பக்கவாட்டு மெனு, நேரலை டிவி காட்சி, தர்மல் ரசீது மற்றும் அச்சு அறிக்கைகளில் உடனடியாகப் புதுப்பிக்கப்படும்.'
              : 'This logo immediately updates across the header, sidebar, live counter display, thermal receipts, and printable reports for this secretariat.'}
          </p>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={!previewUrl && !getDsLogo(targetId)}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'இயல்புநிலைக்கு மீட்டமை' : 'Reset Default'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {lang === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === 'ta' ? 'லோகோவை சேமிக்கவும்' : 'Save Logo'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
