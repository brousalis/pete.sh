import React from 'react';
import Head from 'next/head';

import CreateLink from '../components/CreateLink';

export default function Home() {
  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>pete.sh(ort)</title>
        <meta name="description" content="a really good url shortener" />
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-semibold tracking-tight text-gray-900">
          <span className="text-gray-900">pete.sh</span>
          <span className="text-gray-500">ort</span>
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">a really good url shortener</p>
      </div>

      <CreateLink />
    </div>
  );
}
