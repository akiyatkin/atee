import nicked from "/@atee/nicked"
export default input => {
	const value = input.value
	//const query = value.replace(/<\/?[^>]*(>|$)/g, " ").replace(/[\s\-\"\'\&\?\:\.\!\*]+/g, " ")
	const query = value.replace(/[\s\<\>\-\"\'\&\?\:\.\!\*]+/g, " ")
	const hashs = query.split(',').map(q => nicked(q)).join(',')
	const hash = nicked(query)
	return {value, query, hash, hashs}
}