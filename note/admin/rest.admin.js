import Rest from "@atee/rest"

const rest = new Rest()
import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)

export default rest


rest.addArgument('endorsement', ['string'])
