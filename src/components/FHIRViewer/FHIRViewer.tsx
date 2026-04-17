import { Bundle, Resource } from 'fhir/r4';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { executeEverythingAcrossPartitions, searchAcrossPartitions, SearchParam, useFhirClient } from '../../providers/FHIRClient';
import { Loader, NoResults } from '../../utils';
import FhirResource from '../FHIRResource/FHIRResource';
import { FhirSearchBuilder } from '../FHIRSearch/FHIRSearchBuilder';
import FHIRSearchResults from '../FHIRSearch/FHIRSearchResults';

const FHIRViewer = () => {
	const { resourceType: routeType, id: idParam } = useParams();
	const location = useLocation();
	const [resourceType, setResourceType] = useState(routeType || 'Patient');
	const resourceId = idParam || '';
	const { searchResource, readResource, readBundleUrl } = useFhirClient();
	const [bundle, setBundle] = useState<Bundle | null>(null);
	// const [initialBundleUrl, setInitialBundleUrl] = useState('');
	// const [currentPage, setCurrentPage] = useState('');
	// const [previousPage, setPreviousPage] = useState('');
	const [nextPage, setNextPage] = useState('');
	const [totalPages, setTotalPages] = useState(1);
	// const [totalRecordCount, setTotalRecordCount] = useState(0);
	const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
	const [searchParams, setSearchParams] = useState<SearchParam[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showRawJson, setShowRawJson] = useState(false);
	const isRootPath = location.pathname === '/' && !location.search;
	const patientAccordionRef = useRef<HTMLDivElement>(null);
	const encounterAccordionRef = useRef<HTMLDivElement>(null);
	const advancedSearchRef = useRef<HTMLDivElement>(null);
	// const searchInputRef = useRef<HTMLInputElement>(null);
	// const [memberId, setMemberId] = useState('');

	const getQueryParams = () => {
		const params = new URLSearchParams(location.search);
		const paramArray = [];
		for (let [key, value] of params.entries()) {
			paramArray.push({ name: key, value: value });
		}
		return paramArray;
	};

	useEffect(() => {
		setSearchParams(getQueryParams());
	}, [location.search]);


	useEffect(() => {
		if (resourceId !== undefined && resourceId !== null && resourceId !== '') {
			executeRead(resourceId);
		}
	}, []);

	// Execute search when searchParams change
	useEffect(() => {
		if (searchParams.length > 0) {
			executeSearch();
		}
	}, [searchParams]);


	useEffect(() => {
		// Map to store accordion references for cleaner code
		const accordions = {
			patient: patientAccordionRef.current,
			encounter: encounterAccordionRef.current,
			advanced: advancedSearchRef.current
		};

		/**
		 * Handles accordion open events and ensures only one accordion is open at a time
		 * @param event - Custom event from the accordion
		 */
		const handleAccordionOpen = (event: CustomEvent) => {
			const target = event.target as HTMLElement;

			// Close all accordions except the one that was clicked
			Object.entries(accordions).forEach(([key, accordion]) => {
				if (accordion && target !== accordion) {
					accordion.close();
				}
			});
		};

		// Add event listeners to all accordions
		Object.values(accordions).forEach(accordion => {
			accordion?.addEventListener('lh-open', handleAccordionOpen);
		});

		// Clean up event listeners when component unmounts
		return () => {
			Object.values(accordions).forEach(accordion => {
				accordion?.removeEventListener('lh-open', handleAccordionOpen);
			});
		};
	}, []);

	// Helper function to close all accordions
	const closeAllAccordions = () => {
		const accordions = {
			patient: patientAccordionRef.current,
			encounter: encounterAccordionRef.current,
			advanced: advancedSearchRef.current
		};

		Object.values(accordions).forEach(accordion => {
			if (accordion) {
				accordion.close();
			}
		});
	};

	function setPageVariables(results: { link?: any[]; total?: SetStateAction<number>; entry?: string | any[]; }) {
		if (results.link) {
			const nextLink = results.link.find((link: { relation: string }) => link.relation === 'next');
			setNextPage(nextLink?.url || '');
		} else {
			setNextPage('');
		}

		setTotalPages(2);
	}

	const executeSearch = async () => {
		setLoading(true);
		setError(null);
		setSelectedResource(null);
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
		} catch (error) {
			setError('Error executing search');
			console.error('Error executing search:', error);
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
		} catch (error) {
			setError('Error executing read');
			console.error('Error executing read:', error);
		} finally {
			setLoading(false);
		}
	};


	const handleSelectResource = (resource: Resource) => {
		console.log('Selected Resource:', resource);
		let resourceUrl;
		if (location.pathname === '/' && resource.resourceType === 'Patient') {
			const patientId = resource.id;
			if (patientId) {
				resourceUrl = `/Patient/${patientId}`;
				window.open(resourceUrl, '_blank');
			} else {
				console.error('Resource ID not found.');
			}
		} else {
			setSelectedResource(resource);
		}
	};

	const toggleRawJson = () => {
		setShowRawJson(!showRawJson);
	};

	const handlePageClick = async (event: CustomEvent) => {
		// const page = event.detail.page;
		//setCurrentPage(page);
		const pageUrl = nextPage;

		if (!pageUrl) return;

		try {
			setLoading(true);
			const results = await readBundleUrl(pageUrl) as Bundle;
			setBundle(results);
			setPageVariables(results);
		} catch (error) {
			setError('Error loading next page');
			console.error('Error loading next page:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleEverythingSearch = async (e: any) => {
		e.preventDefault();

		// Close all accordions when search is initiated
		closeAllAccordions();

		// Access the input field value using e.target.elements
		const inputValue = e.target.elements.identifier.value;

		// Set loading state
		setLoading(true);
		setError(null);

		try {
			// Execute a Patient Search by Identifier
			/*const patientIdParams = [{
				name: "identifier",
				value: 'http://bluecrossnc.com/fhir/memberidentifier/nchie:' + inputValue
			}];*/
			const patientIdParams = [{
				name: "identifier",
				value: inputValue
			}];

			const result = await searchAcrossPartitions('Patient', patientIdParams);

			if (!result.entry || result.entry.length === 0) {
				setError('No patient found with that identifier');
				setLoading(false);
				return;
			}

			const patientId = result.entry[0].resource.id;
			const everything = await executeEverythingAcrossPartitions(patientId);
			const patient = everything.entry.filter((entry: any) => entry.resource.resourceType === "Patient");

			if (patient && patient.length > 0) {
				setSelectedResource(patient[0].resource);
			} else {
				setError('Patient data incomplete');
			}
		} catch (error) {
			setError('Error searching for patient');
			console.error('Error searching for patient:', error);
		} finally {
			setLoading(false);
		}
	}
	console.log('Bundle:', bundle);

	return (
		<>
			{isRootPath ? (
				<>
					<container
						gutters="none"
						spacing="none"
						content-width="sm"
						margin-bottom="xxs"
						margin-top="xxs"
						alignment="center"
						padding-bottom="sm"
						padding-top="sm"
						theme="primary-dark"
					>
						<container spacing="none" content-width="fluid" >
							<form onSubmit={handleEverythingSearch}>
								<search-input theme="primary-dark" name="identifier" placeholder="Member ID"></lh-search-input>
							</form>
						</lh-container>
					</lh-container>
					<accordion>
						<container spacing="none" content-width="fluid">
							{/* Patient Search */}
							<accordion-panel
								ref={patientAccordionRef}
								header="PATIENTS SEARCH"
							>
								<FhirSearchBuilder
									resourceType="Patient"
									onSearch={(params) => {
										setResourceType('Patient');
										setSearchParams(params);
									}}
								/>
							</lh-accordion-panel>

							{/* Encounter Search */}
							<accordion-panel
								ref={encounterAccordionRef}
								header="ENCOUNTERS SEARCH"
							>
								<FhirSearchBuilder
									resourceType="Encounter"
									onSearch={(params) => {
										setResourceType('Encounter');
										setSearchParams(params);
									}}
								/>
							</lh-accordion-panel>
						</lh-container>
					</lh-accordion>
				</>
			) : (
				<accordion>
					<container spacing="none" content-width="fluid">
						<accordion-panel header={resourceType.toUpperCase()} default-open>
							<FhirSearchBuilder
								resourceType={resourceType}
								onSearch={setSearchParams}
							/>
						</lh-accordion-panel>
					</lh-container>
				</lh-accordion>
			)}

			{loading && <Loader />}

			{error &&
				<container spacing="none" content-width="fluid" alignment="center" padding-bottom="lg" padding-top="lg">
					<typography variant="h6">Error: {error}</lh-typography>
				</lh-container>
			}

			{selectedResource ? (
				<div>
					<FhirResource resource={selectedResource} followReferences={true} />

					<container spacing="none" content-width="fluid" alignment="center" padding-bottom="lg" padding-top="lg">
						<button-group label='' alignment='center' orientation='horizontal' size='large'>
							<button icon='arrow-left' icon-position='left' onClick={() => setSelectedResource(null)}>
								Back to Results
							</lh-button>
							{' '}
							<button icon='book-open' onClick={toggleRawJson}>
								{showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}{' '}
							</lh-button>
						</lh-button-group>
					</lh-container>

					{showRawJson && <pre>{JSON.stringify(selectedResource, null, 2)}</pre>}
				</div>
			) : bundle ? (
				<div>
					<FHIRSearchResults bundle={bundle} onSelectResource={handleSelectResource} followReferences={true} />

					<container spacing="none" content-width="fluid" alignment="center" padding-bottom="sm" padding-top="none">
						<pagination
							default-page={1}
							pages={totalPages}
							onlh-click={handlePageClick}
						>
						</lh-pagination>
					</lh-container>
				</div>
			) : (
				!loading && !error && <NoResults />
			)}
		</>
	);
};

export default FHIRViewer;
