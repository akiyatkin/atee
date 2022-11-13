import nodemailer from 'nodemailer'
import fs from 'fs/promises'
import config from '@atee/config'
import cproc from '@atee/cproc'

const conf = await config('mail')

const transport = nodemailer.createTransport(conf.nodemailer)
await fs.mkdir('data/auto/', { recursive: true }).catch(e => null)

const file = 'data/auto/mail.csv'
if (await fs.access(file).then(e => false).catch(e => true)) {
	await fs.writeFile(file, '﻿Дата;From;To;Тема;Письмо'+"\n").catch(e => console.log(e))
}
const tocsv = (strings, ...values) => {
	values = values.map(v => {
		v = v.replaceAll("\n",' ')
		v = v.replaceAll(";",':')
		return v	
	})
	return String.raw({ raw: strings }, ...values);
}

const mail = {
	saveSend: opt => {
		cproc(conf, 'saveSend', async () => {
			await fs.appendFile(file, tocsv`${new Date().toLocaleString()};${opt.from};${opt.to};${opt.subject};${opt.html};`+"\n").catch(e => console.log(e))
		}, Date.now())
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