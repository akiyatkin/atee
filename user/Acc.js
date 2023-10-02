const Acc = {
	get: () => {
		const token = (t => t ? t[2] : false)(document.cookie.match('(^|;)?-token=([^;]*)(;|$)'))
		if (!token) return false
		const r = token.split('-')
		if (r.length != 2) return false
		const user_id = Number(r[0])
		if (!user_id) return false;
		return {user_id, token: r[1]}
	}
}

export default Acc