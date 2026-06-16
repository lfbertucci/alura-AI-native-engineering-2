import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// TODO: Implementar Redux Toolkit (atualmente usando Redux sem Toolkit)
// TODO: Adicionar TypeScript para PropTypes
// TODO: Refatorar class components para functional components

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
