import Rest from "@atee/rest"
const rest = new Rest()
import rest_admin from "/-note/rest.admin.js"
rest.extra(rest_admin)

export default rest