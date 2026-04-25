import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Disable right-click on all images globally
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)