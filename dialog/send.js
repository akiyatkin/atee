import cproc from "/-cproc"
/*
	строго последовательное выполнение без пропусков
*/
let count = 0
const send = (src, params) => cproc(send, src, () => {
	const options = {}
	if (params) {
		options.method = 'POST'
		options.headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }
		options.body = new URLSearchParams(params)
	}
	return fetch(src, options).then(res => res.json()).catch(e => ({result: 0, msg:"Ошибка на сервере"}))
}, ++count)
export default send