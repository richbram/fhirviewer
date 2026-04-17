import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchResource, readResource } from './FHIRClient';

const FHIR_BASE = 'https://fhir.test';
vi.stubEnv('VITE_FHIR_SERVER_URL', FHIR_BASE);

describe('FHIR Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    localStorage.setItem('access_token', 'test-token');
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
      `${FHIR_BASE}/Patient?name=smith`,
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
        headers: expect.any(Object),
      })
    );

    expect(result).toEqual(mockResource);
  });

  it('throws on failed search', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    });

    await expect(
      searchResource('Patient', [{ name: 'name', value: 'fail' }])
    ).rejects.toThrow('FHIR search failed: Bad Request');
  });
});
