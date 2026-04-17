import { InteractionRequiredAuthError, InteractionType } from '@azure/msal-browser';
import { useIsAuthenticated, useMsal, useMsalAuthentication } from '@azure/msal-react';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authMode, gcpClientId, gcpScopes, msalScope, type AuthMode } from '../config/runtime';
import { setAccessToken as setSharedAccessToken, setAuthMode as setSharedAuthMode } from './tokenStore';

declare global {
    interface Window {
        google?: any;
    }
}

interface AuthUser {
    name?: string;
    email?: string;
}

interface AuthContextValue {
    mode: AuthMode;
    isAuthenticated: boolean;
    isLoading: boolean;
    accessToken: string | null;
    user: AuthUser | null;
    login: () => void;
    logout: () => void;
    error: string | null;
}

const noop = () => undefined;

const defaultValue: AuthContextValue = {
    mode: authMode,
    isAuthenticated: authMode === 'none',
    isLoading: false,
    accessToken: null,
    user: null,
    login: noop,
    logout: noop,
    error: null,
};

const AuthContext = createContext<AuthContextValue>(defaultValue);

const NoneAuthProvider = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        setSharedAuthMode('none');
        setSharedAccessToken(null);
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        mode: 'none',
        isAuthenticated: true,
        isLoading: false,
        accessToken: null,
        user: null,
        login: noop,
        logout: noop,
        error: null,
    }), []);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const MsalAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useIsAuthenticated();
    const { instance, accounts } = useMsal();
    const { error } = useMsalAuthentication(InteractionType.Redirect, {
        scopes: msalScope ? [msalScope] : [],
        redirectStartPage: window.location.href,
    });
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [tokenLoading, setTokenLoading] = useState(true);

    useEffect(() => {
        setSharedAuthMode('msal');
    }, []);

    useEffect(() => {
        let cancelled = false;

        const acquireToken = async () => {
            if (!isAuthenticated || accounts.length === 0) {
                setAccessToken(null);
                setSharedAccessToken(null);
                setTokenLoading(!isAuthenticated);
                return;
            }

            try {
                setTokenLoading(true);
                const result = await instance.acquireTokenSilent({
                    account: accounts[0],
                    scopes: msalScope ? [msalScope] : [],
                });

                if (!cancelled) {
                    setAccessToken(result.accessToken);
                    setSharedAccessToken(result.accessToken);
                }
            } catch (tokenError) {
                if (tokenError instanceof InteractionRequiredAuthError) {
                    await instance.loginRedirect({
                        scopes: msalScope ? [msalScope] : [],
                        redirectStartPage: window.location.href,
                    });
                    return;
                }

                console.error('Failed to acquire MSAL token:', tokenError);
                if (!cancelled) {
                    setAccessToken(null);
                    setSharedAccessToken(null);
                }
            } finally {
                if (!cancelled) {
                    setTokenLoading(false);
                }
            }
        };

        acquireToken();

        return () => {
            cancelled = true;
        };
    }, [accounts, instance, isAuthenticated]);

    const login = () => {
        instance.loginRedirect({
            scopes: msalScope ? [msalScope] : [],
            redirectStartPage: window.location.href,
        });
    };

    const logout = () => {
        instance.logoutRedirect();
    };

    const user = accounts[0]
        ? {
            name: accounts[0].name ?? undefined,
            email: accounts[0].username ?? undefined,
        }
        : null;

    const value = useMemo<AuthContextValue>(() => ({
        mode: 'msal',
        isAuthenticated,
        isLoading: !isAuthenticated || tokenLoading,
        accessToken,
        user,
        login,
        logout,
        error: error ? String(error) : null,
    }), [accessToken, error, isAuthenticated, tokenLoading, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const loadGoogleScript = async (): Promise<void> => {
    if (window.google?.accounts?.oauth2) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');

        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
        document.head.appendChild(script);
    });
};

const GcpAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const tokenClientRef = useRef<any>(null);
    const [scriptReady, setScriptReady] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        setSharedAuthMode('gcp');
        setSharedAccessToken(null);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const initialize = async () => {
            if (!gcpClientId) {
                setAuthError('Missing VITE_GCP_CLIENT_ID for Google Cloud auth mode.');
                return;
            }

            try {
                await loadGoogleScript();

                if (cancelled) {
                    return;
                }

                tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: gcpClientId,
                    scope: gcpScopes.join(' '),
                    callback: async (response: any) => {
                        if (response?.error) {
                            setAuthError(response.error_description || response.error || 'Google authentication failed.');
                            return;
                        }

                        const token = response?.access_token ?? null;
                        setAccessToken(token);
                        setSharedAccessToken(token);
                        setAuthError(null);

                        if (token) {
                            try {
                                const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                });

                                if (profileResponse.ok) {
                                    const profile = await profileResponse.json();
                                    setUser({
                                        name: profile.name,
                                        email: profile.email,
                                    });
                                }
                            } catch (profileError) {
                                console.warn('Unable to load Google user profile:', profileError);
                            }
                        }
                    },
                });

                setScriptReady(true);
            } catch (scriptError) {
                console.error(scriptError);
                setAuthError('Unable to initialize Google Cloud authentication.');
            }
        };

        initialize();

        return () => {
            cancelled = true;
        };
    }, []);

    const login = () => {
        setAuthError(null);
        tokenClientRef.current?.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    };

    const logout = () => {
        if (accessToken && window.google?.accounts?.oauth2?.revoke) {
            window.google.accounts.oauth2.revoke(accessToken, () => undefined);
        }

        setAccessToken(null);
        setSharedAccessToken(null);
        setUser(null);
    };

    const value = useMemo<AuthContextValue>(() => ({
        mode: 'gcp',
        isAuthenticated: Boolean(accessToken),
        isLoading: !scriptReady && !authError,
        accessToken,
        user,
        login,
        logout,
        error: authError,
    }), [accessToken, authError, scriptReady, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    if (authMode === 'none') {
        return <NoneAuthProvider>{children}</NoneAuthProvider>;
    }

    if (authMode === 'gcp') {
        return <GcpAuthProvider>{children}</GcpAuthProvider>;
    }

    return <MsalAuthProvider>{children}</MsalAuthProvider>;
};

export const useAuth = (): AuthContextValue => useContext(AuthContext);
