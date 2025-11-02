import React from 'react';

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={"w-full h-9 px-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 " + (props.className || "")} 
  />
);

export default Input;
