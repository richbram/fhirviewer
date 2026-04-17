import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import '@bcbsnc/litehouse/litehouse';
import '@bcbsnc/litehouse/style.css';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.tsx';
import { FhirClientProvider } from './providers/FHIRClient.tsx';
import msalConfig from './security/msalConfig';
import './styles/index.css';

const msalInstance = new PublicClientApplication(msalConfig);

async function renderApp() {
    await msalInstance.initialize();

    const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
    root.render(
        <Router>
            {/* <StrictMode> */}
                <MsalProvider instance={msalInstance}>
                    <FhirClientProvider>
                        <App />
                    </FhirClientProvider>
                </MsalProvider>
            {/* </StrictMode> */}
        </Router>
    );
}

renderApp();
