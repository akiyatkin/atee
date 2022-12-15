import Access from "/-controller/Access.js"
import Rest from "/-rest"
import set from '/-showcase/rest.set.js'
import get from '/-showcase/rest.get.js'


const rest = new Rest(get, set)
rest.after((view, reans = {}) => {
	if (~view.action.indexOf('set-')) Access.setAccessTime()
	reans.nostore = true
})

export default rest
