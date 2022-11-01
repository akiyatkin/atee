import nodemailer from 'nodemailer'
import fs from 'fs/promises'

import CONFIG from '/data/.mail.json' assert {type: "json"}
const transport = nodemailer.createTransport(CONFIG.nodemailer)

const mkdir = async (dir) => {
	if (await fs.access(dir).then(e => true).catch(e => false)) return
	await fs.mkdir(dir, { recursive: true })
}
await mkdir('data/auto/mail/')

export const Mail = {
	saveSend: (opt) => {
		const info = transport.sendMail(opt).catch(err => {
			console.log('submit', err)
		})
		return info
	},
	toSupport: (subject, html, email) => {
		const opt = {
			from: CONFIG.from, 
			to: CONFIG.support,
			subject,
			html
		}
		if (email) opt.replyTo = email

		const info = Mail.saveSend(opt)
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

		const info = Mail.saveSend(opt)
		return info
	},
	send: (subject, html, email) => { //depricated
		return Mail.toAdmin(subject, html, email)
	}
}