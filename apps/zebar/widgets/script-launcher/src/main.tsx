import { ConfigProvider } from '@petehome/config';
import '@petehome/ui/fonts.css';
import '@petehome/ui/index.css';
import '@petehome/ui/theme.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
