import Input from './Input';
import React from 'react';

function SlugInput({ setForm, form }) {
  const handleChange = (e) => {
    if (e.target.value === '' || !e.target.value) {
      setForm((form) => ({ ...form, url: '', slug: '' }));
    } else {
      setForm((form) => ({ ...form, slug: e.target.value }));
    }
  };

  return (
    <Input
      name="slug"
      prepend="https://pete.sh/"
      className="pl-[115px]"
      defaultValue={form.slug}
      onChange={handleChange}
    />
  );
}

export default SlugInput;
