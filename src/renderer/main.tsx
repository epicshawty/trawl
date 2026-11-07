import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from './components/ui/Overlays';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <TooltipProvider delayDuration={250} skipDelayDuration={200}>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
