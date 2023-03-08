import { View } from '/vendor/infrajs/view/View.js'
import { Global } from '/vendor/infrajs/layer-global/Global.js'
import { Load } from '/vendor/akiyatkin/load/Load.js'

let User = {
    token: (visitor) => {
    	let token_cookie = (t => t ? t[2] : false)(visitor.client.cookie.match('(^|;)?\-token=([^;]*)(;|$)'))
		return token_cookie
    },
    logout: async () => {
    	document.cookie = '-controller=; path=/; expires=Fri, 31 Dec 2000 23:59:59 GMT'
    	const Client = await window.getClient()
    	Client.replaceState()
    },
    action: (action, param) => {
		let src = User.src(action, param)
		return fetch(src).then(res => res.json())
	},
	src: (visitor, action, param) => {
        let token = User.token(visitor)
        param = { ...param, token }
		let args = [];
		for (let key in param) args.push(key + '=' + encodeURIComponent(param[key]))
		args = args.join('&')
		let src = '/-user/' + action + '?' + args
		return src
	}
}
export default User