CREATE TABLE IF NOT EXISTS `user_users` (
  `user_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `password` varchar(255) NOT NULL COMMENT 'Вначале генерируется, поменять можно только через изменение пароля',
  `token` varchar(255) NOT NULL COMMENT 'В одно время действует только один token можно или забыть на одном или сбросить для всех устройств',
  `timezone` varchar(255) NOT NULL,
  `lang` ENUM('ru','en') NOT NULL DEFAULT 'ru',
  `name` varchar(255) NULL DEFAULT NULL,
  `sername` varchar(255) NULL DEFAULT NULL,
  `verify` int(1) unsigned NULL DEFAULT NULL COMMENT 'Дата первого подтверждения',

  `code_remind` varchar(255) NULL DEFAULT NULL COMMENT 'Код для смены скольк-то действует от date_change',
  `date_remind` DATETIME NULL DEFAULT NULL COMMENT 'Дата когда был сформирован код для восстановления пароля, в этот момент было отправлено сообщение, на указанный контакт',
  `date_create` DATETIME NULL DEFAULT NULL COMMENT 'Дата создания, при автоматической регистрации',
  `date_signup` DATETIME NULL DEFAULT NULL COMMENT 'Дата регистрации, когда указан любой email или телефон',
  `date_verify` DATETIME NULL DEFAULT NULL COMMENT 'Дата верификации, когда первый раз подтверждён email или телефон, дата перехода по сгенерированной сыслки или указания кода в форме',
  `date_active` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего авторизированного действий get или set, когда требовалась авторизация',
  `date_token` DATETIME NULL DEFAULT NULL COMMENT 'Дата создания токена, это может быть дата первого входа или дата выхода или дата изменения пароля',
  PRIMARY KEY (`user_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1;


CREATE TABLE IF NOT EXISTS `user_uemails` (
  `user_id` int(11) unsigned NOT NULL,
  `email` varchar(255) NULL,
  `code_verify` varchar(255) NOT NULL COMMENT 'Код для смены скольк-то действует от date_verify',
  `date_verify` DATETIME NULL DEFAULT NULL COMMENT 'Дата, когда создан и отправлен код верификации',
  `date_add` DATETIME NULL DEFAULT NULL COMMENT 'Дата добавления при регистрации или при добавлении ещё одного',
  UNIQUE INDEX (`email`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `user_uphones` (
  `user_id` int(11) unsigned NOT NULL,
  `phone` int(10) NULL,
  `code_verify` varchar(255) NOT NULL COMMENT 'Код для смены скольк-то действует от date_verify',
  `date_verify` DATETIME NULL DEFAULT NULL COMMENT 'Дата, когда создан и отправлен код верификации',
  `date_add` DATETIME NULL DEFAULT NULL COMMENT 'Дата добавления при регистрации или при добавлении ещё одного',
  UNIQUE INDEX (`phone`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1;



-- CREATE TABLE IF NOT EXISTS `users` (
--   `user_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
--   `password` varchar(255) NOT NULL,
--   `token` varchar(255) NOT NULL,
--   `timezone` varchar(255) NOT NULL,
--   `lang` ENUM('ru','en') NOT NULL,
--   `email` varchar(255) NULL,
--   `verify` int(1) unsigned NULL,
--   `city_id` int(11) unsigned NOT NULL,

--   `datecreate` DATETIME NULL DEFAULT NULL COMMENT 'Дата создания',
--   `datesignup` DATETIME NULL DEFAULT NULL COMMENT 'Дата регистрации',
--   `dateverify` DATETIME NULL DEFAULT NULL COMMENT 'Дата верификации',
--   `dateactive` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего входа',
--   `datetoken` DATETIME NULL DEFAULT NULL COMMENT 'Дата создания токена',
--   `datemail` DATETIME NULL DEFAULT NULL COMMENT 'Последняя дата отправленного письма: confirm, remind',
  

--   PRIMARY KEY (`user_id`),
--   UNIQUE INDEX (`email`)
-- ) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1 ;


/* 
    https://github.com/hflabs/city
*/ 
