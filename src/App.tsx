import { Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { AuthenticatedApp } from './components/AuthenticatedApp/AuthenticatedApp';
import FHIRResourceContainer from './components/FHIRResourceContainer/FHIRResourceContainer';
import FHIRViewer from './components/FHIRViewer/FHIRViewer';

const App = () => {
    const { isAuthenticated, user, mode, logout } = useAuth();

    return (
        <AuthenticatedApp>
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                        <div>
                            <h1 className="text-xl font-semibold">PatientViewer</h1>
                            <p className="text-sm text-slate-600">
                                {mode === 'none' ? 'Local FHIR testing mode' : 'FHIR viewer application'}
                            </p>
                        </div>
                        {isAuthenticated && (
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                {user?.name && <span>{user.name}</span>}
                                {user?.email && <span>{user.email}</span>}
                                {mode !== 'none' && (
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                        Sign out
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-6">
                    <Routes>
                        <Route path='/' element={<FHIRViewer />} />
                        <Route path='/:resourceType' element={<FHIRViewer />} />
                        <Route path='/:resourceType/:id' element={<FHIRViewer />} />
                        <Route path='/Patient/:id' element={<FHIRResourceContainer />} />
                    </Routes>
                </main>

                <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-sm text-slate-500">
                    FHIR Viewer
                </footer>
            </div>
        </AuthenticatedApp>
    );
};

export default App;
