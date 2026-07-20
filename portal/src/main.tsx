import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import TabletApp from './TabletApp'
import ErrorBoundary from './ErrorBoundary'

const isTablet = window.location.pathname.startsWith('/tablet');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isTablet ? <TabletApp /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
