//import nodemailer from 'nodemailer'
import nodemailer from '/node_modules/nodemailer/lib/nodemailer.js'

import CONFIG from '/data/.mail.json' assert {type: "json"}
const transport = nodemailer.createTransport(CONFIG.nodemailer);
console.log(CONFIG)

export const Mail = {
	send: (subject, html, email) => {
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