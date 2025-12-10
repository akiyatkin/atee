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

-- Dumping structure for table notelic.note_history
CREATE TABLE IF NOT EXISTS `note_history` (
  `note_id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `text` text NOT NULL DEFAULT '',
  `title` varchar(255) NOT NULL DEFAULT '',
  `rev` mediumint(8) unsigned NOT NULL DEFAULT 1,
  `editor_id` mediumint(9) DEFAULT NULL,
  `date_edit` datetime NOT NULL DEFAULT current_timestamp(),
  `search` text CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `length` smallint(5) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`note_id`,`rev`) USING BTREE,
  FULLTEXT KEY `Индекс 2` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table notelic.note_notes
CREATE TABLE IF NOT EXISTS `note_notes` (
  `note_id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `text` text NOT NULL DEFAULT '',
  `title` varchar(255) NOT NULL DEFAULT '',
  `rev` mediumint(8) unsigned NOT NULL DEFAULT 1,
  `date_create` datetime NOT NULL DEFAULT current_timestamp(),
  `nick` varchar(255) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `search` text CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `editor_id` mediumint(8) unsigned DEFAULT NULL,
  `date_edit` datetime NOT NULL DEFAULT current_timestamp(),
  `creater_id` mediumint(8) unsigned DEFAULT NULL,
  `length` smallint(5) unsigned NOT NULL DEFAULT 0,
  `iswrap` bit(1) NOT NULL DEFAULT b'1',
  `isslash` bit(1) NOT NULL DEFAULT b'0',
  `isbracket` bit(1) NOT NULL DEFAULT b'1',
  `isbold` bit(1) NOT NULL DEFAULT b'1'
  PRIMARY KEY (`note_id`),
  FULLTEXT KEY `search` (`search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table notelic.note_stats
CREATE TABLE IF NOT EXISTS `note_stats` (
  `user_id` mediumint(8) unsigned NOT NULL,
  `note_id` mediumint(8) unsigned NOT NULL,
  `date_change` datetime DEFAULT NULL,
  `date_cursor` datetime DEFAULT NULL,
  `date_open` datetime DEFAULT NULL,
  `date_close` datetime DEFAULT NULL,
  `date_load` datetime DEFAULT NULL,
  `date_appointment` datetime NOT NULL DEFAULT current_timestamp(),
  `cursor_start` smallint(5) unsigned NOT NULL DEFAULT 0,
  `cursor_size` smallint(5) unsigned NOT NULL DEFAULT 0,
  `cursor_direction` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `date_focus` datetime DEFAULT NULL,
  `date_blur` datetime DEFAULT NULL,
  `cursor_base` int(11) unsigned NOT NULL DEFAULT 1,
  `open` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `focus` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `count_changes` mediumint(9) NOT NULL DEFAULT 0,
  `count_opens` mediumint(9) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`,`note_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table notelic.note_users
CREATE TABLE IF NOT EXISTS `note_users` (
  `user_id` mediumint(9) unsigned NOT NULL,
  `hue` int(4) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
