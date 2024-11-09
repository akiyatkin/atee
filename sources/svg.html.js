const svg = {}
export default svg



svg.eye = (custom, def) => `
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
		<ellipse class="iris" cx="8.5" cy="6" rx="7" ry="5" />
		<ellipse class="pupil" cx="8.5" cy="6" rx="2" ry="3" />
		<path class="beam" d="M2 11.5L15 1" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
	</svg>
`