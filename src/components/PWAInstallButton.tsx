import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../translations/i18n';

interface PWAInstallButtonProps {
  lang?: Language;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'ta',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-xs transition-colors cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
        }`}
        title={lang === 'ta' ? 'தொலைபேசியில் ஆப் ஆக நிறுவு (Install App)' : 'Install as Mobile App'}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{lang === 'ta' ? 'ஆப் நிறுவு (Install)' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold transition-colors cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-1.5 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'ta' ? 'iPhone-இல் நிறுவு' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'ta' ? 'iPhone / iPad-இல் ஆப் ஆக நிறுவுக' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {lang === 'ta' ? (
                  <>
                    1. Safari கீழ் பட்டியில் உள்ள <strong>Share</strong> (பகிர்) பொத்தானை அழுத்தவும்.
                    <br />
                    2. கீழே உருட்டி <strong>Add to Home Screen</strong> என்பதைத் தெரிவுசெய்து <strong>Add</strong> அழுத்தவும்.
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> button in the Safari toolbar.
                    <br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-emerald-800 hover:bg-emerald-900 py-2.5 text-xs font-bold text-white"
              >
                {lang === 'ta' ? 'மூடு (Close)' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
