import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Share2, Trash2, Calendar, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { LogSession } from '../types';
import { getSavedLogSessions, deleteLogSession, downloadFile, shareFileOrText, saveLogSession } from '../utils/export';
import { triggerHaptic } from '../utils/sensors';

interface LogsManagerProps {
  onLogsChanged: () => void;
}

export const LogsManager: React.FC<LogsManagerProps> = ({ onLogsChanged }) => {
  const [sessions, setSessions] = useState<LogSession[]>([]);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const list = getSavedLogSessions();
    setSessions(list);
  };

  const handleDelete = (id: string) => {
    triggerHaptic(20);
    const updated = deleteLogSession(id);
    setSessions(updated);
    onLogsChanged();
  };

  const handleDownloadCsv = (session: LogSession) => {
    if (!session.csvData) return;
    downloadFile(session.csvData, `${session.id}.csv`, 'text/csv');
    triggerHaptic(20);
  };

  const handleDownloadJson = (session: LogSession) => {
    const jsonStr = JSON.stringify(session, null, 2);
    downloadFile(jsonStr, `${session.id}.json`, 'application/json');
    triggerHaptic(20);
  };

  const handleShare = async (session: LogSession) => {
    triggerHaptic(30);
    const filename = `${session.id}.csv`;
    const res = await shareFileOrText(
      session.title,
      `Pomiary z aplikacji Workshop MultiTool: ${session.summary}`,
      session.csvData,
      filename,
      'text/csv'
    );

    if (res.shared) {
      setShareNotice('Pomyślnie wysłano przez panel udostępniania!');
    } else if (res.method === 'download') {
      setShareNotice('Pobrano plik CSV (udostępnianie niedostępne w tej przeglądarce).');
    }
    setTimeout(() => setShareNotice(null), 3500);
  };

  const createSampleLog = () => {
    const now = Date.now();
    let sampleCsv = '# time,accel_x,accel_y,accel_z\n';
    for (let i = 0; i < 200; i++) {
      const t = (i * 0.01).toFixed(6);
      const val = (Math.sin(2 * Math.PI * 48.5 * (i * 0.01)) * 4.5).toFixed(6);
      sampleCsv += `${t},${val},0.020000,9.810000\n`;
    }

    const sampleSession: LogSession = {
      id: `resonances_x_sample_${now}`,
      title: 'Przykładowy test Input Shaper Oś X (48.5 Hz)',
      type: 'input_shaper',
      createdAt: now,
      summary: 'Wykryty rezonans: 48.5 Hz, Rekomendowany filtr: MZV @ 4122 mm/s²',
      csvData: sampleCsv,
      sampleCount: 200,
    };

    saveLogSession(sampleSession);
    loadSessions();
    onLogsChanged();
    triggerHaptic([20, 20]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            Menedżer Zapisanych Logów & Eksport
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Eksportuj pliki CSV zgodne z Klipper `calibrate_shaper.py` oraz wysyłaj logi przez WhatsApp, Dysk Google lub Email.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length === 0 && (
            <button
              onClick={createSampleLog}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-3 py-2 rounded-lg cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dodaj przykładowy log</span>
            </button>
          )}
        </div>
      </div>

      {shareNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareNotice}</span>
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-700" />
            <div className="text-slate-400 font-medium text-sm">Brak zapisanych logów pomiarów</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Wykonaj pomiar w narzędziu <strong>Input Shaper</strong> lub <strong>Sejsmograf</strong> i kliknij "Zapisz w Logach".
            </p>
            <button
              onClick={createSampleLog}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-lg cursor-pointer"
            >
              Wygeneruj przykładowy plik rezonansu
            </button>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {session.type}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">{session.title}</h3>
                </div>
                <div className="text-xs text-slate-400">{session.summary}</div>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(session.createdAt).toLocaleString()}
                  </span>
                  <span>Próbki: {session.sampleCount}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => handleShare(session)}
                  className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  title="Udostępnij plik przez WhatsApp, Gmail, Dysk itp."
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Wyślij / Share</span>
                </button>

                <button
                  onClick={() => handleDownloadCsv(session)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  title="Pobierz CSV"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => handleDownloadJson(session)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                  title="Pobierz JSON"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={() => handleDelete(session.id)}
                  className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 rounded-lg transition-colors cursor-pointer"
                  title="Usuń log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
