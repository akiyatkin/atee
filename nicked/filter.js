export const filter = async (ar, callback) => {
	const results = await Promise.all(ar.map(callback))
	return ar.filter((res,i) => results[i])
}
export default filter