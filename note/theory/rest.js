import Rest from "/-rest"
const rest = new Rest()

import rest_set from "/-note/theory/rest.get.js"
rest.extra(rest_set)
import rest_get from "/-note/theory/rest.set.js"
rest.extra(rest_get)



export default rest