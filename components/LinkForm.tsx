import Button from './Button';
import LinkInput from './LinkInput';
import SlugInput from './SlugInput';
import { generateLinkSlug } from 'lib/slug';
import React, { useState } from 'react';

export default function LinkForm({
  onSubmit,
}: {
  onSubmit: (HTMLElement) => void;
}) {
  const [form, setForm] = useState({
    url: '',
    slug: '',
    slug_type: '',
  });

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
      <div className="bg-white p-8 shadow sm:rounded-lg">
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <LinkInput form={form} setForm={setForm} />
          <SlugInput form={form} setForm={setForm} />
          <Button type="submit">shorten</Button>
        </form>
      </div>
    </div>
  );
}
