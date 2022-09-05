export const mapobj = (obj, call) => { //depricated
	const res = []
	for (const key in obj) res.push(call(obj[key], key))
	return res
}
/*
Object.keys(obj).forEach((key, index) => call(obj[key], key))
*/