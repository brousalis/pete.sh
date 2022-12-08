import Alert from '../app/components/Alert';
import LinkForm from '../app/components/LinkForm';
import axios from 'axios';
import Head from 'next/head';
import React, { useState } from 'react';

export type RequestState = '' | 'loading' | 'success' | 'error';

export default function HomeView() {
  const [requestState, setRequestState] = useState<RequestState>('');
  const [shortenedUrl, setShortenedUrl] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setRequestState('loading');

    try {
      const res = await axios.post('/api/shorten', {
        url: event.target.url?.value,
        slug: event.target.slug?.value,
      });

      setRequestState('success');
      setShortenedUrl(`${process.env.NEXT_PUBLIC_BASE_URL}/${res.data.slug}`);
    } catch (error) {
      setRequestState('error');
      setShortenedUrl(null);
      console.error(error);
    }
    console.log(event);
  };

  const handleCloseAlert = () => {
    setRequestState('');
    setShortenedUrl(null);
  };

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>pete.short</title>
        <meta name="description" content="a really good url shortener" />
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-semibold tracking-tight text-gray-900">
          <span className="text-gray-900">pete.sh</span>
          <span className="text-indigo-500">ort</span>
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          a really good url shortener
        </p>
      </div>

      <LinkForm requestState={requestState} onSubmit={handleSubmit}>
        {requestState === 'success' && (
          <Alert shortenedUrl={shortenedUrl} onClose={handleCloseAlert} />
        )}
      </LinkForm>
    </div>
  );
}
