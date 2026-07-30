import React, { useState, useEffect, useRef } from 'react';

/**
 * Smooth animated counter that counts up to the target value.
 */
export default function AnimatedCounter({
  value,
  duration = 1200,
  separator = true,
  className = '',
  prefix = '',
  suffix = '',
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    const start = display;

    if (start === target) return;

    const startTime = performance.now();
    startRef.current = startTime;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);

      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const formatted = separator ? display.toLocaleString() : display;

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
