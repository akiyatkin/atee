import Rest from "@atee/rest"

const rest = new Rest()
import rest_db from "/-db/rest.db.js"
rest.extra(rest_db)

export default rest


rest.addArgument('inside', (view, value) => ["notempty"].find(v => v == value))
rest.addArgument('change', (view, value) => ["tod","yes","28"].find(v => v == value))
rest.addArgument('create', (view, value) => ["tod","yes","28"].find(v => v == value))
rest.addArgument('sort', (view, value) => ["create"].find(v => v == value))

rest.addArgument('endorsement', ['string'])
