import React, { useState } from 'react';
import {
  Wrench,
  Compass,
  Radio,
  Eye,
  Cpu,
  Search,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { ActiveToolId } from '../types';
import { ALL_TOOLS, RegisteredTool } from '../utils/toolsRegistry';
import { triggerHaptic } from '../utils/sensors';

export type WorkspaceCategory =
  | 'workshop'
  | 'sensors'
  | 'signals'
  | 'optics'
  | 'system';

interface WorkspaceGroup {
  id: WorkspaceCategory;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  toolIds: ActiveToolId[];
}

export const WORKSPACES: WorkspaceGroup[] = [
  {
    id: 'workshop',
    title: 'Druk 3D & Warsztat',
    badge: '3D & Machining',
    icon: Wrench,
    toolIds: [
      'input_shaper',
      'belt_tuner',
      'klipper_dashboard',
      'bubble_level',
      'protractor',
      'ruler',
      'ar_measure',
    ],
  },
  {
    id: 'sensors',
    title: 'Sensory & Nawigacja',
    badge: 'Environment & GPS',
    icon: Compass,
    toolIds: [
      'compass',
      'altimeter',
      'barometer',
      'speedometer',
      'gps_finder',
      'thermometer_hygrometer',
    ],
  },
  {
    id: 'signals',
    title: 'Sygnały & Detekcja',
    badge: 'EMF & Acoustics',
    icon: Radio,
    toolIds: [
      'seismograph',
      'metal_detector',
      'emf_meter',
      'sound_meter',
      'frequency_generator',
      'strobe_light',
    ],
  },
  {
    id: 'optics',
    title: 'Optyka & Światło',
    badge: 'Camera & Lighting',
    icon: Eye,
    toolIds: [
      'flashlight',
      'magnifier',
      'qr_barcode_scanner',
      'mirror',
      'morse_code',
    ],
  },
  {
    id: 'system',
    title: 'Narzędzia & System',
    badge: 'Utilities & Diagnostics',
    icon: Cpu,
    toolIds: [
      'stopwatch_timer',
      'unit_converter',
      'metronome_tuner',
      'screen_tester',
      'device_info',
      'logs_manager',
    ],
  },
];

interface SectionNavProps {
  activeTool: ActiveToolId;
  onSelectTool: (tool: ActiveToolId) => void;
}

export const SectionNav: React.FC<SectionNavProps> = ({
  activeTool,
  onSelectTool,
}) => {
  // Find which workspace contains the active tool
  const currentWorkspace =
    WORKSPACES.find((w) => w.toolIds.includes(activeTool)) || WORKSPACES[0];

  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceCategory>(
    currentWorkspace.id
  );
  const [searchQuery, setSearchQuery] = useState('');

  const activeGroup =
    WORKSPACES.find((w) => w.id === selectedWorkspace) || WORKSPACES[0];

  const toolsInGroup = ALL_TOOLS.filter((t) =>
    activeGroup.toolIds.includes(t.id)
  );

  const searchedTools = searchQuery.trim()
    ? ALL_TOOLS.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.shortName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleWorkspaceChange = (ws: WorkspaceCategory) => {
    setSelectedWorkspace(ws);
    triggerHaptic(15);
  };

  const handleToolClick = (toolId: ActiveToolId) => {
    triggerHaptic(20);
    onSelectTool(toolId);
    // synchronize active workspace
    const ws = WORKSPACES.find((w) => w.toolIds.includes(toolId));
    if (ws) {
      setSelectedWorkspace(ws.id);
    }
  };

  return (
    <nav className="retro-bezel border-b border-[#b8b2a5] px-3 sm:px-4 py-2 sticky top-[68px] sm:top-[65px] z-20 shadow-sm retro-pinstripe">
      <div className="max-w-7xl mx-auto space-y-2">
        {/* Top: 5 Primary OS X Workspace Tabs + Spotlight Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          {/* Segmented Control Buttons */}
          <div className="flex bg-[#cbc4b7] p-1 rounded-xl border border-[#a8a295] shadow-inner overflow-x-auto scrollbar-none no-scrollbar">
            {WORKSPACES.map((ws) => {
              const Icon = ws.icon;
              const isSelected = selectedWorkspace === ws.id;
              const hasActiveTool = ws.toolIds.includes(activeTool);

              return (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceChange(ws.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'aqua-button-primary shadow-sm scale-[1.02]'
                      : 'text-[#44403c] hover:text-[#1c1917] hover:bg-[#ded9ce]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#57534e]'}`} />
                  <span>{ws.title}</span>
                  {hasActiveTool && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* OS X Spotlight Search Input */}
          <div className="relative md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#78716c]" />
            <input
              type="text"
              placeholder="Spotlight Szukaj (np. poziomica, EMF, Klipper)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f2eee8] border border-[#a8a295] rounded-xl pl-8 pr-3 py-1 text-xs text-[#1c1917] placeholder-[#78716c] focus:outline-none focus:border-[#0284c7] shadow-inner font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-[#78716c] hover:text-[#1c1917]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Bottom: OS X Shelf / Sub-Tool Dock */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none no-scrollbar">
          {(searchedTools || toolsInGroup).map((tool) => {
            const isActive = tool.id === activeTool;
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-sm shrink-0 border ${
                  isActive
                    ? 'bg-[#0284c7] text-white border-[#0369a1] ring-2 ring-[#38bdf8]/40 shadow-md translate-y-[-1px]'
                    : 'bg-[#ece8df] hover:bg-[#ded9ce] text-[#292524] border-[#bcb6aa] hover:border-[#9e978a]'
                }`}
                title={tool.description}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#ded8cd] text-[#0284c7]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{tool.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
