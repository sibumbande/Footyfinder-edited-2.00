
import React from 'react';
import { Plus, Check, GripVertical } from 'lucide-react';

interface Point {
  id: string;
  label: string;
  x: number;
  y: number;
  team?: 'A' | 'B';
}

interface TacticalPitchProps {
  points: Point[];
  assignedPlayers: Record<string, string>;
  onPointClick?: (id: string) => void;
  onPointDragStart?: (id: string, e: React.MouseEvent | React.TouchEvent) => void;
  isLocked?: boolean;
  activeId?: string | null;
  perspective?: 'vertical' | 'horizontal';
  showLabels?: boolean;
  className?: string;
}

export const TacticalPitch: React.FC<TacticalPitchProps> = ({
  points,
  assignedPlayers,
  onPointClick,
  onPointDragStart,
  isLocked = false,
  activeId = null,
  perspective = 'vertical',
  showLabels = true,
  className = ""
}) => {
  return (
    <div className={`relative w-full mx-auto rounded-[48px] border-[16px] border-emerald-700 bg-emerald-600 shadow-3xl overflow-hidden ${perspective === 'vertical' ? 'aspect-[3/5]' : 'aspect-[5/3]'} ${className}`}>
      {/* Pitch Markings */}
      <div className="absolute inset-4 border-2 border-white/20 rounded-[32px]"></div>
      <div className="absolute top-1/2 left-0 w-full h-1 border-b-2 border-white/20 -translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-b-2 border-x-2 border-white/20 rounded-b-3xl"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-t-2 border-x-2 border-white/20 rounded-t-3xl"></div>

      {points.map((pos) => {
        const occupant = assignedPlayers[pos.id];
        const isOccupied = !!occupant;
        const isSquadA = pos.team === 'A';
        const isDragging = activeId === pos.id;

        return (
          <div
            key={pos.id}
            onClick={() => !isLocked && onPointClick?.(pos.id)}
            onMouseDown={(e) => !isLocked && onPointDragStart?.(pos.id, e)}
            onTouchStart={(e) => !isLocked && onPointDragStart?.(pos.id, e)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform
              ${!isLocked ? 'cursor-pointer hover:scale-110' : 'pointer-events-none'}
              ${isDragging ? 'scale-125 z-50 cursor-grabbing' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex flex-col items-center justify-center transition-all shadow-lg
              ${isOccupied
                ? (isSquadA ? 'bg-blue-600 border-white text-white' : 'bg-red-600 border-white text-white')
                : 'bg-white/90 border-slate-100 text-slate-300'}`}>

              {showLabels && <span className="text-[6px] font-black uppercase opacity-60 mb-0.5">{pos.label}</span>}

              {occupant ? (
                <span className="text-[8px] font-black uppercase truncate px-1 max-w-full">
                  {occupant.split(' ')[0]}
                </span>
              ) : (
                <Plus size={14} />
              )}

              {onPointDragStart && !isLocked && (
                <div className="absolute -top-1 -right-1 bg-slate-900 text-white rounded-full p-1 border-2 border-white">
                  <GripVertical size={10} />
                </div>
              )}

              {isLocked && isOccupied && (
                <div className="absolute -top-1 -right-1 bg-white text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-100">
                  <Check size={8} strokeWidth={4}/>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
