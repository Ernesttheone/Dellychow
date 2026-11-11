import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Bell, Timer, Plus, Minus, X } from 'lucide-react';

interface CookingTimerProps {
  initialMinutes?: number;
  label?: string;
  theme?: 'light' | 'dark';
  onDismiss?: () => void;
}

export const CookingTimer: React.FC<CookingTimerProps> = ({ 
  initialMinutes = 10, 
  label = 'Step Timer',
  theme = 'light',
  onDismiss
}) => {
  const safeMinutes = Math.max(1, Number(initialMinutes) || 1);
  const [totalSeconds, setTotalSeconds] = useState<number>(safeMinutes * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(safeMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  useEffect(() => {
    const mins = Math.max(1, Number(initialMinutes) || 1);
    setTotalSeconds(mins * 60);
    setSecondsLeft(mins * 60);
    setIsRunning(false);
    setIsDone(false);
  }, [initialMinutes]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      setIsDone(true);
      // Play audio tone if supported by Web Audio API
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      } catch (e) {
        // AudioContext not available or blocked
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const toggleRun = () => setIsRunning(!isRunning);

  const reset = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
    setIsDone(false);
  };

  const adjustMinutes = (delta: number) => {
    const newMins = Math.max(1, Math.round(secondsLeft / 60) + delta);
    setTotalSeconds(newMins * 60);
    setSecondsLeft(newMins * 60);
    setIsDone(false);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = totalSeconds > 0 
    ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
    : 0;

  const isDark = theme === 'dark';

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border transition-colors ${
      isDone 
        ? 'bg-amber-500/20 border-amber-500 text-amber-200 animate-pulse' 
        : isDark
        ? 'bg-stone-900 border-stone-800 text-stone-100'
        : 'bg-stone-50 border-stone-200/80 text-stone-900'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber-500" />
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-stone-300' : 'text-stone-600'
          }`}>
            {label}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isDone ? (
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 animate-bounce">
              <Bell className="w-3.5 h-3.5" /> Time is up!
            </span>
          ) : (
            <span className={`text-[10px] font-medium ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Chef&apos;s Stated Step Time
            </span>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className={`p-1 rounded-lg hover:bg-stone-800 transition-colors ${
                isDark ? 'text-stone-400 hover:text-white' : 'text-stone-400 hover:text-stone-700'
              }`}
              title="Close Timer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="font-mono text-2xl font-bold tracking-tight tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          {/* Quick +/- 1 min adjuster */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => adjustMinutes(-1)}
              disabled={secondsLeft <= 60}
              className={`p-1 rounded-md text-xs font-bold transition-colors disabled:opacity-40 ${
                isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
              title="Minus 1 minute"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => adjustMinutes(1)}
              className={`p-1 rounded-md text-xs font-bold transition-colors ${
                isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
              title="Add 1 minute"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleRun}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isRunning 
                ? (isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800')
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{secondsLeft < totalSeconds ? 'Resume' : 'Start'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={reset}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
            }`}
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`w-full h-1.5 rounded-full mt-3 overflow-hidden ${
        isDark ? 'bg-stone-800' : 'bg-stone-200'
      }`}>
        <div 
          className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
