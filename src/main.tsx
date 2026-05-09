import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { siteMeta } from './lib/siteMeta';
import './app.css';

document.documentElement.classList.replace('no-js', 'js');
document.documentElement.lang = siteMeta.locale;
document.title = siteMeta.name;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
