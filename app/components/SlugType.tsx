import { LinkFormState } from './LinkForm';
import { generateLinkSlug } from 'app/lib/slug';
import React from 'react';

function SlugType({
  form,
  setForm,
}: {
  form: LinkFormState;
  setForm: (form: LinkFormState) => void;
}) {
  const handleTypeChange = (e) => {
    if (form.url !== '' || form.url !== undefined) {
      setForm({
        ...form,
        slug_type: e.target.value,
        slug: generateLinkSlug(e.target.value),
      });
    }
  };

  return (
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
        <option>hash</option>
        <option>slug</option>
      </select>
    </div>
  );
}

export default SlugType;
