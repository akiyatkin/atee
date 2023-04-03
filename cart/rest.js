/* rest для интерфейса */
import Rest from "/-rest"
import config from '/-config'
import rest_admin from '/-controller/rest.admin.js'
import rest_set from '/-cart/rest.set.js'
import rest_get from '/-cart/rest.get.js'

const rest = new Rest(rest_admin, rest_set, rest_get)
export default rest




