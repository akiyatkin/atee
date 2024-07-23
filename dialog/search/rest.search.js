import Rest from "/-rest"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"

const rest = new Rest()

import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)



rest.addArgument('hash', (view, hash) => {
	hash = nicked(hash)
	hash = unique(hash.split('-')).filter(r => r).sort()
	return hash
})


export default rest