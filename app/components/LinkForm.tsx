import Button from './Button';
import LinkInput from './LinkInput';
import SlugInput from './SlugInput';
import clsx from 'clsx';
import React, { useState } from 'react';

const REQUEST_STATE_COLORS = {
  loading: 'bg-gray-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

export default function LinkForm({
  onSubmit,
  requestState = 'success',
}: {
  onSubmit: (HTMLElement) => void;
  requestState?: 'success' | 'error' | 'loading';
}) {
  const [form, setForm] = useState({
    url: '',
    slug: '',
    slug_type: '',
  });

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
      <div
        className={clsx(
          'h-1 rounded-t-md ',
          REQUEST_STATE_COLORS[requestState] || 'bg-indigo-500'
        )}
      ></div>
      <div className="bg-white p-8 shadow sm:rounded-lg">
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <LinkInput form={form} setForm={setForm} />
          <SlugInput form={form} setForm={setForm} />
          <Button requestState={requestState} type="submit">
            shorten
          </Button>
        </form>
      </div>
    </div>
  );
}
