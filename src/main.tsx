import '@bcbsnc/litehouse/litehouse';
import '@bcbsnc/litehouse/style.css';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './auth/AuthProvider';
import { authMode } from './config/runtime';
import { FhirClientProvider } from './providers/FHIRClient.tsx';
import './styles/index.css';

async function renderApp() {
    const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

    if (authMode === 'msal') {
        const { PublicClientApplication } = await import('@azure/msal-browser');
        const { MsalProvider } = await import('@azure/msal-react');
        const { default: msalConfig } = await import('./security/msalConfig');

        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();

        root.render(
            <Router>
                <MsalProvider instance={msalInstance}>
                    <AuthProvider>
                        <FhirClientProvider>
                            <App />
                        </FhirClientProvider>
                    </AuthProvider>
                </MsalProvider>
            </Router>
        );

        return;
    }

    root.render(
        <Router>
            <AuthProvider>
                <FhirClientProvider>
                    <App />
                </FhirClientProvider>
            </AuthProvider>
        </Router>
    );
}

renderApp();
