import Access from "/-controller/Access.js"
import Rest from "@atee/rest"
const rest = new Rest()
import rest_set from '/-showcase/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-showcase/rest.get.js'
rest.extra(rest_get)

import Files from '/-showcase/Files.js'




export default rest
