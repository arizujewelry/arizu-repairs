import React from 'react';

const DEFAULT_COLORS = {
  pending:       { bg: '#FFF7ED', text: '#C2410C', border: '#FDBA74', label: 'ממתין לטיפול' },
  in_progress:   { bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD', label: 'בטיפול' },
  waiting_parts: { bg: '#FEFCE8', text: '#A16207', border: '#FDE047', label: 'ממתין לחלקים' },
  ready:         { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC', label: 'מוכן לאיסוף' },
  collected:     { bg: '#F9FAFB', text: '#4B5563', border: '#D1D5DB', label: 'נאסף' },
};

export default function StatusBadge({ status, label, color, size = 'md' }) {
  const defaults = DEFAULT_COLORS[status];

  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-xs px-2.5 py-1 font-medium';

  if (defaults) {
    return (
      <span
        className={`inline-flex items-center rounded-full border ${sizeClass} whitespace-nowrap`}
        style={{
          backgroundColor: defaults.bg,
          color: defaults.text,
          borderColor: defaults.border,
        }}
      >
        {label || defaults.label}
      </span>
    );
  }

  // Custom status (supplier)
  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClass} whitespace-nowrap`}
      style={{
        backgroundColor: color ? color + '22' : '#F3E8FF',
        color: color || '#7C3AED',
        borderColor: color ? color + '66' : '#C4B5FD',
      }}
    >
      {label || status}
    </span>
  );
}
