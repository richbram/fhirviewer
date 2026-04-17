import { Patient } from 'fhir/r4';
import React from 'react';
interface PatientDetailSidebarProps {
	patient: Patient;
	refreshPage: () => void;
}

const PatientDetailSidebar: React.FC<PatientDetailSidebarProps> = ({ patient, refreshPage }) => {
	if (!patient) {
		return <div>No patient data available</div>;
	}

	const { name, gender, birthDate, telecom, address } = patient;

	const fullName = name?.[0]
		? `${name[0].given?.join(' ')} ${name[0].family}`
		: 'Not Received';
	const email = telecom?.find((t: any) => t.system === 'email')?.value || 'Not Received';
	const phone = telecom?.find((t: any) => t.system === 'phone')?.value || 'Not Received';
	const fullAddress = address?.[0]
		? `${address[0].line?.join(', ')}, ${address[0].city}, ${address[0].state}, ${address[0].postalCode}`
		: 'Not Received';

	const age = birthDate
		? `${new Date().getFullYear() - new Date(birthDate).getFullYear()} years`
		: 'Not Available';

	const handleAttachDocument = () => {
		console.log('test');
	};

	return (
		<container
			theme="primary-dark"
			margin-bottom="none"
			margin-top="none"
			content-width="fluid"
			padding-top="md"
			padding-bottom="xl"
		>
			<typography variant="h2" display-as="h5" alt alignment="left">{fullName}</lh-typography>
			<hr style={{ border: '1px solid #ccc', margin: '16px 0' }} />

			<typography>
				<strong>Gender:</strong> {gender || 'Not Received'}
			</lh-typography>
			<typography>
				<strong>DOB:</strong> {birthDate || 'Not Received'}
			</lh-typography>
			<typography>
				<strong>Age:</strong> {age}
			</lh-typography>
			<typography>
				<strong>Email:</strong> {email}
			</lh-typography>
			<typography>
				<strong>Phone:</strong> {phone}
			</lh-typography>
			<typography>
				<strong>Address:</strong> {fullAddress}
			</lh-typography>
			<div style={{ marginBottom: '16px' }}>

			</div>
			{/* <div style={{ marginBottom: '16px' }}>
				<button
					size="medium"
					type="button"
					variant="outlined"
					icon-position="left"
				>
					Select
				</lh-button>
			</div> */}

			<div style={{ marginBottom: '16px' }}>
				<button
					size="medium"
					type="button"
					variant="outlined"
					icon="arrow-clockwise"
					icon-position="left"
					onClick={refreshPage}
				>
					Refresh
				</lh-button>
			</div>

			<div style={{ marginBottom: '16px' }}>
				<button
					size="medium"
					type="button"
					variant="outlined"
					icon="upload"
					icon-position="left"
					onClick={handleAttachDocument}
				>
					Upload Documents
				</lh-button>
			</div>


		</lh-container>
	);
};

export default PatientDetailSidebar;