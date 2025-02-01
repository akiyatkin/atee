import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import date from "/-words/date.html.js"

export const ROOT = (data, env) => err(data, env) || `
	<h1>Настройки</h1>
	<p>
		Папка с источниками <b>${data.dir}</b>
	</p>
	<div style="display: grid; gap: 0.25em; margin: 2em 0">
		<a href="/@atee/controller">Авторизация</a>
	</div>
	<div style="display: grid; gap: 1em; margin: 2em 0">
		<div>
			<p>
				Кэш сохраняется с <b>${date.dmyhi(data.date_access)}</b>
			</p>
			<p>
				${field.button({
					confirm: 'Сбросить кэш?',
					label:'Сбросить кэш',
					action:'/-controller/set-access',
					reloaddiv: env.layer.div
				})}
			</p>
			<p>
				Обычно требуется сбросить кэш, когда изменились данные в папке data по FTP или SSH.
				Для скриптов есть механизм кэша Access.relate, который используется для чтения данных сайта.
				Если данные меняются, через админку сайта, то такой сброс проихоит автоматически. В ручную надо сбрасывать, если данные изменились вручную.
			</p>
		</div>
		<div>
			<p>
				Сервер запущен <b>${date.dmyhi(data.date_update)}</b>
			</p>
			<p>
				${field.button({
					confirm: 'Сайт несколько секунд не будет работать. Перезапустить?',
					label:'Перезапустить сервер',
					action:'/-controller/set-update',
					reloaddiv: env.layer.div
				})}
			</p>
			<p>
				Обычно требуется перезапустить сервер если поменялся исходный код или конфиги скриптов.
				Перезапуск это самый грубый способ сбросить кэш. Новый кода источников требует перезапуск сервера. Разработчик перезапускает сервер с помщью touch ~/reload после git pull.
			</p>
		</div>
		<div>
			<p>
				Сейчас загружается <b>${data.loads} ${words(data.loads,'источник','источника','источников')}</b>.
			</p>
			<p>
				${field.button({
					label:'Сбросить старты',
					action:'/-sources/set-reset-start',
					reloaddiv: env.layer.div
				})} 
			</p>
			<p>
				Может потребоваться сбросить старты о начале загрузки источников если база данных была перезапущена во время работы или когда какая-то загрузка завершилась непредусмотренной ошибкой. Cбрасывается date_start у источников. Базу данных обычно тоже надо перезапустить.
			</p>
		</div>
		<div>
			<p>
				Сохранено 
				<b>${data.values} ${words(data.values, 'значение','значения','значений')}</b>,
				<b>${data.cells} ${words(data.cells, 'ячейка','ячейки','ячеек')}</b>,
				<b>${data.items} ${words(data.items, 'позиция','позиции','позиций')}</b>,
				<b>${data.rows} ${words(data.rows, 'строка','строки','строк')}</b>,
				<b>${data.sources} ${words(data.sources,'источник','источника','источников')}</b>,
				<b>${data.entities} ${words(data.entities, 'сущность','сущности','сущностей')}</b>.
			</p>
			<p>
				${field.button({
					label:'Очистить данные',
					action:'/-sources/set-reset-values',
					reloaddiv: env.layer.div
				})} 
			</p>
			<p>
				Может потребоваться, например, если для колонке "Цена" с разными ценами был указан тип value вместо number 
				и создалось большое количество value, которые останутся даже если вернуть number. Избыточное количество значений может замедлить работу базы данных.
				<ul>
					<li>Удалятся все внесённые данные из источников.</li>
					<li>Сбросятся технические автоинкременты value_id (key_id). У сущностей и значений (группы, бренды) будут новые индентификаторы. В том числе по этому нужно использовать естественные ключи value_nick, которые не поменяются.</li>
					<li>Удалятся все зарегистрированные значения value.</li>
					<li>Удалится история появления ключей.</li>
				</ul>
				Данные восстановятся после загрузки источников.
				Добавленные вручную настройки сохранятся: комментарии, настройки сущностей и источников, в том числе source_id, entity_id, prop_id, type.
			</p>
		</div>
	</div>
	
`