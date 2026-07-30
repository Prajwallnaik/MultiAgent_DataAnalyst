import React from 'react';

/**
 * Shimmer skeleton loader for premium loading states.
 * Variants: text, card, chart, table, circle
 */
export default function SkeletonLoader({ variant = 'text', lines = 3, className = '' }) {
  const shimmerBase = 'relative overflow-hidden bg-[#EFE9DF] rounded-md';
  const shimmerOverlay = (
    <div className="absolute inset-0 animate-shimmer">
      <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  );

  if (variant === 'circle') {
    return (
      <div className={`${shimmerBase} rounded-full w-10 h-10 ${className}`}>
        {shimmerOverlay}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-[#FAF8F5] border border-[#E9E2D7] rounded-2xl p-5 flex flex-col gap-4 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`${shimmerBase} rounded-full w-8 h-8`}>{shimmerOverlay}</div>
          <div className="flex-1 flex flex-col gap-2">
            <div className={`${shimmerBase} h-3 w-2/3`}>{shimmerOverlay}</div>
            <div className={`${shimmerBase} h-2 w-1/3`}>{shimmerOverlay}</div>
          </div>
        </div>
        <div className={`${shimmerBase} h-24 w-full rounded-lg`}>{shimmerOverlay}</div>
        <div className="flex gap-2">
          <div className={`${shimmerBase} h-6 w-16 rounded-full`}>{shimmerOverlay}</div>
          <div className={`${shimmerBase} h-6 w-20 rounded-full`}>{shimmerOverlay}</div>
        </div>
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`glass-card rounded-xl p-5 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${shimmerBase} h-3 w-1/4`}>{shimmerOverlay}</div>
          <div className={`${shimmerBase} h-6 w-14 rounded-full`}>{shimmerOverlay}</div>
        </div>
        <div className={`${shimmerBase} h-[200px] w-full rounded-lg`}>{shimmerOverlay}</div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`glass-card rounded-xl overflow-hidden ${className}`}>
        <div className="p-3 border-b border-zinc-800/60 flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${shimmerBase} h-3 flex-1`}>{shimmerOverlay}</div>
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-3 border-b border-zinc-800/20 flex gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className={`${shimmerBase} h-3 flex-1`}>{shimmerOverlay}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default: text lines
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={`${shimmerBase} h-3`}
          style={{ width: `${85 - i * 15}%` }}
        >
          {shimmerOverlay}
        </div>
      ))}
    </div>
  );
}
