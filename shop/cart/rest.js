import Rest from "@atee/rest"
const rest = new Rest()
export default rest


import rest_set from '/-shop/cart/rest.set.js'
rest.extra(rest_set)
import rest_get from '/-shop/cart/rest.get.js'
rest.extra(rest_get)
