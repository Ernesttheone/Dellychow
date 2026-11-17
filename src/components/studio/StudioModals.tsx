import React, { useState } from 'react';
import {
  X,
  Check,
  Loader2,
  Download,
  Upload,
  Save,
  Sparkles,
  Keyboard,
  FolderOpen,
  Copy,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Film,
  HelpCircle,
  Wand2,
} from 'lucide-react';
import {
  CropAspectRatio,
  ExportQualityPreset,
  ExportResolutionPreset,
  StudioExportSettings,
  VideoStudioProject,
} from '../../types';

// ============================================================================
// 1. Beginner First-Time Guided Tutorial Modal
// ============================================================================

export const StudioTutorialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  if (!isOpen) return null;

  const slides = [
    {
      title: 'Welcome to DellyChow Video Studio',
      body: 'Everything sits in one calm workspace: your big video preview is on top, your multi-track timeline sits underneath, and beginner-friendly editing tools are grouped cleanly below.',
      tip: 'No prior editing experience required — use Undo anytime or let Autosave protect your work.',
    },
    {
      title: 'Trim, Split & Rearrange in Seconds',
      body: 'Click or tap any clip on the V1 Main track to trim its edges, adjust speed, flip/rotate, or move the red playhead where you want to make a cut and tap Split Clip.',
      tip: 'Keyboard shortcut: Press Space to Play/Pause and S to Split at the playhead.',
    },
    {
      title: 'Add Voiceovers, Music & Drag-Anywhere Text',
      body: 'Open Audio & Music to record microphone commentary in sync with your video or preview culinary background tracks. In Text & Captions, add titles or captions and drag them right on the video screen.',
      tip: 'Try AI Auto-Captions or Auto-Remove Silence under AI Tools to finish edits twice as fast.',
    },
    {
      title: 'Save Drafts or Export & Publish',
      body: 'Save unfinished projects anytime and resume them from Projects & Drafts. When ready, choose 720p, 1080p, 4K, Portrait 9:16, or Landscape 16:9 — your original clip stays untouched unless you choose to replace it.',
      tip: 'You can replay this guide anytime from the Help button in the top studio bar.',
    },
  ];

  const current = slides[step];

  return (
    <div
      className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-lg w-full p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Quick Guide · Step {step + 1} of {slides.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="font-serif-display text-xl font-bold text-stone-900 dark:text-stone-100">
            {current.title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            {current.body}
          </p>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
            <strong>Tip:</strong> {current.tip}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold cursor-pointer"
          >
            {step > 0 ? 'Back' : 'Skip Tour'}
          </button>
          <button
            type="button"
            onClick={() => (step < slides.length - 1 ? setStep(step + 1) : onClose())}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
          >
            {step < slides.length - 1 ? 'Next Step' : 'Start Editing'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. Beginner Editing Templates Modal
// ============================================================================

export interface BeginnerTemplatePreset {
  id: string;
  name: string;
  subtitle: string;
  cropRatio: CropAspectRatio;
  filterPreset: 'warm_kitchen' | 'crisp_studio' | 'golden_hour' | 'vintage_film';
  titleText: string;
  overlayPreset?: 'warm_vignette' | 'cinematic_bars' | 'golden_border';
  musicPresetId?: string;
}

export const BEGINNER_STUDIO_TEMPLATES: BeginnerTemplatePreset[] = [
  {
    id: 'short_recipe_reel',
    name: 'Quick Recipe Reel (9:16)',
    subtitle: 'Vertical format, vibrant Golden Hour look, hook title & snappy rhythm music',
    cropRatio: '9:16',
    filterPreset: 'golden_hour',
    titleText: '3-Minute Secret Recipe',
    overlayPreset: 'golden_border',
    musicPresetId: 'street_food_spark',
  },
  {
    id: 'cinematic_masterclass',
    name: 'Cinematic Chef Masterclass (16:9)',
    subtitle: 'Widescreen cinema bars, Warm Kitchen color polish & acoustic ambiance',
    cropRatio: '16:9',
    filterPreset: 'warm_kitchen',
    titleText: 'Chef Technique Walkthrough',
    overlayPreset: 'cinematic_bars',
    musicPresetId: 'warm_morning_acoustic',
  },
  {
    id: 'voiceover_tutorial',
    name: 'Crisp Step-by-Step Tutorial',
    subtitle: 'Clean Crisp Studio contrast, vignette focus & gentle lower-third ready',
    cropRatio: '16:9',
    filterPreset: 'crisp_studio',
    titleText: 'Step 1: Prep Your Ingredients',
    overlayPreset: 'warm_vignette',
    musicPresetId: 'lofi_bistro_prep',
  },
  {
    id: 'square_feed_card',
    name: 'Square Tasting Showcase (1:1)',
    subtitle: 'Square 1:1 crop, warm vintage glow & evening piano underscore',
    cropRatio: '1:1',
    filterPreset: 'vintage_film',
    titleText: 'Plating & Final Garnish',
    musicPresetId: 'calm_evening_plating',
  },
];

export const StudioTemplatesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (tpl: BeginnerTemplatePreset) => Promise<void>;
}> = ({ isOpen, onClose, onApplyTemplate }) => {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-2xl w-full p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-600" />
            <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              1-Click Beginner Editing Templates
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BEGINNER_STUDIO_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              disabled={Boolean(applyingId)}
              onClick={async () => {
                setApplyingId(tpl.id);
                try {
                  await onApplyTemplate(tpl);
                  onClose();
                } finally {
                  setApplyingId(null);
                }
              }}
              className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 bg-stone-50 dark:bg-stone-800/60 text-left space-y-1.5 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  {tpl.name}
                </span>
                {applyingId === tpl.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                )}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">{tpl.subtitle}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. Projects & Drafts Manager Modal
// ============================================================================

export const StudioProjectsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  projects: VideoStudioProject[];
  currentProjectId: string;
  autosaveProject: VideoStudioProject | null;
  onRestoreAutosave: (proj: VideoStudioProject) => void;
  onCreateNewProject: () => void;
  onLoadProject: (proj: VideoStudioProject) => void;
  onRenameProject: (proj: VideoStudioProject, newName: string) => Promise<void>;
  onDuplicateProject: (proj: VideoStudioProject) => Promise<void>;
  onRequestDeleteProject: (proj: VideoStudioProject) => void;
}> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  autosaveProject,
  onRestoreAutosave,
  onCreateNewProject,
  onLoadProject,
  onRenameProject,
  onDuplicateProject,
  onRequestDeleteProject,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-600" />
            <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              Video Projects &amp; Saved Drafts ({projects.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateNewProject();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Latest Autosave Recovery Card */}
        {autosaveProject && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                Latest Autosave Available: &ldquo;{autosaveProject.title}&rdquo;
              </p>
              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                Saved {new Date(autosaveProject.updatedAt).toLocaleString()} · {autosaveProject.clips.length} clips
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onRestoreAutosave(autosaveProject);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
            >
              Restore Autosave
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {projects.length === 0 ? (
            <div className="p-10 text-center text-xs text-stone-500 border border-dashed border-stone-300 dark:border-stone-700 rounded-2xl">
              No saved video studio drafts yet. Your edits autosave automatically or click Save Draft in the studio bar.
            </div>
          ) : (
            projects.map((p) => {
              const isCurrent = p.id === currentProjectId;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-400'
                      : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {renamingId === p.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-amber-500 text-xs font-bold"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            await onRenameProject(p, renameText);
                            setRenamingId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {p.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-[10px] font-bold uppercase text-stone-700 dark:text-stone-200">
                          {p.status}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {p.clips.length} clips · {p.audioTracks.length} audio · {p.textOverlays.length} text · Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadProject(p);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                    >
                      {isCurrent ? 'Active' : 'Open'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(p.id);
                        setRenameText(p.title);
                      }}
                      title="Rename project"
                      className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={async () => {
                        setBusyId(p.id);
                        try {
                          await onDuplicateProject(p);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      title="Duplicate project"
                      className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteProject(p)}
                      title="Delete project"
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. Help & Keyboard Shortcuts Modal
// ============================================================================

export const StudioHelpModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReplayTutorial: () => void;
}> = ({ isOpen, onClose, onReplayTutorial }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-lg w-full p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-600" />
            <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              Help &amp; Keyboard Shortcuts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {[
            ['Space', 'Play / Pause Video'],
            ['S', 'Split Clip at Playhead'],
            ['Ctrl / Cmd + Z', 'Undo Last Edit'],
            ['Ctrl / Cmd + Y', 'Redo Edit'],
            ['Left / Right Arrow', 'Step 1s Backward / Forward'],
            ['Drag Text on Video', 'Position Text Anywhere'],
          ].map(([key, desc]) => (
            <div
              key={key}
              className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700"
            >
              <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400 block">
                {key}
              </span>
              <span className="text-stone-600 dark:text-stone-300">{desc}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onReplayTutorial();
            }}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Replay Guided Tour</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. Confirmation Modal (replaces any browser confirm dialog)
// ============================================================================

export const StudioConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ isOpen, title, message, confirmLabel = 'Delete', onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-70 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-md w-full p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. Export, Draft Save & Publish Modal
// ============================================================================

export const StudioExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings: StudioExportSettings;
  onChangeSettings: (next: StudioExportSettings) => void;
  exporting: boolean;
  progressPct: number;
  progressStage: string;
  exportError: string | null;
  exportedResult: { url: string; filename: string; size: number; durationSec: number } | null;
  onStartExport: () => void;
  onSaveExportedAsDraft: () => Promise<void>;
  onPublishExportedToWebsite: () => void;
}> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  exporting,
  progressPct,
  progressStage,
  exportError,
  exportedResult,
  onStartExport,
  onSaveExportedAsDraft,
  onPublishExportedToWebsite,
}) => {
  const [savingDraft, setSavingDraft] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !exporting && onClose()}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-600" />
            <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              Export Edited Video
            </h3>
          </div>
          {!exporting && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Settings Form (shown before or while configuring) */}
        {!exportedResult && !exporting && (
          <div className="space-y-4">
            {/* Resolution */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Export Resolution
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: '720p', label: '720p HD', sub: 'Fast upload' },
                    { id: '1080p', label: '1080p Full HD', sub: 'Recommended' },
                    { id: '4k', label: '4K Ultra HD', sub: 'Crisp detail' },
                    { id: 'custom', label: 'Custom Size', sub: 'Set W × H' },
                  ] as Array<{ id: ExportResolutionPreset; label: string; sub: string }>
                ).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onChangeSettings({ ...settings, resolution: r.id })}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                      settings.resolution === r.id
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60'
                    }`}
                  >
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{r.label}</p>
                    <p className="text-[10px] text-stone-500">{r.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {settings.resolution === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">Width (px)</label>
                  <input
                    type="number"
                    min="320"
                    max="3840"
                    step="2"
                    value={settings.customWidth}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        customWidth: Math.max(320, Math.min(3840, parseInt(e.target.value, 10) || 1280)),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">Height (px)</label>
                  <input
                    type="number"
                    min="320"
                    max="3840"
                    step="2"
                    value={settings.customHeight}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        customHeight: Math.max(320, Math.min(3840, parseInt(e.target.value, 10) || 720)),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs tabular-nums"
                  />
                </div>
              </div>
            )}

            {/* Format / Aspect Ratio + Quality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Format / Orientation
                </label>
                <select
                  value={settings.aspectRatio}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, aspectRatio: e.target.value as CropAspectRatio })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold"
                >
                  <option value="16:9">Landscape Widescreen (16:9)</option>
                  <option value="9:16">Portrait Mobile / Reels (9:16)</option>
                  <option value="1:1">Square Social Feed (1:1)</option>
                  <option value="4:5">Vertical Feed (4:5)</option>
                  <option value="original">Keep Original</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Compression Quality
                </label>
                <select
                  value={settings.quality}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, quality: e.target.value as ExportQualityPreset })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold"
                >
                  <option value="standard">Standard (Smaller File)</option>
                  <option value="high">High Quality (Recommended)</option>
                  <option value="ultra">Ultra Master (Studio Lossless-Grade)</option>
                </select>
              </div>
            </div>

            {/* Original Video Preservation Option */}
            <label className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-start gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={settings.replaceOriginal}
                onChange={(e) =>
                  onChangeSettings({ ...settings, replaceOriginal: e.target.checked })
                }
                className="mt-0.5 accent-amber-600"
              />
              <div>
                <span className="font-bold text-stone-900 dark:text-stone-100 block">
                  Replace original uploaded clip reference
                </span>
                <span className="text-[11px] text-stone-500">
                  Leave unchecked to safely preserve your original raw uploaded video alongside your new edited export.
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Rendering Progress Bar */}
        {exporting && (
          <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>{progressStage || 'Rendering video...'}</span>
              </span>
              <span className="font-bold text-amber-600 tabular-nums">{progressPct}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-500 text-center">
              Processing video cuts, filters, text layers &amp; audio mix on DellyChow render server...
            </p>
          </div>
        )}

        {/* Export Error + Retry */}
        {exportError && !exporting && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Export could not complete</p>
                <p className="mt-0.5">{exportError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onStartExport}
              className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Export Complete -> Preview + Save to Drafts / Publish Directly */}
        {exportedResult && !exporting && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Edited Video Rendered &amp; Ready!</p>
                <p className="text-[11px] opacity-85">
                  Duration: {exportedResult.durationSec.toFixed(1)}s · Size: {(exportedResult.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>

            <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-stone-800">
              <video
                src={exportedResult.url}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <a
                href={exportedResult.url}
                download={exportedResult.filename}
                className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Download MP4</span>
              </a>

              <button
                type="button"
                disabled={savingDraft}
                onClick={async () => {
                  setSavingDraft(true);
                  try {
                    await onSaveExportedAsDraft();
                  } finally {
                    setSavingDraft(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                <span>Save to Drafts</span>
              </button>

              <button
                type="button"
                onClick={onPublishExportedToWebsite}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Publish to Website</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions before Export Starts */}
        {!exportedResult && !exporting && (
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold cursor-pointer"
            >
              Back to Studio
            </button>
            <button
              type="button"
              onClick={onStartExport}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Video Export</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
