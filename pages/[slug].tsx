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

SlugView.getInitialProps = async ({ query }) => {
  const { slug } = query;
  try {
    const response = await axios.get(`/api/slug?slug=${slug}`);
    // res.writeHead(302)
    // res.end();
    window.location.replace(response?.data?.url);
  } catch (err) {
    return { error: err.response?.data?.error };
  }
  return {};
};

export default SlugView;
