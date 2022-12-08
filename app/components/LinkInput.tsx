import Input from './Input';
import { generateLinkSlug } from 'app/lib/slug';
import React from 'react';

function LinkInput({
  form,
  setForm,
}: {
  form: any;
  setForm: (form: any) => void;
}) {
  const handleUrlChange = (e) => {
    if (e.target.value === '' || !e.target.value) {
      setForm((form) => ({ ...form, url: '', slug: '' }));
    } else {
      setForm((form) => ({
        ...form,
        url: e.target.value,
        slug: generateLinkSlug(form.slug_type),
      }));
    }
  };

  const handleTypeChange = (e) => {
    setForm((form) => ({
      ...form,
      slug_type: e.target.value,
      slug: generateLinkSlug(e.target.value),
    }));
  };

  return (
    <Input
      name="url"
      placeholder="url to shorten"
      className="pr-[112px]"
      onChange={handleUrlChange}
      defaultValue={form.url}
    >
      <div className="absolute inset-y-0 right-0 flex items-center">
        <label htmlFor="slug_type" className="sr-only">
          slug type
        </label>
        <select
          id="slug_type"
          name="slug_type"
          value={form.slug_type}
          onChange={handleTypeChange}
          className="h-full rounded-md border-transparent bg-transparent py-0 pl-2 pr-7 text-gray-500 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option>slug</option>
          <option>hash</option>
        </select>
      </div>
    </Input>
  );
}

export default LinkInput;
