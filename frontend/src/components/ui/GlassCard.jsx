import React from 'react';
import { motion } from 'framer-motion';

/**
 * Premium glassmorphism card component with configurable glow and hover effects.
 */
export default function GlassCard({
  children,
  className = '',
  hover = true,
  glow = '',
  padding = 'p-5',
  as = 'div',
  onClick,
  ...props
}) {
  const Component = motion[as] || motion.div;

  return (
    <Component
      className={`glass-card rounded-xl ${padding} ${hover ? 'hover-lift' : ''} ${glow} ${className}`}
      onClick={onClick}
      whileHover={hover ? { scale: 1.005 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      {...props}
    >
      {children}
    </Component>
  );
}
