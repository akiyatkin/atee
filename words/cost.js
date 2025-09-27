export const cost = (cost, inp = '&nbsp;') => {
	if (!cost) return '0'
	cost = String(cost)
	const ar = cost.split(/[,\.]/)
	cost = ar[0]
	const sign = cost[0] == '-' ? '-' : ''
	cost = cost.replace('-','')
	
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
	//if (l < 3 && ar[1]) cost += '.' + Math.round(('0.'+ar[1]) * 100)
	//if (ar[1]) cost += '.' + Math.round(('0.'+ar[1]) * 100)
	//if (ar[1]) cost += '.' + ar[1]
	return sign + cost;

}
export default cost