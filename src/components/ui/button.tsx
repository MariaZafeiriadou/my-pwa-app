import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    // Αντιστοίχιση των variants σε πραγματικές κλάσεις Tailwind
    const variantStyles = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      outline: 'border border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800',
      secondary: 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm',
      ghost: 'text-gray-400 hover:bg-gray-800 hover:text-white bg-transparent',
      link: 'text-blue-500 underline-offset-4 hover:underline bg-transparent',
    };

    // Αντιστοίχιση των μεγεθών
    const sizeStyles = {
      default: 'h-10 px-4 py-2 text-sm rounded-xl',
      sm: 'h-9 px-3 text-xs rounded-xl',
      lg: 'h-11 px-8 text-base rounded-2xl',
      icon: 'h-10 w-10 rounded-full flex items-center justify-center p-0 flex-shrink-0',
    };

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";