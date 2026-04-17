import { authMode, type AuthMode } from '../config/runtime';

let currentAccessToken: string | null = null;
let currentAuthMode: AuthMode = authMode;

export const getAccessToken = (): string | null => currentAccessToken;
export const setAccessToken = (token: string | null): void => {
    currentAccessToken = token;
};

export const getAuthMode = (): AuthMode => currentAuthMode;
export const setAuthMode = (mode: AuthMode): void => {
    currentAuthMode = mode;
};
