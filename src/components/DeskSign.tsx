import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Download } from 'lucide-react';
import { PRODUCTION_FRONTEND_URL, COMPANY_NAME } from '../config';

interface DeskSignProps {
  isOpen: boolean;
  onClose: () => void;
  frontendUrl?: string;
}

export const DeskSign: React.FC<DeskSignProps> = ({
  isOpen,
  onClose,
  frontendUrl = PRODUCTION_FRONTEND_URL
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const targetUrl = frontendUrl || (typeof window !== 'undefined' ? window.location.origin : PRODUCTION_FRONTEND_URL);

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(targetUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then(setQrDataUrl)
        .catch((err) => console.error('Error generating QR:', err));
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
          <title>Coventra Attendance - Desk Sign</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              color: #0f172a;
              background-color: #ffffff;
              text-align: center;
            }
            .sign-card {
              border: 3px solid #0f172a;
              border-radius: 28px;
              padding: 60px 40px;
              max-width: 440px;
              width: 100%;
              margin: 0 auto;
            }
            .brand {
              font-size: 32px;
              font-weight: 900;
              letter-spacing: 4px;
              text-transform: uppercase;
              color: #0f172a;
            }
            .subtitle {
              font-size: 18px;
              font-weight: 500;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #475569;
              margin-top: 6px;
              margin-bottom: 36px;
            }
            .qr-frame {
              background: #ffffff;
              padding: 16px;
              border-radius: 20px;
              display: inline-block;
              box-shadow: 0 4px 20px rgba(0,0,0,0.06);
              border: 1px solid #e2e8f0;
              margin-bottom: 32px;
            }
            .qr-image {
              width: 260px;
              height: 260px;
              display: block;
            }
            .scan-badge {
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .instruction {
              font-size: 13px;
              color: #64748b;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="sign-card">
            <div class="brand">COVENTRA</div>
            <div class="subtitle">Attendance</div>
            <div class="qr-frame">
              <img src="${qrDataUrl}" alt="Scan to Check In" class="qr-image" />
            </div>
            <div class="scan-badge">Scan to Check In</div>
            <div class="instruction">Point your camera to record your attendance</div>
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
    a.download = 'coventra-attendance-qr.png';
    a.click();
  };

  return (
    <div
      id="desk-sign-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
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
          <h2 className="text-2xl font-black tracking-widest text-slate-900 uppercase">
            {COMPANY_NAME}
          </h2>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
            Attendance
          </p>

          {/* QR Code Container */}
          <div className="my-6 p-4 bg-white rounded-2xl border-2 border-slate-900 inline-block shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Coventra Attendance QR Code"
                className="w-48 h-48 block mx-auto"
              />
            ) : (
              <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
          </div>

          <p className="text-base font-bold text-slate-900">
            Scan to Check In
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Point your phone camera to record attendance
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
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
            title="Download QR Image"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
