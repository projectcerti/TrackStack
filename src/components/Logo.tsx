import React from 'react';

export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 32 32" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    {/* L-shape in Lime */}
    <path d="M0 12H20V32H12V20H0V12Z" fill="var(--color-brand-lime)" />
    {/* Top Right Block in Purple */}
    <rect x="20" y="0" width="12" height="12" fill="var(--color-brand-purple)" />
  </svg>
);
