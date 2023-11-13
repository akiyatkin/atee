import Rest from "/-rest"
const rest = new Rest(rest_seo, rest_set, rest_get)
import rest_seo from "/-sitemap/rest.seo.js"
rest.extra(rest_seo)
import rest_set from "/-rest.get.js"
rest.extra(rest_set)
import rest_get from "/-rest.set.js"
rest.extra(rest_get)



export default rest