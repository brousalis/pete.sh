import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import React from 'react';

export default function Input({
  label,
  name,
  error,
  prepend,
  className,
  ...props
}: {
  label?: string;
  name: string;
  error?: string;
  prepend?: string;
  className?: string;
} & React.HTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative mt-1 flex rounded-md shadow-sm">
        {prepend && (
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
            {prepend}
          </span>
        )}
        <input
          name={name}
          id={name}
          autoComplete="off"
          className={clsx(
            'block w-full appearance-none border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm',
            prepend ? 'rounded-none rounded-r-md' : 'rounded-md',
            error &&
              'border-red-300 text-red-900 placeholder-red-300  focus:border-red-500 focus:outline-none focus:ring-red-500'
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `"${name}-error` : name}
          {...props}
        />
        {error && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
