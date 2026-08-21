import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Download, QrCode as QrIcon, Building2, CheckCircle2 } from 'lucide-react';
import { PRODUCTION_FRONTEND_URL } from '../config';

interface DeskSignProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeskSign: React.FC<DeskSignProps> = ({
  isOpen,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // The QR code ALWAYS encodes the production Vercel URL directly with no intermediate redirects
  const targetUrl = PRODUCTION_FRONTEND_URL;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(targetUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0a0f1d',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then(setQrDataUrl)
        .catch((err) => console.error('Error generating static QR:', err));
    }
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Coventra Global - Reception Desk Sign</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              color: #090d16;
              background-color: #ffffff;
              text-align: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sign-card {
              border: 3.5px solid #090d16;
              border-radius: 32px;
              padding: 56px 44px;
              max-width: 460px;
              width: 100%;
              margin: 0 auto;
              background: #ffffff;
            }
            .logo-icon {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 52px;
              height: 52px;
              border-radius: 14px;
              background: #090d16;
              color: #ffffff;
              margin-bottom: 16px;
            }
            .logo-icon svg {
              width: 28px;
              height: 28px;
              stroke: #ffffff;
              fill: none;
              stroke-width: 2.2;
            }
            .brand {
              font-size: 28px;
              font-weight: 900;
              letter-spacing: 3.5px;
              text-transform: uppercase;
              color: #090d16;
            }
            .subtitle {
              font-size: 16px;
              font-weight: 600;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #475569;
              margin-top: 4px;
              margin-bottom: 32px;
            }
            .qr-frame {
              background: #ffffff;
              padding: 16px;
              border-radius: 20px;
              display: inline-block;
              border: 2px solid #090d16;
              margin-bottom: 28px;
            }
            .qr-image {
              width: 260px;
              height: 260px;
              display: block;
            }
            .scan-badge {
              font-size: 22px;
              font-weight: 800;
              letter-spacing: 0.5px;
              color: #090d16;
              margin-bottom: 8px;
            }
            .steps {
              font-size: 14px;
              font-weight: 600;
              color: #475569;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="sign-card">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
            </div>
            <div class="brand">COVENTRA GLOBAL</div>
            <div class="subtitle">Coventra Attendance</div>
            <div class="qr-frame">
              <img src="${qrDataUrl}" alt="Static Coventra Attendance QR Code" class="qr-image" />
            </div>
            <div class="scan-badge">Scan to Check In</div>
            <div class="steps">Scan → Enter your name → Check In</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'coventra-attendance-static-qr.png';
    a.click();
  };

  return (
    <div
      id="desk-sign-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="desk-sign-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 relative animate-fadeIn"
      >
        <button
          id="close-desk-sign-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desk Sign Content */}
        <div className="pt-2 pb-4">
          {/* Logo Badge */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-sm mb-3">
            <Building2 className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-black tracking-widest text-slate-900 uppercase">
            COVENTRA GLOBAL
          </h2>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
            Coventra Attendance
          </p>

          {/* QR Code Container */}
          <div className="my-5 p-3.5 bg-white rounded-2xl border-2 border-slate-900 inline-block shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Coventra Attendance Static QR Code"
                className="w-48 h-48 block mx-auto"
              />
            ) : (
              <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400 text-xs">
                Generating Static QR...
              </div>
            )}
          </div>

          <p className="text-lg font-bold text-slate-900">
            Scan to Check In
          </p>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Scan → Enter your name → Check In
          </p>

          {/* Static QR Status Indicator */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200/80">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Static non-expiring QR code</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <button
            id="print-desk-sign-btn"
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Desk Sign</span>
          </button>
          <button
            id="download-qr-btn"
            type="button"
            onClick={handleDownload}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Download QR Image (PNG)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

