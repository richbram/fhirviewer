import { InteractionType } from '@azure/msal-browser';
import { useIsAuthenticated, useMsalAuthentication } from '@azure/msal-react';
import { useEffect } from 'react';
import { Loader } from '../../utils';

interface Props {
  children: React.ReactNode;
}

export const AuthenticatedApp = ({ children }: Props) => {
  const isAuthenticated = useIsAuthenticated();
  const { login, result, error } = useMsalAuthentication(InteractionType.Redirect, {
    scopes: [import.meta.env.VITE_APP_BCNC_SCOPE],
    redirectStartPage: window.location.href,
  });

  useEffect(() => {
    if (error) {
      console.error('Authentication error:', error);
    }
  }, [error]);

  if (!isAuthenticated) {
    return <Loader />;
  }

  return <>{children}</>;
};
