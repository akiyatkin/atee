export const cost = (cost) => {
	if (!cost) return
	cost = String(cost)
	const ar = cost.split(/[,\.]/)
	cost = ar[0];
	let inp = '&nbsp;'
	const l = cost.length;
	//cost = Number(cost)
	if (l > 4) { //10000 = 10 000
		if (l > 6) { //1000000 = 1 000 000
			const last = cost.substr(l - 3, 3)
			const before = cost.substr(l - 6, 3);
			const start = cost.substr(0, l - 6)
			cost = start + inp + before + inp + last
		} else {
			const last = cost.substr(l - 3, 3)
			const start = cost.substr(0, l - 3)
			cost = start + inp + last
		}	
	}
	if (ar[1]) cost += '.'+ar[1]
	return cost;

}
export default cost