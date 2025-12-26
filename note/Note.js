import Acc from '/-user/Acc.js'
import send from '/-dialog/send.js'

const Note = {
	send: async (note_id, data) => { 
		//Например 	Note.send(1, {signal: {type:'iswrap', bit: 1}})
		//			Note.send(1, {insert: {insert:'text'}}) там где курсор
		const link = await Note.getLink(note_id)
		const socket = new WebSocket(link)
		return new Promise(resolve => socket.addEventListener('open', e => {
			socket.send(JSON.stringify(data))
			socket.close()
			resolve()
		}))
	},
	getLink: async (note_id) => {
		const {user_id, token} = Acc.get()
		if (!user_id) return false
		const conf = await import('/-config/get?name=note', {with:{type:'json'}}).then(r => r.default.conf)
		const wshost = conf.wshost
		const protocol = location.protocol === "https:" ? "wss" : "ws"
		return protocol + '://'+ wshost + `/?note_id=${note_id}&user_id=${user_id}&user_token=${token}`
	}
}
export default Note