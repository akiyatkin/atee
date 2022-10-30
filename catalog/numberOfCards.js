export default (limit) => {
	const listcards = document.getElementsByClassName('listcards')[0]
	if (!listcards) return limit
	let count = getComputedStyle(listcards).getPropertyValue("grid-template-columns").split(' ').length * 2
	if (count <= 2) count = limit
	if (count <= 4) count = 6
	return count
}