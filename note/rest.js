import Rest from "@atee/rest"
const rest = new Rest()
import rest_get from "/-note/rest.get.js"
rest.extra(rest_get)
//import rest_set from "/-note/rest.set.js"
//rest.extra(rest_set)

export default rest