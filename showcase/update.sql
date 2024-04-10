
CREATE TABLE IF NOT EXISTS `showcase_prices` (
	`price_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT 'id источника',
	`price_title` varchar(31) NOT NULL COMMENT 'Идентификационное имя источника - имя файла',
	`price_nick` varchar(31) COLLATE latin1_bin NOT NULL COMMENT '',
	`loadtime` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего внесения',
	`quantity` SMALLINT unsigned COMMENT 'Количество записей',
	`duration` MEDIUMINT unsigned COMMENT 'Записывается время разбора данных',
	`ans` mediumtext NULL COMMENT '',
	`loaded` int(1) unsigned NULL COMMENT 'Метка загружена ли таблица',
	UNIQUE INDEX (`price_nick`),
	PRIMARY KEY (`price_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1;


CREATE TABLE IF NOT EXISTS `showcase_tables` (
	`table_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT 'id источника',
	`table_title` varchar(31) NOT NULL COMMENT 'Идентификационное имя источника - имя файла, связь с файлом',
	`table_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT '',
	`loadtime` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего внесения',
	`quantity` SMALLINT unsigned COMMENT 'Количество позиций в обработке',
	`duration` MEDIUMINT unsigned COMMENT 'Записывается время разбора данных',
	`ans` mediumtext NULL COMMENT 'Записывается результат обработки',
	`loaded` int(1) unsigned NULL COMMENT 'Метка загружена ли таблица',
	`ordain` SMALLINT unsigned NOT NULL COMMENT '',
	UNIQUE INDEX (`table_nick`),
	PRIMARY KEY (`table_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_groups` (
	`group_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`group_title` varchar(31) NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
	`group_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT '',
	`parent_id` SMALLINT unsigned NULL COMMENT '',
	
	`icon_id` MEDIUMINT unsigned NULL COMMENT 'file_id',
	`ordain` SMALLINT unsigned NOT NULL COMMENT 'Порядок этой группы',
	PRIMARY KEY (`group_id`),
	UNIQUE INDEX (`group_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_props` (
	`prop_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`prop_title` varchar(31) NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
	`prop_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT '',
	`ordain` SMALLINT unsigned NOT NULL COMMENT '',
--	`type` ENUM("bond","model","group","brand","value","number","text","file") NOT NULL COMMENT 'БЕРЁТСЯ ИЗ КОНФИГА В какой колонке и как хранятся значения',
	PRIMARY KEY (`prop_id`),
	UNIQUE INDEX (prop_nick)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;
INSERT IGNORE INTO showcase_props
    (prop_title, prop_nick)
VALUES
    ('Бренд','brand'),
    ('Модель','model'),
    ('Группа','group');


CREATE TABLE IF NOT EXISTS `showcase_values` (
	`value_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`value_title` varchar(31) NOT NULL COMMENT '',
	`value_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT '',
	PRIMARY KEY (`value_id`),
	UNIQUE INDEX (`value_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 COMMENT 'Значения хранятся в переменных в оперативной памяти';


CREATE TABLE IF NOT EXISTS `showcase_bonds` (
	`bond_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`bond_title` varchar(31) NOT NULL COMMENT '',
	`bond_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT '',
	PRIMARY KEY (`bond_id`),
	UNIQUE INDEX (`bond_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 COMMENT 'Арт, Код, Фото в памяти не хранятся';


CREATE TABLE IF NOT EXISTS `showcase_brands` (
	`brand_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`brand_title` varchar(31) NOT NULL COMMENT '',
	`brand_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT '',
	`logo_id` MEDIUMINT unsigned NULL COMMENT 'file_id',
	`ordain` SMALLINT unsigned NOT NULL COMMENT 'Порядок в списке производителей',
	PRIMARY KEY (`brand_id`),
	UNIQUE (`brand_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_models` (
	`model_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`brand_id` SMALLINT unsigned COMMENT '',
	`model_title` varchar(31) NOT NULL COMMENT '',
	`model_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT '',
	`group_id` SMALLINT unsigned NOT NULL COMMENT '',
	`search` TEXT NOT NULL COLLATE latin1_bin COMMENT 'латиница после Path::encode слова разделены пробелом',
	FULLTEXT INDEX (`search`),
	PRIMARY KEY (`model_id`),
	UNIQUE INDEX (`model_nick`, `brand_id`),
	INDEX (group_id, brand_id)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `showcase_items` (
	`model_id` MEDIUMINT unsigned NOT NULL COMMENT '',
	`item_num` SMALLINT unsigned NOT NULL COMMENT '',
	`ordain` MEDIUMINT unsigned NOT NULL COMMENT '',
	`table_id` SMALLINT unsigned COMMENT '',
	INDEX (ordain),
	PRIMARY KEY (`model_id`, `item_num`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS `showcase_iprops` (
	`model_id` MEDIUMINT unsigned NOT NULL COMMENT '',
	`item_num` SMALLINT unsigned NOT NULL COMMENT '',
	`prop_id` SMALLINT unsigned NOT NULL COMMENT '65 тыс',
	`value_id` MEDIUMINT unsigned NULL COMMENT '16 млн',
	`bond_id` MEDIUMINT unsigned NULL COMMENT '16 млн',
	`file_id` MEDIUMINT unsigned NULL COMMENT '16 млн',
	`number` DECIMAL(10,2) unsigned NULL COMMENT '',
	`text` mediumtext NULL COMMENT '',
	`ordain` TINYINT unsigned COMMENT 'Порядковый номер для порядка значений в одном свойстве',
	`price_id` SMALLINT unsigned NULL COMMENT '65 тыс',
	UNIQUE (model_id, item_num, prop_id, value_id),
	UNIQUE (model_id, item_num, prop_id, bond_id),
	UNIQUE (model_id, item_num, prop_id, file_id),
	UNIQUE (model_id, item_num, prop_id, number),
	INDEX (prop_id, value_id),
	INDEX (file_id),
	INDEX (bond_id),
	INDEX (prop_id, number)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;


CREATE TABLE IF NOT EXISTS `showcase_filekeys` (
	`file_id` MEDIUMINT unsigned NOT NULL COMMENT '',
	`key_nick` varchar(31) COLLATE latin1_bin NULL COMMENT 'Ключ без запятых, для связи может быть именем файла, а может быть папкой в иерархии. Связывается со значениями bond или с model_nick',
	INDEX (key_nick),
	UNIQUE (file_id, key_nick)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci COMMENT '';

CREATE TABLE IF NOT EXISTS `showcase_files` (
	`file_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	
	`src_nick` varchar(255) NOT NULL COLLATE latin1_bin COMMENT 'могут быть дубли с одним nick, сообщаем о них при индексации',
	`src` TEXT NOT NULL COMMENT 'Путь от корня без ведущего слэша или путь начиная с http',

	`source` ENUM('data','disk') NULL DEFAULT NULL COMMENT 'Источник, где найден файл. disk в приоритете',

	`brand_nick` varchar(31) COLLATE latin1_bin NULL COMMENT 'Имя, часто в структуре src или при контексте разбора, которое указывает на бренд',
	`group_nick` varchar(31) COLLATE latin1_bin NULL COMMENT 'Имя, часто в структуре src или при контексте разбора, которое указывает на группу',


	`name` varchar(31) NOT NULL COMMENT 'Потребуется для alt или title у файла',
	`nick` varchar(31) COLLATE latin1_bin NOT NULL COMMENT 'Для сортировки, сначало по num потом по nick - nicked(name) и для ссылки на файл может понадобиться',
	`place` ENUM('local','remote') NOT NULL COMMENT 'или локальный или из интернета',
	
	`size` DECIMAL(3,2) unsigned NULL DEFAULT NULL COMMENT 'В мегобайтах с двумя цифрами после запятой для way - files',


	`destiny` ENUM('images','texts','files','videos','slides','groupicons','brandlogos') NULL DEFAULT NULL COMMENT 'Где использовать, Метка или папка в структуре, которая указывает на предназначение',
	`way` ENUM('images','texts','files','videos') NOT NULL COMMENT 'Как использовать файл, html, picture, video, download',
	`ext` ENUM("avi","ogv","mp4","swf", "zip","webp","tpl","svg","html","rar","png","pdf","json","js","jpg","jpeg","gif","docx","doc") NULL DEFAULT NULL COMMENT 'Расширение может понадобиться для иконки и для определения предназначения или способа использования',

	`ordain` SMALLINT unsigned COMMENT 'Номер в src.',
	`status` ENUM('404','200') NOT NULL DEFAULT '200' COMMENT 'При работе с файлами id не удаляются, а делаются неактивными и связи все удаляются. Если файл неактивный',

	PRIMARY KEY (file_id),
	UNIQUE INDEX (src_nick),
	-- FULLTEXT INDEX (src_nick),
	INDEX (group_nick),
	INDEX (brand_nick)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 COMMENT 'Индекс файлов каталога. Файлы с удалённого сервера http, также могут быть сохранены при внесении данных с полным адресом в src';