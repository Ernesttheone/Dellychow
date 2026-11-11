import { useState, useCallback } from 'react';
import { CookingVideo } from '../types';

export interface VideoDiagnosticReport {
  timestamp: string;
  videoId: string;
  videoTitle: string;
  authorName: string;
  currentSrc: string;
  configuredUrl: string;
  error: {
    code: number | null;
    codeName: string;
    description: string;
    message: string;
  } | null;
  networkState: {
    code: number;
    name: string;
    description: string;
  };
  readyState: {
    code: number;
    name: string;
    description: string;
  };
  publicAccessProbe?: {
    testedUrl: string;
    isPublic: boolean;
    httpStatus: number | null;
    statusText: string;
    contentType: string | null;
    contentRange: string | null;
    acceptRanges: string | null;
    requiresAuthHeaders: boolean;
    testedWithoutAuth: boolean;
    errorSummary?: string;
  };
}

export const MEDIA_ERROR_NAMES: Record<number, { name: string; description: string }> = {
  1: {
    name: 'MEDIA_ERR_ABORTED',
    description: 'The user agent stopped fetching the media resource at the user request.'
  },
  2: {
    name: 'MEDIA_ERR_NETWORK',
    description: 'A network error caused the browser to stop fetching the media data.'
  },
  3: {
    name: 'MEDIA_ERR_DECODE',
    description: 'An error occurred while decoding the media stream (corrupted file or unsupported codec).'
  },
  4: {
    name: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
    description: 'The video stream format, MIME type, or source URL is not supported or returned a non-media response.'
  }
};

export const NETWORK_STATE_NAMES: Record<number, { name: string; description: string }> = {
  0: {
    name: 'NETWORK_EMPTY',
    description: 'There is no data yet. The element has not been initialized.'
  },
  1: {
    name: 'NETWORK_IDLE',
    description: 'The element is active and selected a resource, but is currently not using the network.'
  },
  2: {
    name: 'NETWORK_LOADING',
    description: 'The browser is actively downloading the media resource.'
  },
  3: {
    name: 'NETWORK_NO_SOURCE',
    description: 'No eligible candidate media resource could be found or the source URL failed.'
  }
};

export const READY_STATE_NAMES: Record<number, { name: string; description: string }> = {
  0: {
    name: 'HAVE_NOTHING',
    description: 'No information is available regarding the media resource.'
  },
  1: {
    name: 'HAVE_METADATA',
    description: 'Enough of the resource has been obtained that the duration and dimensions are available.'
  },
  2: {
    name: 'HAVE_CURRENT_DATA',
    description: 'Data for the current playback position is available, but not enough to move forward.'
  },
  3: {
    name: 'HAVE_FUTURE_DATA',
    description: 'Data for the current position and at least a little bit of future data is available.'
  },
  4: {
    name: 'HAVE_ENOUGH_DATA',
    description: 'Enough data is available, and the download rate is high enough to play through without interruption.'
  }
};

/**
 * Diagnostic hook for VideoPlayerModal that captures, verifies, and logs:
 * - video.error object (code, name, message)
 * - currentSrc
 * - networkState (with human-readable name)
 * - readyState
 * - public accessibility test of video URL without signed headers
 */
export function useVideoDiagnostics(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  video: CookingVideo | null,
  playableUrl: string
) {
  const [diagnosticReport, setDiagnosticReport] = useState<VideoDiagnosticReport | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  /**
   * Probe a video URL without any Authorization headers or cookies
   * to verify public accessibility and MIME type.
   */
  const probePublicAccess = useCallback(async (targetUrl: string) => {
    if (!targetUrl || targetUrl.startsWith('blob:') || targetUrl.startsWith('data:')) {
      return {
        testedUrl: targetUrl,
        isPublic: true,
        httpStatus: 200,
        statusText: 'Local Blob/Data URL (In-Memory)',
        contentType: 'video/mp4',
        contentRange: null,
        acceptRanges: 'bytes',
        requiresAuthHeaders: false,
        testedWithoutAuth: true
      };
    }

    try {
      // Test with unauthenticated byte-range request
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-1024'
        },
        credentials: 'omit' // Explicitly omit credentials/signed headers to verify 100% public access
      });

      const contentType = response.headers.get('content-type');
      const contentRange = response.headers.get('content-range');
      const acceptRanges = response.headers.get('accept-ranges');

      const isPublic = response.status === 200 || response.status === 206;
      const requiresAuth = response.status === 401 || response.status === 403;

      return {
        testedUrl: targetUrl,
        isPublic,
        httpStatus: response.status,
        statusText: response.statusText,
        contentType,
        contentRange,
        acceptRanges,
        requiresAuthHeaders: requiresAuth,
        testedWithoutAuth: true
      };
    } catch (err: any) {
      return {
        testedUrl: targetUrl,
        isPublic: false,
        httpStatus: null,
        statusText: 'Fetch network failure',
        contentType: null,
        contentRange: null,
        acceptRanges: null,
        requiresAuthHeaders: false,
        testedWithoutAuth: true,
        errorSummary: err.message || 'Network request failed'
      };
    }
  }, []);

  /**
   * Called when <video onError={...}> triggers or for manual technical inspection.
   */
  const logDiagnosticError = useCallback(
    async (customMessage?: string) => {
      const el = videoRef.current;
      const mediaErr = el?.error || null;
      const errCode = mediaErr ? mediaErr.code : 4;
      const errNameInfo = MEDIA_ERROR_NAMES[errCode] || {
        name: `MEDIA_ERR_UNKNOWN_${errCode}`,
        description: 'Unknown media error code'
      };
      const errMsg = mediaErr?.message || customMessage || 'Video stream could not be loaded.';

      const networkStateCode = el ? el.networkState : 3;
      const networkStateInfo = NETWORK_STATE_NAMES[networkStateCode] || {
        name: `NETWORK_UNKNOWN_${networkStateCode}`,
        description: 'Unknown network state'
      };

      const readyStateCode = el ? el.readyState : 0;
      const readyStateInfo = READY_STATE_NAMES[readyStateCode] || {
        name: `READY_UNKNOWN_${readyStateCode}`,
        description: 'Unknown ready state'
      };

      const effectiveCurrentSrc = el?.currentSrc || playableUrl || video?.videoUrl || '';

      // Perform public accessibility probe without signed headers
      setIsProbing(true);
      const probeResult = await probePublicAccess(effectiveCurrentSrc);
      setIsProbing(false);

      const report: VideoDiagnosticReport = {
        timestamp: new Date().toISOString(),
        videoId: video?.id || 'unknown',
        videoTitle: video?.title || 'Untitled Video',
        authorName: video?.authorName || 'Unknown Chef',
        currentSrc: effectiveCurrentSrc,
        configuredUrl: video?.videoUrl || '',
        error: {
          code: errCode,
          codeName: errNameInfo.name,
          description: errNameInfo.description,
          message: errMsg
        },
        networkState: {
          code: networkStateCode,
          name: networkStateInfo.name,
          description: networkStateInfo.description
        },
        readyState: {
          code: readyStateCode,
          name: readyStateInfo.name,
          description: readyStateInfo.description
        },
        publicAccessProbe: probeResult
      };

      if (probeResult.httpStatus === 404) {
        report.error = {
          code: 4,
          codeName: 'MEDIA_FILE_NOT_FOUND',
          description: 'The requested video file was deleted or removed from the server (HTTP 404).',
          message: 'Video file is no longer available on server storage.'
        };
      }

      setDiagnosticReport(report);

      // Log exact structured details to console for debugging
      console.groupCollapsed(`[DellyChow Video Diagnostics] Playback Status for "${report.videoTitle}"`);
      console.info('Playback Diagnostics:', {
        errorCode: report.error?.code,
        codeName: report.error?.codeName,
        message: report.error?.message,
        description: report.error?.description,
        httpStatus: probeResult.httpStatus
      });
      console.info('Current Stream Source:', report.currentSrc);
      console.info('Network State:', `${report.networkState.code} (${report.networkState.name}) - ${report.networkState.description}`);
      console.info('Ready State:', `${report.readyState.code} (${report.readyState.name}) - ${report.readyState.description}`);
      console.info('Public Access Verification:', {
        isPublicAndAccessible: probeResult.isPublic,
        httpStatus: probeResult.httpStatus,
        contentType: probeResult.contentType,
        acceptRanges: probeResult.acceptRanges,
        requiresAuthHeaders: probeResult.requiresAuthHeaders,
        statusText: probeResult.statusText
      });
      console.groupEnd();

      return report;
    },
    [videoRef, playableUrl, video, probePublicAccess]
  );

  return {
    diagnosticReport,
    isProbing,
    logDiagnosticError,
    probePublicAccess
  };
}
