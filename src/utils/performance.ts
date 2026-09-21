/**
 * Graphics & Rendering Utilities
 * Device-power-based throttling algorithms have been completely removed.
 * Full native graphics fidelity is maintained consistently across all devices.
 */

export function isLowGraphicsActive(): boolean {
  return false;
}

export function getOptimizedClasses(type: 'glow' | 'blur' | 'animation' | 'background'): string {
  switch (type) {
    case 'glow':
      return 'shadow-lg shadow-teal-500/10 border-teal-500/30';
    case 'blur':
      return 'bg-[#161b22]/95 border-[#30363d]';
    case 'animation':
      return 'animate-spin';
    case 'background':
      return 'block';
    default:
      return '';
  }
}

