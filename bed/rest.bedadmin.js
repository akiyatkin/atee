import Rest from "/-rest"
const rest = new Rest()
export default rest

rest.addArgument('group_title', ['string'])

// rest.addArgument('group_id', ['mint'])
// rest.addVariable('group_id#required', ['group_id', 'required'])