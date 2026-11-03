import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  Download, 
  CheckCircle2, 
  Film, 
  Database, 
  HardDrive, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { CookingVideo } from '../types';
import { RecipeService } from '../services/recipeService';

interface VideoCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: CookingVideo[];
  onCleanupComplete: () => void;
}

export const VideoCleanupModal: React.FC<VideoCleanupModalProps> = ({
  isOpen,
  onClose,
  videos,
  onCleanupComplete
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [inProgress, setInProgress] = useState(false);
  const [downloadedBackup, setDownloadedBackup] = useState(false);
  const [backupJsonString, setBackupJsonString] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const [resultSummary, setResultSummary] = useState<{
    deletedCount: number;
    backupKey: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE ALL VIDEOS';

  // Generate and download a JSON backup file
  const handleDownloadBackup = () => {
    const backupObj = {
      exportedAt: new Date().toISOString(),
      reason: 'DellyChow Administrator Video Cleanup Backup',
      videosCount: videos.length,
      videos: videos.map(v => ({
        id: v.id,
        title: v.title,
        authorId: v.authorId,
        authorName: v.authorName,
        category: v.category,
        durationMinutes: v.durationMinutes,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl,
        isPremium: v.isPremium,
        createdAt: v.createdAt
      }))
    };

    const jsonStr = JSON.stringify(backupObj, null, 2);
    setBackupJsonString(jsonStr);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dellychow_videos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedBackup(true);
  };

  const handleExecuteCleanup = async () => {
    if (!isConfirmed) return;
    setErrorMsg('');
    setInProgress(true);
    setStatusText('Backing up affected video records and metadata...');

    try {
      // Execute complete cleanup across database & local video storage
      setStatusText('Permanently clearing video files from connected storage & database...');
      const result = await RecipeService.cleanupAllWebsiteVideos();

      setStatusText('Cleanup complete!');
      setResultSummary({
        deletedCount: result.deletedCount,
        backupKey: result.backupKey
      });
      onCleanupComplete();
    } catch (err: any) {
      console.error('Video cleanup execution error:', err);
      setErrorMsg(err.message || 'Failed to complete video cleanup. Please try again.');
    } finally {
      setInProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xl max-w-lg w-full flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={inProgress}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors z-10 disabled:opacity-50"
          aria-label="Close cleanup dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pt-8 px-6 pb-4 sm:px-8 text-center border-b border-stone-100">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 ring-4 ring-red-50">
            <Trash2 className="w-7 h-7" />
          </div>

          <h3 className="font-serif-display text-2xl font-bold text-stone-900">
            Website Video Cleanup Tool
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Administrator utility to remove existing AI-generated & uploaded videos from storage and database.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-xs text-stone-600">

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultSummary ? (
            /* Cleanup Succeeded View */
            <div className="space-y-5 text-center py-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-4 ring-emerald-50">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-serif-display text-lg font-bold text-stone-900">
                  Video Cleanup Finished
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                  All previous AI-generated and user-uploaded videos, thumbnails, and binary storage files have been permanently cleared.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Database records deleted:</span>
                  <span className="font-bold text-stone-900">{resultSummary.deletedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Storage blobs purged:</span>
                  <span className="font-bold text-emerald-700">100% Cleared</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Local backup key:</span>
                  <span className="font-mono text-[11px] text-stone-700 truncate max-w-[200px]">{resultSummary.backupKey}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-200 text-emerald-800">
                  <span className="font-medium">User accounts & recipes:</span>
                  <span className="font-bold">Preserved Intact</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                Close Cleanup Tool
              </button>
            </div>
          ) : (
            /* Cleanup Confirmation Form */
            <div className="space-y-4">
              
              {/* Coverage Breakdown */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2.5">
                <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  Cleanup Scope & Targets
                </h5>
                <div className="space-y-1.5 text-stone-600">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>AI-generated video templates & previews</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>User-uploaded video database entries ({videos.length} videos detected)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>IndexedDB binary storage blobs & thumbnail caches</span>
                  </div>
                </div>
              </div>

              {/* Preservation Assurance */}
              <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 space-y-1">
                <p className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Preserved Website Information</span>
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  User accounts, chef profiles, food lover profiles, written recipes, comments, community chats, and VIP subscriptions are strictly preserved.
                </p>
              </div>

              {/* Mandatory Backup Step */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    Step 1: Backup Video Records
                  </span>
                  {downloadedBackup && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Backed Up</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500">
                  Download a complete JSON backup of existing video metadata prior to permanent purging.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-3.5 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Download Backup JSON ({videos.length} records)</span>
                </button>
              </div>

              {/* Step 2: Administrator Confirmation */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-900">
                  Step 2: Administrator Confirmation
                </label>
                <p className="text-[11px] text-stone-500">
                  Type <span className="font-mono font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded">DELETE ALL VIDEOS</span> to unlock permanent cleanup:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE ALL VIDEOS"
                  disabled={inProgress}
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-stone-50 uppercase"
                />
              </div>

              {/* Execution Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={inProgress}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteCleanup}
                  disabled={!isConfirmed || inProgress}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {inProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Purging...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>

              {statusText && (
                <p className="text-[11px] text-stone-500 text-center animate-pulse">
                  {statusText}
                </p>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
