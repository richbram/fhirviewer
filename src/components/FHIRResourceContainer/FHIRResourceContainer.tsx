import { Bundle, Resource } from 'fhir-types';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { executeEverythingAcrossPartitions, useFhirClient } from '../../providers/FHIRClient';
import { Loader, NoResults, formatLabel } from '../../utils';
import { groupBundleByResourceType } from '../../utils/dateManipulation';
import FHIRSearchResults from '../FHIRSearch/FHIRSearchResults';
import PatientDetailSidebar from '../PatientDetailSidebar/PatientDetailSidebar';

const FHIRResourceContainer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [resource, setResource] = useState<Resource | null>(null);
    const [selectedResourceName, setSelectedResourceName] = useState<string>('Encounter');
    const [selectedTab, setSelectedTab] = useState<string>('Encounter');
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupedResources, setGroupedResources] = useState<Record<string, Bundle>>({});

    const fetchResources = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!id) {
                setError('Missing patient identifier.');
                return;
            }

            const everythingResponse: Bundle = await executeEverythingAcrossPartitions(id);
            const groupedResourcesCall = groupBundleByResourceType(everythingResponse);
            const resourceTypes = Object.keys(groupedResourcesCall);

            setGroupedResources(groupedResourcesCall);
            setResource(groupedResourcesCall.Patient?.entry?.[0]?.resource || null);

            const initialTab = resourceTypes.includes('Encounter')
                ? 'Encounter'
                : (resourceTypes[0] || 'Patient');

            setSelectedTab(initialTab);
            setSelectedResourceName(initialTab);
            setSelectedResource(null);
        } catch (err) {
            setError('Failed to fetch resources');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchResources();
        }
    }, [id]);

    const refreshPage = () => {
        fetchResources();
    };

    const handleSelectResource = (nextResource: Resource) => {
        if (nextResource.resourceType) {
            setSelectedResourceName(nextResource.resourceType);
        }
        setSelectedResource(nextResource);
    };

    const resourceTypes = useMemo(() => Object.keys(groupedResources), [groupedResources]);

    if (loading) return <Loader />;
    if (error) return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>;
    if (!resource) return <NoResults message="Resource not found" />;

    return (
        <div className="space-y-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
                <Link to="/" className="transition hover:text-slate-700">Home Page</Link>
                <span>/</span>
                <Link to={`/Patient/${id}`} className="transition hover:text-slate-700">Patient Details</Link>
                <span>/</span>
                <span className="font-medium text-slate-700">{selectedResourceName}</span>
            </nav>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <aside className="lg:col-span-4 xl:col-span-3">
                    <PatientDetailSidebar patient={resource as any} refreshPage={refreshPage} />
                </aside>

                <section className="lg:col-span-8 xl:col-span-9">
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                                {resourceTypes.map((resourceType) => (
                                    <button
                                        key={resourceType}
                                        type="button"
                                        onClick={() => {
                                            setSelectedTab(resourceType);
                                            setSelectedResourceName(resourceType);
                                            setSelectedResource(null);
                                        }}
                                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedTab === resourceType
                                            ? 'bg-[#093452] text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                    >
                                        {formatLabel(resourceType)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fff4ea] text-[#cf6f1f]">R</span>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {formatLabel(selectedTab)}
                                </h2>
                            </div>

                            {selectedTab && groupedResources[selectedTab] ? (
                                <FHIRSearchResults
                                    bundle={groupedResources[selectedTab]}
                                    onSelectResource={handleSelectResource}
                                    followReferences={true}
                                />
                            ) : (
                                <NoResults message="No resources available for the selected tab." />
                            )}

                            {selectedResource && (
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    Selected resource: <span className="font-medium text-slate-900">{selectedResource.resourceType}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default FHIRResourceContainer;
