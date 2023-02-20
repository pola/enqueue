SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;


CREATE TABLE `actions` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` enum('primary','secondary','accent','default') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `queue_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `assistants` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bookings` (
  `id` int NOT NULL,
  `external_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` bigint DEFAULT NULL,
  `removal_duration` bigint DEFAULT NULL,
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `queue_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bookings_students` (
  `booking_id` int NOT NULL,
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `computers` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `room_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `events` (
  `id` int NOT NULL,
  `timestamp` bigint NOT NULL,
  `type` enum('OPEN','CLOSE','DESCRIPTION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` mediumtext COLLATE utf8mb4_unicode_ci,
  `queue_id` int DEFAULT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `profiles` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queues` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` mediumtext COLLATE utf8mb4_unicode_ci,
  `open` tinyint(1) DEFAULT NULL,
  `show_openings` tinyint(1) NOT NULL,
  `force_kthlan` tinyint(1) DEFAULT NULL,
  `force_comment` tinyint(1) DEFAULT NULL,
  `force_action` tinyint(1) DEFAULT NULL,
  `queuing` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queues_assistants` (
  `assistant_id` int NOT NULL,
  `queue_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queues_queuings` (
  `id` int NOT NULL,
  `timestamp_enter` bigint NOT NULL,
  `timestamp_leave` bigint DEFAULT NULL,
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `queue_id` int DEFAULT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queues_queuings_handlers` (
  `id` int NOT NULL,
  `timestamp_enter` bigint NOT NULL,
  `timestamp_leave` bigint DEFAULT NULL,
  `queue_student_id` int DEFAULT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queues_rooms` (
  `queue_id` int NOT NULL,
  `room_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queues_students` (
  `student_id` int NOT NULL,
  `queue_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rooms` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tasks` (
  `id` int NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` mediumtext COLLATE utf8mb4_unicode_ci,
  `deadline` bigint DEFAULT NULL,
  `queue_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `time_slots` (
  `id` int NOT NULL,
  `time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booked_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `assistantId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tokens` (
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


ALTER TABLE `actions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `queue_id` (`queue_id`);

ALTER TABLE `assistants`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `queue_id` (`queue_id`);

ALTER TABLE `bookings_students`
  ADD PRIMARY KEY (`booking_id`,`student_id`),
  ADD KEY `student_id` (`student_id`);

ALTER TABLE `computers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`);

ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `queue_id` (`queue_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `queues`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `queues_assistants`
  ADD PRIMARY KEY (`assistant_id`,`queue_id`),
  ADD KEY `queue_id` (`queue_id`);

ALTER TABLE `queues_queuings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `queue_id` (`queue_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `queues_queuings_handlers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `queue_student_id` (`queue_student_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `queues_rooms`
  ADD PRIMARY KEY (`queue_id`,`room_id`),
  ADD KEY `room_id` (`room_id`);

ALTER TABLE `queues_students`
  ADD PRIMARY KEY (`student_id`,`queue_id`),
  ADD KEY `queue_id` (`queue_id`);

ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `queue_id` (`queue_id`);

ALTER TABLE `time_slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assistantId` (`assistantId`);

ALTER TABLE `tokens`
  ADD PRIMARY KEY (`token`),
  ADD KEY `profile_id` (`profile_id`);


ALTER TABLE `actions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `assistants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `bookings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `computers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `events`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `queues`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `queues_queuings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `queues_queuings_handlers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `rooms`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `tasks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `time_slots`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;


ALTER TABLE `actions`
  ADD CONSTRAINT `actions_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `bookings_students`
  ADD CONSTRAINT `bookings_students_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_students_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `computers`
  ADD CONSTRAINT `computers_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `events_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `queues_assistants`
  ADD CONSTRAINT `queues_assistants_ibfk_1` FOREIGN KEY (`assistant_id`) REFERENCES `queues` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `queues_assistants_ibfk_2` FOREIGN KEY (`queue_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `queues_queuings`
  ADD CONSTRAINT `queues_queuings_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `queues_queuings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `queues_queuings_handlers`
  ADD CONSTRAINT `queues_queuings_handlers_ibfk_1` FOREIGN KEY (`queue_student_id`) REFERENCES `queues_queuings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `queues_queuings_handlers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `queues_rooms`
  ADD CONSTRAINT `queues_rooms_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `queues_rooms_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `queues_students`
  ADD CONSTRAINT `queues_students_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `queues` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `queues_students_ibfk_2` FOREIGN KEY (`queue_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `time_slots`
  ADD CONSTRAINT `time_slots_ibfk_1` FOREIGN KEY (`assistantId`) REFERENCES `assistants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tokens`
  ADD CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
