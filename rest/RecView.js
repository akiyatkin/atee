class RecView {
	constructor (view, pproc) {
		this.view = view
		this.pproc = pproc
		this.replaced = pproc.opt.replaced //Может быть только одна подмена в папке проекта
	}
	get (name, parentvalue = null, parentname = null) {
		
		return this.view.get(name, this.pproc, parentvalue, parentname)
	}

	gets (ar) {
		return this.view.gets(ar, this.pproc)
	}
	// catch (...args) {
	// 	return this.view.catch(...args)
	// }
	err (...args) {
		return this.view.err(...args)
	}
	ret (...args) {
		return this.view.ret(...args)
	}
	fin (...args) {
		return this.view.fin(...args)
	}
	nope (...args) {
		return this.view.nope(...args)
	}
	end (...args) {
		return this.view.end(...args)
	}
	reset (...args) {
		return this.view.reset(...args)
	}
	after (...args) {
		return this.view.after(...args)
	}
	setCookie (...args) {
		return this.view.setCookie(...args)
	}
	delCookie (...args) {
		return this.view.delCookie(...args)
	}
	set db(value) {
		this.view.db = value
	}
	get db() {
		return this.view.db
	}
	set req(value) {
		this.view.req = value
	}
	get req() {
		return this.view.req
	}
	set rest(value) {
		this.view.rest = value
	}
	get rest() {
		return this.view.rest
	}
	set nostore(value) {
		this.view.nostore = value
	}
	get nostore() {
		return this.view.nostore
	}
	set action(value) {
		return this.view.action = value
	}
	get action() {
		return this.view.action
	}
	set visitor(value) {
		return this.view.visitor = value
	}
	get visitor() {
		return this.view.visitor
	}
	set headers(value) {
		this.view.headers = value
	}
	get headers() {
		return this.view.headers
	}
	set status(value) {
		this.view.status = value
	}
	get status() {
		return this.view.status
	}
	set ext(value) {
		this.view.ext = value
	}
	get ext() {
		return this.view.ext
	}
	set data(value) {
		this.view.data = value
	}
	get data() {
		return this.view.data
	}
	set ans(value) {
		this.view.data = value
	}
	get ans() {
		return this.view.data
	}
}

export default RecView