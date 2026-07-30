import React from 'react';
import { CheckCircle, AlertCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  idle: {
    icon: null,
    color: 'text-zinc-500',
    bg: 'bg-zinc-800/40',
    border: 'border-zinc-700/40',
    label: 'Idle',
  },
  running: {
    icon: Loader2,
    color: 'text-brand',
    bg: 'bg-brand/10',
    border: 'border-brand/30',
    label: 'Running',
    spin: true,
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald',
    bg: 'bg-emerald/10',
    border: 'border-emerald/30',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    color: 'text-rose',
    bg: 'bg-rose/10',
    border: 'border-rose/30',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber',
    bg: 'bg-amber/10',
    border: 'border-amber/30',
    label: 'Warning',
  },
  retrying: {
    icon: RefreshCw,
    color: 'text-amber',
    bg: 'bg-amber/10',
    border: 'border-amber/30',
    label: 'Retrying',
    spin: true,
  },
};

/**
 * Animated status badge component with icon and optional label.
 */
export default function StatusBadge({ status = 'idle', label, showLabel = true, size = 'sm', className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const Icon = config.icon;
  const displayLabel = label || config.label;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-1 gap-1.5',
    md: 'text-xs px-3 py-1.5 gap-2',
  };

  const iconSizes = { xs: 10, sm: 12, md: 14 };

  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded-full border ${config.bg} ${config.border} ${config.color} ${sizeClasses[size]} ${className}`}
    >
      {Icon && (
        <Icon
          size={iconSizes[size]}
          className={config.spin ? 'animate-spin' : ''}
        />
      )}
      {showLabel && <span>{displayLabel}</span>}
    </span>
  );
}
