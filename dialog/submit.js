import action from "/-dialog/action.js"
import recaptcha from "/-dialog/recaptcha.js"

export default async (form, userlayer) => {
	await recaptcha(form)
	await action(form, userlayer)
}


