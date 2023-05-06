import Rest from "/-rest"
import rest_set from '/-cart/rest.set.js'
import rest_get from '/-cart/rest.get.js'
const rest = new Rest()
rest.extra(rest_set)
rest.extra(rest_get)
export default rest




