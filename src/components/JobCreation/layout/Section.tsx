import React from 'react';

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
          {icon ?? '⬚'}
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-12 gap-3">{children}</div>
    </div>
  );
};

export default Section;
