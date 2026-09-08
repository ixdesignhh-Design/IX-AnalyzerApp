import React from 'react';
import { Disc, ChevronRight } from 'lucide-react';
import { ActiveToolId, ToolCategory } from '../types';
import { ALL_TOOLS, CATEGORIES } from '../utils/toolsRegistry';
import { triggerHaptic } from '../utils/sensors';

interface SectionNavProps {
  activeTool: ActiveToolId;
  onSelectTool: (tool: ActiveToolId) => void;
  onOpenRadialHub: () => void;
}

export const SectionNav: React.FC<SectionNavProps> = ({
  activeTool,
  onSelectTool,
  onOpenRadialHub,
}) => {
  const currentToolDef = ALL_TOOLS.find((t) => t.id === activeTool);

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 backdrop-blur-md sticky top-[61px] z-20 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {/* Radial Star Hub Switcher Button */}
          <button
            onClick={() => {
              triggerHaptic(25);
              onOpenRadialHub();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shadow-md shrink-0 ${
              activeTool === 'radial_hub'
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/80 shadow-amber-500/30'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold'
            }`}
            title="Otwórz kołowy / gwiazdowy interfejs wyboru"
          >
            <Disc className="w-4 h-4 animate-[spin_10s_linear_infinite]" />
            <span>KOŁO GWIAZDA</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800 shrink-0" />

          {/* Quick Tool Chips / Active Category */}
          {ALL_TOOLS.map((tool) => {
            const isActive = tool.id === activeTool;
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  triggerHaptic(20);
                  onSelectTool(tool.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                    : 'bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tool.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
