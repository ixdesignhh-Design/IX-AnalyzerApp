import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Zap,
  Layers,
  ArrowRight,
  Sparkles,
  Grid,
  Disc,
  Search,
  Check,
} from 'lucide-react';
import { ActiveToolId, ToolCategory } from '../types';
import { ALL_TOOLS, RegisteredTool, CATEGORIES } from '../utils/toolsRegistry';
import { triggerHaptic } from '../utils/sensors';

interface RadialStarHubProps {
  activeTool: ActiveToolId;
  onSelectTool: (toolId: ActiveToolId) => void;
}

export const RadialStarHub: React.FC<RadialStarHubProps> = ({
  activeTool,
  onSelectTool,
}) => {
  const [selectedToolId, setSelectedToolId] = useState<ActiveToolId>(
    activeTool === 'radial_hub' ? 'flashlight' : activeTool
  );
  const [viewMode, setViewMode] = useState<'wheel' | 'grid'>('wheel');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ToolCategory | 'all'>('all');

  const selectedTool: RegisteredTool =
    ALL_TOOLS.find((t) => t.id === selectedToolId) || ALL_TOOLS[0];

  const filteredTools = ALL_TOOLS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || t.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const handleToolClick = (tool: RegisteredTool) => {
    setSelectedToolId(tool.id);
    triggerHaptic(20);
  };

  const handleLaunchTool = (toolId: ActiveToolId) => {
    triggerHaptic(35);
    onSelectTool(toolId);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Controls Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2.5">
            <Disc className="w-6 h-6 text-amber-400 animate-[spin_12s_linear_infinite]" />
            Kołowy Hub Modułów & Gwiazda Sensoryczna
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Wybierz narzędzie ze schematu radialnego 360° lub przełącz na widok siatki. Zestaw 26 narzędzi.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Szukaj narzędzia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* View toggle */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => {
                setViewMode('wheel');
                triggerHaptic(15);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'wheel' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Widok Kołowy / Gwiazdowy"
            >
              <Disc className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setViewMode('grid');
                triggerHaptic(15);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Widok Siatki Bento"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          Wszystkie Moduły ({ALL_TOOLS.length})
        </button>
        {CATEGORIES.map((c) => {
          const isSelected = filterCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* WHEEL / STAR VIEW */}
      {viewMode === 'wheel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* The Circular / Star Orbit Arena */}
          <div className="lg:col-span-8 flex justify-center py-4">
            <div className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[500px] md:h-[500px] flex items-center justify-center select-none">
              {/* Star Background Rings */}
              <div className="absolute inset-0 rounded-full border border-slate-800/80 pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-dashed border-slate-800/60 pointer-events-none" />
              <div className="absolute inset-20 rounded-full border border-slate-800/40 pointer-events-none" />

              {/* Crosshair Star Axes */}
              <div className="absolute w-full h-[1px] bg-slate-800/60 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-slate-800/60 pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-slate-800/40 rotate-45 pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-slate-800/40 -rotate-45 pointer-events-none" />

              {/* Center Core HUD */}
              <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-slate-950/95 border-2 border-amber-500/40 shadow-2xl p-4 flex flex-col items-center justify-center text-center backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
                  <selectedTool.icon className="w-5 h-5" />
                </div>
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  {selectedTool.categoryName}
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-100 line-clamp-1 mt-0.5">
                  {selectedTool.shortName}
                </h3>
                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight px-1">
                  {selectedTool.description}
                </p>

                <button
                  onClick={() => handleLaunchTool(selectedTool.id)}
                  className="mt-2.5 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <span>URUCHOM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Radial Orbital Satellite Nodes */}
              {ALL_TOOLS.map((tool, index) => {
                const total = ALL_TOOLS.length;
                const angle = (index * (360 / total) - 90) * (Math.PI / 180);
                // Radius in pixels depending on screen size
                const radius = window.innerWidth < 640 ? 140 : 200;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                const isSelected = tool.id === selectedToolId;
                const Icon = tool.icon;

                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool)}
                    onDoubleClick={() => handleLaunchTool(tool.id)}
                    className={`absolute w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 z-20 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 scale-125 ring-4 ring-amber-400/40 shadow-xl shadow-amber-500/50'
                        : 'bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:scale-110 hover:border-amber-400 hover:text-white shadow-md'
                    }`}
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                    }}
                    title={`${tool.name} (kliknij aby wybrać, 2x klik aby uruchomić)`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick List / Tool Details Card */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                AKTYWNY MODUŁ
              </span>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {selectedTool.categoryName}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-100">{selectedTool.name}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedTool.description}</p>
            </div>

            <button
              onClick={() => handleLaunchTool(selectedTool.id)}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer text-sm"
            >
              <span>OTWÓRZ {selectedTool.shortName.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick module selector list */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase">
                Szybka lista ({filteredTools.length})
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredTools.map((t) => {
                  const isCur = t.id === selectedToolId;
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedToolId(t.id);
                        triggerHaptic(15);
                      }}
                      onDoubleClick={() => handleLaunchTool(t.id)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isCur
                          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-slate-950/70 border border-slate-800/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchTool(t.id);
                        }}
                        className="text-[10px] text-amber-400 hover:underline shrink-0 ml-2"
                      >
                        Otwórz
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = tool.id === selectedToolId;
            return (
              <div
                key={tool.id}
                onClick={() => handleLaunchTool(tool.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${tool.accentColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">
                      {tool.categoryName}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                    {tool.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tool.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-amber-400">
                  <span>Uruchom</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
