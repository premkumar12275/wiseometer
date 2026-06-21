import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Debug: indicate that the client bundle executed
try {
  console.log('wiseometer: client bundle executing', import.meta.env.MODE)
  const rootEl = document.getElementById('root')
  if (rootEl) rootEl.innerHTML = '<div id="debug" style="color:#9be7d1;padding:16px">JS bundle loaded — mounting React…</div>'
} catch (e) {
  console.error('Error during debug DOM write', e)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
