import type { Config } from 'tailwindcss';
import sharedConfig from '@petehome/tailwind';

const config: Pick<Config, 'prefix' | 'presets' | 'content'> = {
  content: ['./src/**/*.tsx', '../widgets/*/src/**/*.{ts,tsx}'],
  presets: [sharedConfig],
};

export default config;
