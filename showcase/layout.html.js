export const ROOT = (data) => `
<p>
	Администратор сайта: ${data.admin?'Да':'Нет'}
</p>
<a href="tables">Данные</a>
<a href="prices">Прайсы</a>
`