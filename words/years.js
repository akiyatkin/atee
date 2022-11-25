export const years = start => {
	let y = new Date().getFullYear()
	if (y == start) return y
	return start + '&ndash;' + y
}
export default years