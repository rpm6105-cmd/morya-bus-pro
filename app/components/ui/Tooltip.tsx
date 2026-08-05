'use client';

import { useState } from 'react';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
}

export default function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <span
        role="tooltip"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 'calc(100% + 6px)',
          transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(4px)',
          background: '#1f2937',
          color: '#fff',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 1000,
          opacity: visible ? 1 : 0,
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        {label}
      </span>
    </span>
  );
}
