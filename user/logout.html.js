import field from "/-dialog/field.html.js"

export const ROOT = (data, env) => 
`<div style="float:left; margin-top: 1rem; display: block;">
		<a href="/user">Личный кабинет</a>
	</div>
	<h1>Выход</h1>` 
+ 
(!data.user.user_id ? `
	<p>Вы не авторизованы.</p>
	<p>Выхода нет. <code>&copy;</code> Сплин</p>
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