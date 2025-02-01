import Rest from "/-rest"
const rest = new Rest()
export default rest

import rest_set from '/-bed/admin/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-bed/admin/rest.get.js'
rest.extra(rest_get)