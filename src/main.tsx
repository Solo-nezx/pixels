import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {TooltipProvider} from './components/ui/tooltip';
import {installErrorReporting} from './lib/errorReporting';
import './index.css';

// Catch crashes before React mounts, so a failure in setup is still reported.
installErrorReporting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Radix tooltips need one provider above every trigger. 400ms is long
        enough not to fire on a passing cursor. */}
    <TooltipProvider delayDuration={400}>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
