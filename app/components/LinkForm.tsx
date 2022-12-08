import Alert from './Alert';
import Button from './Button';
import LinkInput from './LinkInput';
import SlugInput from './SlugInput';
import axios from 'axios';
import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

export type RequestState = '' | 'loading' | 'success' | 'error';

export interface LinkFormState {
  url?: string;
  slug?: string;
  slug_type?: string;
}

export const LinkFormInitialState = {
  url: '',
  slug: '',
  slug_type: 'hash',
};

export default function LinkForm() {
  const [form, setForm] = useState<LinkFormState>(LinkFormInitialState);
  const [loading, setLoading] = useState(null);
  const [response, setResponse] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { url, slug } = event.target;
    setLoading(true);
    try {
      const res = await axios.post('/api/shorten', {
        url: url?.value,
        slug: slug?.value,
      });

      setResponse(res.data);
    } catch (error) {
      setResponse({ error: 'invalid attempt' });
    }

    setLoading(false);
  };

  console.log(response);
  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
      <div
        className={clsx(
          'h-1 rounded-t-md ',
          loading && 'bg-gray-500',
          response?.error && 'bg-red-500',
          !response?.error && 'bg-green-500',
          !response && 'bg-indigo-500'
        )}
      />
      <div className="bg-white p-8 shadow sm:rounded-lg">
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <LinkInput
            form={form}
            setForm={setForm}
            setResponse={setResponse}
            error={response?.error && 'invalid link'}
          />
          <SlugInput form={form} setForm={setForm} />
          <Button
            loading={loading}
            color={response?.error ? 'error' : response ? 'success' : ''}
            type="submit"
          >
            <div className="animate__animated animate__bounce">
              {response?.success ? 'success 🎉️' : 'shorten ✂️'}
            </div>
          </Button>
        </form>

        {response && !response?.error && (
          <Alert
            shortenedUrl={response.slug_url}
            title="link shortened"
            onClose={() => {
              setResponse(null);
            }}
          >
            <a href={response.slug_url} rel="noreferrer" target="_blank">
              {response.slug_url}
            </a>
          </Alert>
        )}
      </div>
    </div>
  );
}
