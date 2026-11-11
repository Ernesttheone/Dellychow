/**
 * Helper utilities for chef-specified cooking durations and step timers.
 * Strictly respects the chef's stated time with no hardcoded or fake fallbacks.
 */

/**
 * Extracts the duration (in minutes) stated by the chef within a preparation step instruction.
 * Examples:
 * - "Simmer gently for 15 minutes" -> 15
 * - "Roast for 45 mins until golden" -> 45
 * - "Bake for 1 hour at 180C" -> 60
 * - "Let dough rest for 30 min" -> 30
 * - "Sear for 90 seconds per side" -> 2
 */
export function extractStepMinutes(stepText: string): number | null {
  if (!stepText || typeof stepText !== 'string') return null;

  const text = stepText.toLowerCase();

  // Pattern: "X to Y hours" or "X hours"
  const hoursRangeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/);
  if (hoursRangeMatch) {
    const hours = parseFloat(hoursRangeMatch[2]);
    return Math.round(hours * 60);
  }

  const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/);
  if (hoursMatch) {
    const hours = parseFloat(hoursMatch[1]);
    return Math.round(hours * 60);
  }

  // Phrase: "half an hour"
  if (text.includes('half an hour') || text.includes('half hour')) {
    return 30;
  }

  // Phrase: "an hour"
  if (text.includes('an hour') || text.includes('1 hour')) {
    return 60;
  }

  // Pattern: "X to Y minutes" or "X-Y mins" (take the higher or stated duration)
  const rangeMatch = text.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*(?:minutes|minute|mins|min)\b/);
  if (rangeMatch) {
    return parseInt(rangeMatch[2], 10);
  }

  // Pattern: "X minutes/mins/min/m"
  const minutesMatch = text.match(/(\d+)\s*(?:minutes|minute|mins|min|m)\b/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10);
  }

  // Pattern: "X seconds" -> convert to minutes (rounded up)
  const secondsMatch = text.match(/(\d+)\s*(?:seconds|second|secs|sec)\b/);
  if (secondsMatch) {
    const secs = parseInt(secondsMatch[1], 10);
    return Math.max(1, Math.ceil(secs / 60));
  }

  return null;
}

/**
 * Format minutes into a clean display string (e.g. "25 mins" or "1h 15m")
 */
export function formatMinutesDisplay(minutes?: number | null): string {
  if (minutes == null || isNaN(minutes) || minutes <= 0) {
    return '';
  }

  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
