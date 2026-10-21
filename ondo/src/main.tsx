import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Providers } from './Providers.tsx'
import './index.css'

// biome-ignore lint/style/noNonNullAssertion: #root is defined in index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
)
