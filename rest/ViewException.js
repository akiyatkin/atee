class ViewException { 
	status
	ext
	nostore
	msg
	data
	constructor (msg, view) {
		this.msg = msg
		this.view = view
	}
}

export default ViewException