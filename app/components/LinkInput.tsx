import Input from './Input';
import { LinkFormState } from './LinkForm';
import SlugType from './SlugType';
import { generateLinkSlug } from 'app/lib/slug';
import React from 'react';

function LinkInput({
  form,
  setForm,
}: {
  form: LinkFormState;
  setForm: (form: LinkFormState) => void;
}) {
  const handleUrlChange = (e) => {
    if (e.target.value === '' || !e.target.value) {
      setForm({ ...form, url: '', slug: '' });
    } else {
      setForm({
        ...form,
        url: e.target.value,
        slug: generateLinkSlug(form.slug_type),
      });
    }
  };

  return (
    <Input
      name="url"
      placeholder="url to shorten"
      className="pr-[112px]"
      onChange={handleUrlChange}
      defaultValue={form.url}
    >
      <SlugType form={form} setForm={setForm} />
    </Input>
  );
}

export default LinkInput;
