import nicked from "/-nicked"
export default input => {
	const value = input.value
	const query = value.replace(/<\/?[^>]*(>|$)/g, " ").replace(/[\s\-\"\'\&\?\:\.\,\!\*]+/g, " ")
	const hash = nicked(query)
	return {value, query, hash}
}