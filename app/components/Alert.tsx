import CopyButton from './CopyButton';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import React from 'react';

function Alert({
  children,
  shortenedUrl,
  title,
  onClose,
}: {
  children?: React.ReactNode;
  title?: string;
  shortenedUrl?: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 rounded-md bg-green-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <CheckCircleIcon
            className="h-5 w-5 text-green-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3 flex flex-1 flex-col">
          <h3 className="text-sm font-medium text-green-800">{title}</h3>
          <div className="mt-2 text-sm text-green-700">{children}</div>
          <div className="ml-auto mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <CopyButton text={shortenedUrl} />
              <button
                type="button"
                onClick={onClose}
                className="ml-3 rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 active:bg-green-100"
              >
                done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Alert;
