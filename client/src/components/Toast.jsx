import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error:   'bg-red-50 border-red-400 text-red-800',
    info:    'bg-blue-50 border-blue-400 text-blue-800',
  };

  const icons = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
  };

  return (
    <div className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 border rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 toast-enter ${styles[type]}`}>
      <span className="text-lg shrink-0 mt-0.5">{icons[type]}</span>
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
}
