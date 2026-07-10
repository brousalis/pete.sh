import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@petehome/ui/theme.css';
import '@petehome/ui/index.css';
import '@petehome/ui/fonts.css';
import App from './App';
import { ConfigProvider } from '@petehome/config';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </StrictMode>
);
