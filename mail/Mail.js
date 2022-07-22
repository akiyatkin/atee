import nodemailer from 'nodemailer'

import CONFIG from '/data/.mail.json' assert {type: "json"}
const transport = nodemailer.createTransport(CONFIG.nodemailer)

export const Mail = {
	toSupport: (subject, html, email) => {
		const opt = {
			from: CONFIG.from, 
			to: CONFIG.support,
			subject,
			html
		}
		if (email) opt.replyTo = email
		const info = transport.sendMail(opt).catch(err => {
			console.log('submit', err)
		})
		info.then(info => console.log(info))
		return info
	},
	toAdmin: (subject, html, email) => {
		const opt = {
			from: CONFIG.from, 
			to: CONFIG.to,
			subject,
			html
		}
		if (email) opt.replyTo = email
		const info = transport.sendMail(opt).catch(err => {
			console.log('submit', err)
		})
		info.then(info => console.log(info))
		return info
	},
	send: (subject, html, email) => { //depricated
		const opt = {
			from: CONFIG.from, 
			to: CONFIG.to,
			subject,
			html
		}
		if (email) opt.replyTo = email
		const info = transport.sendMail(opt).catch(err => {
			console.log('submit', err)
		})
		info.then(info => console.log(info))
		return info
	}
}