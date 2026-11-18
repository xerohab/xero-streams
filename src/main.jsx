import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Silence debug chatter in production; warnings and errors stay visible for error reporting
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Disable right-click on all images globally
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(console.warn));
}
