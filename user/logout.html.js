import field from "/-dialog/field.html.js"

export const ROOT = (data, env) => 
`<div style="margin-top:1rem"><a href="/user">Личный кабинет</a></div>
	<h1 style="margin-top:0">Выход</h1>` 
+ 
(!data.user.user_id ? `
	<p>Вы не авторизованы.</p>
	<p>Выхода нет. <code>&copy;</code> Сплин  </p>
` : `
	<p>${data.user.email || ''}</p>

	${field.button({
		label:'Выйти', 
		action:"/-user/set-logout", 
		go: '/user/signin',
		reload:true
	})}
	<p align="right">
		${field.button({
			label:'Удалить аккаунт', 
			action:"/-user/set-delete", 
			confirm:"Удалить аккаунт?",
			go: '/user/signin',
			reload:true
		})}
	</p>
`)