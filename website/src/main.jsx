import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))

function RootLayout() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  )
}

root.render(
  <StrictMode>
    <RootLayout />
  </StrictMode>,
)
