import { nicked } from "/-nicked/nicked.js"
export default input => {
	let query = input.value
	query = query.replace(/<\/?[^>]*(>|$)/g, " ")
	query = query.replace(/[\s\-\"\'\&\?\:\.\,\!\*]+/g, " ")
	const hash = nicked(query)
	return {query, hash}
}