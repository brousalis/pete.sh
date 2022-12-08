import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const slug = req.query.slug;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!slug) {
    res.status(404).json({ error: 'Invalid request' });
    return;
  }

  const data = await prisma.link.findFirst({
    where: { slug: { equals: slug } },
  });

  if (!data) {
    res.status(404).json({ error: 'Invalid link' });
    return;
  }

  res.json(data);

  return;
};
