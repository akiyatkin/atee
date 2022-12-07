import nicked from "/-nicked"
export default input => {
	let query = input.value
	query = query.replace(/<\/?[^>]*(>|$)/g, " ")
	query = query.replace(/[\s\-\"\'\&\?\:\.\,\!\*]+/g, " ")
	const hash = nicked(query)
	return {query, hash}
}