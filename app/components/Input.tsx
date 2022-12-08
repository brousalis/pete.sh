import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import React from 'react';

export default function Input({
  children,
  className,
  error,
  label,
  name,
  prepend,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  error?: string;
  label?: string;
  name: string;
  prepend?: string;
  [props: string]: any;
}) {
  console.log(error);
  return (
    <div>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <div className="relative mt-1 flex rounded-md shadow-sm">
        {prepend && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-400 sm:text-sm">{prepend}</span>
          </div>
        )}
        <input
          name={name}
          id={name}
          autoComplete="off"
          className={clsx(
            'block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm',
            error &&
              'border-red-300 text-red-900 placeholder-red-300  focus:border-red-500',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `"${name}-error` : name}
          {...props}
        />
        {!!error && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-600"
              aria-hidden="true"
            />
          </div>
        )}
        {children}
      </div>
      {!!error && (
        <p
          className="absolute text-center text-xs text-red-600"
          id={`${name}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
