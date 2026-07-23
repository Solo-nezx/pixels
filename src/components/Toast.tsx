import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-[#7C5CFF] text-white shadow-lg shadow-[#7C5CFF]/30 text-sm font-medium animate-bounce">
      <CheckCircle2 className="w-4 h-4 text-white" />
      <span>{toastMessage}</span>
    </div>
  );
};
