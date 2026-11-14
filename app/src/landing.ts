// Remembers that the intro was seen. Only a convenience: browser storage may be missing or blocked.
const KEY = 'dalil-intro-seen';

export function hasSeenLanding(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markLandingSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* not remembered; the intro just shows again next visit */
  }
}
