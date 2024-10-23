import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'

import xlsx from "/-xlsx"
import Rest from "/-rest"
import config from "/-config"
import Sources from "/-sources/Sources.js"
const rest = new Rest()

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

export default rest

