import Rest from "@atee/rest"
const rest = new Rest()

import rest_get from "/-note/rest.get.js"
rest.extra(rest_get)
import rest_set from "/-note/rest.set.js"
rest.extra(rest_set)


import rest_admin_get from "/-note/rest.admin.get.js"
rest.extra(rest_admin_get)
import rest_admin_set from "/-note/rest.admin.set.js"
rest.extra(rest_admin_set)

import rest_theory_get from "/-note/rest.theory.get.js"
rest.extra(rest_theory_get)
import rest_theory_set from "/-note/rest.theory.set.js"
rest.extra(rest_theory_set)

export default rest