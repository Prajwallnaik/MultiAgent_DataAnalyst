import React from 'react';

export default function Tooltip({ children, content, position = 'top', className = '', tooltipClassName = '' }) {
  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    'top-end': 'bottom-full right-0 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    'bottom-end': 'top-full right-0 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  if (!content) return <>{children}</>;

  return (
    <div className={`relative group/tooltip flex items-center justify-center ${className}`}>
      {children}
      <div className={`absolute ${posClasses[position]} opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100]`}>
        <div className={`bg-[#1a1a1a] text-[#F3F3F3] text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-md border border-[#333] ${tooltipClassName}`}>
          {content}
        </div>
      </div>
    </div>
  );
}
