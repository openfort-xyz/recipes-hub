import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EnvValidationWrapper } from './components/env_validation/EnvValidationWrapper'
import { Providers } from './Providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EnvValidationWrapper>
      <Providers>
        <App />
      </Providers>
    </EnvValidationWrapper>
  </StrictMode>
)
