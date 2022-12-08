import LinkForm from '../app/components/LinkForm';
import Head from 'next/head';
import React from 'react';

export default function HomeView() {
  return (
    <div
      role="main"
      className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8"
    >
      <Head>
        <title>pete.short</title>
        <meta name="description" content="a really good url shortener" />
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2
          role="heading"
          className="mt-6 text-center text-3xl font-semibold tracking-tight text-gray-900"
        >
          <span className="text-gray-900">pete.sh</span>
          <span className="text-indigo-500">ort</span>
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          a really good url shortener
        </p>
      </div>

      <LinkForm />
    </div>
  );
}
