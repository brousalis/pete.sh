import prisma from '../../app/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  let data;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    data = await prisma.link.create({
      data: {
        slug: req.body?.slug,
        url: req.body?.url,
      },
    });
  } catch (error) {
    console.error('POST error', error);
    res.status(500).json({ error: 'Error creating link' });
    return;
  }

  if (!data) {
    res.status(500).json({ error: 'Unexpected error' });
    return;
  }

  res.json(data);

  return;
}

export default handler;
