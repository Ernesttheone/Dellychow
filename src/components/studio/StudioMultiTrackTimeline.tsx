import React, { useMemo, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Film,
  Layers,
  Type,
  Music,
  Scissors,
  Copy,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Mic,
} from 'lucide-react';
import {
  AudioTrackItem,
  OverlayEffectItem,
  TextOverlayItem,
  VideoClipItem,
} from '../../types';

export interface TimelineSelection {
  kind: 'clip' | 'audio' | 'text' | 'effect';
  id: string;
}

interface StudioMultiTrackTimelineProps {
  clips: VideoClipItem[];
  audioTracks: AudioTrackItem[];
  textOverlays: TextOverlayItem[];
  overlayEffects: OverlayEffectItem[];
  playheadSec: number;
  selection: TimelineSelection | null;
  onSelect: (sel: TimelineSelection) => void;
  onPlayheadChange: (sec: number) => void;
  onReorderV1Clips: (fromId: string, toId: string) => void;
  onMoveClipStep: (clipId: string, dir: -1 | 1) => void;
  onTrimClipEdge: (clipId: string, edge: 'start' | 'end', deltaSec: number) => void;
  onSplitClipAtPlayhead: () => void;
  onDuplicateClip: (clipId: string) => void;
  onRequestDeleteItem: (sel: TimelineSelection, label: string) => void;
}

export const StudioMultiTrackTimeline: React.FC<StudioMultiTrackTimelineProps> = ({
  clips,
  audioTracks,
  textOverlays,
  overlayEffects,
  playheadSec,
  selection,
  onSelect,
  onPlayheadChange,
  onReorderV1Clips,
  onMoveClipStep,
  onTrimClipEdge,
  onSplitClipAtPlayhead,
  onDuplicateClip,
  onRequestDeleteItem,
}) => {
  const [pxPerSec, setPxPerSec] = useState(44); // Zoom in/out timeline scale
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const v1Segments = useMemo(() => {
    let cursor = 0;
    return clips
      .filter((c) => (c.trackIndex ?? 0) === 0)
      .map((clip) => {
        const speed = Math.max(0.25, Math.min(3.0, Number(clip.speed) || 1));
        const len = Math.max(0.2, ((clip.trimEndSec || clip.durationSec) - (clip.trimStartSec || 0)) / speed);
        const start = cursor;
        const end = cursor + len;
        cursor = end;
        return { clip, len, start, end };
      });
  }, [clips]);

  const v2Clips = useMemo(() => clips.filter((c) => c.trackIndex === 1), [clips]);

  const totalDurationSec = useMemo(() => {
    const v1 = v1Segments.length > 0 ? v1Segments[v1Segments.length - 1].end : 0;
    const v2 = v2Clips.reduce((mx, c) => {
      const sp = Math.max(0.25, Math.min(3.0, Number(c.speed) || 1));
      const len = Math.max(0.2, ((c.trimEndSec || c.durationSec) - (c.trimStartSec || 0)) / sp);
      return Math.max(mx, (c.startOffsetSec || 0) + len);
    }, 0);
    const aud = audioTracks.reduce((mx, t) => {
      const len = Math.max(0.2, (t.trimEndSec || t.durationSec) - (t.trimStartSec || 0));
      return Math.max(mx, (t.startOffsetSec || 0) + len);
    }, 0);
    const txt = textOverlays.reduce((mx, o) => Math.max(mx, o.endSec), 0);
    return Math.max(8, v1, v2, aud, txt);
  }, [v1Segments, v2Clips, audioTracks, textOverlays]);

  const trackWidthPx = Math.max(540, Math.round(totalDurationSec * pxPerSec));

  const rulerTicks = useMemo(() => {
    const step = pxPerSec < 28 ? 5 : pxPerSec < 60 ? 2 : 1;
    const ticks: number[] = [];
    for (let t = 0; t <= Math.ceil(totalDurationSec); t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [totalDurationSec, pxPerSec]);

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const sec = Math.max(0, Math.min(totalDurationSec, x / pxPerSec));
    onPlayheadChange(Number(sec.toFixed(2)));
  };

  const selectedV1Clip =
    selection?.kind === 'clip'
      ? clips.find((c) => c.id === selection.id && (c.trackIndex ?? 0) === 0) || null
      : null;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 overflow-hidden shadow-2xs">
      {/* Timeline Top Control Strip */}
      <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={v1Segments.length === 0}
            onClick={onSplitClipAtPlayhead}
            title="Split clip at playhead"
            className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Split</span>
          </button>

          {selectedV1Clip && (
            <>
              <button
                type="button"
                onClick={() => onMoveClipStep(selectedV1Clip.id, -1)}
                title="Move selected clip earlier"
                className="p-1.5 min-h-[36px] min-w-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onMoveClipStep(selectedV1Clip.id, 1)}
                title="Move selected clip later"
                className="p-1.5 min-h-[36px] min-w-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDuplicateClip(selectedV1Clip.id)}
                title="Duplicate selected clip"
                className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
            </>
          )}

          {selection && (
            <button
              type="button"
              onClick={() => {
                const label =
                  selection.kind === 'clip'
                    ? clips.find((c) => c.id === selection.id)?.name || 'this clip'
                    : selection.kind === 'audio'
                    ? audioTracks.find((a) => a.id === selection.id)?.name || 'this audio track'
                    : selection.kind === 'text'
                    ? textOverlays.find((t) => t.id === selection.id)?.text || 'this caption'
                    : 'this overlay effect';
                onRequestDeleteItem(selection, label);
              }}
              title="Delete selected item"
              className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-100 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPxPerSec((z) => Math.max(16, z - 10))}
            className="p-1.5 min-h-[36px] min-w-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
            title="Zoom out timeline"
            aria-label="Zoom out timeline"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-stone-500 tabular-nums w-12 text-center">
            {Math.round((pxPerSec / 44) * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setPxPerSec((z) => Math.min(120, z + 10))}
            className="p-1.5 min-h-[36px] min-w-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
            title="Zoom in timeline"
            aria-label="Zoom in timeline"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Multi-Track Lane Area */}
      <div className="flex overflow-x-auto touch-pan-x relative">
        {/* Left Sticky Track Headers */}
        <div className="sticky left-0 z-20 w-20 sm:w-28 shrink-0 bg-stone-100 dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 divide-y divide-stone-200 dark:divide-stone-800 select-none">
          <div className="h-7 px-2 flex items-center text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Time
          </div>
          <div className="h-14 px-2 flex items-center gap-1.5 text-[11px] font-bold text-stone-800 dark:text-stone-200">
            <Film className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">V1 Main</span>
          </div>
          <div className="h-11 px-2 flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">V2 PiP</span>
          </div>
          <div className="h-10 px-2 flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            <Type className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Text / FX</span>
          </div>
          <div className="h-12 px-2 flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Audio</span>
          </div>
        </div>

        {/* Right Track Lanes */}
        <div style={{ width: `${trackWidthPx}px` }} className="relative shrink-0 divide-y divide-stone-200/80 dark:divide-stone-800/80 bg-stone-50/70 dark:bg-stone-900">
          {/* Ruler */}
          <div
            ref={rulerRef}
            onPointerDown={handleRulerPointerDown}
            className="h-7 relative cursor-pointer bg-stone-100/80 dark:bg-stone-950/50"
          >
            {rulerTicks.map((sec) => (
              <div
                key={sec}
                style={{ left: `${sec * pxPerSec}px` }}
                className="absolute top-0 bottom-0 border-l border-stone-300 dark:border-stone-700 pl-1 text-[10px] font-mono text-stone-500 flex items-center pointer-events-none"
              >
                {sec}s
              </div>
            ))}
          </div>

          {/* Lane V1: Main Video Sequence (Drag Reorder + Trim Handles) */}
          <div className="h-14 relative flex items-center px-1 gap-0.5">
            {v1Segments.length === 0 ? (
              <span className="text-[11px] text-stone-400 px-3">Main video track empty — add or record a clip</span>
            ) : (
              v1Segments.map((seg) => {
                const widthPx = Math.max(46, Math.round(seg.len * pxPerSec));
                const isSel = selection?.kind === 'clip' && selection.id === seg.clip.id;
                return (
                  <div
                    key={seg.clip.id}
                    draggable
                    onDragStart={() => setDragClipId(seg.clip.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragClipId && dragClipId !== seg.clip.id) {
                        onReorderV1Clips(dragClipId, seg.clip.id);
                      }
                      setDragClipId(null);
                    }}
                    onClick={() => {
                      onSelect({ kind: 'clip', id: seg.clip.id });
                      onPlayheadChange(Number(seg.start.toFixed(2)));
                    }}
                    style={{ width: `${widthPx}px` }}
                    className={`h-11 rounded-xl px-2 flex items-center justify-between shrink-0 cursor-pointer transition-all relative overflow-hidden ${
                      seg.clip.isFreezeFrame
                        ? 'bg-sky-700 text-white'
                        : isSel
                        ? 'bg-amber-600 text-white ring-2 ring-amber-300 shadow-sm'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-100'
                    }`}
                  >
                    {/* Quick Left Trim Nudge Handle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrimClipEdge(seg.clip.id, 'start', 0.25);
                      }}
                      title="Trim 0.25s off start"
                      className="w-3 h-full -ml-2 px-1 hover:bg-black/30 flex items-center justify-center shrink-0 text-[9px]"
                    >
                      |
                    </button>

                    <div className="min-w-0 flex-1 px-1 flex items-center gap-1">
                      <GripVertical className="w-3 h-3 opacity-60 shrink-0 hidden sm:block" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold truncate leading-tight">{seg.clip.name}</p>
                        <p className="text-[9px] opacity-80 tabular-nums">
                          {seg.len.toFixed(1)}s{seg.clip.speed && seg.clip.speed !== 1 ? ` · ${seg.clip.speed}x` : ''}
                          {seg.clip.reversed ? ' · Rev' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Quick Right Trim Nudge Handle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrimClipEdge(seg.clip.id, 'end', -0.25);
                      }}
                      title="Trim 0.25s off end"
                      className="w-3 h-full -mr-2 px-1 hover:bg-black/30 flex items-center justify-center shrink-0 text-[9px]"
                    >
                      |
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Lane V2: Picture-in-Picture / Overlay Clips */}
          <div className="h-11 relative">
            {v2Clips.length === 0 ? (
              <div className="h-full flex items-center px-3 text-[10px] text-stone-400">
                PiP / Chroma-Key overlay track
              </div>
            ) : (
              v2Clips.map((c) => {
                const sp = Math.max(0.25, Math.min(3, c.speed || 1));
                const dur = Math.max(0.4, ((c.trimEndSec || c.durationSec) - (c.trimStartSec || 0)) / sp);
                const leftPx = Math.round((c.startOffsetSec || 0) * pxPerSec);
                const wPx = Math.max(44, Math.round(dur * pxPerSec));
                const isSel = selection?.kind === 'clip' && selection.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect({ kind: 'clip', id: c.id });
                      onPlayheadChange(c.startOffsetSec || 0);
                    }}
                    style={{ left: `${leftPx}px`, width: `${wPx}px` }}
                    className={`absolute top-1.5 bottom-1.5 rounded-lg px-2 text-left text-[10px] font-bold truncate cursor-pointer ${
                      isSel
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                        : 'bg-indigo-700/85 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    PiP: {c.name}
                  </button>
                );
              })
            )}
          </div>

          {/* Lane T: Text, Captions & Overlay Effects */}
          <div className="h-10 relative">
            {textOverlays.length === 0 && overlayEffects.length === 0 ? (
              <div className="h-full flex items-center px-3 text-[10px] text-stone-400">
                Titles, Captions &amp; Overlay Effects
              </div>
            ) : (
              <>
                {textOverlays.map((ov) => {
                  const leftPx = Math.round(ov.startSec * pxPerSec);
                  const wPx = Math.max(38, Math.round((ov.endSec - ov.startSec) * pxPerSec));
                  const isSel = selection?.kind === 'text' && selection.id === ov.id;
                  return (
                    <button
                      key={ov.id}
                      type="button"
                      onClick={() => {
                        onSelect({ kind: 'text', id: ov.id });
                        onPlayheadChange(ov.startSec);
                      }}
                      style={{ left: `${leftPx}px`, width: `${wPx}px` }}
                      className={`absolute top-1.5 bottom-1.5 rounded-lg px-2 text-left text-[10px] font-semibold truncate cursor-pointer ${
                        isSel
                          ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-200'
                          : ov.isAutoCaption
                          ? 'bg-amber-700/90 text-white'
                          : 'bg-amber-600/85 text-white'
                      }`}
                    >
                      {ov.text}
                    </button>
                  );
                })}
                {overlayEffects.map((fx) => {
                  const leftPx = Math.round(fx.startSec * pxPerSec);
                  const wPx = Math.max(34, Math.round((fx.endSec - fx.startSec) * pxPerSec));
                  const isSel = selection?.kind === 'effect' && selection.id === fx.id;
                  return (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => {
                        onSelect({ kind: 'effect', id: fx.id });
                        onPlayheadChange(fx.startSec);
                      }}
                      style={{ left: `${leftPx}px`, width: `${wPx}px` }}
                      className={`absolute bottom-0.5 h-3.5 rounded px-1 text-[9px] font-bold truncate cursor-pointer ${
                        isSel ? 'bg-purple-500 text-white' : 'bg-purple-700/80 text-white'
                      }`}
                    >
                      FX: {fx.preset.replace('_', ' ')}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Lane A: Voiceovers, Background Music & Extracted Audio */}
          <div className="h-12 relative">
            {audioTracks.length === 0 ? (
              <div className="h-full flex items-center px-3 text-[10px] text-stone-400">
                Voiceover, music &amp; extracted audio tracks
              </div>
            ) : (
              audioTracks.map((tr) => {
                const len = Math.max(0.3, (tr.trimEndSec || tr.durationSec) - (tr.trimStartSec || 0));
                const leftPx = Math.round((tr.startOffsetSec || 0) * pxPerSec);
                const wPx = Math.max(44, Math.round(len * pxPerSec));
                const isSel = selection?.kind === 'audio' && selection.id === tr.id;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => {
                      onSelect({ kind: 'audio', id: tr.id });
                      onPlayheadChange(tr.startOffsetSec || 0);
                    }}
                    style={{ left: `${leftPx}px`, width: `${wPx}px` }}
                    className={`absolute top-1.5 bottom-1.5 rounded-lg px-2 text-left text-[10px] font-bold flex items-center gap-1 truncate cursor-pointer ${
                      tr.muted
                        ? 'bg-stone-400 text-stone-900 line-through'
                        : isSel
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
                        : tr.trackType === 'voiceover'
                        ? 'bg-emerald-700 text-white'
                        : tr.trackType === 'extracted'
                        ? 'bg-teal-700 text-white'
                        : 'bg-stone-700 text-white'
                    }`}
                  >
                    {tr.trackType === 'voiceover' && <Mic className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{tr.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Continuous Red Playhead Needle across all tracks */}
          <div
            style={{ left: `${Math.min(trackWidthPx - 2, Math.max(0, playheadSec * pxPerSec))}px` }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
          >
            <div className="w-2.5 h-2.5 -ml-[4px] bg-red-500 rotate-45 rounded-[2px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
