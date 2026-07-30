/**
 * Device vibration haptics utility.
 * Safe to call on any browser; does nothing if haptics are not supported.
 */
export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
    return;
  }
  
  try {
    switch (type) {
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(20);
        break;
      case 'heavy':
        window.navigator.vibrate(35);
        break;
      case 'success':
        window.navigator.vibrate([15, 40, 15]);
        break;
      case 'error':
        window.navigator.vibrate([30, 60, 30]);
        break;
      default:
        window.navigator.vibrate(10);
    }
  } catch (err) {
    // Silently catch security exceptions or other vibration errors
  }
};
