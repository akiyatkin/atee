export const map = async (ar, callback) => { //depricated
	return await Promise.all(ar.map(callback))
}
export default map