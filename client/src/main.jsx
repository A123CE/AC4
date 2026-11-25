import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/encyclopedia.css'
import './styles/CardSwap.css'
import './styles/guards.css'
import './styles/cardDeck.css'
import './styles/graphSphere.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
