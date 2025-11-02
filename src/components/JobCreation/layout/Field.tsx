import React from 'react';

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[13px] text-gray-700 mb-1">{children}</label>
);

interface FieldProps {
  span?: string;
  hint?: string;
  children: React.ReactNode;
  label?: string;
}

const Field: React.FC<FieldProps> = ({ 
  span = "col-span-12 sm:col-span-6 lg:col-span-4", 
  hint, 
  children, 
  label 
}) => {
  return (
    <div className={span}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint ? <div className="mt-1 text-[11px] text-gray-500">{hint}</div> : null}
    </div>
  );
};

export default Field;
