import Document, { Head, Html, Main, NextScript } from 'next/document';
import React from 'react';

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html className="h-full bg-gray-100" lang="en">
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" />
        </Head>
        <body className="h-full transition-colors duration-100 ease-linear">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
