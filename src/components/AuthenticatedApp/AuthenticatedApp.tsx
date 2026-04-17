import type { ReactNode } from 'react';
import { Loader } from '../../utils';
import { useAuth } from '../../auth/AuthProvider';

interface Props {
  children: ReactNode;
}

export const AuthenticatedApp = ({ children }: Props) => {
  const { mode, isAuthenticated, isLoading, login, error } = useAuth();

  if (mode === 'none') {
    return <>{children}</>;
  }

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-slate-200">
          <h1 className="text-2xl font-semibold text-slate-900 mb-3">Authentication required</h1>
          <p className="text-sm text-slate-600 mb-6">
            {mode === 'gcp'
              ? 'Use Google Cloud authentication to request a token for the configured FHIR endpoint.'
              : 'Sign in with Microsoft authentication to continue.'}
          </p>
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}
          <button
            type="button"
            onClick={login}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            {mode === 'gcp' ? 'Sign in with Google Cloud' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
