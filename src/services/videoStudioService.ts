import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VideoStudioProject } from '../types';

const IDB_NAME = 'dellychow_studio_media';
const IDB_VERSION = 1;
const IDB_STORE = 'media_blobs';
const LOCAL_DRAFTS_PREFIX = 'dellychow_studio_drafts_';
const LOCAL_AUTOSAVE_PREFIX = 'dellychow_studio_autosave_';

// ============================================================================
// IndexedDB Blob Storage (for large video & audio draft recordings/files)
// ============================================================================

function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(IDB_STORE)) {
        database.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open Studio IndexedDB'));
  });
}

export async function saveMediaBlobToIndexedDb(mediaId: string, blob: Blob): Promise<void> {
  try {
    const database = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, mediaId);
      tx.oncomplete = () => {
        database.close();
        resolve();
      };
      tx.onerror = () => {
        database.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn('[Studio IndexedDB] Save notice:', err);
  }
}

export async function getMediaBlobFromIndexedDb(mediaId: string): Promise<Blob | null> {
  try {
    const database = await openStudioDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = database.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(mediaId);
      req.onsuccess = () => {
        database.close();
        resolve((req.result as Blob) || null);
      };
      req.onerror = () => {
        database.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function deleteMediaBlobFromIndexedDb(mediaId: string): Promise<void> {
  try {
    const database = await openStudioDb();
    await new Promise<void>((resolve) => {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(mediaId);
      tx.oncomplete = () => {
        database.close();
        resolve();
      };
      tx.onerror = () => {
        database.close();
        resolve();
      };
    });
  } catch {
    // ignore
  }
}

// ============================================================================
// Draft Video Projects Persistence (Firestore + LocalStorage Safe Mirror)
// ============================================================================

function readLocalDrafts(userId: string): VideoStudioProject[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_DRAFTS_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalDrafts(userId: string, projects: VideoStudioProject[]): void {
  try {
    localStorage.setItem(`${LOCAL_DRAFTS_PREFIX}${userId}`, JSON.stringify(projects.slice(0, 20)));
  } catch (err) {
    console.warn('[Studio LocalDrafts] Write notice:', err);
  }
}

export const VideoStudioService = {
  generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  createBlankProject(
    userId: string,
    seed?: Partial<VideoStudioProject>
  ): VideoStudioProject {
    const now = new Date().toISOString();
    return {
      id: seed?.id || this.generateProjectId(),
      userId,
      title: seed?.title || 'Untitled Culinary Video',
      description: seed?.description || '',
      category: seed?.category || 'Technique',
      recipeId: seed?.recipeId || '',
      isPremium: Boolean(seed?.isPremium),
      durationMinutes: seed?.durationMinutes ?? 5,
      prepTimeMinutes: seed?.prepTimeMinutes ?? 10,
      thumbnailUrl: seed?.thumbnailUrl || '',
      cropRatio: seed?.cropRatio || '16:9',
      rotation: seed?.rotation ?? 0,
      bgColor: seed?.bgColor || '#0c0a09',
      originalAudioVolume: seed?.originalAudioVolume ?? 1,
      originalAudioMuted: Boolean(seed?.originalAudioMuted),
      clips: seed?.clips || [],
      audioTracks: seed?.audioTracks || [],
      textOverlays: seed?.textOverlays || [],
      overlayEffects: seed?.overlayEffects || [],
      exportSettings: seed?.exportSettings || {
        resolution: '1080p',
        aspectRatio: seed?.cropRatio || '16:9',
        customWidth: 1920,
        customHeight: 1080,
        quality: 'high',
        replaceOriginal: false,
      },
      sourceVideoUrl: seed?.sourceVideoUrl,
      exportedVideoUrl: seed?.exportedVideoUrl,
      calories: seed?.calories ?? '',
      protein: seed?.protein || '',
      carbs: seed?.carbs || '',
      fat: seed?.fat || '',
      status: seed?.status || 'draft',
      publishedVideoId: seed?.publishedVideoId,
      createdAt: seed?.createdAt || now,
      updatedAt: now,
    };
  },

  saveAutosaveSnapshot(project: VideoStudioProject): void {
    if (!project?.userId) return;
    try {
      const snapshot: VideoStudioProject = {
        ...project,
        thumbnailUrl:
          project.thumbnailUrl && project.thumbnailUrl.length > 80_000
            ? ''
            : project.thumbnailUrl,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `${LOCAL_AUTOSAVE_PREFIX}${project.userId}`,
        JSON.stringify(snapshot)
      );
    } catch {
      // ignore quota failure
    }
  },

  getLatestAutosave(userId: string): VideoStudioProject | null {
    if (!userId) return null;
    try {
      const raw = localStorage.getItem(`${LOCAL_AUTOSAVE_PREFIX}${userId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as VideoStudioProject;
      if (!parsed?.id || !Array.isArray(parsed.clips)) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  clearAutosaveSnapshot(userId: string): void {
    if (!userId) return;
    try {
      localStorage.removeItem(`${LOCAL_AUTOSAVE_PREFIX}${userId}`);
    } catch {
      // ignore
    }
  },

  async saveDraftProject(project: VideoStudioProject): Promise<VideoStudioProject> {
    const updated: VideoStudioProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    // Always update local mirror immediately for instant offline-capable recovery
    const existingLocal = readLocalDrafts(updated.userId);
    const nextLocal = [updated, ...existingLocal.filter((p) => p.id !== updated.id)];
    writeLocalDrafts(updated.userId, nextLocal);

    // Strip huge data URI thumbnails if Firestore document approaches limit, keep compact metadata
    const firestoreSafe: VideoStudioProject = {
      ...updated,
      thumbnailUrl:
        updated.thumbnailUrl && updated.thumbnailUrl.length > 250_000
          ? updated.thumbnailUrl.slice(0, 250_000)
          : updated.thumbnailUrl,
    };

    try {
      await setDoc(doc(db, 'video_projects', updated.id), firestoreSafe, { merge: true });
    } catch (err) {
      console.warn('[Studio Drafts] Firestore sync notice (saved locally):', err);
    }

    return updated;
  },

  async renameProject(
    project: VideoStudioProject,
    newTitle: string
  ): Promise<VideoStudioProject> {
    const trimmed = newTitle.trim() || project.title;
    return this.saveDraftProject({
      ...project,
      title: trimmed,
    });
  },

  async duplicateProject(
    project: VideoStudioProject
  ): Promise<VideoStudioProject> {
    const newId = this.generateProjectId();
    const now = new Date().toISOString();

    const clipIdMap = new Map<string, string>();
    const clonedClips = await Promise.all(
      project.clips.map(async (c, idx) => {
        const clonedClipId = `${c.id}_copy_${Date.now().toString(36)}_${idx}`;
        clipIdMap.set(c.id, clonedClipId);
        const existingBlob = await getMediaBlobFromIndexedDb(c.id);
        if (existingBlob) {
          await saveMediaBlobToIndexedDb(clonedClipId, existingBlob);
        }
        return { ...c, id: clonedClipId };
      })
    );

    const clonedAudio = await Promise.all(
      project.audioTracks.map(async (a, idx) => {
        const clonedAudioId = `${a.id}_copy_${Date.now().toString(36)}_${idx}`;
        const existingBlob = await getMediaBlobFromIndexedDb(a.id);
        if (existingBlob) {
          await saveMediaBlobToIndexedDb(clonedAudioId, existingBlob);
        }
        return {
          ...a,
          id: clonedAudioId,
          sourceClipId: a.sourceClipId ? clipIdMap.get(a.sourceClipId) || a.sourceClipId : undefined,
        };
      })
    );

    const duplicated: VideoStudioProject = {
      ...project,
      id: newId,
      title: `${project.title} (Copy)`,
      status: 'draft',
      publishedVideoId: undefined,
      exportedVideoUrl: undefined,
      clips: clonedClips,
      audioTracks: clonedAudio,
      createdAt: now,
      updatedAt: now,
    };

    return this.saveDraftProject(duplicated);
  },

  async listUserProjects(userId: string): Promise<VideoStudioProject[]> {
    const localProjects = readLocalDrafts(userId);
    try {
      const q = query(collection(db, 'video_projects'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const remoteProjects = snap.docs.map((d) => d.data() as VideoStudioProject);

      const mergedMap = new Map<string, VideoStudioProject>();
      [...localProjects, ...remoteProjects].forEach((p) => {
        const prev = mergedMap.get(p.id);
        if (!prev || new Date(p.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()) {
          mergedMap.set(p.id, p);
        }
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      writeLocalDrafts(userId, merged);
      return merged;
    } catch {
      return localProjects.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
  },

  async deleteProject(userId: string, project: VideoStudioProject): Promise<void> {
    const remaining = readLocalDrafts(userId).filter((p) => p.id !== project.id);
    writeLocalDrafts(userId, remaining);

    // Clean up indexed media blobs
    await Promise.all([
      ...project.clips.map((c) => deleteMediaBlobFromIndexedDb(c.id)),
      ...project.audioTracks.map((a) => deleteMediaBlobFromIndexedDb(a.id)),
    ]);

    try {
      await deleteDoc(doc(db, 'video_projects', project.id));
    } catch (err) {
      console.warn('[Studio Drafts] Firestore delete notice:', err);
    }
  },
};

// ============================================================================
// Built-In Synthesized Culinary Background Music Library (Real Playable WAVs)
// ============================================================================

export interface StudioMusicPreset {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  durationSec: number;
  chords: number[][]; // Frequencies in Hz
}

export const STUDIO_MUSIC_PRESETS: StudioMusicPreset[] = [
  {
    id: 'warm_morning_acoustic',
    title: 'Warm Morning Kitchen',
    mood: 'Gentle Acoustic',
    bpm: 92,
    durationSec: 20,
    chords: [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 392.0],  // G6
    ],
  },
  {
    id: 'lofi_bistro_prep',
    title: 'Lo-Fi Bistro Prep',
    mood: 'Relaxed Chill',
    bpm: 84,
    durationSec: 20,
    chords: [
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 277.18, 329.63, 392.0],  // A7
    ],
  },
  {
    id: 'upbeat_saute_groove',
    title: 'Upbeat Saute Groove',
    mood: 'Bright & Energetic',
    bpm: 112,
    durationSec: 20,
    chords: [
      [329.63, 415.3, 493.88, 659.25], // E
      [246.94, 311.13, 369.99, 493.88],// B
      [277.18, 329.63, 415.3, 554.37], // C#m
      [220.0, 277.18, 329.63, 440.0],  // A
    ],
  },
  {
    id: 'calm_evening_plating',
    title: 'Evening Plating Piano',
    mood: 'Elegant Culinary',
    bpm: 76,
    durationSec: 20,
    chords: [
      [220.0, 261.63, 329.63, 440.0],  // Am
      [174.61, 220.0, 261.63, 349.23], // F
      [261.63, 329.63, 392.0, 523.25], // C
      [196.0, 246.94, 293.66, 392.0],  // G
    ],
  },
  {
    id: 'street_food_spark',
    title: 'Street Market Rhythm',
    mood: 'Short-Form Snappy',
    bpm: 122,
    durationSec: 18,
    chords: [
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [392.0, 493.88, 587.33, 698.46], // G
      [293.66, 349.23, 440.0, 587.33], // Dm
      [261.63, 329.63, 392.0, 523.25], // C
    ],
  },
  {
    id: 'sunday_bakehouse',
    title: 'Sunday Bakehouse Waltz',
    mood: 'Warm Pastry Vibe',
    bpm: 88,
    durationSec: 20,
    chords: [
      [196.0, 246.94, 293.66, 392.0],  // G
      [246.94, 293.66, 369.99, 493.88],// Bm
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [293.66, 369.99, 440.0, 587.33], // D
    ],
  },
];

function encodeAudioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

const presetBlobCache = new Map<string, Blob>();

/**
 * Generates a warm, studio-clean stereo WAV soundtrack locally using OfflineAudioContext.
 */
export async function generateStudioMusicPresetBlob(presetId: string): Promise<Blob> {
  const cached = presetBlobCache.get(presetId);
  if (cached) return cached;

  const preset = STUDIO_MUSIC_PRESETS.find((p) => p.id === presetId) || STUDIO_MUSIC_PRESETS[0];
  const sampleRate = 44100;
  const durationSec = preset.durationSec;
  const offline = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);

  const master = offline.createGain();
  master.gain.setValueAtTime(0.32, 0);
  master.connect(offline.destination);

  const beatDur = 60 / preset.bpm;
  const barDur = beatDur * 4;
  const totalBars = Math.ceil(durationSec / barDur);

  for (let bar = 0; bar < totalBars; bar++) {
    const chord = preset.chords[bar % preset.chords.length];
    const barStart = bar * barDur;
    if (barStart >= durationSec) break;

    // Warm chord pad + gentle arpeggiated notes
    chord.forEach((freq, noteIdx) => {
      const osc = offline.createOscillator();
      const noteGain = offline.createGain();
      osc.type = noteIdx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, barStart);

      const noteStart = barStart + noteIdx * (beatDur * 0.25);
      const noteEnd = Math.min(durationSec, barStart + barDur);
      if (noteStart >= durationSec) return;

      noteGain.gain.setValueAtTime(0.0001, noteStart);
      noteGain.gain.linearRampToValueAtTime(noteIdx === 0 ? 0.22 : 0.12, noteStart + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.025, Math.max(noteStart + 0.2, noteEnd - 0.05));
      noteGain.gain.linearRampToValueAtTime(0.0001, noteEnd);

      osc.connect(noteGain);
      noteGain.connect(master);
      osc.start(noteStart);
      osc.stop(noteEnd);
    });

    // Soft rhythmic pulse on beats 1 and 3
    for (let b = 0; b < 4; b++) {
      const pulseTime = barStart + b * beatDur;
      if (pulseTime >= durationSec - 0.1) break;
      const pluck = offline.createOscillator();
      const pluckGain = offline.createGain();
      pluck.type = 'sine';
      pluck.frequency.setValueAtTime(chord[b % chord.length] * 2, pulseTime);

      pluckGain.gain.setValueAtTime(0.0001, pulseTime);
      pluckGain.gain.linearRampToValueAtTime(b % 2 === 0 ? 0.09 : 0.05, pulseTime + 0.02);
      pluckGain.gain.exponentialRampToValueAtTime(0.0001, Math.min(durationSec, pulseTime + 0.42));

      pluck.connect(pluckGain);
      pluckGain.connect(master);
      pluck.start(pulseTime);
      pluck.stop(Math.min(durationSec, pulseTime + 0.45));
    }
  }

  const rendered = await offline.startRendering();
  const wavBlob = encodeAudioBufferToWavBlob(rendered);
  presetBlobCache.set(preset.id, wavBlob);
  return wavBlob;
}
