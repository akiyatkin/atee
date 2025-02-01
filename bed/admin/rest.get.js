import Rest from '/-rest'
const rest = new Rest()
export default rest


import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)