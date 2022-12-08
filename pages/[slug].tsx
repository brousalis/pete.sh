import axios from 'axios';
import { NextPage } from 'next';
import React from 'react';

interface SlugViewProps {
  error?: string;
}

const SlugView: NextPage<SlugViewProps> = ({ error }) => {
  if (error) {
    return <div className="text-red-500">{error}</div>;
  }
  return <div>loading</div>;
};

SlugView.getInitialProps = async ({ res, query }) => {
  const { slug } = query;
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/slug`,
      {
        params: { slug: slug },
      }
    );

    const url = response?.data?.url;
    if (typeof window === 'undefined') {
      res.writeHead(302, { location: url });
      res.end();
    } else {
      window.location.replace(url);
    }
  } catch (err) {
    return { error: err.response?.data?.error };
  }

  return {};
};

export default SlugView;
