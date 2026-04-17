import { Configuration } from '@azure/msal-browser';
import { msalAuthorityBase, msalClientId, msalTenantId, redirectUri } from '../config/runtime';

const msalConfig: Configuration = {
	auth: {
		clientId: msalClientId,
		authority: `${msalAuthorityBase}${msalTenantId}`,
		redirectUri,
	},
	cache: {
		cacheLocation: 'localStorage',
		storeAuthStateInCookie: false,
	},
};

export default msalConfig;
