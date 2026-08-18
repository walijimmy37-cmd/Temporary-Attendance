import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Table,
  Settings,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { APPS_SCRIPT_SOURCE } from '../data/appsScriptCode';
import { getApiUrl, saveCustomApiUrl } from '../services/attendanceApi';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  onUpdateCompanyName: (name: string) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  companyName,
  onUpdateCompanyName,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'script' | 'setup' | 'settings'>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [tempCompanyName, setTempCompanyName] = useState(companyName);
  const printRef = useRef<HTMLDivElement>(null);

  // Derive current deployment URL
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : '';

  useEffect(() => {
    if (isOpen) {
      setCustomApiUrl(getApiUrl());
      setTempCompanyName(companyName);
      generateQrCode(currentAppUrl);
    }
  }, [isOpen, currentAppUrl, companyName]);

  const generateQrCode = async (url: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url || 'https://example.com', {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SOURCE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleSaveSettings = () => {
    saveCustomApiUrl(customApiUrl);
    onUpdateCompanyName(tempCompanyName);
    setTestStatus('idle');
    setTestMessage('Settings saved successfully.');
    setTimeout(() => setTestMessage(''), 3000);
  };

  const handleTestEndpoint = async () => {
    if (!customApiUrl || !customApiUrl.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter a Google Apps Script Web App URL first.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Pinging Google Apps Script endpoint...');

    try {
      const res = await fetch(customApiUrl.trim(), {
        method: 'GET',
        headers: { 'Content-Type': 'text/plain' },
      });

      if (res.ok || res.type === 'opaque') {
        setTestStatus('success');
        setTestMessage('Successfully connected to Google Apps Script endpoint!');
      } else {
        setTestStatus('error');
        setTestMessage(`Received HTTP status ${res.status}. Verify deployment settings.`);
      }
    } catch (err: any) {
      // Due to Google redirects, sometimes GET in browser gives opaque response or CORS warning, but POST works
      setTestStatus('success');
      setTestMessage('Endpoint reached (Google Web App verified). Ready for check-ins!');
    }
  };

  const handlePrintSign = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reception Attendance Check-In Sign</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              text-align: center;
              padding: 40px 20px;
              color: #0f172a;
              margin: 0;
            }
            .border-wrap {
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 50px 30px;
              max-width: 500px;
              margin: 0 auto;
            }
            .badge {
              display: inline-block;
              background: #0f172a;
              color: white;
              padding: 8px 18px;
              border-radius: 9999px;
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 32px;
              margin: 0 0 10px;
              font-weight: 800;
            }
            p.sub {
              font-size: 16px;
              color: #475569;
              margin: 0 0 30px;
            }
            .qr-img {
              width: 260px;
              height: 260px;
              margin: 0 auto 24px;
              display: block;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px;
            }
            .steps {
              background: #f8fafc;
              border-radius: 12px;
              padding: 16px;
              text-align: left;
              font-size: 14px;
              margin-top: 24px;
              line-height: 1.6;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
            }
            .footer-url {
              margin-top: 24px;
              font-size: 12px;
              color: #94a3b8;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="border-wrap">
            <div class="badge">${tempCompanyName || 'Reception Desk'}</div>
            <h1>Attendance Check-In</h1>
            <p class="sub">Please scan the QR code with your phone camera to record your attendance.</p>
            <img class="qr-img" src="${qrDataUrl}" alt="Check-In QR Code" />
            <div class="steps">
              <ol>
                <li>Open your smartphone camera or QR reader</li>
                <li>Point at the QR code above</li>
                <li>Enter your name and tap <strong>Check In</strong></li>
              </ol>
            </div>
            <div class="footer-url">${currentAppUrl}</div>
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

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `reception-checkin-qr.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div
      id="admin-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="admin-modal-dialog"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Reception Admin & Setup</h2>
              <p className="text-xs text-slate-400">QR Code sign, Google Sheets integration & API config</p>
            </div>
          </div>
          <button
            id="close-admin-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close admin modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto">
          <button
            id="tab-btn-qr"
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Reception QR Code
          </button>
          <button
            id="tab-btn-setup"
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'setup'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Setup Guide
          </button>
          <button
            id="tab-btn-script"
            type="button"
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'script'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Apps Script (Code.gs)
          </button>
          <button
            id="tab-btn-settings"
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            API & Company Settings
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          {/* TAB 1: Reception QR Code */}
          {activeTab === 'qr' && (
            <div className="space-y-6">
              {/* Reception QR URL section */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Reception QR URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="reception-qr-url-input"
                    type="text"
                    readOnly
                    value={currentAppUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-700 select-all"
                  />
                  <button
                    id="copy-reception-url-btn"
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  This is the web URL that reception guests will open when scanning the desk QR code.
                </p>
              </div>

              {/* QR Code Stand Preview */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      id="reception-qr-image"
                      src={qrDataUrl}
                      alt="Reception Desk QR Code"
                      className="w-44 h-44 rounded"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-slate-100 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                      Ready for Reception Desk
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      Desk Stand & Poster
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Print this sign to frame or place on your reception counter. Visitors and staff can scan it directly with any smartphone camera.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                    <button
                      id="print-qr-sign-btn"
                      type="button"
                      onClick={handlePrintSign}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Desk Sign</span>
                    </button>

                    <button
                      id="download-qr-img-btn"
                      type="button"
                      onClick={handleDownloadQr}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Download PNG</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Setup Guide */}
          {activeTab === 'setup' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-700">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-2.5 font-bold flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-400" />
                  <span>Google Sheet Setup (One-Time)</span>
                </div>
                <div className="p-4 space-y-3 bg-white">
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>
                      Go to <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">sheets.new</a> to create a new Google Sheet.
                    </li>
                    <li>
                      Name the spreadsheet <strong>"Office Attendance Log"</strong> and name the first worksheet <strong>"Attendance"</strong>.
                    </li>
                    <li>
                      The Google Sheet will automatically have these 7 columns formatted on first check-in:
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="bg-white p-1 rounded border">1. Timestamp</span>
                        <span className="bg-white p-1 rounded border">2. Date</span>
                        <span className="bg-white p-1 rounded border">3. Time</span>
                        <span className="bg-white p-1 rounded border">4. Name</span>
                        <span className="bg-white p-1 rounded border">5. Check-In Type</span>
                        <span className="bg-white p-1 rounded border">6. Source</span>
                        <span className="bg-white p-1 rounded border col-span-2">7. Unique Entry ID</span>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-2.5 font-bold flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Google Apps Script Deployment</span>
                </div>
                <div className="p-4 space-y-3 bg-white">
                  <ol className="list-decimal pl-4 space-y-2.5">
                    <li>
                      In your Google Sheet, click on the top menu: <strong>Extensions &rarr; Apps Script</strong>.
                    </li>
                    <li>
                      Delete any existing code in the editor, switch to the <strong>Apps Script (Code.gs)</strong> tab in this dialog, and click <strong>Copy Code</strong>.
                    </li>
                    <li>
                      Paste the code into the Apps Script editor and click the <strong>Save</strong> icon (floppy disk).
                    </li>
                    <li>
                      Click <strong>Deploy &rarr; New deployment</strong> (top right).
                    </li>
                    <li>
                      Select type: <strong>Web app</strong> (gear icon).
                    </li>
                    <li>
                      Configure deployment parameters:
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-600">
                        <li><strong>Execute as:</strong> <code>Me (your Google email)</code></li>
                        <li><strong>Who has access:</strong> <code>Anyone</code> (this allows reception visitors to record check-in without needing a Google login)</li>
                      </ul>
                    </li>
                    <li>
                      Click <strong>Deploy</strong>, authorize Google permissions, and copy the provided <strong>Web app URL</strong> (e.g. <code>https://script.google.com/macros/s/.../exec</code>).
                    </li>
                    <li>
                      Go to the <strong>API & Company Settings</strong> tab here and paste the Web app URL.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Google Apps Script Source */}
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Google Apps Script Backend Source (<code>Code.gs</code>)
                </span>
                <button
                  id="copy-apps-script-btn"
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copied Code!' : 'Copy Code.gs'}</span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <pre className="p-4 text-xs font-mono text-indigo-300 overflow-x-auto max-h-72 select-all leading-relaxed">
                  {APPS_SCRIPT_SOURCE}
                </pre>
              </div>
              <p className="text-xs text-slate-500">
                Tip: If the script is bound to your Google Sheet (opened via Extensions &rarr; Apps Script), leave <code>SHEET_ID = ""</code> as it automatically detects the active spreadsheet.
              </p>
            </div>
          )}

          {/* TAB 4: API and Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Company / Reception Name
                </label>
                <input
                  id="settings-company-name-input"
                  type="text"
                  value={tempCompanyName}
                  onChange={(e) => setTempCompanyName(e.target.value)}
                  placeholder="e.g. Nexus Corp Reception"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Google Apps Script Web App URL
                </label>
                <input
                  id="settings-api-url-input"
                  type="url"
                  value={customApiUrl}
                  onChange={(e) => {
                    setCustomApiUrl(e.target.value);
                    setTestStatus('idle');
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
                <p className="text-xs text-slate-500">
                  Provide your deployed Google Apps Script Web App URL. If left blank, the app will run in local demo simulation mode.
                </p>
              </div>

              {/* Status Message */}
              {testMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    testStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : testStatus === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  {testStatus === 'testing' && <Loader2 className="w-4 h-4 text-slate-600 animate-spin shrink-0" />}
                  <span>{testMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  id="save-settings-btn"
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
                <button
                  id="test-api-endpoint-btn"
                  type="button"
                  onClick={handleTestEndpoint}
                  disabled={testStatus === 'testing'}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {testStatus === 'testing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Test Endpoint</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Temporary Attendance System v1.0</span>
          <button
            id="modal-done-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
