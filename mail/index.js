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
	saveSend: message => {
		//csv('data/auto/mail/.mail-v2.csv', message)
		if (!transport) return false
		const info = transport.sendMail(message).catch(err => console.log('Mail.saveSend', err))
		return info
	},
	toSupport: (subject, html, email) => {
		const message = {
			from: conf.from, 
			to: conf.support,
			replyTo: null,
			subject,
			html
		}
		if (email) message.replyTo = email

		const info = Mail.saveSend(message)
		return info
	},
	toUser: (subject, html, email, replayto) => {
		if (!replayto) {
			const r = conf.to.split(',')
			replayto = r[0].trim()
		}
		const opt = {
			from: conf.from, 
			to: email,
			replyTo: replayto,
			subject,
			html
		}
		const info = Mail.saveSend(opt)
		return info
	},
	toUserFrom: (subject, html, email, replayto) => {
		if (!replayto) {
			const r = conf.to.split(',')
			replayto = r[0].trim()
		}
		const opt = {
			from: replayto || conf.from, 
			to: email,
			replyTo: replayto,
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
	toAdminSplit: (subject, html, email) => {
		const tos = conf.to.split(',').map(email => email.trim()).filter(email => email)
		if (!tos.length) return false
		let r = true
		for (const to of tos) {
			r = r && Mail.toUser(subject, html, to, email)
		}
		return r
	},
	toAdminFrom: (subject, html, email) => {
		const opt = {
			from: email, 
			to: conf.to,
			replyTo: email,
			subject,
			html
		}

		const info = Mail.saveSend(opt)
		return info
	},
	send: (subject, html, email) => { //depricated
		return Mail.toAdmin(subject, html, email)
	}
}
export default Mail