import React, { useState } from 'react';
import { Disc, X, Search, ArrowRight } from 'lucide-react';
import { ActiveToolId } from '../types';
import { ALL_TOOLS, RegisteredTool } from '../utils/toolsRegistry';
import { triggerHaptic } from '../utils/sensors';

interface RadialQuickDialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (toolId: ActiveToolId) => void;
  currentTool: ActiveToolId;
}

export const RadialQuickDialModal: React.FC<RadialQuickDialModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  currentTool,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<ActiveToolId>(currentTool);

  if (!isOpen) return null;

  const filtered = ALL_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTool: RegisteredTool =
    ALL_TOOLS.find((t) => t.id === selectedId) || ALL_TOOLS[0];

  const handlePick = (id: ActiveToolId) => {
    triggerHaptic(25);
    onSelectTool(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-amber-400 animate-spin" />
            <span className="font-bold text-slate-100 text-sm">Szybkie Koło Wyboru (26 Narzędzi)</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800 bg-slate-950">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filtruj moduły..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              autoFocus
            />
          </div>
        </div>

        {/* Tools Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filtered.map((tool) => {
            const Icon = tool.icon;
            const isCur = tool.id === currentTool;
            return (
              <button
                key={tool.id}
                onClick={() => handlePick(tool.id)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                  isCur
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:bg-slate-800'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCur ? 'bg-slate-950 text-amber-400' : 'bg-slate-900 text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold truncate">{tool.shortName}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isCur ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {tool.categoryName}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
          <span>Łącznie modułów: {ALL_TOOLS.length}</span>
          <button
            onClick={() => handlePick('radial_hub')}
            className="text-amber-400 hover:underline font-semibold cursor-pointer"
          >
            Otwórz pełną Gwiazdę 360°
          </button>
        </div>
      </div>
    </div>
  );
};
