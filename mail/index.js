import nodemailer from 'nodemailer'
import fs from 'fs/promises'
import config from '/-config'
import csv from '/-csv'

const conf = await config('mail')
const transport = conf.nodemailer ? nodemailer.createTransport(conf.nodemailer) : false
if (!transport) console.log('nodemailer не настроен в .mail.json')
if (transport) await fs.mkdir('data/auto/mail/', { recursive: true }).catch(e => null)

const Mail = {
	emailreg: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
	isEmail: (email) => {
		return email && email.toLowerCase().match(Mail.emailreg)
	},
	saveSend: opt => {
		csv('data/auto/mail/.mail-v2.csv', opt)
		if (!transport) return false
		const info = transport.sendMail(opt).catch(err => console.log('Mail.saveSend', err))
		return info
	},
	toSupport: (subject, html, email) => {
		const opt = {
			from: conf.from, 
			to: conf.support,
			replyTo: null,
			subject,
			html
		}
		if (email) opt.replyTo = email

		const info = Mail.saveSend(opt)
		return info
	},
	toUser: (subject, html, email) => {
		const opt = {
			from: conf.from, 
			to: email,
			replyTo: conf.to,
			subject,
			html
		}
		const info = Mail.saveSend(opt)
		return info
	},
	toAdmin: (subject, html, email) => {
		const opt = {
			from: conf.from, 
			to: conf.to,
			replyTo: null,
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
export default Mail