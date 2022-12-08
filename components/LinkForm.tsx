import Button from './Button';
import Input from './Input';
import React from 'react';

export default function LinkForm({ onSubmit }: { onSubmit: (HTMLElement) => void }) {
  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
      <div className="bg-white p-4 shadow sm:rounded-lg">
        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <Input name="url" placeholder="url to shorten">
            <div className="absolute inset-y-0 right-0 flex items-center">
              <label htmlFor="slug_type" className="sr-only">
                slug type
              </label>
              <select
                id="slug_type"
                name="slug_type"
                className="h-full rounded-md border-transparent bg-transparent py-0 pl-2 pr-7 text-gray-500 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option>hash</option>
                <option>slug</option>
              </select>
            </div>
          </Input>
          <Input name="slug" prepend="https://pete.sh/" />
          <Button type="submit">shorten</Button>
        </form>
      </div>
    </div>
  );
}
