import prisma from '../../app/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  let data;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { slug, url } = req.body;

  if (!slug) {
    res.status(500).json({ error: 'invalid_slug' });
    return;
  }

  try {
    data = await prisma.link.create({
      data: { slug, url },
    });
  } catch (error) {
    console.error('POST error', error);
    res.status(500).json({ error: 'invalid_link' });
    return;
  }

  if (!data) {
    res.status(500).json({ error: 'unexpected_error' });
    return;
  }

  res.json({
    ...data,
    success: true,
    slug_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${data.slug}`,
  });

  return;
}

export default handler;
