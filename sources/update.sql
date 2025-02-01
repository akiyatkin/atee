-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.4.0-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.3.0.6589
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table kvant63.ru.node.sources_appears
CREATE TABLE IF NOT EXISTS `sources_appears` (
  `source_id` smallint(5) unsigned NOT NULL,
  `entity_id` smallint(5) unsigned NOT NULL DEFAULT 0,
  `key_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `date_appear` datetime NOT NULL DEFAULT current_timestamp(),
  `date_disappear` datetime DEFAULT NULL,
  PRIMARY KEY (`source_id`,`entity_id`,`key_nick`) USING BTREE,
  KEY `FK_sources_appears_sources_props` (`entity_id`) USING BTREE,
  KEY `FK_sources_appears_sources_values` (`key_nick`),
  CONSTRAINT `FK_sources_appears_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_appears_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_appears_sources_values` FOREIGN KEY (`key_nick`) REFERENCES `sources_values` (`value_nick`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_cells
CREATE TABLE IF NOT EXISTS `sources_cells` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `row_index` mediumint(8) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `multi_index` smallint(5) unsigned NOT NULL DEFAULT 0,
  `value_id` mediumint(8) unsigned DEFAULT NULL,
  `number` decimal(10,2) unsigned DEFAULT NULL,
  `text` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `represent_cell` bit(1) NOT NULL DEFAULT b'0',
  `represent_cell_summary` bit(1) NOT NULL DEFAULT b'0',
  `represent_text_summary` bit(1) NOT NULL DEFAULT b'0',
  `represent` bit(1) NOT NULL DEFAULT b'0',
  `winner` bit(1) NOT NULL DEFAULT b'0',
  `pruning` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`source_id`,`sheet_index`,`row_index`,`col_index`,`multi_index`),
  KEY `FK_sources_cells_sources_values` (`value_id`),
  CONSTRAINT `FK_sources_cells_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_cells_sources_values` FOREIGN KEY (`value_id`) REFERENCES `sources_values` (`value_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_cols
CREATE TABLE IF NOT EXISTS `sources_cols` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `col_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `col_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `prop_id` smallint(5) unsigned DEFAULT NULL,
  `represent_col` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`source_id`,`sheet_index`,`col_index`) USING BTREE,
  UNIQUE KEY `col_nick` (`source_id`,`sheet_index`,`col_title`) USING BTREE,
  KEY `FK_sources_cols_sources_props` (`prop_id`),
  CONSTRAINT `FK_sources_cols_sources_props` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_cols_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_custom_cells
CREATE TABLE IF NOT EXISTS `sources_custom_cells` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `key_nick` varchar(63) NOT NULL,
  `repeat_index` smallint(6) NOT NULL,
  `col_title` varchar(63) NOT NULL DEFAULT '',
  `represent_custom_cell` bit(1) DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_title`,`key_nick`,`repeat_index`,`col_title`) USING BTREE,
  KEY `FK_sources_custom_cells_sources_values` (`key_nick`) USING BTREE,
  CONSTRAINT `FK_sources_custom_cells_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_custom_cols
CREATE TABLE IF NOT EXISTS `sources_custom_cols` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `col_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  `represent_custom_col` bit(1) DEFAULT NULL,
  `prop_id` smallint(5) unsigned DEFAULT NULL,
  `noprop` bit(1) DEFAULT NULL COMMENT '1 = нет свойства и NULL = есть свойство',
  PRIMARY KEY (`source_id`,`col_title`,`sheet_title`) USING BTREE,
  KEY `FK_sources_custom_cols_sources_props` (`prop_id`),
  CONSTRAINT `FK_sources_custom_cols_sources_props` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_custom_cols_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_custom_rows
CREATE TABLE IF NOT EXISTS `sources_custom_rows` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `key_nick` varchar(63) NOT NULL,
  `repeat_index` smallint(6) NOT NULL,
  `represent_custom_row` bit(1) DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_title`,`key_nick`,`repeat_index`) USING BTREE,
  CONSTRAINT `FK_sources_custom_rows_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_custom_sheets
CREATE TABLE IF NOT EXISTS `sources_custom_sheets` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `represent_custom_sheet` bit(1) DEFAULT NULL,
  `entity_id` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_title`) USING BTREE,
  KEY `FK_sources_custom_sheets_sources_props` (`entity_id`) USING BTREE,
  CONSTRAINT `FK_sources_custom_sheets_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_custom_sheets_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_custom_values
CREATE TABLE IF NOT EXISTS `sources_custom_values` (
  `prop_id` smallint(5) unsigned NOT NULL,
  `value_nick` varchar(63) NOT NULL,
  `represent_custom_value` bit(1) DEFAULT NULL,
  PRIMARY KEY (`value_nick`,`prop_id`) USING BTREE,
  KEY `FK_sources_custom_values_sources_props` (`prop_id`),
  CONSTRAINT `FK_sources_custom_values_sources_props` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for view kvant63.ru.node.sources_data
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `sources_data` (
	`entity_id` SMALLINT(5) UNSIGNED NULL,
	`entity_nick` VARCHAR(63) NOT NULL COLLATE 'latin1_bin',
	`key_id` MEDIUMINT(8) UNSIGNED NULL,
	`prop_id` SMALLINT(5) UNSIGNED NULL,
	`text` LONGTEXT NULL COLLATE 'utf8mb3_general_ci',
	`value_id` MEDIUMINT(8) UNSIGNED NULL,
	`number` DECIMAL(10,2) UNSIGNED NULL,
	`date` DATETIME NULL,
	`source_id` SMALLINT(5) UNSIGNED NOT NULL,
	`source_title` VARCHAR(63) NOT NULL COLLATE 'utf8mb3_general_ci',
	`sheet_index` SMALLINT(5) UNSIGNED NOT NULL,
	`row_index` MEDIUMINT(8) UNSIGNED NOT NULL,
	`col_index` SMALLINT(5) UNSIGNED NOT NULL
) ENGINE=MyISAM;

-- Dumping structure for table kvant63.ru.node.sources_items
CREATE TABLE IF NOT EXISTS `sources_items` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` mediumint(8) unsigned NOT NULL,
  `search` text CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '' COMMENT 'латиница после Path::encode слова разделены пробелом',
  `represent_value` bit(1) NOT NULL DEFAULT b'0',
  `master` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`entity_id`,`key_id`) USING BTREE,
  KEY `FK_sources_items_sources_values` (`key_id`),
  FULLTEXT KEY `search items` (`search`),
  CONSTRAINT `FK_sources_items_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_items_sources_values` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_props
CREATE TABLE IF NOT EXISTS `sources_props` (
  `prop_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `prop_title` varchar(63) NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  `prop_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `prop_2` varchar(63) NOT NULL,
  `prop_5` varchar(63) NOT NULL,
  `prop_plural` varchar(63) NOT NULL,
  `type` enum('text','value','date','number') NOT NULL DEFAULT 'text',
  `multi` bit(1) NOT NULL DEFAULT b'0',
  `name` varchar(63) DEFAULT NULL,
  `unit` varchar(15) NOT NULL DEFAULT '',
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `comment` text NOT NULL DEFAULT '',
  `represent_prop` bit(1) NOT NULL DEFAULT b'1',
  `represent_values` bit(1) NOT NULL DEFAULT b'1',
  PRIMARY KEY (`prop_id`) USING BTREE,
  UNIQUE KEY `UNIQUE nick` (`prop_nick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_rows
CREATE TABLE IF NOT EXISTS `sources_rows` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `row_index` mediumint(8) unsigned NOT NULL,
  `repeat_index` mediumint(8) unsigned DEFAULT NULL,
  `key_id` mediumint(8) unsigned DEFAULT NULL,
  `represent_row` bit(1) NOT NULL DEFAULT b'0',
  `represent_row_key` bit(1) NOT NULL DEFAULT b'0',
  `search` text CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '' COMMENT 'латиница после Path::encode слова разделены пробелом',
  PRIMARY KEY (`source_id`,`sheet_index`,`row_index`) USING BTREE,
  KEY `FK_sources_rows_sources_values` (`key_id`),
  FULLTEXT KEY `search rows` (`search`),
  CONSTRAINT `FK_sources_rows_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_rows_sources_values` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_sheets
CREATE TABLE IF NOT EXISTS `sources_sheets` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `entity_id` smallint(5) unsigned DEFAULT NULL,
  `represent_sheet` bit(1) NOT NULL DEFAULT b'0',
  `key_index` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_index`) USING BTREE,
  KEY `FK_sources_sheets_sources_props` (`entity_id`),
  CONSTRAINT `FK_sources_sheets_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_sheets_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_sources
CREATE TABLE IF NOT EXISTS `sources_sources` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `source_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `source_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `date_check` datetime DEFAULT NULL,
  `date_content` datetime DEFAULT NULL,
  `date_load` datetime DEFAULT NULL,
  `date_mtime` datetime DEFAULT NULL,
  `date_exam` datetime NOT NULL DEFAULT current_timestamp(),
  `duration_rest` mediumint(9) DEFAULT NULL,
  `duration_insert` mediumint(9) DEFAULT NULL,
  `duration_check` mediumint(9) DEFAULT NULL,
  `entity_id` smallint(5) unsigned DEFAULT NULL,
  `dependent` bit(1) NOT NULL DEFAULT b'0',
  `master` bit(1) NOT NULL DEFAULT b'1',
  `comment` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `represent_source` bit(1) NOT NULL DEFAULT b'1',
  `represent_sheets` bit(1) NOT NULL DEFAULT b'1' COMMENT 'Какбудто: 0 прайс, 1 данные',
  `represent_cells` bit(1) NOT NULL DEFAULT b'1',
  `represent_cols` bit(1) NOT NULL DEFAULT b'1',
  `represent_rows` bit(1) NOT NULL DEFAULT b'1',
  `renovate` bit(1) NOT NULL DEFAULT b'1',
  `date_start` datetime DEFAULT NULL,
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `error` text NOT NULL DEFAULT '',
  `msg_check` text NOT NULL DEFAULT '',
  `msg_load` text NOT NULL DEFAULT '',
  PRIMARY KEY (`source_id`) USING BTREE,
  UNIQUE KEY `source_name` (`source_title`) USING BTREE,
  UNIQUE KEY `UNIQUE source_nick` (`source_nick`) USING BTREE,
  KEY `FK_sources_sources_sources_props` (`entity_id`) USING BTREE,
  CONSTRAINT `FK_sources_sources_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_values
CREATE TABLE IF NOT EXISTS `sources_values` (
  `value_id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `value_title` varchar(63) NOT NULL,
  `value_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  PRIMARY KEY (`value_id`) USING HASH,
  UNIQUE KEY `nick` (`value_nick`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=DYNAMIC COMMENT='Значения хранятся в переменных в оперативной памяти';

-- Data exporting was unselected.

-- Dumping structure for view kvant63.ru.node.sources_data
-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `sources_data`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `sources_data` AS select `sh`.`entity_id` AS `entity_id`,`en`.`prop_nick` AS `entity_nick`,`ro`.`key_id` AS `key_id`,`col`.`prop_id` AS `prop_id`,if(`pr`.`type` = 'text',`c`.`text`,NULL) AS `text`,`c`.`value_id` AS `value_id`,`c`.`number` AS `number`,`c`.`date` AS `date`,`c`.`source_id` AS `source_id`,`so`.`source_title` AS `source_title`,`c`.`sheet_index` AS `sheet_index`,`c`.`row_index` AS `row_index`,`c`.`col_index` AS `col_index` from (((((((`sources_cells` `c` join `sources_sources` `so`) join `sources_props` `en`) join `sources_items` `it`) join `sources_sheets` `sh`) join `sources_cols` `col`) join `sources_props` `pr`) join `sources_rows` `ro`) where `c`.`represent` = 0x01 and `c`.`winner` = 0x01 and `it`.`master` = 0x01 and `so`.`source_id` = `c`.`source_id` and `sh`.`source_id` = `c`.`source_id` and `sh`.`sheet_index` = `c`.`sheet_index` and `en`.`prop_id` = `sh`.`entity_id` and `col`.`source_id` = `c`.`source_id` and `col`.`sheet_index` = `c`.`sheet_index` and `col`.`col_index` = `c`.`col_index` and `pr`.`prop_id` = `col`.`prop_id` and `ro`.`source_id` = `c`.`source_id` and `ro`.`sheet_index` = `c`.`sheet_index` and `ro`.`row_index` = `c`.`row_index` and `it`.`key_id` = `ro`.`key_id` and `it`.`entity_id` = `sh`.`entity_id`;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
