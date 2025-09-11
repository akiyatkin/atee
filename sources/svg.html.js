const svg = {}
export default svg
svg.edit = () => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>`
svg.plus = () => `
	<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect width="24" height="24"></rect>
		<path class="one" stroke-width="2" d="M 0 12 L 24 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
		<path class="two" stroke-width="2" d="M 12 0 L 12 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
	</svg>
`
svg.cross = () => `
	<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect width="24" height="24"></rect>
		<path class="one" stroke-width="2" d="M 0 0 L 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
		<path class="two" stroke-width="2" d="M 0 24 L 24 0" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
	</svg>
`
svg.eye = (custom, def) => `
	<svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
		<ellipse class="iris" cx="8.5" cy="6" rx="7" ry="5" />
		<ellipse class="pupil" cx="8.5" cy="6" rx="2" ry="3" />
		<path class="beam" d="M2 11.5L15 1" stroke-linecap="round" stroke-linejoin="round">
	</svg>
`