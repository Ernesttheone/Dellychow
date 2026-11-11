import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  showLabel = false
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${
        isDark 
          ? 'bg-stone-800/90 border-stone-700 text-amber-300 hover:bg-stone-700 hover:text-amber-200 shadow-2xs' 
          : 'bg-stone-100/90 border-stone-200 text-stone-700 hover:bg-stone-200 hover:text-stone-900 shadow-2xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-stone-600 animate-in spin-in-180 duration-300" />
      )}
      <span className="text-[11px] font-medium tracking-wide">
        {showLabel ? (isDark ? 'Dark Theme' : 'Light Theme') : (isDark ? 'Dark' : 'Light')}
      </span>
    </button>
  );
};
