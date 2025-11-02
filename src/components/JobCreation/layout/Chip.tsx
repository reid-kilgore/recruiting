import React from 'react';

interface ChipProps {
  onRemove?: () => void;
  children: React.ReactNode;
}

const Chip: React.FC<ChipProps> = ({ onRemove, children }) => {
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2 h-7 text-xs">
      {children}
      {onRemove && (
        <button 
          type="button" 
          onClick={onRemove} 
          className="w-4 h-4 grid place-items-center rounded-full hover:bg-red-100 text-red-600"
        >
          ×
        </button>
      )}
    </span>
  );
};

export default Chip;
