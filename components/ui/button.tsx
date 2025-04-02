"use client";

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'outline':
          return 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50';
        case 'ghost':
          return 'bg-transparent hover:bg-gray-100 text-gray-700';
        case 'link':
          return 'bg-transparent underline text-blue-600 hover:text-blue-800';
        default:
          return 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent';
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return 'text-xs px-2.5 py-1.5';
        case 'lg':
          return 'text-base px-6 py-3';
        default:
          return 'text-sm px-4 py-2';
      }
    };

    return (
      <button
        ref={ref}
        className={`font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
          ${getVariantStyles()} ${getSizeStyles()} ${className} 
          disabled:opacity-50 disabled:cursor-not-allowed`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button'; 