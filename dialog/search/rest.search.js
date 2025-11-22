import Rest from "@atee/rest"
import nicked from "@atee/nicked"
import unique from "/-nicked/unique.js"

const rest = new Rest()

import rest_funcs from "/-rest/rest.funcs.js"
rest.extra(rest_funcs)




rest.addArgument('query', ['string'])
rest.addVariable('query#required', ['query', 'required'])
rest.addVariable('query_nick', ['query', 'nicked'])
rest.addVariable('query_nick#required', ['query_nick', 'required'])

rest.addArgument('hashs', ['string'], async (view, hashs) => {//Несколько условий "или""
	hashs ||= await view.get('query')
	hashs = hashs.split(', ').map(hash => unique(nicked(hash).split('-')).filter(r => r).sort()).filter(r => r.length)
	return hashs
})





// rest.addArgument('search', ['string'], async (view, search) => { //depricated
// 	search ||= await view.get('query')
// 	return search
// })
// rest.addVariable('search#required', ['search','required']) //depricated
// rest.addVariable('search_nick', ['search','nicked']) //depricated
// rest.addVariable('search_nick#required', ['search_nick','required']) //depricated

// rest.addArgument('hash', ['string'], async (view, hash) => { //depricated
// 	hash ||= await view.get('query')
// 	hash = nicked(hash)
// 	hash = unique(hash.split('-')).filter(r => r).sort()
// 	return hash
// })


export default rest
