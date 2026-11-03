import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Bell, Timer, Volume2 } from 'lucide-react';

interface CookingTimerProps {
  initialMinutes?: number;
  label?: string;
}

export const CookingTimer: React.FC<CookingTimerProps> = ({ initialMinutes = 5, label = 'Prep Timer' }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialMinutes * 60);
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
    setSecondsLeft(initialMinutes * 60);
    setIsDone(false);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = ((initialMinutes * 60 - secondsLeft) / (initialMinutes * 60)) * 100;

  return (
    <div className={`p-4 rounded-2xl border transition-colors ${
      isDone 
        ? 'bg-amber-100/80 border-amber-300 text-amber-900 animate-pulse' 
        : 'bg-stone-50 border-stone-200/80 text-stone-900'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">{label}</span>
        </div>
        {isDone && (
          <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 animate-bounce" /> Time's up!
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="font-mono text-2xl font-bold tracking-tight tabular-nums">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleRun}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
              isRunning 
                ? 'bg-stone-200 hover:bg-stone-300 text-stone-800' 
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <button
            type="button"
            onClick={reset}
            className="p-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-stone-200 rounded-full mt-3 overflow-hidden">
        <div 
          className="h-full bg-amber-600 rounded-full transition-all duration-500 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
