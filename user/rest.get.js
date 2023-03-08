//get для интерфейса
import Rest from '/-rest'
const rest = new Rest()
export default rest


rest.addResponse('get-user', async view => {
	const user = await view.get('user#create')
	
	view.ans.user = user
	return view.ret()
})