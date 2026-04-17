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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#093452] shadow-sm">
            <img
              src="/assets/iks-health-white-logo.webp"
              alt="Placeholder white healthcare logo"
              className="max-h-9 w-auto object-contain"
            />
          </div>
          <h1 className="mb-3 text-2xl font-semibold text-slate-900">Authentication required</h1>
          <p className="mb-6 text-sm text-slate-600">
            {mode === 'gcp'
              ? 'Use Google Cloud authentication to request a token for the configured FHIR endpoint.'
              : 'Sign in with Microsoft authentication to continue.'}
          </p>
          {error && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}
          <button
            type="button"
            onClick={login}
            className="inline-flex items-center justify-center rounded-lg bg-[#e57f25] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#cf6f1f]"
          >
            {mode === 'gcp' ? 'Sign in with Google Cloud' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
