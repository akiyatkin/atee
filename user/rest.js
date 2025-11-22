/* rest для интерфейса */
import Rest from "@atee/rest"
import config from '@atee/config'


import rest_set from '/-user/rest.set.js'
import rest_get from '/-user/rest.get.js'

const rest = new Rest(rest_set, rest_get)
export default rest




