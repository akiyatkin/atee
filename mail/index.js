import nodemailer from 'nodemailer'
import fs from 'fs/promises'
import config from '/-config'
import csv from '/-csv'

const conf = await config('mail')
const transport = conf.nodemailer ? nodemailer.createTransport(conf.nodemailer) : false
if (!transport) console.log('nodemailer не настроен в .mail.json')
if (transport) await fs.mkdir('data/auto/mail/', { recursive: true }).catch(e => null)
const mail = {
	saveSend: opt => {
		csv('data/auto/mail/.mail-v1.csv', opt)
		if (!transport) return false
		const info = transport.sendMail(opt).catch(err => console.log('mail.saveSend', err))
		return info
	},
	toSupport: (subject, html, email) => {
		const opt = {
			from: conf.from, 
			to: conf.support,
			subject,
			html
		}
		if (email) opt.replyTo = email

		const info = mail.saveSend(opt)
		return info
	},
	toAdmin: (subject, html, email) => {
		const opt = {
			from: conf.from, 
			to: conf.to,
			subject,
			html
		}
		if (email) opt.replyTo = email

		const info = mail.saveSend(opt)
		return info
	},
	send: (subject, html, email) => { //depricated
		return mail.toAdmin(subject, html, email)
	}
}
export default mail