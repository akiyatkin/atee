export const map = async (ar, callback) => {
	return await Promise.all(ar.map(callback))
}