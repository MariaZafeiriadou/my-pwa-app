import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-full border border-gray-700 bg-gray-900/50 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";