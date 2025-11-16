import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', size = 'md', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-semibold shadow-sm transition-transform transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-teal-500 text-white hover:bg-teal-600 focus-visible:outline-teal-500',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 focus-visible:outline-gray-600',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
