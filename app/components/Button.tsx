import clsx from 'clsx';
import React, { ButtonHTMLAttributes } from 'react';

const COLORS = {
  success: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
  error: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
};

export default function Button({
  children,
  requestState,
  className,
  ...props
}: {
  className?: string;
  requestState?: 'success' | 'error' | 'loading';
  children: React.ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'flex w-full select-none justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white shadow-sm',
        COLORS[requestState] ||
          'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
