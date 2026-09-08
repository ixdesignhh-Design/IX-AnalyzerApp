import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Camera,
  EyeOff,
  Copy,
  ExternalLink,
  Flashlight,
  Trash2,
  Check,
  History,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const QrBarcodeScannerTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [scannedFormat, setScannedFormat] = useState<string>('QR Code');
  const [history, setHistory] = useState<{ text: string; format: string; time: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsActive(true);
      startScanning();
    } catch (e) {
      alert('Brak dostępu do kamery.');
    }
  };

  const stopCamera = () => {
    clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: next }] });
        setTorchOn(next);
      } catch {}
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const startScanning = () => {
    clearInterval(scanIntervalRef.current);
    const BarcodeDetectorClass = (window as any).BarcodeDetector;

    if (BarcodeDetectorClass) {
      const detector = new BarcodeDetectorClass({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'data_matrix'],
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const val = barcodes[0].rawValue;
            const fmt = barcodes[0].format || 'QR/Barcode';
            handleDetected(val, fmt);
          }
        } catch {}
      }, 250);
    }
  };

  const handleDetected = (text: string, format: string) => {
    if (text === scannedResult) return;
    triggerHaptic(50);
    playBeep();
    setScannedResult(text);
    setScannedFormat(format);
    setHistory((prev) => [
      { text, format, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleCopy = () => {
    if (!scannedResult) return;
    navigator.clipboard.writeText(scannedResult);
    setCopied(true);
    triggerHaptic(20);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrl = scannedResult?.startsWith('http://') || scannedResult?.startsWith('https://');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            Skaner Kodów Kreskowych 1D & Kodów QR 2D
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Błyskawiczne odczytywanie kodów EAN-13, UPC, Code 128 (narzędzia, filamenty, etykiety) oraz kodów QR z podglądem i historią.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                torchOn
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Doświetlenie LED"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          {!isActive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Uruchom Skaner</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Zatrzymaj Kamerę</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative aspect-[4/3] flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
          />

          {!isActive && (
            <div className="text-center p-6 text-slate-500 space-y-3">
              <QrCode className="w-16 h-16 mx-auto text-slate-600" />
              <div className="text-sm font-medium text-slate-300">Kamera skanera jest wyłączona</div>
              <p className="text-xs text-slate-500 max-w-xs">
                Kliknij „Uruchom Skaner”, aby nakierować aparat na kod kreskowy lub kod QR.
              </p>
            </div>
          )}

          {/* Scanner Reticle Overlay */}
          {isActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-64 border-2 border-emerald-400/80 rounded-2xl relative shadow-2xl">
                {/* Laser scanline animation */}
                <div className="absolute inset-x-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#34d399] animate-[bounce_2s_infinite]" />
                <div className="absolute top-2 left-2 text-[10px] uppercase font-bold text-emerald-300 bg-slate-950/70 px-2 py-0.5 rounded">
                  Nakieruj na kod
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scanned Result Details & History */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>OSTATNI ODCZYT</span>
              {scannedResult && (
                <span className="text-[10px] uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                  {scannedFormat}
                </span>
              )}
            </div>

            {scannedResult ? (
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-sm break-all text-amber-300 max-h-32 overflow-y-auto">
                  {scannedResult}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 rounded-lg border border-slate-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Skopiowano' : 'Kopiuj'}</span>
                  </button>

                  {isUrl && (
                    <a
                      href={scannedResult}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-lg cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Otwórz Link</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Brak odczytanego kodu. Skieruj obiektyw na etykietę.
              </div>
            )}
          </div>

          {/* History */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Historia ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-[11px] text-slate-500 hover:text-red-400 cursor-pointer"
                >
                  Wyczyść
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setScannedResult(item.text);
                    setScannedFormat(item.format);
                  }}
                  className="bg-slate-950 p-2 rounded border border-slate-800 text-xs hover:border-slate-700 cursor-pointer flex justify-between items-center"
                >
                  <span className="font-mono text-slate-300 truncate max-w-[180px]">{item.text}</span>
                  <span className="text-[10px] text-slate-500">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
