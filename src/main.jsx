import React from 'react';
import ReactDOM from 'react-dom';
import { Helmet } from 'react-helmet';

import '@/index.css';
import App from '@/App';

const rootEl = document.getElementById('root');

try {
  ReactDOM.render(
    <React.StrictMode>
      <Helmet
        defaultTitle='PHCIS'
        titleTemplate='%s | PHCIS'
      >
        <meta charSet='utf-8' />
      </Helmet>
      <App />
    </React.StrictMode>,
    rootEl,
  );
} catch (err) {
  console.error(err);
  if (rootEl) {
    rootEl.innerHTML = `<pre style="padding:24px;color:#7F1D1D;white-space:pre-wrap">${err.stack || err.message}</pre>`;
  }
}
