import { nanoid } from 'nanoid';
import { generateSlug } from 'random-word-slugs';

export function generateLinkSlug(type = 'slug') {
  if (type === 'hash') {
    return nanoid(10);
  } else {
    return generateSlug();
  }
}
