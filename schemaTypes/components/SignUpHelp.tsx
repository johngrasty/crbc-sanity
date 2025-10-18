import React from 'react';

export const SignUpHelp = () => {
	return (
		<div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
			<h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
				Custom Sign-Ups Management
			</h2>
			<div style={{ lineHeight: '1.6', color: '#666' }}>
				<p style={{ marginBottom: '1rem' }}>
					<strong>What are Custom Sign-Ups?</strong>
					<br />
					Custom sign-ups are for PCO People forms or external registration links that aren't
					full events in Planning Center Calendar.
				</p>
				<p style={{ marginBottom: '1rem' }}>
					<strong>When to use Custom Sign-Ups:</strong>
				</p>
				<ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
					<li>PCO People forms (surveys, volunteer sign-ups, etc.)</li>
					<li>External registration links</li>
					<li>Ongoing ministry opportunities</li>
					<li>Simple sign-ups that don't need a full event in PCO Calendar</li>
				</ul>
				<p style={{ marginBottom: '1rem' }}>
					<strong>Note:</strong> Most events should be managed in Planning Center Calendar and
					will appear automatically on the website. Only create custom sign-ups when needed!
				</p>
				<p style={{ marginBottom: '1rem' }}>
					<strong>Categories:</strong>
				</p>
				<ul style={{ marginLeft: '1.5rem' }}>
					<li>
						<strong>Event:</strong> One-time or recurring events
					</li>
					<li>
						<strong>Ministry:</strong> Ongoing ministry involvement opportunities
					</li>
					<li>
						<strong>Volunteer:</strong> Service and volunteer opportunities
					</li>
				</ul>
			</div>
		</div>
	);
};
