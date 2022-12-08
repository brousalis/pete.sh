import Alert from './Alert';
import Button from './Button';
import LinkInput from './LinkInput';
import SlugInput from './SlugInput';
import clsx from 'clsx';
import { RequestState } from 'pages';
import React, { useState } from 'react';

export interface LinkFormState {
  url?: string;
  slug?: string;
  slug_type?: string;
}

export default function LinkForm({
  children,
  onSubmit,
  requestState,
}: {
  children?: React.ReactNode;
  onSubmit: (HTMLElement) => void;
  requestState?: RequestState;
}) {
  const [form, setForm] = useState<LinkFormState>({
    url: '',
    slug: '',
    slug_type: 'hash',
  });

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
      <div
        className={clsx(
          'h-1 rounded-t-md ',
          {
            loading: 'bg-gray-500',
            success: 'bg-green-500',
            error: 'bg-red-500',
          }[requestState] || 'bg-indigo-500'
        )}
      />
      <div className="bg-white p-8 shadow sm:rounded-lg">
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <LinkInput form={form} setForm={setForm} />
          <SlugInput form={form} setForm={setForm} />
          <Button requestState={requestState} type="submit">
            {requestState === 'success' ? 'success 🎉️' : 'shorten ✂️'}
          </Button>
        </form>
        {children}
      </div>
    </div>
  );
}
