import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken, setAuthMode } from '../auth/tokenStore';
import { readResource, searchResource } from './FHIRClient';

const FHIR_BASE = 'https://fhir.test';

vi.stubEnv('VITE_FHIR_BASE_URL', FHIR_BASE);
vi.stubEnv('VITE_FHIR_USE_PARTITIONS', 'false');

describe('FHIR Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    setAuthMode('msal');
    setAccessToken('test-token');
  });

  it('searchResource sends correct request and returns data', async () => {
    const mockData = { resourceType: 'Bundle', total: 1 };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await searchResource('Patient', [
      { name: 'name', value: 'smith' },
    ]);

    expect(fetch).toHaveBeenCalledWith(
      `${FHIR_BASE}/Patient?name=smith&_count=50`,
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/fhir+json',
          Authorization: 'Bearer test-token',
        },
      })
    );

    expect(result).toEqual(mockData);
  });

  it('omits Authorization when auth mode is none', async () => {
    setAuthMode('none');
    setAccessToken(null);

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ resourceType: 'Bundle', total: 0 }),
    });

    await searchResource('Patient', []);

    expect(fetch).toHaveBeenCalledWith(
      `${FHIR_BASE}/Patient?_count=50`,
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/fhir+json',
        },
      })
    );
  });

  it('readResource fetches the correct resource by ID', async () => {
    const mockResource = { resourceType: 'Patient', id: '123' };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResource,
    });

    const result = await readResource('Patient', '123');

    expect(fetch).toHaveBeenCalledWith(
      `${FHIR_BASE}/Patient/123`,
      expect.objectContaining({
        method: 'GET',
      })
    );

    expect(result).toEqual(mockResource);
  });
});
