import { Bundle, Resource } from 'fhir/r4';
import { SetStateAction, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { executeEverythingAcrossPartitions, searchAcrossPartitions, SearchParam, useFhirClient } from '../../providers/FHIRClient';
import { Loader, NoResults } from '../../utils';
import FhirResource from '../FHIRResource/FHIRResource';
import { FhirSearchBuilder } from '../FHIRSearch/FHIRSearchBuilder';
import FHIRSearchResults from '../FHIRSearch/FHIRSearchResults';

type AccordionKey = 'patient' | 'encounter' | 'advanced';

const panelStyles = {
    open: 'border-[#f2c49a] bg-[#fff4ea]',
    closed: 'border-slate-200 bg-white hover:bg-slate-50'
};

const FHIRViewer = () => {
    const { resourceType: routeType, id: idParam } = useParams();
    const location = useLocation();
    const [resourceType, setResourceType] = useState(routeType || 'Patient');
    const resourceId = idParam || '';
    const { readResource, readBundleUrl } = useFhirClient();
    const [bundle, setBundle] = useState<Bundle | null>(null);
    const [nextPage, setNextPage] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [searchParams, setSearchParams] = useState<SearchParam[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRawJson, setShowRawJson] = useState(false);
    const [memberIdentifier, setMemberIdentifier] = useState('');
    const [openPanel, setOpenPanel] = useState<AccordionKey | null>('patient');
    const isRootPath = location.pathname === '/' && !location.search;

    const getQueryParams = () => {
        const params = new URLSearchParams(location.search);
        const paramArray: SearchParam[] = [];
        for (const [key, value] of params.entries()) {
            paramArray.push({ name: key, value });
        }
        return paramArray;
    };

    useEffect(() => {
        setSearchParams(getQueryParams());
    }, [location.search]);

    useEffect(() => {
        if (routeType) {
            setResourceType(routeType);
        }
    }, [routeType]);

    useEffect(() => {
        if (resourceId) {
            executeRead();
        }
    }, [resourceId, resourceType]);

    useEffect(() => {
        if (searchParams.length > 0) {
            executeSearch();
        } else if (!resourceId) {
            setBundle(null);
        }
    }, [searchParams, resourceType]);

    const hasSearchResults = useMemo(() => Boolean(bundle?.entry?.length), [bundle]);

    function setPageVariables(results: { link?: any[]; total?: SetStateAction<number> }) {
        if (results.link) {
            const nextLink = results.link.find((link: { relation: string }) => link.relation === 'next');
            setNextPage(nextLink?.url || '');
        } else {
            setNextPage('');
        }

        setTotalPages(results.link?.some((link: { relation: string }) => link.relation === 'next') ? 2 : 1);
    }

    const executeSearch = async () => {
        setLoading(true);
        setError(null);
        setSelectedResource(null);
        setShowRawJson(false);

        try {
            const results = await searchAcrossPartitions(resourceType, searchParams);
            if (results && results.resourceType === 'Bundle') {
                setBundle(results);
                setPageVariables(results);
            } else {
                console.error('Invalid results format:', results);
                setError('Received invalid response format');
                setBundle(null);
            }
        } catch (searchError) {
            setError('Error executing search');
            console.error('Error executing search:', searchError);
            setBundle(null);
        } finally {
            setLoading(false);
        }
    };

    const executeRead = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await readResource(resourceType, resourceId);
            setSelectedResource(result);
        } catch (readError) {
            setError('Error executing read');
            console.error('Error executing read:', readError);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectResource = (resource: Resource) => {
        if (location.pathname === '/' && resource.resourceType === 'Patient') {
            const patientId = resource.id;
            if (patientId) {
                window.open(`/Patient/${patientId}`, '_blank');
            } else {
                console.error('Resource ID not found.');
            }
            return;
        }

        setSelectedResource(resource);
    };

    const toggleRawJson = () => {
        setShowRawJson((current) => !current);
    };

    const handlePageClick = async () => {
        if (!nextPage) return;

        try {
            setLoading(true);
            const results = (await readBundleUrl(nextPage)) as Bundle;
            setBundle(results);
            setPageVariables(results);
        } catch (pageError) {
            setError('Error loading next page');
            console.error('Error loading next page:', pageError);
        } finally {
            setLoading(false);
        }
    };

    const handleEverythingSearch = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!memberIdentifier.trim()) {
            setError('Please enter a member identifier.');
            return;
        }

        setOpenPanel(null);
        setLoading(true);
        setError(null);
        setSelectedResource(null);
        setShowRawJson(false);

        try {
            const patientIdParams = [{
                name: 'identifier',
                value: memberIdentifier.trim()
            }];

            const result = await searchAcrossPartitions('Patient', patientIdParams);

            if (!result.entry || result.entry.length === 0) {
                setError('No patient found with that identifier');
                return;
            }

            const patientId = result.entry[0].resource.id;
            const everything = await executeEverythingAcrossPartitions(patientId);
            const patient = everything.entry.filter((entry: any) => entry.resource.resourceType === 'Patient');

            if (patient && patient.length > 0) {
                setSelectedResource(patient[0].resource);
                setBundle(null);
            } else {
                setError('Patient data incomplete');
            }
        } catch (everythingError) {
            setError('Error searching for patient');
            console.error('Error searching for patient:', everythingError);
        } finally {
            setLoading(false);
        }
    };

    const renderAccordionSection = (
        key: AccordionKey,
        title: string,
        content: React.ReactNode,
        defaultOpen = false
    ) => {
        const isOpen = openPanel === key || (defaultOpen && openPanel === null);

        return (
            <div className={`overflow-hidden rounded-2xl border ${isOpen ? panelStyles.open : panelStyles.closed}`}>
                <button
                    type="button"
                    onClick={() => setOpenPanel((current) => current === key ? null : key)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-800"
                >
                    <span>{title}</span>
                    <span className="text-lg leading-none">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <div className="border-t border-slate-200 bg-white p-4">{content}</div>}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {isRootPath ? (
                <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-900 px-6 py-6 text-white shadow-sm">
                        <div className="mx-auto max-w-2xl">
                            <h2 className="text-lg font-semibold">Patient lookup</h2>
                            <p className="mt-1 text-sm text-slate-300">
                                Search for a patient by member identifier and open the patient-centric clinical view.
                            </p>
                            <form onSubmit={handleEverythingSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <input
                                    type="text"
                                    name="identifier"
                                    value={memberIdentifier}
                                    onChange={(event) => setMemberIdentifier(event.target.value)}
                                    placeholder="Member ID"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-400 focus:border-[#e57f25] focus:outline-none focus:ring-2 focus:ring-[#e57f25]/40"
                                />
                                <button
                                    type="submit"
                                    className="rounded-xl bg-[#e57f25] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#cf6f1f]"
                                >
                                    Search patient
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {renderAccordionSection(
                            'patient',
                            'Patients Search',
                            <FhirSearchBuilder
                                resourceType="Patient"
                                onSearch={(params) => {
                                    setResourceType('Patient');
                                    setSearchParams(params);
                                }}
                            />
                        )}
                        {renderAccordionSection(
                            'encounter',
                            'Encounters Search',
                            <FhirSearchBuilder
                                resourceType="Encounter"
                                onSearch={(params) => {
                                    setResourceType('Encounter');
                                    setSearchParams(params);
                                }}
                            />
                        )}
                    </div>
                </div>
            ) : (
                renderAccordionSection(
                    'advanced',
                    `${resourceType.toUpperCase()} Search`,
                    <FhirSearchBuilder resourceType={resourceType} onSearch={setSearchParams} />
                )
            )}

            {loading && <Loader />}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
                    Error: {error}
                </div>
            )}

            {selectedResource ? (
                <div className="space-y-4">
                    <FhirResource resource={selectedResource} followReferences={true} />

                    <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setSelectedResource(null)}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            Back to Results
                        </button>
                        <button
                            type="button"
                            onClick={toggleRawJson}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                            {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
                        </button>
                    </div>

                    {showRawJson && (
                        <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100">
                            {JSON.stringify(selectedResource, null, 2)}
                        </pre>
                    )}
                </div>
            ) : bundle ? (
                <div className="space-y-4">
                    <FHIRSearchResults bundle={bundle} onSelectResource={handleSelectResource} followReferences={true} />

                    {nextPage && (
                        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <span className="text-sm text-slate-500">
                                Additional results are available. Showing page 1 of {totalPages}.
                            </span>
                            <button
                                type="button"
                                onClick={handlePageClick}
                                className="rounded-lg bg-[#e57f25] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#cf6f1f]"
                            >
                                Load next page
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                !loading && !error && !hasSearchResults && <NoResults />
            )}
        </div>
    );
};

export default FHIRViewer;
