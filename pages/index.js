import Head from 'next/head';

import CreateLink from '../components/CreateLink';

export default function Home() {
  return (
    <div>
      <Head>
        <title>pete.sh(ort)</title>
        <meta name='description' content='pete brousalis, brousalis' />
      </Head>

      <CreateLink />
    </div>
  );
}
