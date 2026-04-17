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
                <header className="border-b border-[#0f456d] bg-[#093452] text-white shadow-sm">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                                <img
                                    src="/assets/iks-health-white-logo.webp"
                                    alt="Placeholder white healthcare logo"
                                    className="max-h-9 w-auto object-contain"
                                />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">FHIR Workspace</h1>
                                <p className="text-sm text-slate-200">
                                    {mode === 'none' ? 'Local FHIR testing mode' : 'FHIR viewer application'}
                                </p>
                            </div>
                        </div>
                        {isAuthenticated && (
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
                                {user?.name && <span>{user.name}</span>}
                                {user?.email && <span>{user.email}</span>}
                                {mode !== 'none' && (
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="rounded-lg bg-[#e57f25] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#cf6f1f]"
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
                    FHIR Workspace
                </footer>
            </div>
        </AuthenticatedApp>
    );
};

export default App;
