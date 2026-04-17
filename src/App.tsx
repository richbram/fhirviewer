import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Route, Routes } from 'react-router-dom';
import { AuthenticatedApp } from './components/AuthenticatedApp/AuthenticatedApp';
import FHIRResourceContainer from './components/FHIRResourceContainer/FHIRResourceContainer';
import FHIRViewer from './components/FHIRViewer/FHIRViewer';
const App = () => {
    const { accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    return (
        <AuthenticatedApp>
            <header>
                <logo slot='logo' mobile-name='bcbsnc-short' name='bcbsnc-short'></lh-logo>

                <container slot='title' spacing='none' content-width='fluid' alignment="center">
                    <typography variant="h5">PatientViewer</lh-typography>
                    <typography variant="text-rich">A Blue Cross NC Healthihub app</lh-typography>
                </lh-container>

                <icon-button slot='action-nav' icon='bell' accessible-label='Notifications' size='lg'>
                    <badge slot='badge' number='3'></lh-badge>
                </lh-icon-button>

                <icon-button slot='action-nav' icon='user-circle' accessible-label='User' size='lg' slideout-id="user-details" target="_slideout">
                    <badge slot='badge' number='1'></lh-badge>
                </lh-icon-button>

                <icon slot='action-nav' name='list' size='lg'></lh-icon>
            </lh-header>
            {isAuthenticated && (
                <slideout id="user-details" accessible-label="User Details">
                    <container spacing="tight" alignment="center">
                        <logo name="bcbsnc-short" href="/"></lh-logo>

                        <typography variant="h6" alignment="center">User Details</lh-typography>
                        <typography variant="text-rich" alignment="center">Name: {accounts[0].name}</lh-typography>
                        <typography variant="text-rich" alignment="center">Email: {accounts[0].username}</lh-typography>

                    </lh-container>
                </lh-slideout>
            )}
            <Routes>
                <Route path='/' element={<FHIRViewer />} />
                <Route path='/:resourceType' element={<FHIRViewer />} />
                <Route path='/:resourceType/:id' element={<FHIRViewer />} />
                <Route path='/Patient/:id' element={<FHIRResourceContainer />} />
            </Routes>

            <footer theme="dark">
                <logo slot="logo" name="bcbsnc-full" inverse></lh-logo>
            </lh-footer>
        </AuthenticatedApp>
    );
};

export default App;
