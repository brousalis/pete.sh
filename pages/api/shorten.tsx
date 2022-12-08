import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async (req: NextApiRequest, res: NextApiResponse) => {
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
  }

  if (!data) {
    res.status(500).json({ error: 'Unexpected error' });
    return;
  }


  res.json(data);

  return;
};
