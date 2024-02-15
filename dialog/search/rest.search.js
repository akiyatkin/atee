import Rest from "/-rest"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"

const rest = new Rest()


rest.addArgument('hash', (view, hash) => {
	hash = nicked(hash)
	hash = unique(hash.split('-')).sort()
	return hash
})


export default rest