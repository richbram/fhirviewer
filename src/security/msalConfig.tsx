import { Configuration } from '@azure/msal-browser';
import { parameters } from '../parameters';
const msalConfig: Configuration = {
	auth: {
		clientId: import.meta.env.VITE_APP_BCNC_CLIENT_ID,
		authority: import.meta.env.VITE_APP_BCNC_AUTHORITY + import.meta.env.VITE_APP_BCNC_TENANT_ID,
		redirectUri: parameters.redirectURI,

	},
	cache: {
		cacheLocation: 'localStorage',
		storeAuthStateInCookie: false,
	},
};

export default msalConfig;

