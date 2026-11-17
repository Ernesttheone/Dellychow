import React, { useRef, useState } from 'react';
import {
  Scissors,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Gauge,
  Rewind,
  Sparkles,
  Sun,
  Contrast,
  Droplets,
  Layers,
  Palette,
  Music,
  Mic,
  Volume2,
  VolumeX,
  Upload,
  Type,
  Captions,
  Wand2,
  AudioLines,
  ScanSearch,
  Smartphone,
  Monitor,
  Square as SquareIcon,
  Camera,
  Snowflake,
  Play,
  Pause,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Split,
  Eraser,
  Film,
  Info,
} from 'lucide-react';
import {
  AnimatedOverlayPreset,
  AudioTrackItem,
  CropAspectRatio,
  OverlayEffectItem,
  TextAnimationType,
  TextFontFamily,
  TextOverlayItem,
  TextOverlayKind,
  VideoClipItem,
  VideoFilterPreset,
  VideoRotationDeg,
  VideoTransitionType,
  ZoomEffectType,
} from '../../types';
import { STUDIO_MUSIC_PRESETS, generateStudioMusicPresetBlob } from '../../services/videoStudioService';
import { AudioRecorderPanel, LocalAudioRecording } from './AudioRecorderPanel';
import { AiCoachResponse, SceneSegment } from '../../lib/videoAiAnalysis';

export type StudioToolTab = 'clips' | 'effects' | 'audio' | 'text' | 'ai';

interface StudioToolPanelsProps {
  activeTab: StudioToolTab;
  onChangeTab: (tab: StudioToolTab) => void;
  clips: VideoClipItem[];
  selectedClip: VideoClipItem | null;
  audioTracks: AudioTrackItem[];
  selectedAudioTrack: AudioTrackItem | null;
  textOverlays: TextOverlayItem[];
  selectedTextOverlay: TextOverlayItem | null;
  overlayEffects: OverlayEffectItem[];
  cropRatio: CropAspectRatio;
  projectRotation: VideoRotationDeg;
  projectBgColor: string;
  originalAudioVolume: number;
  originalAudioMuted: boolean;
  playheadSec: number;
  totalDurationSec: number;
  voiceRecordings: LocalAudioRecording[];
  // Handlers
  onRequestUploadClip: (asPip?: boolean) => void;
  onRequestRecordCameraClip: () => void;
  onSplitAtPlayhead: () => void;
  onDuplicateClip: (clipId: string) => void;
  onCreateFreezeFrame: () => void;
  onSeparateAudioFromClip: (clip: VideoClipItem) => void;
  onRemoveMiddleSectionPrompt: () => void;
  onUpdateClip: (clipId: string, patch: Partial<VideoClipItem>) => void;
  onDeleteClipPrompt: (clip: VideoClipItem) => void;
  onChangeCropRatio: (ratio: CropAspectRatio) => void;
  onChangeProjectRotation: (rot: VideoRotationDeg) => void;
  onChangeProjectBgColor: (hex: string) => void;
  onPreviewFilterHover: (preset: VideoFilterPreset | null) => void;
  onAddOverlayEffect: (preset: AnimatedOverlayPreset) => void;
  onDeleteOverlayEffect: (id: string) => void;
  onChangeOriginalAudio: (vol: number, muted: boolean) => void;
  onAddMusicPreset: (presetId: string) => Promise<void>;
  onUploadAudioFile: (file: File) => Promise<void>;
  onUpdateAudioTrack: (id: string, patch: Partial<AudioTrackItem>) => void;
  onDeleteAudioPrompt: (track: AudioTrackItem) => void;
  onVoiceRecordingCreated: (rec: LocalAudioRecording) => void;
  onVoiceRecordingDeleted: (id: string) => void;
  onVoiceRecordingRenamed: (id: string, name: string) => void;
  onAttachVoiceRecording: (rec: LocalAudioRecording, atPlayhead?: boolean) => void;
  onRequestSyncedVideoStart: () => void;
  onRequestSyncedVideoStop: () => void;
  onAddTextOverlay: (kind: TextOverlayKind, text: string, subtitle?: string) => void;
  onUpdateTextOverlay: (id: string, patch: Partial<TextOverlayItem>) => void;
  onDeleteTextOverlay: (id: string) => void;
  // AI handlers
  aiBusyTask: string | null;
  aiNotice: string | null;
  aiError: string | null;
  aiScenes: SceneSegment[];
  aiCoachResult: AiCoachResponse | null;
  onRunAutoEnhance: () => void;
  onRunAutoRemoveSilence: () => void;
  onRunSceneDetection: () => void;
  onSplitDetectedScenes: () => void;
  onKeepHighlightScenesOnly: () => void;
  onRunNoiseReductionAll: () => void;
  onRunAutoCaptions: () => void;
  onRunAiCoach: () => void;
  onApplyCoachSuggestion: (actionType: string) => void;
}

const FILTER_PRESETS: Array<{ id: VideoFilterPreset; label: string; swatch: string }> = [
  { id: 'none', label: 'Original', swatch: 'bg-stone-700' },
  { id: 'warm_kitchen', label: 'Warm Kitchen', swatch: 'bg-amber-600' },
  { id: 'crisp_studio', label: 'Crisp Studio', swatch: 'bg-sky-600' },
  { id: 'golden_hour', label: 'Golden Hour', swatch: 'bg-orange-500' },
  { id: 'high_contrast', label: 'Bold Contrast', swatch: 'bg-stone-900' },
  { id: 'vintage_film', label: 'Vintage Film', swatch: 'bg-yellow-700' },
  { id: 'cool_fresh', label: 'Cool Fresh', swatch: 'bg-teal-600' },
  { id: 'noir_bw', label: 'B&W Noir', swatch: 'bg-stone-500' },
];

export const StudioToolPanels: React.FC<StudioToolPanelsProps> = ({
  activeTab,
  onChangeTab,
  clips,
  selectedClip,
  audioTracks,
  selectedAudioTrack,
  textOverlays,
  selectedTextOverlay,
  overlayEffects,
  cropRatio,
  projectRotation,
  projectBgColor,
  originalAudioVolume,
  originalAudioMuted,
  playheadSec,
  totalDurationSec,
  voiceRecordings,
  onRequestUploadClip,
  onRequestRecordCameraClip,
  onSplitAtPlayhead,
  onDuplicateClip,
  onCreateFreezeFrame,
  onSeparateAudioFromClip,
  onRemoveMiddleSectionPrompt,
  onUpdateClip,
  onDeleteClipPrompt,
  onChangeCropRatio,
  onChangeProjectRotation,
  onChangeProjectBgColor,
  onPreviewFilterHover,
  onAddOverlayEffect,
  onDeleteOverlayEffect,
  onChangeOriginalAudio,
  onAddMusicPreset,
  onUploadAudioFile,
  onUpdateAudioTrack,
  onDeleteAudioPrompt,
  onVoiceRecordingCreated,
  onVoiceRecordingDeleted,
  onVoiceRecordingRenamed,
  onAttachVoiceRecording,
  onRequestSyncedVideoStart,
  onRequestSyncedVideoStop,
  onAddTextOverlay,
  onUpdateTextOverlay,
  onDeleteTextOverlay,
  aiBusyTask,
  aiNotice,
  aiError,
  aiScenes,
  aiCoachResult,
  onRunAutoEnhance,
  onRunAutoRemoveSilence,
  onRunSceneDetection,
  onSplitDetectedScenes,
  onKeepHighlightScenesOnly,
  onRunNoiseReductionAll,
  onRunAutoCaptions,
  onRunAiCoach,
  onApplyCoachSuggestion,
}) => {
  const [previewPlayingMusicId, setPreviewPlayingMusicId] = useState<string | null>(null);
  const [addingMusicId, setAddingMusicId] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Quick Add Text Draft
  const [draftText, setDraftText] = useState('');
  const [draftSubtitle, setDraftSubtitle] = useState('');
  const [draftKind, setDraftKind] = useState<TextOverlayKind>('title');

  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioFileUploadRef = useRef<HTMLInputElement | null>(null);

  const togglePreviewMusic = async (presetId: string) => {
    if (previewPlayingMusicId === presetId) {
      musicAudioRef.current?.pause();
      setPreviewPlayingMusicId(null);
      return;
    }
    try {
      const blob = await generateStudioMusicPresetBlob(presetId);
      const url = URL.createObjectURL(blob);
      if (!musicAudioRef.current) {
        musicAudioRef.current = new Audio();
        musicAudioRef.current.onended = () => setPreviewPlayingMusicId(null);
      }
      musicAudioRef.current.src = url;
      await musicAudioRef.current.play();
      setPreviewPlayingMusicId(presetId);
    } catch {
      setPreviewPlayingMusicId(null);
    }
  };

  const tabs: Array<{ id: StudioToolTab; label: string; icon: any; tip: string }> = [
    { id: 'clips', label: 'Edit & Trim', icon: Scissors, tip: 'Cut, merge, crop, rotate, speed, reverse & freeze frames' },
    { id: 'effects', label: 'Effects & Filters', icon: Sparkles, tip: 'Color grading, filters, transitions, PiP & green screen' },
    { id: 'audio', label: 'Audio & Music', icon: Music, tip: 'Voiceovers, background music, volume, sync, fades & mute' },
    { id: 'text', label: 'Text & Captions', icon: Type, tip: 'Titles, lower thirds, subtitles & auto-captions' },
    { id: 'ai', label: 'AI Tools', icon: Wand2, tip: 'Auto silence removal, scene cuts, resize & AI coach' },
  ];

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 overflow-hidden shadow-2xs flex flex-col">
      {/* Section Switcher Bar */}
      <div className="p-2 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={t.tip}
              onClick={() => onChangeTab(t.id)}
              className={`px-3 py-2 min-h-[42px] rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tool Panel Body */}
      <div className="p-4 sm:p-5 space-y-5 max-h-[520px] overflow-y-auto">
        {/* ==============================================================
            TAB 1: BASIC VIDEO TOOLS (Trim, Split, Merge, Crop, Speed, Reverse, Freeze)
           ============================================================== */}
        {activeTab === 'clips' && (
          <div className="space-y-5">
            {/* Add / Merge Clips Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onRequestUploadClip(false)}
                title="Add and merge another video clip onto your timeline"
                className="px-3.5 py-2 min-h-[42px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Add / Merge Video Clip</span>
              </button>

              <button
                type="button"
                onClick={onRequestRecordCameraClip}
                title="Record a new scene directly with your device camera"
                className="px-3.5 py-2 min-h-[42px] rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Record Camera Clip</span>
              </button>

              <button
                type="button"
                disabled={clips.length === 0}
                onClick={onCreateFreezeFrame}
                title="Freeze the current preview frame as a 3-second still shot on the timeline"
                className="px-3.5 py-2 min-h-[42px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                <span>Freeze Frame ({playheadSec.toFixed(1)}s)</span>
              </button>
            </div>

            {/* Global Canvas Aspect Ratio, Rotate & Background Color */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-amber-600" />
                  <span>Canvas Frame &amp; Crop Size</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {(['16:9', '9:16', '1:1', '4:5', 'original'] as CropAspectRatio[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onChangeCropRatio(r)}
                      title={`Resize video frame to ${r}`}
                      className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold cursor-pointer ${
                        cropRatio === r
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {r === 'original' ? 'Original' : r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200/70 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                    Canvas Background:
                  </span>
                  {['#0c0a09', '#faf7f2', '#d97706', '#14532d', '#1e3a8a'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onChangeProjectBgColor(hex)}
                      style={{ backgroundColor: hex }}
                      title={`Set background fill to ${hex}`}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                        projectBgColor === hex ? 'border-amber-500 scale-110' : 'border-stone-300'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={projectBgColor}
                    onChange={(e) => onChangeProjectBgColor(e.target.value)}
                    aria-label="Custom background color"
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onChangeProjectRotation((((projectRotation + 90) % 360) as VideoRotationDeg))}
                  className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 cursor-pointer"
                  title="Rotate entire video project 90 degrees"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Rotate Canvas ({projectRotation}°)</span>
                </button>
              </div>
            </div>

            {/* Selected Clip Inspector */}
            {selectedClip ? (
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-stone-950/70 border border-amber-200/80 dark:border-stone-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Selected Clip ({selectedClip.trackIndex === 1 ? 'Track V2 PiP' : 'Track V1'})
                    </span>
                    <input
                      type="text"
                      value={selectedClip.name}
                      onChange={(e) => onUpdateClip(selectedClip.id, { name: e.target.value })}
                      className="block text-sm font-bold text-stone-900 dark:text-stone-100 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onSplitAtPlayhead}
                      title="Split clip at current playhead"
                      className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5 text-amber-600" />
                      <span>Split</span>
                    </button>

                    <button
                      type="button"
                      onClick={onRemoveMiddleSectionPrompt}
                      title="Cut out the middle section of this clip around the playhead"
                      className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5 text-red-500" />
                      <span>Cut Unwanted Section</span>
                    </button>

                    {!selectedClip.isFreezeFrame && !selectedClip.audioDetached && (
                      <button
                        type="button"
                        onClick={() => onSeparateAudioFromClip(selectedClip)}
                        title="Separate clip sound onto the independent Audio Track so you can trim, fade, or move it"
                        className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <AudioLines className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Separate Audio</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteClipPrompt(selectedClip)}
                      className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      title="Delete selected clip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Trim Start & End */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs text-stone-700 dark:text-stone-300 mb-1">
                      <span>Trim Start</span>
                      <span className="font-bold tabular-nums">{selectedClip.trimStartSec.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, selectedClip.trimEndSec - 0.3)}
                      step="0.1"
                      value={selectedClip.trimStartSec}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, { trimStartSec: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-stone-700 dark:text-stone-300 mb-1">
                      <span>Trim End</span>
                      <span className="font-bold tabular-nums">{selectedClip.trimEndSec.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min={Math.min(selectedClip.durationSec, selectedClip.trimStartSec + 0.3)}
                      max={Math.max(0.5, selectedClip.durationSec)}
                      step="0.1"
                      value={selectedClip.trimEndSec}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, { trimEndSec: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Speed, Reverse, Flip, Rotate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-200/50 dark:border-stone-800">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 mb-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Gauge className="w-3.5 h-3.5 text-amber-600" />
                        <span>Playback Speed</span>
                      </span>
                      <span className="font-bold tabular-nums">{(selectedClip.speed || 1).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="3"
                      step="0.05"
                      value={selectedClip.speed || 1}
                      onChange={(e) => onUpdateClip(selectedClip.id, { speed: parseFloat(e.target.value) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0.5, 1, 1.5, 2].map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => onUpdateClip(selectedClip.id, { speed: sp })}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            Math.abs((selectedClip.speed || 1) - sp) < 0.05
                              ? 'bg-amber-600 text-white'
                              : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {sp === 0.5 ? '0.5x Slow' : sp === 1 ? '1x Normal' : `${sp}x Fast`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 content-start">
                    <button
                      type="button"
                      onClick={() => onUpdateClip(selectedClip.id, { reversed: !selectedClip.reversed })}
                      title="Play this clip backward in reverse"
                      className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                        selectedClip.reversed
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      <Rewind className="w-3.5 h-3.5" />
                      <span>Reverse Clip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateClip(selectedClip.id, { flipH: !selectedClip.flipH })}
                      title="Mirror horizontally"
                      className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                        selectedClip.flipH
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Flip H</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateClip(selectedClip.id, { flipV: !selectedClip.flipV })}
                      title="Flip upside down vertically"
                      className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                        selectedClip.flipV
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span>Flip V</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
                Select or add a video clip on the timeline to trim, split, speed up, slow down, reverse, or flip it.
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            TAB 2: EFFECTS, FILTERS, TRANSITIONS, PIP & GREEN SCREEN
           ============================================================== */}
        {activeTab === 'effects' && (
          <div className="space-y-5">
            {!selectedClip ? (
              <div className="p-6 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
                Select a clip on the timeline to apply filters, color grading, zoom, blur, transitions, or chroma-key.
              </div>
            ) : (
              <>
                {/* Visual Filter Presets (Hover to Preview Live!) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                      Culinary Filters (Hover to Preview)
                    </h4>
                    <span className="text-[11px] text-stone-400">Click to apply to &ldquo;{selectedClip.name}&rdquo;</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FILTER_PRESETS.map((fp) => {
                      const active = (selectedClip.filterPreset || 'none') === fp.id;
                      return (
                        <button
                          key={fp.id}
                          type="button"
                          onMouseEnter={() => onPreviewFilterHover(fp.id)}
                          onMouseLeave={() => onPreviewFilterHover(null)}
                          onClick={() => onUpdateClip(selectedClip.id, { filterPreset: fp.id })}
                          className={`p-2.5 min-h-[42px] rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                            active
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                              : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-200 hover:border-amber-400'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full shrink-0 ${fp.swatch}`} />
                          <span className="truncate">{fp.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Grading: Brightness, Contrast, Saturation, Exposure */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'brightness', label: 'Brightness', icon: Sun, min: -60, max: 60 },
                    { key: 'contrast', label: 'Contrast', icon: Contrast, min: -60, max: 60 },
                    { key: 'saturation', label: 'Saturation', icon: Droplets, min: -80, max: 80 },
                    { key: 'exposure', label: 'Exposure', icon: Palette, min: -60, max: 60 },
                  ].map((ctrl) => {
                    const val = Number((selectedClip as any)[ctrl.key] || 0);
                    const Icon = ctrl.icon;
                    return (
                      <div key={ctrl.key}>
                        <div className="flex justify-between text-xs text-stone-700 dark:text-stone-300 mb-1">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Icon className="w-3.5 h-3.5 text-amber-600" />
                            <span>{ctrl.label}</span>
                          </span>
                          <span className="font-bold tabular-nums">{val > 0 ? `+${val}` : val}</span>
                        </div>
                        <input
                          type="range"
                          min={ctrl.min}
                          max={ctrl.max}
                          step="2"
                          value={val}
                          onChange={(e) =>
                            onUpdateClip(selectedClip.id, { [ctrl.key]: parseInt(e.target.value, 10) } as any)
                          }
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Blur, Zoom, Glitch & Clip Transitions */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      <span>Soft Blur</span>
                      <span className="tabular-nums">{selectedClip.blur || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      step="1"
                      value={selectedClip.blur || 0}
                      onChange={(e) => onUpdateClip(selectedClip.id, { blur: parseInt(e.target.value, 10) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      <span>Zoom Scale</span>
                      <span className="tabular-nums">{(selectedClip.zoom || 1).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.2"
                      step="0.05"
                      value={selectedClip.zoom || 1}
                      onChange={(e) => onUpdateClip(selectedClip.id, { zoom: parseFloat(e.target.value) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      <span>Glitch Effect</span>
                      <span className="tabular-nums">{selectedClip.glitch || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={selectedClip.glitch || 0}
                      onChange={(e) => onUpdateClip(selectedClip.id, { glitch: parseInt(e.target.value, 10) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Motion / Transition
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={selectedClip.transition}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, { transition: e.target.value as VideoTransitionType })
                        }
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-medium"
                      >
                        <option value="none">Cut</option>
                        <option value="fade">Fade</option>
                        <option value="crossfade">Crossfade</option>
                        <option value="slide">Slide</option>
                        <option value="zoom">Zoom</option>
                      </select>
                      <select
                        value={selectedClip.zoomEffect || 'none'}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, { zoomEffect: e.target.value as ZoomEffectType })
                        }
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-medium"
                      >
                        <option value="none">Still Cam</option>
                        <option value="slow_zoom_in">Slow Zoom In</option>
                        <option value="slow_zoom_out">Slow Zoom Out</option>
                        <option value="pulse">Beat Pulse</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Animated Overlay Frames, Picture-in-Picture & Green Screen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Animated Overlays */}
                  <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Animated Frame Overlays
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'warm_vignette', label: '+ Warm Vignette' },
                          { id: 'cinematic_bars', label: '+ Cinema Bars' },
                          { id: 'golden_border', label: '+ Gold Frame' },
                          { id: 'chef_frame', label: '+ White Border' },
                        ] as Array<{ id: AnimatedOverlayPreset; label: string }>
                      ).map((ov) => (
                        <button
                          key={ov.id}
                          type="button"
                          onClick={() => onAddOverlayEffect(ov.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-600 hover:text-white text-[11px] font-semibold cursor-pointer transition-colors"
                        >
                          {ov.label}
                        </button>
                      ))}
                    </div>
                    {overlayEffects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {overlayEffects.map((fx) => (
                          <span
                            key={fx.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 text-[11px] font-semibold"
                          >
                            {fx.preset.replace('_', ' ')}
                            <button
                              type="button"
                              onClick={() => onDeleteOverlayEffect(fx.id)}
                              className="hover:text-red-600 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Picture-in-Picture (PiP) & Green Screen Chroma-Key */}
                  <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        Picture-in-Picture &amp; Green Screen
                      </h4>
                      <button
                        type="button"
                        onClick={() => onRequestUploadClip(true)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="w-3 h-3" />
                        <span>+ Add PiP Clip</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedClip.chromaKeyEnabled)}
                          onChange={(e) =>
                            onUpdateClip(selectedClip.id, {
                              chromaKeyEnabled: e.target.checked,
                              chromaKeyColor: selectedClip.chromaKeyColor || '#00ff00',
                              chromaKeySimilarity: selectedClip.chromaKeySimilarity ?? 0.24,
                            })
                          }
                          className="accent-emerald-600"
                        />
                        <span>Green Screen Removal</span>
                      </label>

                      {selectedClip.chromaKeyEnabled && (
                        <>
                          <input
                            type="color"
                            value={selectedClip.chromaKeyColor || '#00ff00'}
                            onChange={(e) =>
                              onUpdateClip(selectedClip.id, { chromaKeyColor: e.target.value })
                            }
                            title="Key color to remove"
                            className="w-7 h-7 rounded border-0 cursor-pointer"
                          />
                          <input
                            type="range"
                            min="0.08"
                            max="0.48"
                            step="0.02"
                            value={selectedClip.chromaKeySimilarity ?? 0.24}
                            onChange={(e) =>
                              onUpdateClip(selectedClip.id, {
                                chromaKeySimilarity: parseFloat(e.target.value),
                              })
                            }
                            title="Chroma key tolerance"
                            className="w-24 accent-emerald-600 cursor-pointer"
                          />
                        </>
                      )}
                    </div>

                    {selectedClip.trackIndex === 1 && (
                      <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px]">
                        <span>PiP Size:</span>
                        <input
                          type="range"
                          min="0.18"
                          max="0.7"
                          step="0.02"
                          value={selectedClip.pipScale ?? 0.32}
                          onChange={(e) =>
                            onUpdateClip(selectedClip.id, { pipScale: parseFloat(e.target.value) })
                          }
                          className="w-28 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-stone-500">(Drag PiP box on preview screen)</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==============================================================
            TAB 3: AUDIO, VOICEOVER & MUSIC EDITING
           ============================================================== */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            {/* Master Original Video Audio + Action Buttons */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onChangeOriginalAudio(originalAudioVolume, !originalAudioMuted)}
                  className={`p-2 min-h-[40px] min-w-[40px] rounded-xl border cursor-pointer flex items-center justify-center ${
                    originalAudioMuted
                      ? 'bg-red-100 border-red-300 text-red-600'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-amber-600'
                  }`}
                  title={originalAudioMuted ? 'Unmute video audio' : 'Mute original video audio'}
                >
                  {originalAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Original Video Audio
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Adjust room sound, mute completely, or separate audio from clip
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={originalAudioMuted ? 0 : originalAudioVolume}
                  onChange={(e) => onChangeOriginalAudio(parseFloat(e.target.value), false)}
                  className="w-28 sm:w-36 accent-amber-600 cursor-pointer"
                />
                <span className="text-xs font-bold tabular-nums w-10 text-right">
                  {originalAudioMuted ? 'Mute' : `${Math.round(originalAudioVolume * 100)}%`}
                </span>
                {selectedClip && !selectedClip.isFreezeFrame && !selectedClip.audioDetached && (
                  <button
                    type="button"
                    onClick={() => onSeparateAudioFromClip(selectedClip)}
                    className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-900 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Split className="w-3.5 h-3.5 text-amber-400" />
                    <span>Separate Clip Audio</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action Buttons: Voiceover Recorder & Upload Audio */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowVoiceRecorder((v) => !v)}
                className={`px-4 py-2 min-h-[42px] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  showVoiceRecorder
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{showVoiceRecorder ? 'Hide Voiceover Recorder' : 'Record Voiceover'}</span>
              </button>

              <input
                ref={audioFileUploadRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadAudioFile(f);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => audioFileUploadRef.current?.click()}
                className="px-4 py-2 min-h-[42px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Upload Audio / Music</span>
              </button>
            </div>

            {showVoiceRecorder && (
              <AudioRecorderPanel
                recordings={voiceRecordings}
                onRecordingCreated={onVoiceRecordingCreated}
                onDeleteRecording={onVoiceRecordingDeleted}
                onRenameRecording={onVoiceRecordingRenamed}
                onAddToTimeline={onAttachVoiceRecording}
                timelineTracks={audioTracks}
                hasVideoClips={clips.length > 0}
                currentPlayheadSec={playheadSec}
                onRequestSyncedVideoStart={onRequestSyncedVideoStart}
                onRequestSyncedVideoStop={onRequestSyncedVideoStop}
              />
            )}

            {/* Selected or Active Audio Tracks Inspector (Trim, Sync Offset, Volume, Fade-In/Out, Noise Reduction) */}
            {audioTracks.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Timeline Audio Tracks ({audioTracks.length})
                </h4>
                {audioTracks.map((tr) => {
                  const isSel = selectedAudioTrack?.id === tr.id;
                  return (
                    <div
                      key={tr.id}
                      className={`p-3.5 rounded-2xl border space-y-3 ${
                        isSel
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-stone-900 text-white text-[10px] font-bold uppercase">
                            {tr.trackType}
                          </span>
                          <input
                            type="text"
                            value={tr.name}
                            onChange={(e) => onUpdateAudioTrack(tr.id, { name: e.target.value })}
                            className="text-xs font-bold text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none border-b border-transparent focus:border-amber-500"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdateAudioTrack(tr.id, { noiseReduction: !tr.noiseReduction })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                              tr.noiseReduction
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {tr.noiseReduction ? 'Noise Clean ON' : 'Clean Noise'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onUpdateAudioTrack(tr.id, { muted: !tr.muted })}
                            className={`p-1.5 rounded-lg border cursor-pointer ${
                              tr.muted ? 'bg-red-100 border-red-300 text-red-600' : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                            }`}
                            title={tr.muted ? 'Unmute track' : 'Mute track'}
                          >
                            {tr.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteAudioPrompt(tr)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete audio track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[11px]">
                        <div>
                          <span className="text-stone-500 block">Volume ({Math.round(tr.volume * 100)}%)</span>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={tr.volume}
                            onChange={(e) => onUpdateAudioTrack(tr.id, { volume: parseFloat(e.target.value) })}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-stone-500 block">Sync Start ({tr.startOffsetSec.toFixed(1)}s)</span>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(10, totalDurationSec)}
                            step="0.2"
                            value={tr.startOffsetSec}
                            onChange={(e) =>
                              onUpdateAudioTrack(tr.id, { startOffsetSec: parseFloat(e.target.value) })
                            }
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-stone-500 block">Trim Start ({tr.trimStartSec.toFixed(1)}s)</span>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(0, tr.trimEndSec - 0.3)}
                            step="0.1"
                            value={tr.trimStartSec}
                            onChange={(e) =>
                              onUpdateAudioTrack(tr.id, { trimStartSec: parseFloat(e.target.value) })
                            }
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-stone-500 block">Trim End ({tr.trimEndSec.toFixed(1)}s)</span>
                          <input
                            type="range"
                            min={Math.min(tr.durationSec, tr.trimStartSec + 0.3)}
                            max={Math.max(0.5, tr.durationSec)}
                            step="0.1"
                            value={tr.trimEndSec}
                            onChange={(e) =>
                              onUpdateAudioTrack(tr.id, { trimEndSec: parseFloat(e.target.value) })
                            }
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-stone-500 block">Fade In ({(tr.fadeInSec || 0).toFixed(1)}s)</span>
                          <input
                            type="range"
                            min="0"
                            max="4"
                            step="0.2"
                            value={tr.fadeInSec || 0}
                            onChange={(e) =>
                              onUpdateAudioTrack(tr.id, { fadeInSec: parseFloat(e.target.value) })
                            }
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-stone-500 block">Fade Out ({(tr.fadeOutSec || 0).toFixed(1)}s)</span>
                          <input
                            type="range"
                            min="0"
                            max="4"
                            step="0.2"
                            value={tr.fadeOutSec || 0}
                            onChange={(e) =>
                              onUpdateAudioTrack(tr.id, { fadeOutSec: parseFloat(e.target.value) })
                            }
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Built-in Culinary Background Music Library with Preview Before Applying */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Built-In Culinary Background Music Library (Preview &amp; Add)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {STUDIO_MUSIC_PRESETS.map((preset) => {
                  const isPrev = previewPlayingMusicId === preset.id;
                  const isBusy = addingMusicId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {preset.title}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {preset.mood} · {preset.bpm} BPM
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePreviewMusic(preset.id)}
                          title="Preview music track before adding"
                          className="p-2 min-h-[36px] min-w-[36px] rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 cursor-pointer"
                        >
                          {isPrev ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-amber-600" />}
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            setAddingMusicId(preset.id);
                            try {
                              await onAddMusicPreset(preset.id);
                            } finally {
                              setAddingMusicId(null);
                            }
                          }}
                          className="px-2.5 py-2 min-h-[36px] rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          <span>Use</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 4: TEXT, TITLES, LOWER THIRDS & CAPTIONS
           ============================================================== */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* Add New Text / Title / Lower Third / Subtitle */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'title', label: 'Animated Title' },
                      { id: 'lower_third', label: 'Lower Third / Name Tag' },
                      { id: 'text', label: 'Custom Text' },
                      { id: 'caption', label: 'Manual Subtitle' },
                    ] as Array<{ id: TextOverlayKind; label: string }>
                  ).map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setDraftKind(k.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        draftKind === k.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onRunAutoCaptions}
                  disabled={aiBusyTask === 'captions' || clips.length === 0}
                  className="px-3 py-1.5 min-h-[36px] rounded-xl bg-stone-900 dark:bg-amber-700 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {aiBusyTask === 'captions' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Captions className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Auto-Generate AI Captions</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder={
                    draftKind === 'lower_third'
                      ? 'Chef Name or Step (e.g. Chef Maria Rossi)'
                      : draftKind === 'caption'
                      ? 'Subtitle text shown at this timestamp...'
                      : 'Enter title or text overlay...'
                  }
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                />
                {draftKind === 'lower_third' && (
                  <input
                    type="text"
                    value={draftSubtitle}
                    onChange={(e) => setDraftSubtitle(e.target.value)}
                    placeholder="Role / Subtitle (e.g. Pastry Chef)"
                    className="sm:w-52 px-3 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                  />
                )}
                <button
                  type="button"
                  disabled={!draftText.trim()}
                  onClick={() => {
                    onAddTextOverlay(draftKind, draftText, draftSubtitle);
                    setDraftText('');
                    setDraftSubtitle('');
                  }}
                  className="px-4 py-2.5 min-h-[42px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add at {playheadSec.toFixed(1)}s</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>Tip: Drag any text overlay directly inside the video preview window to place it anywhere!</span>
              </p>
            </div>

            {/* Selected Text / Caption Inspector */}
            {selectedTextOverlay && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-stone-950/70 border border-amber-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Edit Selected Text / Caption
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteTextOverlay(selectedTextOverlay.id)}
                    className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={selectedTextOverlay.text}
                    onChange={(e) =>
                      onUpdateTextOverlay(selectedTextOverlay.id, { text: e.target.value })
                    }
                    className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-semibold"
                  />
                  {selectedTextOverlay.kind === 'lower_third' && (
                    <input
                      type="text"
                      value={selectedTextOverlay.subtitle || ''}
                      onChange={(e) =>
                        onUpdateTextOverlay(selectedTextOverlay.id, { subtitle: e.target.value })
                      }
                      placeholder="Subtitle..."
                      className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <select
                    value={selectedTextOverlay.fontFamily || 'Plus Jakarta Sans'}
                    onChange={(e) =>
                      onUpdateTextOverlay(selectedTextOverlay.id, {
                        fontFamily: e.target.value as TextFontFamily,
                      })
                    }
                    className="px-2.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                  >
                    <option value="Plus Jakarta Sans">Modern Sans</option>
                    <option value="Playfair Display">Editorial Serif</option>
                    <option value="Georgia">Classic Serif</option>
                    <option value="Courier New">Typewriter Mono</option>
                  </select>

                  <select
                    value={selectedTextOverlay.fontSize || 'md'}
                    onChange={(e) =>
                      onUpdateTextOverlay(selectedTextOverlay.id, {
                        fontSize: e.target.value as 'sm' | 'md' | 'lg',
                      })
                    }
                    className="px-2.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                  >
                    <option value="sm">Small Text</option>
                    <option value="md">Medium Text</option>
                    <option value="lg">Large Headline</option>
                  </select>

                  <select
                    value={selectedTextOverlay.animation || 'fade'}
                    onChange={(e) =>
                      onUpdateTextOverlay(selectedTextOverlay.id, {
                        animation: e.target.value as TextAnimationType,
                      })
                    }
                    className="px-2.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs"
                  >
                    <option value="none">No Animation</option>
                    <option value="fade">Smooth Fade</option>
                    <option value="slide_up">Slide Up</option>
                    <option value="pop">Bounce Pop</option>
                    <option value="typewriter">Typewriter</option>
                  </select>

                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                    <span className="text-[11px] text-stone-500">Text</span>
                    <input
                      type="color"
                      value={selectedTextOverlay.color || '#ffffff'}
                      onChange={(e) =>
                        onUpdateTextOverlay(selectedTextOverlay.id, { color: e.target.value })
                      }
                      className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[11px] text-stone-500">Box</span>
                    <input
                      type="color"
                      value={selectedTextOverlay.bgColor || '#0c0a09'}
                      onChange={(e) =>
                        onUpdateTextOverlay(selectedTextOverlay.id, { bgColor: e.target.value })
                      }
                      className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={selectedTextOverlay.startSec}
                      onChange={(e) =>
                        onUpdateTextOverlay(selectedTextOverlay.id, {
                          startSec: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="w-16 px-2 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs tabular-nums"
                      title="Start time (seconds)"
                    />
                    <span>–</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={selectedTextOverlay.endSec}
                      onChange={(e) =>
                        onUpdateTextOverlay(selectedTextOverlay.id, {
                          endSec: Math.max(selectedTextOverlay.startSec + 0.3, parseFloat(e.target.value) || 1),
                        })
                      }
                      className="w-16 px-2 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs tabular-nums"
                      title="End time (seconds)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Inline Captions / Subtitles Editor List */}
            {textOverlays.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  All Titles &amp; Captions ({textOverlays.length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {textOverlays.map((ov) => (
                    <div
                      key={ov.id}
                      onClick={() => onUpdateTextOverlay(ov.id, {})}
                      className={`p-2.5 rounded-xl border flex flex-wrap items-center gap-2 text-xs ${
                        selectedTextOverlay?.id === ov.id
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400'
                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                        {ov.startSec.toFixed(1)}s – {ov.endSec.toFixed(1)}s
                      </span>
                      <input
                        type="text"
                        value={ov.text}
                        onChange={(e) => onUpdateTextOverlay(ov.id, { text: e.target.value })}
                        className="flex-1 min-w-[140px] bg-transparent font-medium text-stone-900 dark:text-stone-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTextOverlay(ov.id);
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                        title="Delete text item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            TAB 5: AI-POWERED EDITING TOOLS
           ============================================================== */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {aiError && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}
            {aiNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{aiNotice}</span>
              </div>
            )}

            {/* One-Click AI Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={Boolean(aiBusyTask) || clips.length === 0}
                onClick={onRunAutoEnhance}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 hover:border-amber-500 text-left space-y-1 transition-all cursor-pointer disabled:opacity-45"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Auto-Enhance Lighting &amp; Color</span>
                  </span>
                  {aiBusyTask === 'enhance' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                </div>
                <p className="text-[11px] text-stone-500">
                  Analyzes kitchen lighting brightness &amp; contrast and applies balanced color polish.
                </p>
              </button>

              <button
                type="button"
                disabled={Boolean(aiBusyTask) || clips.length === 0}
                onClick={onRunAutoRemoveSilence}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 hover:border-amber-500 text-left space-y-1 transition-all cursor-pointer disabled:opacity-45"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-amber-600" />
                    <span>Auto-Remove Silence</span>
                  </span>
                  {aiBusyTask === 'silence' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                </div>
                <p className="text-[11px] text-stone-500">
                  Detects quiet pauses via Web Audio RMS waveform analysis and trims dead air automatically.
                </p>
              </button>

              <button
                type="button"
                disabled={Boolean(aiBusyTask) || clips.length === 0}
                onClick={onRunSceneDetection}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 hover:border-amber-500 text-left space-y-1 transition-all cursor-pointer disabled:opacity-45"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <ScanSearch className="w-4 h-4 text-amber-600" />
                    <span>Auto Scene &amp; Highlight Scan</span>
                  </span>
                  {aiBusyTask === 'scenes' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                </div>
                <p className="text-[11px] text-stone-500">
                  Scans frames to find scene cuts &amp; high-action cooking moments you can keep in 1 click.
                </p>
              </button>

              <button
                type="button"
                disabled={Boolean(aiBusyTask) || clips.length === 0}
                onClick={onRunAutoCaptions}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 hover:border-amber-500 text-left space-y-1 transition-all cursor-pointer disabled:opacity-45"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Captions className="w-4 h-4 text-amber-600" />
                    <span>AI Auto-Captions</span>
                  </span>
                  {aiBusyTask === 'captions' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                </div>
                <p className="text-[11px] text-stone-500">
                  Transcribes spoken narration via Gemini AI into editable, timed subtitle cues.
                </p>
              </button>

              <button
                type="button"
                disabled={Boolean(aiBusyTask)}
                onClick={onRunNoiseReductionAll}
                className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 hover:border-amber-500 text-left space-y-1 transition-all cursor-pointer disabled:opacity-45"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <AudioLines className="w-4 h-4 text-emerald-600" />
                    <span>Background Noise Reduction</span>
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Enables vocal-clarity filtering &amp; FFmpeg FFT denoising across voiceover &amp; extracted tracks.
                </p>
              </button>

              <button
                type="button"
                disabled={Boolean(aiBusyTask) || clips.length === 0}
                onClick={onRunAiCoach}
                className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/25 hover:border-amber-600 text-left space-y-1 transition-all cursor-pointer disabled:opacity-45"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-amber-600" />
                    <span>Gemini Editing Coach</span>
                  </span>
                  {aiBusyTask === 'coach' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Analyzes keyframes &amp; gives personalized hook title, filter &amp; pacing fixes.
                </p>
              </button>
            </div>

            {/* Smart Platform Resizing Bar */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Smart Platform Resize:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { ratio: '9:16' as CropAspectRatio, label: 'Reels / Shorts / TikTok (9:16)', icon: Smartphone },
                  { ratio: '16:9' as CropAspectRatio, label: 'YouTube / Masterclass (16:9)', icon: Monitor },
                  { ratio: '1:1' as CropAspectRatio, label: 'Square Feed (1:1)', icon: SquareIcon },
                  { ratio: '4:5' as CropAspectRatio, label: 'Portrait Feed (4:5)', icon: Film },
                ].map((plat) => {
                  const Icon = plat.icon;
                  return (
                    <button
                      key={plat.ratio}
                      type="button"
                      onClick={() => onChangeCropRatio(plat.ratio)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        cropRatio === plat.ratio
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{plat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detected Scenes & Highlights Results */}
            {aiScenes.length > 0 && (
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Detected Scenes &amp; Smart Highlights ({aiScenes.length})
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Highlights represent scenes with highest cooking motion &amp; visual variety.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={onSplitDetectedScenes}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      Split Into Scene Clips
                    </button>
                    <button
                      type="button"
                      onClick={onKeepHighlightScenesOnly}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Keep Highlights Only
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {aiScenes.map((sc, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border text-xs ${
                        sc.isHighlight
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400'
                          : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>Scene {i + 1}</span>
                        {sc.isHighlight && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-400">Highlight</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 tabular-nums mt-0.5">
                        {sc.startSec.toFixed(1)}s – {sc.endSec.toFixed(1)}s · Motion {sc.motionScore}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gemini AI Editing Coach Output */}
            {aiCoachResult && (
              <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Gemini Editing Coach Recommendations
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      Suggested Hook Title: <strong>&ldquo;{aiCoachResult.recommendedTitleHook}&rdquo;</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyCoachSuggestion('add_title')}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    + Add Hook Title
                  </button>
                </div>

                <div className="space-y-2">
                  {aiCoachResult.suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{sug.title}</p>
                        <p className="text-[11px] text-stone-500">{sug.detail}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyCoachSuggestion(sug.actionType)}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
