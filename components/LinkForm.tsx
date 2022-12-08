import Button from './Button';
import Input from './Input';
import React from 'react';

export default function LinkForm({ onSubmit }: { onSubmit: (HTMLElement) => void }) {
  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <Input name="url" placeholder="url to shorten" />
          <Input name="slug" prepend="https://pete.sh/" />
          <Button type="submit">shorten</Button>
        </form>
      </div>
    </div>
  );
}
