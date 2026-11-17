import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AudioLines,
  Radio,
  Film,
  Upload
} from 'lucide-react';
import { AudioTrackItem } from '../../types';
import { probeMediaDurationSec } from '../../lib/videoStorage';

export interface LocalAudioRecording {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  durationSec: number;
  mimeType: string;
  createdAt: string;
}

interface AudioRecorderPanelProps {
  recordings: LocalAudioRecording[];
  onRecordingCreated: (rec: LocalAudioRecording) => void;
  onDeleteRecording: (id: string) => void;
  onRenameRecording: (id: string, name: string) => void;
  onAddToTimeline: (rec: LocalAudioRecording, atPlayhead?: boolean) => void;
  timelineTracks?: AudioTrackItem[];
  hasVideoClips?: boolean;
  currentPlayheadSec?: number;
  onRequestSyncedVideoStart?: () => void;
  onRequestSyncedVideoStop?: () => void;
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AudioRecorderPanel: React.FC<AudioRecorderPanelProps> = ({
  recordings,
  onRecordingCreated,
  onDeleteRecording,
  onRenameRecording,
  onAddToTimeline,
  timelineTracks = [],
  hasVideoClips = false,
  currentPlayheadSec = 0,
  onRequestSyncedVideoStart,
  onRequestSyncedVideoStop,
}) => {
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [micPermissionState, setMicPermissionState] = useState<'idle' | 'ready' | 'denied'>('idle');
  const [micError, setMicError] = useState<string | null>(null);
  const [micGain, setMicGain] = useState<number>(1.0); // 0.0 to 2.0
  const [syncWithVideo, setSyncWithVideo] = useState<boolean>(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [peakLevel, setPeakLevel] = useState<number>(0);
  const [supportsPause, setSupportsPause] = useState<boolean>(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [trackTitleDraft, setTrackTitleDraft] = useState<string>('');

  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const uploadAudioInputRef = useRef<HTMLInputElement | null>(null);

  const loadAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      setAvailableMics(mics);
      if (mics.length > 0 && !selectedMicId) {
        setSelectedMicId(mics[0].deviceId);
      }
    } catch {
      // ignore enumeration errors
    }
  }, [selectedMicId]);

  const stopWaveformAndHardware = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    gainNodeRef.current = null;
    analyserRef.current = null;
    setPeakLevel(0);
  }, []);

  useEffect(() => {
    loadAudioDevices();
    return () => {
      stopWaveformAndHardware();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, [loadAudioDevices, stopWaveformAndHardware]);

  // Live microphone volume adjustment while armed or recording
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(micGain, audioCtxRef.current.currentTime, 0.02);
    }
  }, [micGain]);

  const drawWaveformLoop = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(timeData);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Subtle grid centerline
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Calculate peak & draw live waveform
      let maxDev = 0;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = recordingState === 'recording' ? '#f59e0b' : '#d97706';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0;
        const dev = Math.abs(v - 1.0);
        if (dev > maxDev) maxDev = dev;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      setPeakLevel(Math.min(100, Math.round(maxDev * 220)));
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
  }, [recordingState]);

  const armMicrophone = async (deviceIdOverride?: string): Promise<MediaStream | null> => {
    setMicError(null);
    stopWaveformAndHardware();

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone recording is not supported on this browser or insecure connection.');
      setMicPermissionState('denied');
      return null;
    }

    try {
      const targetId = deviceIdOverride || selectedMicId;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: targetId
          ? {
              deviceId: { exact: targetId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false,
            },
      });

      rawStreamRef.current = stream;
      setMicPermissionState('ready');
      await loadAudioDevices();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = micGain;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      const dest = audioCtx.createMediaStreamDestination();

      source.connect(gainNode);
      gainNode.connect(analyser);
      gainNode.connect(dest);

      gainNodeRef.current = gainNode;
      analyserRef.current = analyser;

      drawWaveformLoop();
      return dest.stream;
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Microphone permission denied. Enable microphone access in browser settings and retry.'
          : err?.name === 'NotFoundError'
          ? 'No microphone detected. Connect a microphone or headset and try again.'
          : err?.message || 'Unable to access microphone.';
      setMicError(msg);
      setMicPermissionState('denied');
      return null;
    }
  };

  const handleStartAudioRecording = async () => {
    const processedStream = await armMicrophone();
    if (!processedStream) return;

    chunksRef.current = [];
    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    let selectedMime = '';
    for (const t of preferredTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        selectedMime = t;
        break;
      }
    }

    try {
      const recorder = selectedMime
        ? new MediaRecorder(processedStream, { mimeType: selectedMime })
        : new MediaRecorder(processedStream);

      setSupportsPause(typeof recorder.pause === 'function' && typeof recorder.resume === 'function');
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (syncWithVideo && onRequestSyncedVideoStop) {
          onRequestSyncedVideoStop();
        }

        const mime = recorder.mimeType || selectedMime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size > 0) {
          const measuredSec = await probeMediaDurationSec(blob, 'audio');
          const durationSec = measuredSec > 0 ? measuredSec : Math.max(1, recordingSeconds);
          const id = `vo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const defaultName =
            trackTitleDraft.trim() || `Voiceover ${recordings.length + 1}`;
          const rec: LocalAudioRecording = {
            id,
            name: defaultName,
            blob,
            url: URL.createObjectURL(blob),
            durationSec,
            mimeType: mime,
            createdAt: new Date().toISOString(),
          };
          onRecordingCreated(rec);
          setTrackTitleDraft('');
        }
        setRecordingState('idle');
        setRecordingSeconds(0);
        stopWaveformAndHardware();
      };

      recorder.start(500);
      setRecordingState('recording');
      setRecordingSeconds(0);

      if (syncWithVideo && hasVideoClips && onRequestSyncedVideoStart) {
        onRequestSyncedVideoStart();
      }

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setMicError(err?.message || 'Failed to start microphone recorder.');
      stopWaveformAndHardware();
    }
  };

  const handlePauseAudio = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== 'recording') return;
    try {
      rec.pause();
      setRecordingState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (syncWithVideo && onRequestSyncedVideoStop) {
        onRequestSyncedVideoStop();
      }
    } catch {
      // ignore
    }
  };

  const handleResumeAudio = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== 'paused') return;
    try {
      rec.resume();
      setRecordingState('recording');
      if (syncWithVideo && hasVideoClips && onRequestSyncedVideoStart) {
        onRequestSyncedVideoStart();
      }
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      // ignore
    }
  };

  const handleStopAudio = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        setRecordingState('idle');
        stopWaveformAndHardware();
      }
    }
  };

  const togglePlayRecording = (rec: LocalAudioRecording) => {
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.onended = () => setPlayingId(null);
    }
    const audioEl = previewAudioRef.current;

    if (playingId === rec.id) {
      audioEl.pause();
      setPlayingId(null);
      return;
    }

    audioEl.src = rec.url;
    audioEl.play().then(() => setPlayingId(rec.id)).catch(() => setPlayingId(null));
  };

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const durationSec = (await probeMediaDurationSec(file, 'audio')) || 5;
    const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanName = file.name.replace(/\.[^.]+$/, '') || `Audio ${recordings.length + 1}`;
    onRecordingCreated({
      id,
      name: cleanName,
      blob: file,
      url: URL.createObjectURL(file),
      durationSec,
      mimeType: file.type || 'audio/mpeg',
      createdAt: new Date().toISOString(),
    });
    e.target.value = '';
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-4 sm:p-6 space-y-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/15 text-amber-600 flex items-center justify-center shrink-0">
            <AudioLines className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-display text-lg font-bold text-stone-900 dark:text-stone-100">
              Microphone &amp; Voiceover Studio
            </h3>
            <p className="text-xs text-stone-500">
              Record commentary, narration, or multiple voiceovers synchronized with your video timeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={uploadAudioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            onChange={handleUploadAudioFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => uploadAudioInputRef.current?.click()}
            className="px-3 py-2 min-h-[40px] rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-amber-600" />
            <span>Import Audio</span>
          </button>
          <button
            type="button"
            onClick={() => armMicrophone()}
            disabled={recordingState !== 'idle'}
            className="px-3 py-2 min-h-[40px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span>Test Mic</span>
          </button>
        </div>
      </div>

      {/* Microphone Error Banner */}
      {micError && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Microphone Access Needed</p>
            <p className="mt-0.5">{micError}</p>
          </div>
        </div>
      )}

      {/* Mic Device, Input Gain & Track Name Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
            Microphone Source
          </label>
          <select
            value={selectedMicId}
            disabled={recordingState !== 'idle'}
            onChange={(e) => {
              setSelectedMicId(e.target.value);
              if (micPermissionState === 'ready') {
                armMicrophone(e.target.value);
              }
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-100"
          >
            {availableMics.length === 0 ? (
              <option value="">Default System / External Microphone</option>
            ) : (
              availableMics.map((m, idx) => (
                <option key={m.deviceId || idx} value={m.deviceId}>
                  {m.label || `Microphone ${idx + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
            Voiceover Label (Optional)
          </label>
          <input
            type="text"
            value={trackTitleDraft}
            onChange={(e) => setTrackTitleDraft(e.target.value)}
            placeholder={`Voiceover ${recordings.length + 1} (e.g. Step 2 Sauce Tip)`}
            className="w-full px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              {micGain === 0 ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-amber-600" />}
              <span>Mic Input Volume</span>
            </label>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {Math.round(micGain * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={micGain}
            onChange={(e) => setMicGain(parseFloat(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer mt-1.5"
          />
        </div>
      </div>

      {/* Live Waveform Visualizer Stage */}
      <div className="relative rounded-2xl bg-stone-950 border border-stone-800 p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {recordingState === 'recording' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-[11px] font-bold">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                RECORDING AUDIO
              </span>
            ) : recordingState === 'paused' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-bold">
                PAUSED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-800 text-stone-300 text-[11px] font-semibold">
                <Mic className="w-3.5 h-3.5 text-amber-500" />
                {micPermissionState === 'ready' ? 'MICROPHONE ARMED' : 'READY TO RECORD AUDIO'}
              </span>
            )}
            <span className="font-mono text-sm font-bold text-white tabular-nums">
              {formatTimer(recordingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider">Input Peak</span>
            <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  peakLevel > 82 ? 'bg-red-500' : peakLevel > 45 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${peakLevel}%` }}
              />
            </div>
          </div>
        </div>

        <canvas
          ref={waveformCanvasRef}
          width={760}
          height={92}
          className="w-full h-24 rounded-xl bg-stone-900/90 border border-stone-800/80"
        />

        {/* Recorder Primary Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={handleStartAudioRecording}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <Mic className="w-4 h-4" />
                <span>Start Voice Recording</span>
              </button>
            )}

            {recordingState === 'recording' && (
              <>
                {supportsPause && (
                  <button
                    type="button"
                    onClick={handlePauseAudio}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStopAudio}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-red-600 text-red-600" />
                  <span>Stop &amp; Save Audio</span>
                </button>
              </>
            )}

            {recordingState === 'paused' && (
              <>
                <button
                  type="button"
                  onClick={handleResumeAudio}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopAudio}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-red-600 text-red-600" />
                  <span>Finish &amp; Save</span>
                </button>
              </>
            )}
          </div>

          {hasVideoClips && (
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={syncWithVideo}
                onChange={(e) => setSyncWithVideo(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>Play Timeline Video While Recording ({currentPlayheadSec.toFixed(1)}s)</span>
            </label>
          )}
        </div>
      </div>

      {/* Recorded Voiceovers & Audio Library */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
            Recorded &amp; Imported Voice Clips ({recordings.length})
          </h4>
          {recordings.length > 0 && (
            <span className="text-[11px] text-stone-500">
              Preview clips or attach multiple voiceovers to your video timeline
            </span>
          )}
        </div>

        {recordings.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
            No voice recordings yet. Click <strong className="text-stone-800 dark:text-stone-200">Start Voice Recording</strong> above or import an audio file.
          </div>
        ) : (
          <div className="space-y-2">
            {recordings.map((rec) => {
              const isPlaying = playingId === rec.id;
              const isOnTimeline = timelineTracks.some((t) => t.id === rec.id);
              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => togglePlayRecording(rec)}
                      className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shrink-0 cursor-pointer"
                      aria-label={isPlaying ? 'Pause audio preview' : 'Play audio preview'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={rec.name}
                        onChange={(e) => onRenameRecording(rec.id, e.target.value)}
                        className="w-full max-w-xs text-xs font-bold bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none text-stone-900 dark:text-stone-100"
                      />
                      <p className="text-[11px] text-stone-500 tabular-nums mt-0.5">
                        {rec.durationSec.toFixed(1)}s &bull; {(rec.blob.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOnTimeline ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        On Timeline
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddToTimeline(rec, true)}
                        className="px-3 py-2 min-h-[38px] rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add at {currentPlayheadSec.toFixed(1)}s</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (playingId === rec.id && previewAudioRef.current) {
                          previewAudioRef.current.pause();
                          setPlayingId(null);
                        }
                        onDeleteRecording(rec.id);
                      }}
                      className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center cursor-pointer"
                      title="Delete voice recording"
                      aria-label="Delete voice recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
