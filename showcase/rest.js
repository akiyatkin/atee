import Access from "/-controller/Access.js"
import Rest from "/-rest"
import set from '/-showcase/rest.set.js'
import get from '/-showcase/rest.get.js'

import Files from '/-showcase/Files.js'

const rest = new Rest(get, set)
rest.after((view, reans = {}) => {
	if (~view.action.indexOf('set-')) Access.setAccessTime()
	reans.nostore = true
})

rest.addResponse('get-test', (view) => {
	const info = Files.srcInfo('https://optimus-cctv.ru/files/VMH-7.1_VMH-7.5.rar#Актуальная прошивка VMH-7.1(w)(b) /')
	view.ans.info = info
	console.log(info)
	return view.ret()

})

export default rest
