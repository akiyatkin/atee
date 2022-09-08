export default (strings, ...values) => {
	for (const i in values) {
		const val = values[i]
		if (val == null) values[i] = ''
		else if(typeof(val) == 'boolean') values[i] = ''
		else if(Array.isArray(val)) values[i] = values[i].join('')
	}
	return String.raw({ raw: strings }, ...values)
}