-- ============================================================
-- ERDify DDL Import Test Data (300 tables)
-- MySQL 8.0 / InnoDB / UTF8MB4
-- 식별관계(Identifying): FK가 PK의 일부 (복합PK)
-- 비식별관계(Non-identifying): FK가 별도 컬럼 (일반FK)
-- ============================================================

-- ============================================================
-- Schema Definitions
-- ============================================================
CREATE SCHEMA IF NOT EXISTS `Auth`      DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Catalog`   DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Order`     DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Logistics` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Support`   DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Marketing` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Content`   DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `HR`        DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Finance`   DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `System`    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE SCHEMA IF NOT EXISTS `Social`    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- Schema: Auth (Domain 1: 사용자/인증) - 30 tables
-- ============================================================

CREATE TABLE `Auth`.`users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `email` VARCHAR(255) NOT NULL COMMENT '이메일',
  `username` VARCHAR(100) NOT NULL COMMENT '사용자명',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '상태(1:활성,0:비활성,2:정지)',
  `email_verified_at` DATETIME NULL COMMENT '이메일 인증일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_username` (`username`),
  INDEX `idx_users_status` (`status`),
  INDEX `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자';

CREATE TABLE `Auth`.`user_profiles` (
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `full_name` VARCHAR(100) NULL COMMENT '실명',
  `phone` VARCHAR(30) NULL COMMENT '전화번호',
  `birth_date` DATE NULL COMMENT '생년월일',
  `gender` TINYINT NULL COMMENT '성별(1:남,2:여)',
  `bio` TEXT NULL COMMENT '자기소개',
  `avatar_url` VARCHAR(500) NULL COMMENT '프로필 이미지 URL',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul' COMMENT '타임존',
  `locale` VARCHAR(10) NOT NULL DEFAULT 'ko' COMMENT '로케일',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`user_id`),
  INDEX `idx_user_profiles_phone` (`phone`),
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 프로필';

CREATE TABLE `Auth`.`user_addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `label` VARCHAR(50) NOT NULL DEFAULT '기본' COMMENT '주소 레이블',
  `recipient` VARCHAR(100) NOT NULL COMMENT '수령인',
  `phone` VARCHAR(30) NOT NULL COMMENT '연락처',
  `zipcode` VARCHAR(10) NOT NULL COMMENT '우편번호',
  `address1` VARCHAR(255) NOT NULL COMMENT '주소1',
  `address2` VARCHAR(255) NULL COMMENT '주소2',
  `city` VARCHAR(100) NOT NULL COMMENT '시/군/구',
  `state` VARCHAR(100) NULL COMMENT '도/주',
  `country` CHAR(2) NOT NULL DEFAULT 'KR' COMMENT '국가코드',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '기본 주소 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_user_addresses_user_id` (`user_id`),
  CONSTRAINT `fk_user_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 주소';

CREATE TABLE `Auth`.`user_settings` (
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '설정 키',
  `setting_value` TEXT NULL COMMENT '설정 값',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`user_id`, `setting_key`),
  CONSTRAINT `fk_user_settings_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 설정';

CREATE TABLE `Auth`.`user_devices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `device_token` VARCHAR(500) NOT NULL COMMENT '디바이스 토큰',
  `platform` VARCHAR(20) NOT NULL COMMENT '플랫폼(ios/android/web)',
  `device_name` VARCHAR(100) NULL COMMENT '디바이스명',
  `app_version` VARCHAR(20) NULL COMMENT '앱 버전',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `last_used_at` DATETIME NULL COMMENT '마지막 사용일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_devices_token` (`device_token`),
  INDEX `idx_user_devices_user_id` (`user_id`),
  CONSTRAINT `fk_user_devices_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 디바이스';

CREATE TABLE `Auth`.`auth_sessions` (
  `id` VARCHAR(128) NOT NULL COMMENT '세션 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP 주소',
  `user_agent` VARCHAR(500) NULL COMMENT 'User-Agent',
  `payload` TEXT NOT NULL COMMENT '세션 페이로드',
  `last_activity` INT UNSIGNED NOT NULL COMMENT '마지막 활동 타임스탬프',
  PRIMARY KEY (`id`),
  INDEX `idx_auth_sessions_user_id` (`user_id`),
  INDEX `idx_auth_sessions_last_activity` (`last_activity`),
  CONSTRAINT `fk_auth_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='인증 세션';

CREATE TABLE `Auth`.`auth_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `token_hash` VARCHAR(255) NOT NULL COMMENT '토큰 해시',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(email_verify/password_reset/invite)',
  `expires_at` DATETIME NOT NULL COMMENT '만료일시',
  `used_at` DATETIME NULL COMMENT '사용일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_tokens_hash` (`token_hash`),
  INDEX `idx_auth_tokens_user_id` (`user_id`),
  INDEX `idx_auth_tokens_expires_at` (`expires_at`),
  CONSTRAINT `fk_auth_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='인증 토큰';

CREATE TABLE `Auth`.`auth_refresh_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `token_hash` VARCHAR(255) NOT NULL COMMENT '리프레시 토큰 해시',
  `device_id` BIGINT UNSIGNED NULL COMMENT '디바이스 ID',
  `expires_at` DATETIME NOT NULL COMMENT '만료일시',
  `revoked_at` DATETIME NULL COMMENT '폐기일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_refresh_tokens_hash` (`token_hash`),
  INDEX `idx_auth_refresh_tokens_user_id` (`user_id`),
  CONSTRAINT `fk_auth_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auth_refresh_tokens_device` FOREIGN KEY (`device_id`) REFERENCES `Auth`.`user_devices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리프레시 토큰';

CREATE TABLE `Auth`.`auth_oauth_providers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '공급자 코드(google/kakao/naver)',
  `name` VARCHAR(100) NOT NULL COMMENT '공급자명',
  `client_id` VARCHAR(255) NOT NULL COMMENT '클라이언트 ID',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_oauth_providers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OAuth 공급자';

CREATE TABLE `Auth`.`auth_oauth_connections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `provider_id` INT UNSIGNED NOT NULL COMMENT 'OAuth 공급자 ID',
  `provider_user_id` VARCHAR(255) NOT NULL COMMENT '공급자 사용자 ID',
  `access_token` TEXT NULL COMMENT '액세스 토큰',
  `refresh_token` TEXT NULL COMMENT '리프레시 토큰',
  `token_expires_at` DATETIME NULL COMMENT '토큰 만료일시',
  `connected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '연결일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_oauth_conn_provider_uid` (`provider_id`, `provider_user_id`),
  INDEX `idx_auth_oauth_connections_user_id` (`user_id`),
  CONSTRAINT `fk_auth_oauth_conn_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auth_oauth_conn_provider` FOREIGN KEY (`provider_id`) REFERENCES `Auth`.`auth_oauth_providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OAuth 연결';

CREATE TABLE `Auth`.`auth_mfa_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `method` VARCHAR(20) NOT NULL COMMENT '방법(totp/sms/email)',
  `secret` VARCHAR(255) NULL COMMENT 'TOTP 시크릿',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '활성 여부',
  `verified_at` DATETIME NULL COMMENT '인증일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_mfa_user_method` (`user_id`, `method`),
  CONSTRAINT `fk_auth_mfa_settings_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MFA 설정';

CREATE TABLE `Auth`.`auth_mfa_backup_codes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `code_hash` VARCHAR(255) NOT NULL COMMENT '백업 코드 해시',
  `used_at` DATETIME NULL COMMENT '사용일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_auth_mfa_backup_user_id` (`user_id`),
  CONSTRAINT `fk_auth_mfa_backup_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MFA 백업 코드';

CREATE TABLE `Auth`.`auth_password_histories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '변경일시',
  PRIMARY KEY (`id`),
  INDEX `idx_auth_pw_hist_user_id` (`user_id`),
  CONSTRAINT `fk_auth_pw_hist_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비밀번호 변경 이력';

CREATE TABLE `Auth`.`auth_login_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `identifier` VARCHAR(255) NOT NULL COMMENT '로그인 식별자(이메일/IP)',
  `ip_address` VARCHAR(45) NOT NULL COMMENT 'IP 주소',
  `is_success` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '성공 여부',
  `attempted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '시도일시',
  PRIMARY KEY (`id`),
  INDEX `idx_auth_login_attempts_identifier` (`identifier`),
  INDEX `idx_auth_login_attempts_ip` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='로그인 시도 이력';

CREATE TABLE `Auth`.`roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(50) NOT NULL COMMENT '역할 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '역할명',
  `description` TEXT NULL COMMENT '설명',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '시스템 역할 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='역할';

CREATE TABLE `Auth`.`permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(100) NOT NULL COMMENT '권한 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '권한명',
  `group_name` VARCHAR(50) NOT NULL COMMENT '그룹명',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`code`),
  INDEX `idx_permissions_group` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='권한';

CREATE TABLE `Auth`.`role_permissions` (
  `role_id` INT UNSIGNED NOT NULL COMMENT '역할 ID',
  `permission_id` INT UNSIGNED NOT NULL COMMENT '권한 ID',
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `Auth`.`roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_perm` FOREIGN KEY (`permission_id`) REFERENCES `Auth`.`permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='역할-권한 매핑';

CREATE TABLE `Auth`.`user_roles` (
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `role_id` INT UNSIGNED NOT NULL COMMENT '역할 ID',
  `granted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '부여일시',
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `Auth`.`roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자-역할 매핑';

CREATE TABLE `Auth`.`groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '그룹명',
  `slug` VARCHAR(100) NOT NULL COMMENT '슬러그',
  `description` TEXT NULL COMMENT '설명',
  `owner_id` BIGINT UNSIGNED NULL COMMENT '소유자 ID',
  `is_public` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '공개 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_groups_slug` (`slug`),
  CONSTRAINT `fk_groups_owner` FOREIGN KEY (`owner_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='그룹';

CREATE TABLE `Auth`.`group_members` (
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT '그룹 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `role` VARCHAR(20) NOT NULL DEFAULT 'member' COMMENT '역할(owner/admin/member)',
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입일시',
  PRIMARY KEY (`group_id`, `user_id`),
  CONSTRAINT `fk_group_members_group` FOREIGN KEY (`group_id`) REFERENCES `Auth`.`groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_members_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='그룹 멤버';

CREATE TABLE `Auth`.`group_roles` (
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT '그룹 ID',
  `role_id` INT UNSIGNED NOT NULL COMMENT '역할 ID',
  PRIMARY KEY (`group_id`, `role_id`),
  CONSTRAINT `fk_group_roles_group` FOREIGN KEY (`group_id`) REFERENCES `Auth`.`groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_roles_role` FOREIGN KEY (`role_id`) REFERENCES `Auth`.`roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='그룹-역할 매핑';

CREATE TABLE `Auth`.`api_keys` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `name` VARCHAR(100) NOT NULL COMMENT 'API 키 이름',
  `key_hash` VARCHAR(255) NOT NULL COMMENT 'API 키 해시',
  `key_prefix` VARCHAR(10) NOT NULL COMMENT '키 접두사(표시용)',
  `expires_at` DATETIME NULL COMMENT '만료일시',
  `last_used_at` DATETIME NULL COMMENT '마지막 사용일시',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_api_keys_hash` (`key_hash`),
  INDEX `idx_api_keys_user_id` (`user_id`),
  CONSTRAINT `fk_api_keys_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 키';

CREATE TABLE `Auth`.`api_key_scopes` (
  `api_key_id` BIGINT UNSIGNED NOT NULL COMMENT 'API 키 ID',
  `scope` VARCHAR(100) NOT NULL COMMENT '스코프',
  PRIMARY KEY (`api_key_id`, `scope`),
  CONSTRAINT `fk_api_key_scopes_key` FOREIGN KEY (`api_key_id`) REFERENCES `Auth`.`api_keys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 키 스코프';

CREATE TABLE `Auth`.`notification_templates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(100) NOT NULL COMMENT '템플릿 코드',
  `channel` VARCHAR(20) NOT NULL COMMENT '채널(email/sms/push/in_app)',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `body` TEXT NOT NULL COMMENT '내용',
  `variables` JSON NULL COMMENT '변수 목록',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_tmpl_code_channel` (`code`, `channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림 템플릿';

CREATE TABLE `Auth`.`user_notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `template_id` INT UNSIGNED NULL COMMENT '템플릿 ID',
  `channel` VARCHAR(20) NOT NULL COMMENT '채널',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `body` TEXT NOT NULL COMMENT '내용',
  `data` JSON NULL COMMENT '추가 데이터',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '읽음 여부',
  `read_at` DATETIME NULL COMMENT '읽은 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_user_notif_user_id` (`user_id`),
  INDEX `idx_user_notif_is_read` (`is_read`),
  CONSTRAINT `fk_user_notif_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_notif_template` FOREIGN KEY (`template_id`) REFERENCES `Auth`.`notification_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 알림';

CREATE TABLE `Auth`.`notification_settings` (
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `channel` VARCHAR(20) NOT NULL COMMENT '채널',
  `event_type` VARCHAR(100) NOT NULL COMMENT '이벤트 유형',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`user_id`, `channel`, `event_type`),
  CONSTRAINT `fk_notif_settings_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림 설정';

CREATE TABLE `Auth`.`audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `action` VARCHAR(100) NOT NULL COMMENT '액션',
  `entity_type` VARCHAR(100) NOT NULL COMMENT '엔티티 유형',
  `entity_id` VARCHAR(100) NULL COMMENT '엔티티 ID',
  `old_values` JSON NULL COMMENT '변경 전 값',
  `new_values` JSON NULL COMMENT '변경 후 값',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP 주소',
  `user_agent` VARCHAR(500) NULL COMMENT 'User-Agent',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_audit_logs_user_id` (`user_id`),
  INDEX `idx_audit_logs_entity` (`entity_type`, `entity_id`),
  INDEX `idx_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='감사 로그';

CREATE TABLE `Auth`.`user_preferences` (
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `theme` VARCHAR(20) NOT NULL DEFAULT 'light' COMMENT '테마',
  `language` VARCHAR(10) NOT NULL DEFAULT 'ko' COMMENT '언어',
  `items_per_page` TINYINT UNSIGNED NOT NULL DEFAULT 20 COMMENT '페이지당 항목 수',
  `dashboard_layout` JSON NULL COMMENT '대시보드 레이아웃',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_prefs_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 기본설정';

CREATE TABLE `Auth`.`user_social_links` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `platform` VARCHAR(30) NOT NULL COMMENT '플랫폼(github/twitter/linkedin)',
  `url` VARCHAR(500) NOT NULL COMMENT '링크 URL',
  `is_public` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '공개 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_social_links_user_platform` (`user_id`, `platform`),
  CONSTRAINT `fk_user_social_links_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 소셜 링크';

CREATE TABLE `Auth`.`user_follows` (
  `follower_id` BIGINT UNSIGNED NOT NULL COMMENT '팔로워 ID',
  `followee_id` BIGINT UNSIGNED NOT NULL COMMENT '팔로이 ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '팔로우일시',
  PRIMARY KEY (`follower_id`, `followee_id`),
  INDEX `idx_user_follows_followee_id` (`followee_id`),
  CONSTRAINT `fk_user_follows_follower` FOREIGN KEY (`follower_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_follows_followee` FOREIGN KEY (`followee_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 팔로우';

-- ============================================================
-- Schema: Catalog (Domain 2: 상품/카탈로그) - 30 tables
-- ============================================================

CREATE TABLE `Catalog`.`categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `parent_id` INT UNSIGNED NULL COMMENT '부모 카테고리 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  `slug` VARCHAR(100) NOT NULL COMMENT '슬러그',
  `description` TEXT NULL COMMENT '설명',
  `image_url` VARCHAR(500) NULL COMMENT '이미지 URL',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  INDEX `idx_categories_parent_id` (`parent_id`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `Catalog`.`categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='카테고리';

CREATE TABLE `Catalog`.`brands` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '브랜드명',
  `slug` VARCHAR(100) NOT NULL COMMENT '슬러그',
  `logo_url` VARCHAR(500) NULL COMMENT '로고 URL',
  `description` TEXT NULL COMMENT '설명',
  `website_url` VARCHAR(500) NULL COMMENT '웹사이트 URL',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brands_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='브랜드';

CREATE TABLE `Catalog`.`specification_groups` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '스펙 그룹명',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_spec_groups_category_id` (`category_id`),
  CONSTRAINT `fk_spec_groups_category` FOREIGN KEY (`category_id`) REFERENCES `Catalog`.`categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스펙 그룹';

CREATE TABLE `Catalog`.`products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `brand_id` INT UNSIGNED NULL COMMENT '브랜드 ID',
  `sku` VARCHAR(100) NOT NULL COMMENT 'SKU',
  `name` VARCHAR(255) NOT NULL COMMENT '상품명',
  `slug` VARCHAR(255) NOT NULL COMMENT '슬러그',
  `description` LONGTEXT NULL COMMENT '상품 설명',
  `short_description` TEXT NULL COMMENT '짧은 설명',
  `base_price` DECIMAL(12,2) NOT NULL COMMENT '기본 가격',
  `cost_price` DECIMAL(12,2) NULL COMMENT '원가',
  `weight` DECIMAL(8,3) NULL COMMENT '무게(kg)',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '상태(1:판매중,0:비활성,2:품절)',
  `is_digital` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '디지털 상품 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_sku` (`sku`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  INDEX `idx_products_category_id` (`category_id`),
  INDEX `idx_products_brand_id` (`brand_id`),
  INDEX `idx_products_status` (`status`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `Catalog`.`categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `Catalog`.`brands` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품';

CREATE TABLE `Catalog`.`product_variants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `sku` VARCHAR(100) NOT NULL COMMENT '변형 SKU',
  `option_values` JSON NOT NULL COMMENT '옵션 값(color, size 등)',
  `price` DECIMAL(12,2) NOT NULL COMMENT '변형 가격',
  `stock_qty` INT NOT NULL DEFAULT 0 COMMENT '재고 수량',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_variants_sku` (`sku`),
  INDEX `idx_product_variants_product_id` (`product_id`),
  CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 변형';

CREATE TABLE `Catalog`.`product_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `variant_id` BIGINT UNSIGNED NULL COMMENT '변형 ID',
  `url` VARCHAR(500) NOT NULL COMMENT '이미지 URL',
  `alt_text` VARCHAR(255) NULL COMMENT '대체 텍스트',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '대표 이미지 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_product_images_product_id` (`product_id`),
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_images_variant` FOREIGN KEY (`variant_id`) REFERENCES `Catalog`.`product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 이미지';

CREATE TABLE `Catalog`.`tags` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '태그명',
  `slug` VARCHAR(100) NOT NULL COMMENT '슬러그',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tags_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='태그';

CREATE TABLE `Catalog`.`product_tags` (
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `tag_id` INT UNSIGNED NOT NULL COMMENT '태그 ID',
  PRIMARY KEY (`product_id`, `tag_id`),
  CONSTRAINT `fk_product_tags_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `Catalog`.`tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품-태그 매핑';

CREATE TABLE `Catalog`.`product_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `order_item_id` BIGINT UNSIGNED NULL COMMENT '주문 항목 ID',
  `rating` TINYINT UNSIGNED NOT NULL COMMENT '평점(1-5)',
  `title` VARCHAR(255) NULL COMMENT '제목',
  `body` TEXT NOT NULL COMMENT '내용',
  `is_verified_purchase` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '구매 인증 여부',
  `helpful_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '도움됨 수',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '상태(1:게시,0:숨김,2:신고)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_product_reviews_product_id` (`product_id`),
  INDEX `idx_product_reviews_user_id` (`user_id`),
  CONSTRAINT `fk_product_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 리뷰';

CREATE TABLE `Catalog`.`review_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `review_id` BIGINT UNSIGNED NOT NULL COMMENT '리뷰 ID',
  `url` VARCHAR(500) NOT NULL COMMENT '이미지 URL',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_review_images_review_id` (`review_id`),
  CONSTRAINT `fk_review_images_review` FOREIGN KEY (`review_id`) REFERENCES `Catalog`.`product_reviews` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리뷰 이미지';

CREATE TABLE `Catalog`.`review_votes` (
  `review_id` BIGINT UNSIGNED NOT NULL COMMENT '리뷰 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `is_helpful` TINYINT(1) NOT NULL COMMENT '도움됨 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '투표일시',
  PRIMARY KEY (`review_id`, `user_id`),
  CONSTRAINT `fk_review_votes_review` FOREIGN KEY (`review_id`) REFERENCES `Catalog`.`product_reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_votes_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리뷰 투표';

CREATE TABLE `Catalog`.`product_questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '질문자 ID',
  `body` TEXT NOT NULL COMMENT '질문 내용',
  `is_answered` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '답변 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_product_questions_product_id` (`product_id`),
  CONSTRAINT `fk_product_questions_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_questions_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 문의';

CREATE TABLE `Catalog`.`product_answers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `question_id` BIGINT UNSIGNED NOT NULL COMMENT '문의 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '답변자 ID',
  `body` TEXT NOT NULL COMMENT '답변 내용',
  `is_official` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '공식 답변 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_product_answers_question_id` (`question_id`),
  CONSTRAINT `fk_product_answers_question` FOREIGN KEY (`question_id`) REFERENCES `Catalog`.`product_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_answers_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 문의 답변';

CREATE TABLE `Catalog`.`product_bundles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '번들명',
  `discount_type` VARCHAR(20) NOT NULL DEFAULT 'fixed' COMMENT '할인 유형(fixed/percent)',
  `discount_value` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '할인 값',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 번들';

CREATE TABLE `Catalog`.`bundle_items` (
  `bundle_id` BIGINT UNSIGNED NOT NULL COMMENT '번들 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '수량',
  PRIMARY KEY (`bundle_id`, `product_id`),
  CONSTRAINT `fk_bundle_items_bundle` FOREIGN KEY (`bundle_id`) REFERENCES `Catalog`.`product_bundles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bundle_items_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='번들 상품';

CREATE TABLE `Catalog`.`product_specifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `group_id` INT UNSIGNED NOT NULL COMMENT '스펙 그룹 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '스펙명',
  `value` VARCHAR(500) NOT NULL COMMENT '스펙 값',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_product_specs_product_id` (`product_id`),
  CONSTRAINT `fk_product_specs_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_specs_group` FOREIGN KEY (`group_id`) REFERENCES `Catalog`.`specification_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 스펙';

CREATE TABLE `Catalog`.`tax_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '세금 카테고리명',
  `code` VARCHAR(50) NOT NULL COMMENT '코드',
  `default_rate` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '기본 세율(%)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tax_categories_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='세금 카테고리';

CREATE TABLE `Catalog`.`product_tax_mappings` (
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `tax_category_id` INT UNSIGNED NOT NULL COMMENT '세금 카테고리 ID',
  PRIMARY KEY (`product_id`, `tax_category_id`),
  CONSTRAINT `fk_product_tax_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_tax_category` FOREIGN KEY (`tax_category_id`) REFERENCES `Catalog`.`tax_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품-세금 카테고리 매핑';

CREATE TABLE `Catalog`.`inventory_warehouses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '창고 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '창고명',
  `address` VARCHAR(255) NOT NULL COMMENT '주소',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inv_warehouses_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='재고 창고';

CREATE TABLE `Catalog`.`inventory_locations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '창고 ID',
  `code` VARCHAR(30) NOT NULL COMMENT '위치 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '위치명',
  `type` VARCHAR(20) NOT NULL DEFAULT 'bin' COMMENT '유형(bin/shelf/zone)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inv_loc_warehouse_code` (`warehouse_id`, `code`),
  CONSTRAINT `fk_inv_locations_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `Catalog`.`inventory_warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='재고 위치';

CREATE TABLE `Catalog`.`product_inventory` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `variant_id` BIGINT UNSIGNED NULL COMMENT '변형 ID',
  `location_id` INT UNSIGNED NOT NULL COMMENT '위치 ID',
  `qty_on_hand` INT NOT NULL DEFAULT 0 COMMENT '보유 수량',
  `qty_reserved` INT NOT NULL DEFAULT 0 COMMENT '예약 수량',
  `reorder_point` INT NOT NULL DEFAULT 0 COMMENT '재주문 기준점',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_inv_product_variant_loc` (`product_id`, `variant_id`, `location_id`),
  CONSTRAINT `fk_product_inv_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_inv_variant` FOREIGN KEY (`variant_id`) REFERENCES `Catalog`.`product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_inv_location` FOREIGN KEY (`location_id`) REFERENCES `Catalog`.`inventory_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 재고';

CREATE TABLE `Catalog`.`inventory_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `variant_id` BIGINT UNSIGNED NULL COMMENT '변형 ID',
  `location_id` INT UNSIGNED NOT NULL COMMENT '위치 ID',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(in/out/adjust/transfer)',
  `qty` INT NOT NULL COMMENT '수량(음수 가능)',
  `reference_type` VARCHAR(50) NULL COMMENT '참조 유형',
  `reference_id` BIGINT UNSIGNED NULL COMMENT '참조 ID',
  `note` TEXT NULL COMMENT '비고',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_inv_tx_product_id` (`product_id`),
  INDEX `idx_inv_tx_location_id` (`location_id`),
  CONSTRAINT `fk_inv_tx_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_tx_location` FOREIGN KEY (`location_id`) REFERENCES `Catalog`.`inventory_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='재고 트랜잭션';

CREATE TABLE `Catalog`.`price_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '가격 규칙명',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(percent/fixed/tiered)',
  `value` DECIMAL(12,2) NOT NULL COMMENT '값',
  `min_qty` INT UNSIGNED NULL COMMENT '최소 수량',
  `starts_at` DATETIME NULL COMMENT '시작일시',
  `ends_at` DATETIME NULL COMMENT '종료일시',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='가격 규칙';

CREATE TABLE `Catalog`.`product_price_rules` (
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `price_rule_id` BIGINT UNSIGNED NOT NULL COMMENT '가격 규칙 ID',
  PRIMARY KEY (`product_id`, `price_rule_id`),
  CONSTRAINT `fk_product_price_rules_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_price_rules_rule` FOREIGN KEY (`price_rule_id`) REFERENCES `Catalog`.`price_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품-가격 규칙 매핑';

CREATE TABLE `Catalog`.`product_cross_sells` (
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `related_product_id` BIGINT UNSIGNED NOT NULL COMMENT '연관 상품 ID',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`product_id`, `related_product_id`),
  CONSTRAINT `fk_cross_sells_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cross_sells_related` FOREIGN KEY (`related_product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='크로스셀 상품';

CREATE TABLE `Catalog`.`product_up_sells` (
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `upsell_product_id` BIGINT UNSIGNED NOT NULL COMMENT '업셀 상품 ID',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`product_id`, `upsell_product_id`),
  CONSTRAINT `fk_up_sells_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_up_sells_upsell` FOREIGN KEY (`upsell_product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='업셀 상품';

CREATE TABLE `Catalog`.`category_attributes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '속성명',
  `type` VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT '유형(text/select/boolean/number)',
  `options` JSON NULL COMMENT '선택 옵션 목록',
  `is_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '필수 여부',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_category_attrs_category_id` (`category_id`),
  CONSTRAINT `fk_category_attrs_category` FOREIGN KEY (`category_id`) REFERENCES `Catalog`.`categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='카테고리 속성';

CREATE TABLE `Catalog`.`product_attributes` (
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `attribute_id` BIGINT UNSIGNED NOT NULL COMMENT '속성 ID',
  PRIMARY KEY (`product_id`, `attribute_id`),
  CONSTRAINT `fk_product_attrs_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_attrs_attr` FOREIGN KEY (`attribute_id`) REFERENCES `Catalog`.`category_attributes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품-속성 매핑';

CREATE TABLE `Catalog`.`product_attribute_values` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `attribute_id` BIGINT UNSIGNED NOT NULL COMMENT '속성 ID',
  `value` TEXT NOT NULL COMMENT '속성 값',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prod_attr_values` (`product_id`, `attribute_id`),
  CONSTRAINT `fk_prod_attr_values_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prod_attr_values_attr` FOREIGN KEY (`attribute_id`) REFERENCES `Catalog`.`category_attributes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 속성 값';

CREATE TABLE `Catalog`.`product_videos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `title` VARCHAR(255) NULL COMMENT '제목',
  `url` VARCHAR(500) NOT NULL COMMENT '동영상 URL',
  `thumbnail_url` VARCHAR(500) NULL COMMENT '썸네일 URL',
  `duration_sec` INT NULL COMMENT '재생 시간(초)',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_product_videos_product_id` (`product_id`),
  CONSTRAINT `fk_product_videos_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 동영상';

-- ============================================================
-- Schema: Order (Domain 3: 주문/결제) - 30 tables
-- ============================================================

CREATE TABLE `Order`.`coupons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(50) NOT NULL COMMENT '쿠폰 코드',
  `name` VARCHAR(255) NOT NULL COMMENT '쿠폰명',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(percent/fixed/free_ship)',
  `value` DECIMAL(12,2) NOT NULL COMMENT '할인 값',
  `min_order_amount` DECIMAL(12,2) NULL COMMENT '최소 주문 금액',
  `max_discount_amount` DECIMAL(12,2) NULL COMMENT '최대 할인 금액',
  `usage_limit` INT UNSIGNED NULL COMMENT '전체 사용 한도',
  `usage_per_user` INT UNSIGNED NULL COMMENT '유저당 사용 한도',
  `used_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '사용 횟수',
  `starts_at` DATETIME NULL COMMENT '시작일시',
  `ends_at` DATETIME NULL COMMENT '종료일시',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupons_code` (`code`),
  INDEX `idx_coupons_starts_at` (`starts_at`),
  INDEX `idx_coupons_ends_at` (`ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쿠폰';

CREATE TABLE `Order`.`payment_methods` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '결제 수단 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '결제 수단명',
  `provider` VARCHAR(50) NOT NULL COMMENT '결제 공급사',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_methods_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='결제 수단';

CREATE TABLE `Order`.`subscription_plans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '플랜명',
  `code` VARCHAR(50) NOT NULL COMMENT '플랜 코드',
  `price` DECIMAL(12,2) NOT NULL COMMENT '가격',
  `billing_cycle` VARCHAR(20) NOT NULL COMMENT '결제 주기(monthly/yearly)',
  `trial_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '무료 체험 기간(일)',
  `features` JSON NULL COMMENT '기능 목록',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subscription_plans_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='구독 플랜';

CREATE TABLE `Order`.`orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '주문 번호',
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `payment_status` VARCHAR(30) NOT NULL DEFAULT 'unpaid' COMMENT '결제 상태',
  `subtotal` DECIMAL(12,2) NOT NULL COMMENT '소계',
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '할인 금액',
  `shipping_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '배송비',
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '세금',
  `total_amount` DECIMAL(12,2) NOT NULL COMMENT '총액',
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW' COMMENT '통화',
  `shipping_name` VARCHAR(100) NOT NULL COMMENT '배송 수령인',
  `shipping_phone` VARCHAR(30) NOT NULL COMMENT '배송 연락처',
  `shipping_address` TEXT NOT NULL COMMENT '배송 주소',
  `note` TEXT NULL COMMENT '주문 메모',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_order_number` (`order_number`),
  INDEX `idx_orders_user_id` (`user_id`),
  INDEX `idx_orders_status` (`status`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문';

CREATE TABLE `Order`.`order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `variant_id` BIGINT UNSIGNED NULL COMMENT '변형 ID',
  `product_name` VARCHAR(255) NOT NULL COMMENT '상품명(스냅샷)',
  `sku` VARCHAR(100) NOT NULL COMMENT 'SKU(스냅샷)',
  `unit_price` DECIMAL(12,2) NOT NULL COMMENT '단가',
  `quantity` INT UNSIGNED NOT NULL COMMENT '수량',
  `subtotal` DECIMAL(12,2) NOT NULL COMMENT '소계',
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '세금',
  PRIMARY KEY (`id`),
  INDEX `idx_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문 항목';

CREATE TABLE `Order`.`order_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `from_status` VARCHAR(30) NULL COMMENT '이전 상태',
  `to_status` VARCHAR(30) NOT NULL COMMENT '변경 상태',
  `note` TEXT NULL COMMENT '비고',
  `created_by` BIGINT UNSIGNED NULL COMMENT '변경자 ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '변경일시',
  PRIMARY KEY (`id`),
  INDEX `idx_order_status_hist_order_id` (`order_id`),
  CONSTRAINT `fk_order_status_hist_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문 상태 이력';

CREATE TABLE `Order`.`order_notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `user_id` BIGINT UNSIGNED NULL COMMENT '작성자 ID',
  `note` TEXT NOT NULL COMMENT '메모',
  `is_customer_visible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '고객 공개 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_order_notes_order_id` (`order_id`),
  CONSTRAINT `fk_order_notes_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문 메모';

CREATE TABLE `Order`.`carts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `session_id` VARCHAR(128) NULL COMMENT '세션 ID(비회원)',
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW' COMMENT '통화',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_carts_user_id` (`user_id`),
  INDEX `idx_carts_session_id` (`session_id`),
  CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장바구니';

CREATE TABLE `Order`.`cart_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `cart_id` BIGINT UNSIGNED NOT NULL COMMENT '장바구니 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `variant_id` BIGINT UNSIGNED NULL COMMENT '변형 ID',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '수량',
  `unit_price` DECIMAL(12,2) NOT NULL COMMENT '단가',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_items_cart_product_variant` (`cart_id`, `product_id`, `variant_id`),
  CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `Order`.`carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장바구니 항목';

CREATE TABLE `Order`.`cart_coupons` (
  `cart_id` BIGINT UNSIGNED NOT NULL COMMENT '장바구니 ID',
  `coupon_id` BIGINT UNSIGNED NOT NULL COMMENT '쿠폰 ID',
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '적용일시',
  PRIMARY KEY (`cart_id`, `coupon_id`),
  CONSTRAINT `fk_cart_coupons_cart` FOREIGN KEY (`cart_id`) REFERENCES `Order`.`carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_coupons_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `Order`.`coupons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장바구니 쿠폰';

CREATE TABLE `Order`.`wishlists` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `name` VARCHAR(100) NOT NULL DEFAULT '위시리스트' COMMENT '위시리스트명',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '공개 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_wishlists_user_id` (`user_id`),
  CONSTRAINT `fk_wishlists_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='위시리스트';

CREATE TABLE `Order`.`wishlist_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `wishlist_id` BIGINT UNSIGNED NOT NULL COMMENT '위시리스트 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `variant_id` BIGINT UNSIGNED NULL COMMENT '변형 ID',
  `added_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '추가일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlist_items_wishlist_product` (`wishlist_id`, `product_id`),
  CONSTRAINT `fk_wishlist_items_wishlist` FOREIGN KEY (`wishlist_id`) REFERENCES `Order`.`wishlists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_items_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='위시리스트 항목';

CREATE TABLE `Order`.`payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `payment_method_id` INT UNSIGNED NOT NULL COMMENT '결제 수단 ID',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '결제 금액',
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW' COMMENT '통화',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `pg_transaction_id` VARCHAR(255) NULL COMMENT 'PG 거래 ID',
  `paid_at` DATETIME NULL COMMENT '결제일시',
  `failed_at` DATETIME NULL COMMENT '실패일시',
  `failure_reason` TEXT NULL COMMENT '실패 사유',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_payments_order_id` (`order_id`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_method` FOREIGN KEY (`payment_method_id`) REFERENCES `Order`.`payment_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='결제';

CREATE TABLE `Order`.`payment_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `payment_id` BIGINT UNSIGNED NOT NULL COMMENT '결제 ID',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(charge/refund/cancel)',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '금액',
  `pg_response` JSON NULL COMMENT 'PG 응답',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_payment_tx_payment_id` (`payment_id`),
  CONSTRAINT `fk_payment_tx_payment` FOREIGN KEY (`payment_id`) REFERENCES `Order`.`payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='결제 트랜잭션';

CREATE TABLE `Order`.`payment_refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `payment_id` BIGINT UNSIGNED NOT NULL COMMENT '결제 ID',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '환불 금액',
  `reason` TEXT NOT NULL COMMENT '환불 사유',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `refunded_at` DATETIME NULL COMMENT '환불 처리일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_payment_refunds_payment_id` (`payment_id`),
  CONSTRAINT `fk_payment_refunds_payment` FOREIGN KEY (`payment_id`) REFERENCES `Order`.`payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='결제 환불';

CREATE TABLE `Order`.`invoices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `invoice_number` VARCHAR(50) NOT NULL COMMENT '청구서 번호',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/sent/paid)',
  `subtotal` DECIMAL(12,2) NOT NULL COMMENT '소계',
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '세금',
  `total_amount` DECIMAL(12,2) NOT NULL COMMENT '총액',
  `due_date` DATE NOT NULL COMMENT '납부 기한',
  `paid_at` DATETIME NULL COMMENT '납부일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_number` (`invoice_number`),
  INDEX `idx_invoices_order_id` (`order_id`),
  CONSTRAINT `fk_invoices_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='청구서';

CREATE TABLE `Order`.`invoice_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `invoice_id` BIGINT UNSIGNED NOT NULL COMMENT '청구서 ID',
  `description` VARCHAR(255) NOT NULL COMMENT '항목 설명',
  `quantity` INT UNSIGNED NOT NULL COMMENT '수량',
  `unit_price` DECIMAL(12,2) NOT NULL COMMENT '단가',
  `subtotal` DECIMAL(12,2) NOT NULL COMMENT '소계',
  PRIMARY KEY (`id`),
  INDEX `idx_invoice_items_invoice_id` (`invoice_id`),
  CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `Order`.`invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='청구서 항목';

CREATE TABLE `Order`.`coupon_usages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `coupon_id` BIGINT UNSIGNED NOT NULL COMMENT '쿠폰 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `discount_amount` DECIMAL(12,2) NOT NULL COMMENT '할인 금액',
  `used_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '사용일시',
  PRIMARY KEY (`id`),
  INDEX `idx_coupon_usages_coupon_id` (`coupon_id`),
  INDEX `idx_coupon_usages_user_id` (`user_id`),
  CONSTRAINT `fk_coupon_usages_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `Order`.`coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coupon_usages_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coupon_usages_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쿠폰 사용 이력';

CREATE TABLE `Order`.`gift_cards` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(50) NOT NULL COMMENT '상품권 코드',
  `initial_amount` DECIMAL(12,2) NOT NULL COMMENT '초기 금액',
  `balance` DECIMAL(12,2) NOT NULL COMMENT '잔액',
  `issued_to_user_id` BIGINT UNSIGNED NULL COMMENT '발행 대상 사용자 ID',
  `expires_at` DATE NULL COMMENT '만료일',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gift_cards_code` (`code`),
  CONSTRAINT `fk_gift_cards_user` FOREIGN KEY (`issued_to_user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품권';

CREATE TABLE `Order`.`gift_card_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `gift_card_id` BIGINT UNSIGNED NOT NULL COMMENT '상품권 ID',
  `order_id` BIGINT UNSIGNED NULL COMMENT '주문 ID',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(issue/redeem/refund)',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '금액',
  `balance_after` DECIMAL(12,2) NOT NULL COMMENT '처리 후 잔액',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_gift_card_tx_card_id` (`gift_card_id`),
  CONSTRAINT `fk_gift_card_tx_card` FOREIGN KEY (`gift_card_id`) REFERENCES `Order`.`gift_cards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gift_card_tx_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품권 트랜잭션';

CREATE TABLE `Order`.`subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `plan_id` INT UNSIGNED NOT NULL COMMENT '플랜 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '상태',
  `trial_ends_at` DATETIME NULL COMMENT '체험 종료일시',
  `current_period_start` DATETIME NOT NULL COMMENT '현재 기간 시작',
  `current_period_end` DATETIME NOT NULL COMMENT '현재 기간 종료',
  `canceled_at` DATETIME NULL COMMENT '취소일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_subscriptions_user_id` (`user_id`),
  CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `Order`.`subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='구독';

CREATE TABLE `Order`.`subscription_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `subscription_id` BIGINT UNSIGNED NOT NULL COMMENT '구독 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '수량',
  `unit_price` DECIMAL(12,2) NOT NULL COMMENT '단가',
  PRIMARY KEY (`id`),
  INDEX `idx_subscription_items_sub_id` (`subscription_id`),
  CONSTRAINT `fk_subscription_items_sub` FOREIGN KEY (`subscription_id`) REFERENCES `Order`.`subscriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subscription_items_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='구독 항목';

CREATE TABLE `Order`.`subscription_payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `subscription_id` BIGINT UNSIGNED NOT NULL COMMENT '구독 ID',
  `payment_id` BIGINT UNSIGNED NULL COMMENT '결제 ID',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '금액',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `billing_date` DATE NOT NULL COMMENT '청구일',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_sub_payments_sub_id` (`subscription_id`),
  CONSTRAINT `fk_sub_payments_sub` FOREIGN KEY (`subscription_id`) REFERENCES `Order`.`subscriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sub_payments_payment` FOREIGN KEY (`payment_id`) REFERENCES `Order`.`payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='구독 결제';

CREATE TABLE `Order`.`checkout_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `cart_id` BIGINT UNSIGNED NULL COMMENT '장바구니 ID',
  `session_token` VARCHAR(128) NOT NULL COMMENT '세션 토큰',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '상태',
  `expires_at` DATETIME NOT NULL COMMENT '만료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_checkout_sessions_token` (`session_token`),
  INDEX `idx_checkout_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_checkout_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_checkout_sessions_cart` FOREIGN KEY (`cart_id`) REFERENCES `Order`.`carts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='체크아웃 세션';

CREATE TABLE `Order`.`checkout_addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `session_id` BIGINT UNSIGNED NOT NULL COMMENT '체크아웃 세션 ID',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(shipping/billing)',
  `recipient` VARCHAR(100) NOT NULL COMMENT '수령인',
  `phone` VARCHAR(30) NOT NULL COMMENT '연락처',
  `zipcode` VARCHAR(10) NOT NULL COMMENT '우편번호',
  `address1` VARCHAR(255) NOT NULL COMMENT '주소1',
  `address2` VARCHAR(255) NULL COMMENT '주소2',
  `city` VARCHAR(100) NOT NULL COMMENT '시/군/구',
  `country` CHAR(2) NOT NULL DEFAULT 'KR' COMMENT '국가코드',
  PRIMARY KEY (`id`),
  INDEX `idx_checkout_addrs_session_id` (`session_id`),
  CONSTRAINT `fk_checkout_addrs_session` FOREIGN KEY (`session_id`) REFERENCES `Order`.`checkout_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='체크아웃 주소';

CREATE TABLE `Order`.`loyalty_points` (
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `balance` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '포인트 잔액',
  `lifetime_earned` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '누적 적립 포인트',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_loyalty_points_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='로열티 포인트';

CREATE TABLE `Order`.`loyalty_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(earn/redeem/expire/adjust)',
  `points` INT NOT NULL COMMENT '포인트(음수 가능)',
  `balance_after` INT UNSIGNED NOT NULL COMMENT '처리 후 잔액',
  `reference_type` VARCHAR(50) NULL COMMENT '참조 유형',
  `reference_id` BIGINT UNSIGNED NULL COMMENT '참조 ID',
  `description` VARCHAR(255) NULL COMMENT '설명',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_loyalty_tx_user_id` (`user_id`),
  CONSTRAINT `fk_loyalty_tx_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='포인트 트랜잭션';

CREATE TABLE `Order`.`reward_programs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '프로그램명',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(points/cashback/tier)',
  `earn_rate` DECIMAL(5,2) NOT NULL DEFAULT 1.0 COMMENT '적립률',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리워드 프로그램';

CREATE TABLE `Order`.`reward_tiers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `program_id` INT UNSIGNED NOT NULL COMMENT '프로그램 ID',
  `name` VARCHAR(50) NOT NULL COMMENT '등급명',
  `min_points` INT UNSIGNED NOT NULL COMMENT '최소 포인트',
  `multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.0 COMMENT '적립 배율',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_reward_tiers_program_id` (`program_id`),
  CONSTRAINT `fk_reward_tiers_program` FOREIGN KEY (`program_id`) REFERENCES `Order`.`reward_programs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리워드 등급';

CREATE TABLE `Order`.`reward_tier_benefits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `tier_id` INT UNSIGNED NOT NULL COMMENT '등급 ID',
  `benefit_type` VARCHAR(50) NOT NULL COMMENT '혜택 유형',
  `benefit_value` VARCHAR(255) NOT NULL COMMENT '혜택 값',
  PRIMARY KEY (`id`),
  INDEX `idx_reward_tier_benefits_tier_id` (`tier_id`),
  CONSTRAINT `fk_reward_tier_benefits_tier` FOREIGN KEY (`tier_id`) REFERENCES `Order`.`reward_tiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='리워드 등급 혜택';

-- ============================================================
-- Schema: Logistics (Domain 4: 배송/물류) - 30 tables
-- ============================================================

CREATE TABLE `Logistics`.`carriers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(20) NOT NULL COMMENT '배송사 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '배송사명',
  `tracking_url` VARCHAR(500) NULL COMMENT '운송장 조회 URL',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_carriers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송사';

CREATE TABLE `Logistics`.`carrier_services` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `carrier_id` INT UNSIGNED NOT NULL COMMENT '배송사 ID',
  `code` VARCHAR(30) NOT NULL COMMENT '서비스 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '서비스명',
  `estimated_days` TINYINT UNSIGNED NULL COMMENT '예상 배송일',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_carrier_services_carrier_code` (`carrier_id`, `code`),
  CONSTRAINT `fk_carrier_services_carrier` FOREIGN KEY (`carrier_id`) REFERENCES `Logistics`.`carriers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 서비스';

CREATE TABLE `Logistics`.`shipping_zones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '배송 구역명',
  `description` TEXT NULL COMMENT '설명',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 구역';

CREATE TABLE `Logistics`.`shipping_zone_countries` (
  `zone_id` INT UNSIGNED NOT NULL COMMENT '배송 구역 ID',
  `country_code` CHAR(2) NOT NULL COMMENT '국가 코드',
  PRIMARY KEY (`zone_id`, `country_code`),
  CONSTRAINT `fk_shipping_zone_countries_zone` FOREIGN KEY (`zone_id`) REFERENCES `Logistics`.`shipping_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 구역-국가 매핑';

CREATE TABLE `Logistics`.`shipping_rates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `zone_id` INT UNSIGNED NOT NULL COMMENT '배송 구역 ID',
  `service_id` INT UNSIGNED NOT NULL COMMENT '배송 서비스 ID',
  `min_weight` DECIMAL(8,3) NOT NULL DEFAULT 0 COMMENT '최소 무게(kg)',
  `max_weight` DECIMAL(8,3) NULL COMMENT '최대 무게(kg)',
  `rate` DECIMAL(10,2) NOT NULL COMMENT '운임',
  `free_shipping_threshold` DECIMAL(12,2) NULL COMMENT '무료 배송 기준 금액',
  PRIMARY KEY (`id`),
  INDEX `idx_shipping_rates_zone_id` (`zone_id`),
  CONSTRAINT `fk_shipping_rates_zone` FOREIGN KEY (`zone_id`) REFERENCES `Logistics`.`shipping_zones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shipping_rates_service` FOREIGN KEY (`service_id`) REFERENCES `Logistics`.`carrier_services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 요금';

CREATE TABLE `Logistics`.`shipping_rules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '규칙명',
  `condition_type` VARCHAR(30) NOT NULL COMMENT '조건 유형',
  `condition_value` JSON NOT NULL COMMENT '조건 값',
  `action_type` VARCHAR(30) NOT NULL COMMENT '적용 유형',
  `action_value` JSON NOT NULL COMMENT '적용 값',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 규칙';

CREATE TABLE `Logistics`.`warehouses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(20) NOT NULL COMMENT '창고 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '창고명',
  `address` VARCHAR(255) NOT NULL COMMENT '주소',
  `phone` VARCHAR(30) NULL COMMENT '연락처',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_warehouses_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='물류 창고';

CREATE TABLE `Logistics`.`warehouse_zones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '창고 ID',
  `code` VARCHAR(20) NOT NULL COMMENT '구역 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '구역명',
  `temperature_zone` VARCHAR(20) NULL COMMENT '온도 구역(ambient/cold/frozen)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_warehouse_zones_wh_code` (`warehouse_id`, `code`),
  CONSTRAINT `fk_warehouse_zones_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `Logistics`.`warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='창고 구역';

CREATE TABLE `Logistics`.`warehouse_locations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `zone_id` INT UNSIGNED NOT NULL COMMENT '구역 ID',
  `code` VARCHAR(30) NOT NULL COMMENT '위치 코드',
  `aisle` VARCHAR(10) NULL COMMENT '통로',
  `rack` VARCHAR(10) NULL COMMENT '랙',
  `shelf` VARCHAR(10) NULL COMMENT '선반',
  `bin` VARCHAR(10) NULL COMMENT '빈',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wh_locations_zone_code` (`zone_id`, `code`),
  CONSTRAINT `fk_wh_locations_zone` FOREIGN KEY (`zone_id`) REFERENCES `Logistics`.`warehouse_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='창고 위치';

CREATE TABLE `Logistics`.`warehouse_staff` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '창고 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `role` VARCHAR(30) NOT NULL COMMENT '역할(manager/picker/packer/receiver)',
  `started_at` DATE NOT NULL COMMENT '시작일',
  `ended_at` DATE NULL COMMENT '종료일',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wh_staff_wh_user` (`warehouse_id`, `user_id`),
  CONSTRAINT `fk_wh_staff_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `Logistics`.`warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wh_staff_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='창고 직원';

CREATE TABLE `Logistics`.`shipments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '출고 창고 ID',
  `carrier_id` INT UNSIGNED NOT NULL COMMENT '배송사 ID',
  `service_id` INT UNSIGNED NULL COMMENT '배송 서비스 ID',
  `tracking_number` VARCHAR(100) NULL COMMENT '운송장 번호',
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `shipped_at` DATETIME NULL COMMENT '출고일시',
  `delivered_at` DATETIME NULL COMMENT '배송 완료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_shipments_order_id` (`order_id`),
  INDEX `idx_shipments_tracking_number` (`tracking_number`),
  CONSTRAINT `fk_shipments_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shipments_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `Logistics`.`warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shipments_carrier` FOREIGN KEY (`carrier_id`) REFERENCES `Logistics`.`carriers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송';

CREATE TABLE `Logistics`.`shipment_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `shipment_id` BIGINT UNSIGNED NOT NULL COMMENT '배송 ID',
  `order_item_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 항목 ID',
  `quantity` INT UNSIGNED NOT NULL COMMENT '수량',
  PRIMARY KEY (`id`),
  INDEX `idx_shipment_items_shipment_id` (`shipment_id`),
  CONSTRAINT `fk_shipment_items_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `Logistics`.`shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shipment_items_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `Order`.`order_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 항목';

CREATE TABLE `Logistics`.`shipment_tracking` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `shipment_id` BIGINT UNSIGNED NOT NULL COMMENT '배송 ID',
  `status_code` VARCHAR(30) NOT NULL COMMENT '상태 코드',
  `description` VARCHAR(255) NOT NULL COMMENT '상태 설명',
  `location` VARCHAR(255) NULL COMMENT '위치',
  `tracked_at` DATETIME NOT NULL COMMENT '추적 일시',
  PRIMARY KEY (`id`),
  INDEX `idx_shipment_tracking_shipment_id` (`shipment_id`),
  CONSTRAINT `fk_shipment_tracking_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `Logistics`.`shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 추적';

CREATE TABLE `Logistics`.`shipment_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `shipment_id` BIGINT UNSIGNED NOT NULL COMMENT '배송 ID',
  `event_type` VARCHAR(50) NOT NULL COMMENT '이벤트 유형',
  `note` TEXT NULL COMMENT '메모',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_shipment_events_shipment_id` (`shipment_id`),
  CONSTRAINT `fk_shipment_events_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `Logistics`.`shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송 이벤트';

CREATE TABLE `Logistics`.`receiving_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '창고 ID',
  `supplier_id` BIGINT UNSIGNED NULL COMMENT '공급사 ID',
  `reference_number` VARCHAR(50) NOT NULL COMMENT '참조 번호',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `expected_date` DATE NULL COMMENT '예상 입고일',
  `received_at` DATETIME NULL COMMENT '입고 완료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_receiving_orders_ref` (`reference_number`),
  INDEX `idx_receiving_orders_warehouse_id` (`warehouse_id`),
  CONSTRAINT `fk_receiving_orders_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `Logistics`.`warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='입고 주문';

CREATE TABLE `Logistics`.`receiving_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `receiving_order_id` BIGINT UNSIGNED NOT NULL COMMENT '입고 주문 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `variant_id` BIGINT UNSIGNED NULL COMMENT '변형 ID',
  `expected_qty` INT UNSIGNED NOT NULL COMMENT '예상 수량',
  `received_qty` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '입고 수량',
  `location_id` INT UNSIGNED NULL COMMENT '입고 위치 ID',
  PRIMARY KEY (`id`),
  INDEX `idx_receiving_items_order_id` (`receiving_order_id`),
  CONSTRAINT `fk_receiving_items_order` FOREIGN KEY (`receiving_order_id`) REFERENCES `Logistics`.`receiving_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_receiving_items_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='입고 항목';

CREATE TABLE `Logistics`.`picking_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `shipment_id` BIGINT UNSIGNED NOT NULL COMMENT '배송 ID',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '창고 ID',
  `assigned_to` BIGINT UNSIGNED NULL COMMENT '담당자 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `started_at` DATETIME NULL COMMENT '시작일시',
  `completed_at` DATETIME NULL COMMENT '완료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_picking_orders_shipment_id` (`shipment_id`),
  CONSTRAINT `fk_picking_orders_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `Logistics`.`shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_picking_orders_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `Logistics`.`warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_picking_orders_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='피킹 주문';

CREATE TABLE `Logistics`.`picking_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `picking_order_id` BIGINT UNSIGNED NOT NULL COMMENT '피킹 주문 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `location_id` INT UNSIGNED NOT NULL COMMENT '위치 ID',
  `requested_qty` INT UNSIGNED NOT NULL COMMENT '요청 수량',
  `picked_qty` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '피킹 수량',
  PRIMARY KEY (`id`),
  INDEX `idx_picking_items_order_id` (`picking_order_id`),
  CONSTRAINT `fk_picking_items_order` FOREIGN KEY (`picking_order_id`) REFERENCES `Logistics`.`picking_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_picking_items_location` FOREIGN KEY (`location_id`) REFERENCES `Logistics`.`warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='피킹 항목';

CREATE TABLE `Logistics`.`packing_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `picking_order_id` BIGINT UNSIGNED NOT NULL COMMENT '피킹 주문 ID',
  `assigned_to` BIGINT UNSIGNED NULL COMMENT '담당자 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `completed_at` DATETIME NULL COMMENT '완료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_packing_orders_picking_id` (`picking_order_id`),
  CONSTRAINT `fk_packing_orders_picking` FOREIGN KEY (`picking_order_id`) REFERENCES `Logistics`.`picking_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_packing_orders_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='패킹 주문';

CREATE TABLE `Logistics`.`packing_materials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '포장재 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '포장재명',
  `width_cm` DECIMAL(8,2) NULL COMMENT '가로(cm)',
  `height_cm` DECIMAL(8,2) NULL COMMENT '세로(cm)',
  `depth_cm` DECIMAL(8,2) NULL COMMENT '깊이(cm)',
  `weight_g` INT UNSIGNED NULL COMMENT '자체 무게(g)',
  `stock_qty` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '재고 수량',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_packing_materials_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='포장재';

CREATE TABLE `Logistics`.`return_reasons` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '반품 사유 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '반품 사유명',
  `requires_image` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '이미지 첨부 필요 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_return_reasons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반품 사유';

CREATE TABLE `Logistics`.`returns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `reason_id` INT UNSIGNED NOT NULL COMMENT '반품 사유 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'requested' COMMENT '상태',
  `note` TEXT NULL COMMENT '메모',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_returns_order_id` (`order_id`),
  CONSTRAINT `fk_returns_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_returns_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_returns_reason` FOREIGN KEY (`reason_id`) REFERENCES `Logistics`.`return_reasons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반품';

CREATE TABLE `Logistics`.`return_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `return_id` BIGINT UNSIGNED NOT NULL COMMENT '반품 ID',
  `order_item_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 항목 ID',
  `quantity` INT UNSIGNED NOT NULL COMMENT '반품 수량',
  PRIMARY KEY (`id`),
  INDEX `idx_return_items_return_id` (`return_id`),
  CONSTRAINT `fk_return_items_return` FOREIGN KEY (`return_id`) REFERENCES `Logistics`.`returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_return_items_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `Order`.`order_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반품 항목';

CREATE TABLE `Logistics`.`return_inspections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `return_id` BIGINT UNSIGNED NOT NULL COMMENT '반품 ID',
  `inspector_id` BIGINT UNSIGNED NULL COMMENT '검사자 ID',
  `result` VARCHAR(20) NOT NULL COMMENT '결과(pass/fail/partial)',
  `note` TEXT NULL COMMENT '검사 메모',
  `inspected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '검사일시',
  PRIMARY KEY (`id`),
  INDEX `idx_return_inspections_return_id` (`return_id`),
  CONSTRAINT `fk_return_inspections_return` FOREIGN KEY (`return_id`) REFERENCES `Logistics`.`returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_return_inspections_inspector` FOREIGN KEY (`inspector_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반품 검사';

CREATE TABLE `Logistics`.`return_refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `return_id` BIGINT UNSIGNED NOT NULL COMMENT '반품 ID',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '환불 금액',
  `method` VARCHAR(30) NOT NULL COMMENT '환불 방법',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `processed_at` DATETIME NULL COMMENT '처리일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_return_refunds_return_id` (`return_id`),
  CONSTRAINT `fk_return_refunds_return` FOREIGN KEY (`return_id`) REFERENCES `Logistics`.`returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반품 환불';

CREATE TABLE `Logistics`.`suppliers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '공급사 코드',
  `name` VARCHAR(255) NOT NULL COMMENT '공급사명',
  `country` CHAR(2) NOT NULL DEFAULT 'KR' COMMENT '국가 코드',
  `payment_terms` VARCHAR(50) NULL COMMENT '결제 조건',
  `lead_time_days` INT UNSIGNED NULL COMMENT '리드 타임(일)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_suppliers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공급사';

CREATE TABLE `Logistics`.`supplier_contacts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '공급사 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '담당자명',
  `email` VARCHAR(255) NULL COMMENT '이메일',
  `phone` VARCHAR(30) NULL COMMENT '전화번호',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '주 담당자 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_supplier_contacts_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_supplier_contacts_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `Logistics`.`suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공급사 담당자';

CREATE TABLE `Logistics`.`supplier_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '공급사 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `supplier_sku` VARCHAR(100) NULL COMMENT '공급사 SKU',
  `unit_cost` DECIMAL(12,2) NOT NULL COMMENT '단위 원가',
  `min_order_qty` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '최소 주문 수량',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_supplier_products_sup_prod` (`supplier_id`, `product_id`),
  CONSTRAINT `fk_supplier_products_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `Logistics`.`suppliers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_supplier_products_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공급사 상품';

CREATE TABLE `Logistics`.`purchase_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '공급사 ID',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '입고 창고 ID',
  `po_number` VARCHAR(50) NOT NULL COMMENT '발주 번호',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태',
  `total_amount` DECIMAL(12,2) NOT NULL COMMENT '총액',
  `expected_date` DATE NULL COMMENT '예상 입고일',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_purchase_orders_po_number` (`po_number`),
  INDEX `idx_purchase_orders_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_purchase_orders_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `Logistics`.`suppliers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_orders_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `Logistics`.`warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='발주';

CREATE TABLE `Logistics`.`purchase_order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `po_id` BIGINT UNSIGNED NOT NULL COMMENT '발주 ID',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '상품 ID',
  `quantity` INT UNSIGNED NOT NULL COMMENT '수량',
  `unit_cost` DECIMAL(12,2) NOT NULL COMMENT '단위 원가',
  `subtotal` DECIMAL(12,2) NOT NULL COMMENT '소계',
  PRIMARY KEY (`id`),
  INDEX `idx_po_items_po_id` (`po_id`),
  CONSTRAINT `fk_po_items_po` FOREIGN KEY (`po_id`) REFERENCES `Logistics`.`purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_po_items_product` FOREIGN KEY (`product_id`) REFERENCES `Catalog`.`products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='발주 항목';

-- ============================================================
-- Schema: Support (Domain 5: 고객 서비스) - 30 tables
-- ============================================================

CREATE TABLE `Support`.`ticket_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  `parent_id` INT UNSIGNED NULL COMMENT '상위 카테고리 ID',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ticket_cats_parent` FOREIGN KEY (`parent_id`) REFERENCES `Support`.`ticket_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='티켓 카테고리';

CREATE TABLE `Support`.`agent_teams` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '팀명',
  `description` TEXT NULL COMMENT '설명',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상담원 팀';

CREATE TABLE `Support`.`agents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `team_id` INT UNSIGNED NULL COMMENT '팀 ID',
  `display_name` VARCHAR(100) NOT NULL COMMENT '표시 이름',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agents_user_id` (`user_id`),
  CONSTRAINT `fk_agents_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_agents_team` FOREIGN KEY (`team_id`) REFERENCES `Support`.`agent_teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상담원';

CREATE TABLE `Support`.`team_members` (
  `team_id` INT UNSIGNED NOT NULL COMMENT '팀 ID',
  `agent_id` BIGINT UNSIGNED NOT NULL COMMENT '상담원 ID',
  `role` VARCHAR(20) NOT NULL DEFAULT 'member' COMMENT '역할(lead/member)',
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '합류일시',
  PRIMARY KEY (`team_id`, `agent_id`),
  CONSTRAINT `fk_team_members_team` FOREIGN KEY (`team_id`) REFERENCES `Support`.`agent_teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_members_agent` FOREIGN KEY (`agent_id`) REFERENCES `Support`.`agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='팀 멤버';

CREATE TABLE `Support`.`sla_policies` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT 'SLA 정책명',
  `description` TEXT NULL COMMENT '설명',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SLA 정책';

CREATE TABLE `Support`.`sla_targets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `policy_id` INT UNSIGNED NOT NULL COMMENT 'SLA 정책 ID',
  `priority` VARCHAR(20) NOT NULL COMMENT '우선순위(low/medium/high/urgent)',
  `first_response_hours` INT UNSIGNED NOT NULL COMMENT '첫 응답 시간(시간)',
  `resolution_hours` INT UNSIGNED NOT NULL COMMENT '해결 시간(시간)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sla_targets_policy_priority` (`policy_id`, `priority`),
  CONSTRAINT `fk_sla_targets_policy` FOREIGN KEY (`policy_id`) REFERENCES `Support`.`sla_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SLA 목표';

CREATE TABLE `Support`.`tickets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '요청자 ID',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `agent_id` BIGINT UNSIGNED NULL COMMENT '담당 상담원 ID',
  `team_id` INT UNSIGNED NULL COMMENT '담당 팀 ID',
  `sla_policy_id` INT UNSIGNED NULL COMMENT 'SLA 정책 ID',
  `subject` VARCHAR(255) NOT NULL COMMENT '제목',
  `status` VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT '상태(open/pending/resolved/closed)',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'medium' COMMENT '우선순위',
  `channel` VARCHAR(20) NOT NULL DEFAULT 'web' COMMENT '채널(web/email/chat/phone)',
  `first_responded_at` DATETIME NULL COMMENT '첫 응답일시',
  `resolved_at` DATETIME NULL COMMENT '해결일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_tickets_user_id` (`user_id`),
  INDEX `idx_tickets_agent_id` (`agent_id`),
  INDEX `idx_tickets_status` (`status`),
  CONSTRAINT `fk_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_category` FOREIGN KEY (`category_id`) REFERENCES `Support`.`ticket_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_agent` FOREIGN KEY (`agent_id`) REFERENCES `Support`.`agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tickets_team` FOREIGN KEY (`team_id`) REFERENCES `Support`.`agent_teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지원 티켓';

CREATE TABLE `Support`.`ticket_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `ticket_id` BIGINT UNSIGNED NOT NULL COMMENT '티켓 ID',
  `sender_id` BIGINT UNSIGNED NOT NULL COMMENT '발신자 ID',
  `body` TEXT NOT NULL COMMENT '내용',
  `is_internal` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '내부 메모 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_ticket_messages_ticket_id` (`ticket_id`),
  CONSTRAINT `fk_ticket_messages_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `Support`.`tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='티켓 메시지';

CREATE TABLE `Support`.`ticket_attachments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `message_id` BIGINT UNSIGNED NOT NULL COMMENT '메시지 ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '파일명',
  `file_url` VARCHAR(500) NOT NULL COMMENT '파일 URL',
  `file_size` INT UNSIGNED NOT NULL COMMENT '파일 크기(bytes)',
  `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME 타입',
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '업로드일시',
  PRIMARY KEY (`id`),
  INDEX `idx_ticket_attachments_message_id` (`message_id`),
  CONSTRAINT `fk_ticket_attachments_message` FOREIGN KEY (`message_id`) REFERENCES `Support`.`ticket_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='티켓 첨부파일';

CREATE TABLE `Support`.`ticket_tags` (
  `ticket_id` BIGINT UNSIGNED NOT NULL COMMENT '티켓 ID',
  `tag` VARCHAR(50) NOT NULL COMMENT '태그',
  PRIMARY KEY (`ticket_id`, `tag`),
  CONSTRAINT `fk_ticket_tags_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `Support`.`tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='티켓 태그';

CREATE TABLE `Support`.`ticket_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `ticket_id` BIGINT UNSIGNED NOT NULL COMMENT '티켓 ID',
  `agent_id` BIGINT UNSIGNED NOT NULL COMMENT '상담원 ID',
  `assigned_by` BIGINT UNSIGNED NULL COMMENT '배정자 ID',
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '배정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_ticket_assignments_ticket_id` (`ticket_id`),
  CONSTRAINT `fk_ticket_assignments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `Support`.`tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_assignments_agent` FOREIGN KEY (`agent_id`) REFERENCES `Support`.`agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='티켓 배정 이력';

CREATE TABLE `Support`.`canned_response_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='캔드 응답 카테고리';

CREATE TABLE `Support`.`canned_responses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `body` TEXT NOT NULL COMMENT '내용',
  `shortcut` VARCHAR(50) NULL COMMENT '단축키',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_canned_responses_shortcut` (`shortcut`),
  CONSTRAINT `fk_canned_responses_category` FOREIGN KEY (`category_id`) REFERENCES `Support`.`canned_response_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='캔드 응답';

CREATE TABLE `Support`.`knowledge_base_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `parent_id` INT UNSIGNED NULL COMMENT '상위 카테고리 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  `slug` VARCHAR(100) NOT NULL COMMENT '슬러그',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kb_categories_slug` (`slug`),
  CONSTRAINT `fk_kb_cats_parent` FOREIGN KEY (`parent_id`) REFERENCES `Support`.`knowledge_base_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지식베이스 카테고리';

CREATE TABLE `Support`.`knowledge_base_articles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `author_id` BIGINT UNSIGNED NOT NULL COMMENT '작성자 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `slug` VARCHAR(255) NOT NULL COMMENT '슬러그',
  `body` LONGTEXT NOT NULL COMMENT '내용',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/published/archived)',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '조회수',
  `helpful_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '도움됨 수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kb_articles_slug` (`slug`),
  INDEX `idx_kb_articles_category_id` (`category_id`),
  CONSTRAINT `fk_kb_articles_category` FOREIGN KEY (`category_id`) REFERENCES `Support`.`knowledge_base_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kb_articles_author` FOREIGN KEY (`author_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지식베이스 문서';

CREATE TABLE `Support`.`article_feedback` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT '문서 ID',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `is_helpful` TINYINT(1) NOT NULL COMMENT '도움됨 여부',
  `comment` TEXT NULL COMMENT '코멘트',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_article_feedback_article_id` (`article_id`),
  CONSTRAINT `fk_article_feedback_article` FOREIGN KEY (`article_id`) REFERENCES `Support`.`knowledge_base_articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_article_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지식베이스 피드백';

CREATE TABLE `Support`.`live_chats` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `agent_id` BIGINT UNSIGNED NULL COMMENT '상담원 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'waiting' COMMENT '상태(waiting/active/ended)',
  `started_at` DATETIME NULL COMMENT '시작일시',
  `ended_at` DATETIME NULL COMMENT '종료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_live_chats_user_id` (`user_id`),
  CONSTRAINT `fk_live_chats_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_live_chats_agent` FOREIGN KEY (`agent_id`) REFERENCES `Support`.`agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='라이브 채팅';

CREATE TABLE `Support`.`live_chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `chat_id` BIGINT UNSIGNED NOT NULL COMMENT '채팅 ID',
  `sender_id` BIGINT UNSIGNED NOT NULL COMMENT '발신자 ID',
  `body` TEXT NOT NULL COMMENT '메시지 내용',
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발송일시',
  PRIMARY KEY (`id`),
  INDEX `idx_live_chat_messages_chat_id` (`chat_id`),
  CONSTRAINT `fk_live_chat_messages_chat` FOREIGN KEY (`chat_id`) REFERENCES `Support`.`live_chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_live_chat_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅 메시지';

CREATE TABLE `Support`.`chat_ratings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `chat_id` BIGINT UNSIGNED NOT NULL COMMENT '채팅 ID',
  `rating` TINYINT UNSIGNED NOT NULL COMMENT '평점(1-5)',
  `comment` TEXT NULL COMMENT '코멘트',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '평가일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_ratings_chat_id` (`chat_id`),
  CONSTRAINT `fk_chat_ratings_chat` FOREIGN KEY (`chat_id`) REFERENCES `Support`.`live_chats` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅 평가';

CREATE TABLE `Support`.`escalation_rules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '에스컬레이션 규칙명',
  `condition_type` VARCHAR(30) NOT NULL COMMENT '조건 유형',
  `condition_value` JSON NOT NULL COMMENT '조건 값',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='에스컬레이션 규칙';

CREATE TABLE `Support`.`escalation_actions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `rule_id` INT UNSIGNED NOT NULL COMMENT '규칙 ID',
  `action_type` VARCHAR(30) NOT NULL COMMENT '액션 유형(assign/notify/change_priority)',
  `action_value` JSON NOT NULL COMMENT '액션 값',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '실행 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_escalation_actions_rule_id` (`rule_id`),
  CONSTRAINT `fk_escalation_actions_rule` FOREIGN KEY (`rule_id`) REFERENCES `Support`.`escalation_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='에스컬레이션 액션';

CREATE TABLE `Support`.`customer_feedbacks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(general/bug/feature/complaint)',
  `subject` VARCHAR(255) NOT NULL COMMENT '제목',
  `body` TEXT NOT NULL COMMENT '내용',
  `rating` TINYINT UNSIGNED NULL COMMENT '평점(1-5)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT '상태',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_customer_feedbacks_user_id` (`user_id`),
  CONSTRAINT `fk_customer_feedbacks_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 피드백';

CREATE TABLE `Support`.`feedback_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `feedback_id` BIGINT UNSIGNED NOT NULL COMMENT '피드백 ID',
  `category` VARCHAR(50) NOT NULL COMMENT '카테고리',
  PRIMARY KEY (`id`),
  INDEX `idx_feedback_categories_feedback_id` (`feedback_id`),
  CONSTRAINT `fk_feedback_categories_feedback` FOREIGN KEY (`feedback_id`) REFERENCES `Support`.`customer_feedbacks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='피드백 카테고리';

CREATE TABLE `Support`.`survey_templates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '설문 템플릿명',
  `trigger_event` VARCHAR(50) NOT NULL COMMENT '트리거 이벤트',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='설문 템플릿';

CREATE TABLE `Support`.`survey_questions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `template_id` INT UNSIGNED NOT NULL COMMENT '설문 템플릿 ID',
  `question` TEXT NOT NULL COMMENT '질문',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(rating/text/choice)',
  `options` JSON NULL COMMENT '선택지',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_survey_questions_template_id` (`template_id`),
  CONSTRAINT `fk_survey_questions_template` FOREIGN KEY (`template_id`) REFERENCES `Support`.`survey_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='설문 질문';

CREATE TABLE `Support`.`survey_responses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `template_id` INT UNSIGNED NOT NULL COMMENT '설문 템플릿 ID',
  `user_id` BIGINT UNSIGNED NULL COMMENT '응답자 ID',
  `reference_type` VARCHAR(50) NULL COMMENT '참조 유형(ticket/order)',
  `reference_id` BIGINT UNSIGNED NULL COMMENT '참조 ID',
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '제출일시',
  PRIMARY KEY (`id`),
  INDEX `idx_survey_responses_template_id` (`template_id`),
  CONSTRAINT `fk_survey_responses_template` FOREIGN KEY (`template_id`) REFERENCES `Support`.`survey_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_survey_responses_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='설문 응답';

CREATE TABLE `Support`.`survey_response_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `response_id` BIGINT UNSIGNED NOT NULL COMMENT '응답 ID',
  `question_id` INT UNSIGNED NOT NULL COMMENT '질문 ID',
  `answer` TEXT NOT NULL COMMENT '답변',
  PRIMARY KEY (`id`),
  INDEX `idx_survey_response_items_response_id` (`response_id`),
  CONSTRAINT `fk_survey_response_items_response` FOREIGN KEY (`response_id`) REFERENCES `Support`.`survey_responses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_survey_response_items_question` FOREIGN KEY (`question_id`) REFERENCES `Support`.`survey_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='설문 응답 항목';

CREATE TABLE `Support`.`macros` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '매크로명',
  `description` TEXT NULL COMMENT '설명',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='매크로';

CREATE TABLE `Support`.`macro_actions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `macro_id` INT UNSIGNED NOT NULL COMMENT '매크로 ID',
  `action_type` VARCHAR(30) NOT NULL COMMENT '액션 유형',
  `action_value` JSON NOT NULL COMMENT '액션 값',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '실행 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_macro_actions_macro_id` (`macro_id`),
  CONSTRAINT `fk_macro_actions_macro` FOREIGN KEY (`macro_id`) REFERENCES `Support`.`macros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='매크로 액션';

CREATE TABLE `Support`.`automation_rules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '자동화 규칙명',
  `trigger_event` VARCHAR(50) NOT NULL COMMENT '트리거 이벤트',
  `conditions` JSON NOT NULL COMMENT '조건 목록',
  `actions` JSON NOT NULL COMMENT '액션 목록',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='자동화 규칙';

-- ============================================================
-- Schema: Marketing (Domain 6: 마케팅/프로모션) - 30 tables
-- ============================================================

CREATE TABLE `Marketing`.`customer_segments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '세그먼트명',
  `description` TEXT NULL COMMENT '설명',
  `type` VARCHAR(20) NOT NULL DEFAULT 'dynamic' COMMENT '유형(dynamic/static)',
  `member_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '멤버 수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 세그먼트';

CREATE TABLE `Marketing`.`segment_conditions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `segment_id` INT UNSIGNED NOT NULL COMMENT '세그먼트 ID',
  `field` VARCHAR(100) NOT NULL COMMENT '조건 필드',
  `operator` VARCHAR(20) NOT NULL COMMENT '연산자(eq/gt/lt/in/contains)',
  `value` JSON NOT NULL COMMENT '조건 값',
  `logic` VARCHAR(5) NOT NULL DEFAULT 'AND' COMMENT '논리(AND/OR)',
  PRIMARY KEY (`id`),
  INDEX `idx_segment_conditions_segment_id` (`segment_id`),
  CONSTRAINT `fk_segment_conditions_segment` FOREIGN KEY (`segment_id`) REFERENCES `Marketing`.`customer_segments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='세그먼트 조건';

CREATE TABLE `Marketing`.`campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '캠페인명',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(email/sms/push/display)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/active/paused/ended)',
  `budget` DECIMAL(12,2) NULL COMMENT '예산',
  `spent` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '지출액',
  `starts_at` DATETIME NULL COMMENT '시작일시',
  `ends_at` DATETIME NULL COMMENT '종료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_campaigns_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='캠페인';

CREATE TABLE `Marketing`.`campaign_segments` (
  `campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '캠페인 ID',
  `segment_id` INT UNSIGNED NOT NULL COMMENT '세그먼트 ID',
  PRIMARY KEY (`campaign_id`, `segment_id`),
  CONSTRAINT `fk_campaign_segments_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_campaign_segments_segment` FOREIGN KEY (`segment_id`) REFERENCES `Marketing`.`customer_segments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='캠페인-세그먼트 매핑';

CREATE TABLE `Marketing`.`email_templates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '템플릿명',
  `subject` VARCHAR(255) NOT NULL COMMENT '제목',
  `html_body` LONGTEXT NOT NULL COMMENT 'HTML 내용',
  `text_body` TEXT NULL COMMENT '텍스트 내용',
  `variables` JSON NULL COMMENT '변수 목록',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='이메일 템플릿';

CREATE TABLE `Marketing`.`email_campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '캠페인 ID',
  `template_id` INT UNSIGNED NOT NULL COMMENT '이메일 템플릿 ID',
  `from_name` VARCHAR(100) NOT NULL COMMENT '발신자명',
  `from_email` VARCHAR(255) NOT NULL COMMENT '발신 이메일',
  `scheduled_at` DATETIME NULL COMMENT '발송 예약일시',
  `sent_at` DATETIME NULL COMMENT '발송일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_campaigns_campaign_id` (`campaign_id`),
  CONSTRAINT `fk_email_campaigns_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_campaigns_template` FOREIGN KEY (`template_id`) REFERENCES `Marketing`.`email_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='이메일 캠페인';

CREATE TABLE `Marketing`.`email_sends` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `email_campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '이메일 캠페인 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '수신자 ID',
  `email` VARCHAR(255) NOT NULL COMMENT '수신 이메일',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태(pending/sent/bounced/failed)',
  `sent_at` DATETIME NULL COMMENT '발송일시',
  PRIMARY KEY (`id`),
  INDEX `idx_email_sends_campaign_id` (`email_campaign_id`),
  INDEX `idx_email_sends_user_id` (`user_id`),
  CONSTRAINT `fk_email_sends_campaign` FOREIGN KEY (`email_campaign_id`) REFERENCES `Marketing`.`email_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_sends_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='이메일 발송';

CREATE TABLE `Marketing`.`email_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `send_id` BIGINT UNSIGNED NOT NULL COMMENT '발송 ID',
  `event_type` VARCHAR(30) NOT NULL COMMENT '이벤트(open/click/unsubscribe/spam)',
  `occurred_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발생일시',
  `metadata` JSON NULL COMMENT '메타데이터',
  PRIMARY KEY (`id`),
  INDEX `idx_email_events_send_id` (`send_id`),
  CONSTRAINT `fk_email_events_send` FOREIGN KEY (`send_id`) REFERENCES `Marketing`.`email_sends` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='이메일 이벤트';

CREATE TABLE `Marketing`.`sms_templates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '템플릿명',
  `body` TEXT NOT NULL COMMENT '내용',
  `variables` JSON NULL COMMENT '변수 목록',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SMS 템플릿';

CREATE TABLE `Marketing`.`sms_campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '캠페인 ID',
  `template_id` INT UNSIGNED NOT NULL COMMENT 'SMS 템플릿 ID',
  `sender_number` VARCHAR(20) NOT NULL COMMENT '발신 번호',
  `scheduled_at` DATETIME NULL COMMENT '발송 예약일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sms_campaigns_campaign_id` (`campaign_id`),
  CONSTRAINT `fk_sms_campaigns_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sms_campaigns_template` FOREIGN KEY (`template_id`) REFERENCES `Marketing`.`sms_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SMS 캠페인';

CREATE TABLE `Marketing`.`sms_sends` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `sms_campaign_id` BIGINT UNSIGNED NOT NULL COMMENT 'SMS 캠페인 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '수신자 ID',
  `phone` VARCHAR(30) NOT NULL COMMENT '수신 번호',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `sent_at` DATETIME NULL COMMENT '발송일시',
  PRIMARY KEY (`id`),
  INDEX `idx_sms_sends_campaign_id` (`sms_campaign_id`),
  CONSTRAINT `fk_sms_sends_campaign` FOREIGN KEY (`sms_campaign_id`) REFERENCES `Marketing`.`sms_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sms_sends_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SMS 발송';

CREATE TABLE `Marketing`.`push_templates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '템플릿명',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `body` TEXT NOT NULL COMMENT '내용',
  `image_url` VARCHAR(500) NULL COMMENT '이미지 URL',
  `click_action` VARCHAR(500) NULL COMMENT '클릭 액션 URL',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='푸시 알림 템플릿';

CREATE TABLE `Marketing`.`push_campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '캠페인 ID',
  `template_id` INT UNSIGNED NOT NULL COMMENT '푸시 템플릿 ID',
  `scheduled_at` DATETIME NULL COMMENT '발송 예약일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_push_campaigns_campaign_id` (`campaign_id`),
  CONSTRAINT `fk_push_campaigns_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_push_campaigns_template` FOREIGN KEY (`template_id`) REFERENCES `Marketing`.`push_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='푸시 캠페인';

CREATE TABLE `Marketing`.`push_sends` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `push_campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '푸시 캠페인 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '수신자 ID',
  `device_id` BIGINT UNSIGNED NULL COMMENT '디바이스 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `sent_at` DATETIME NULL COMMENT '발송일시',
  PRIMARY KEY (`id`),
  INDEX `idx_push_sends_campaign_id` (`push_campaign_id`),
  CONSTRAINT `fk_push_sends_campaign` FOREIGN KEY (`push_campaign_id`) REFERENCES `Marketing`.`push_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_push_sends_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_push_sends_device` FOREIGN KEY (`device_id`) REFERENCES `Auth`.`user_devices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='푸시 발송';

CREATE TABLE `Marketing`.`ab_tests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '캠페인 ID',
  `name` VARCHAR(255) NOT NULL COMMENT '테스트명',
  `metric` VARCHAR(50) NOT NULL COMMENT '측정 지표(open_rate/click_rate/conversion)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'running' COMMENT '상태',
  `winner_variant_id` INT UNSIGNED NULL COMMENT '승리 변형 ID',
  `started_at` DATETIME NULL COMMENT '시작일시',
  `ended_at` DATETIME NULL COMMENT '종료일시',
  PRIMARY KEY (`id`),
  INDEX `idx_ab_tests_campaign_id` (`campaign_id`),
  CONSTRAINT `fk_ab_tests_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='A/B 테스트';

CREATE TABLE `Marketing`.`ab_test_variants` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `test_id` INT UNSIGNED NOT NULL COMMENT 'A/B 테스트 ID',
  `name` VARCHAR(50) NOT NULL COMMENT '변형명',
  `traffic_pct` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT '트래픽 비율(%)',
  `config` JSON NOT NULL COMMENT '변형 설정',
  PRIMARY KEY (`id`),
  INDEX `idx_ab_test_variants_test_id` (`test_id`),
  CONSTRAINT `fk_ab_test_variants_test` FOREIGN KEY (`test_id`) REFERENCES `Marketing`.`ab_tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='A/B 테스트 변형';

CREATE TABLE `Marketing`.`ab_test_participants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `variant_id` INT UNSIGNED NOT NULL COMMENT '변형 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '참여자 ID',
  `converted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '전환 여부',
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '배정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ab_test_part_variant_user` (`variant_id`, `user_id`),
  CONSTRAINT `fk_ab_test_part_variant` FOREIGN KEY (`variant_id`) REFERENCES `Marketing`.`ab_test_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ab_test_part_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='A/B 테스트 참여자';

CREATE TABLE `Marketing`.`referral_programs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '추천 프로그램명',
  `referrer_reward_type` VARCHAR(20) NOT NULL COMMENT '추천인 보상 유형',
  `referrer_reward_value` DECIMAL(10,2) NOT NULL COMMENT '추천인 보상 값',
  `referee_reward_type` VARCHAR(20) NOT NULL COMMENT '피추천인 보상 유형',
  `referee_reward_value` DECIMAL(10,2) NOT NULL COMMENT '피추천인 보상 값',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='추천 프로그램';

CREATE TABLE `Marketing`.`referral_codes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `program_id` INT UNSIGNED NOT NULL COMMENT '추천 프로그램 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `code` VARCHAR(30) NOT NULL COMMENT '추천 코드',
  `usage_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '사용 횟수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_referral_codes_code` (`code`),
  INDEX `idx_referral_codes_user_id` (`user_id`),
  CONSTRAINT `fk_referral_codes_program` FOREIGN KEY (`program_id`) REFERENCES `Marketing`.`referral_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_codes_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='추천 코드';

CREATE TABLE `Marketing`.`referral_conversions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `referral_code_id` BIGINT UNSIGNED NOT NULL COMMENT '추천 코드 ID',
  `referred_user_id` BIGINT UNSIGNED NOT NULL COMMENT '피추천 사용자 ID',
  `order_id` BIGINT UNSIGNED NULL COMMENT '주문 ID',
  `converted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '전환일시',
  PRIMARY KEY (`id`),
  INDEX `idx_referral_conversions_code_id` (`referral_code_id`),
  CONSTRAINT `fk_referral_conversions_code` FOREIGN KEY (`referral_code_id`) REFERENCES `Marketing`.`referral_codes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_conversions_user` FOREIGN KEY (`referred_user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_conversions_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='추천 전환';

CREATE TABLE `Marketing`.`affiliate_programs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '제휴 프로그램명',
  `commission_type` VARCHAR(20) NOT NULL COMMENT '수수료 유형(percent/fixed)',
  `commission_value` DECIMAL(10,2) NOT NULL COMMENT '수수료 값',
  `cookie_days` INT UNSIGNED NOT NULL DEFAULT 30 COMMENT '쿠키 유효 기간(일)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제휴 프로그램';

CREATE TABLE `Marketing`.`affiliates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `program_id` INT UNSIGNED NOT NULL COMMENT '제휴 프로그램 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `affiliate_code` VARCHAR(30) NOT NULL COMMENT '제휴 코드',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태(pending/active/suspended)',
  `total_earnings` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '총 수익',
  `paid_earnings` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '지급된 수익',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_affiliates_code` (`affiliate_code`),
  CONSTRAINT `fk_affiliates_program` FOREIGN KEY (`program_id`) REFERENCES `Marketing`.`affiliate_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_affiliates_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제휴사';

CREATE TABLE `Marketing`.`affiliate_conversions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `affiliate_id` BIGINT UNSIGNED NOT NULL COMMENT '제휴사 ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '주문 ID',
  `commission_amount` DECIMAL(12,2) NOT NULL COMMENT '수수료 금액',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태(pending/approved/paid)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_affiliate_conversions_affiliate_id` (`affiliate_id`),
  CONSTRAINT `fk_affiliate_conversions_affiliate` FOREIGN KEY (`affiliate_id`) REFERENCES `Marketing`.`affiliates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_affiliate_conversions_order` FOREIGN KEY (`order_id`) REFERENCES `Order`.`orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제휴 전환';

CREATE TABLE `Marketing`.`utm_trackings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `session_id` VARCHAR(128) NULL COMMENT '세션 ID',
  `utm_source` VARCHAR(100) NULL COMMENT 'UTM 소스',
  `utm_medium` VARCHAR(100) NULL COMMENT 'UTM 매체',
  `utm_campaign` VARCHAR(100) NULL COMMENT 'UTM 캠페인',
  `utm_term` VARCHAR(100) NULL COMMENT 'UTM 검색어',
  `utm_content` VARCHAR(100) NULL COMMENT 'UTM 콘텐츠',
  `landing_url` VARCHAR(1000) NULL COMMENT '랜딩 URL',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '방문일시',
  PRIMARY KEY (`id`),
  INDEX `idx_utm_trackings_user_id` (`user_id`),
  INDEX `idx_utm_trackings_utm_campaign` (`utm_campaign`),
  CONSTRAINT `fk_utm_trackings_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='UTM 트래킹';

CREATE TABLE `Marketing`.`conversion_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `event_type` VARCHAR(50) NOT NULL COMMENT '이벤트 유형(signup/purchase/subscribe)',
  `campaign_id` BIGINT UNSIGNED NULL COMMENT '캠페인 ID',
  `utm_tracking_id` BIGINT UNSIGNED NULL COMMENT 'UTM 추적 ID',
  `value` DECIMAL(12,2) NULL COMMENT '전환 가치',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발생일시',
  PRIMARY KEY (`id`),
  INDEX `idx_conversion_events_user_id` (`user_id`),
  INDEX `idx_conversion_events_campaign_id` (`campaign_id`),
  CONSTRAINT `fk_conversion_events_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_conversion_events_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='전환 이벤트';

CREATE TABLE `Marketing`.`landing_pages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `campaign_id` BIGINT UNSIGNED NULL COMMENT '캠페인 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '페이지명',
  `slug` VARCHAR(100) NOT NULL COMMENT 'URL 슬러그',
  `html_content` LONGTEXT NULL COMMENT 'HTML 내용',
  `is_published` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '발행 여부',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '조회수',
  `conversion_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '전환 수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_landing_pages_slug` (`slug`),
  CONSTRAINT `fk_landing_pages_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='랜딩 페이지';

CREATE TABLE `Marketing`.`landing_page_variants` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `landing_page_id` INT UNSIGNED NOT NULL COMMENT '랜딩 페이지 ID',
  `name` VARCHAR(50) NOT NULL COMMENT '변형명',
  `html_content` LONGTEXT NULL COMMENT 'HTML 내용',
  `traffic_pct` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT '트래픽 비율(%)',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '조회수',
  `conversion_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '전환 수',
  PRIMARY KEY (`id`),
  INDEX `idx_lp_variants_page_id` (`landing_page_id`),
  CONSTRAINT `fk_lp_variants_page` FOREIGN KEY (`landing_page_id`) REFERENCES `Marketing`.`landing_pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='랜딩 페이지 A/B 변형';

CREATE TABLE `Marketing`.`marketing_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '이벤트명',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(flash_sale/seasonal/holiday)',
  `starts_at` DATETIME NOT NULL COMMENT '시작일시',
  `ends_at` DATETIME NOT NULL COMMENT '종료일시',
  `discount_type` VARCHAR(20) NOT NULL COMMENT '할인 유형(percent/fixed)',
  `discount_value` DECIMAL(10,2) NOT NULL COMMENT '할인 값',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='마케팅 이벤트';

CREATE TABLE `Marketing`.`marketing_goals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `campaign_id` BIGINT UNSIGNED NOT NULL COMMENT '캠페인 ID',
  `metric` VARCHAR(50) NOT NULL COMMENT '지표(impressions/clicks/conversions/revenue)',
  `target_value` DECIMAL(14,2) NOT NULL COMMENT '목표 값',
  `current_value` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '현재 값',
  PRIMARY KEY (`id`),
  INDEX `idx_marketing_goals_campaign_id` (`campaign_id`),
  CONSTRAINT `fk_marketing_goals_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `Marketing`.`campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='캠페인 목표';

CREATE TABLE `Marketing`.`attribution_models` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '어트리뷰션 모델명',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(last_click/first_click/linear/time_decay)',
  `config` JSON NULL COMMENT '모델 설정',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '기본 모델 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='어트리뷰션 모델';

-- ============================================================
-- Schema: Content (Domain 7: 컨텐츠/미디어) - 30 tables
-- ============================================================

CREATE TABLE `Content`.`article_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `parent_id` INT UNSIGNED NULL COMMENT '상위 카테고리 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  `slug` VARCHAR(100) NOT NULL COMMENT '슬러그',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_article_categories_slug` (`slug`),
  CONSTRAINT `fk_article_cats_parent` FOREIGN KEY (`parent_id`) REFERENCES `Content`.`article_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='아티클 카테고리';

CREATE TABLE `Content`.`articles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `author_id` BIGINT UNSIGNED NOT NULL COMMENT '작성자 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `slug` VARCHAR(255) NOT NULL COMMENT '슬러그',
  `excerpt` TEXT NULL COMMENT '요약',
  `body` LONGTEXT NOT NULL COMMENT '내용',
  `cover_image_url` VARCHAR(500) NULL COMMENT '커버 이미지 URL',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/published/archived)',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '조회수',
  `published_at` DATETIME NULL COMMENT '발행일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_articles_slug` (`slug`),
  INDEX `idx_articles_category_id` (`category_id`),
  INDEX `idx_articles_author_id` (`author_id`),
  INDEX `idx_articles_status` (`status`),
  CONSTRAINT `fk_articles_category` FOREIGN KEY (`category_id`) REFERENCES `Content`.`article_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_articles_author` FOREIGN KEY (`author_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='아티클';

CREATE TABLE `Content`.`article_revisions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT '아티클 ID',
  `editor_id` BIGINT UNSIGNED NOT NULL COMMENT '편집자 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `body` LONGTEXT NOT NULL COMMENT '내용',
  `revision_note` VARCHAR(255) NULL COMMENT '수정 메모',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_article_revisions_article_id` (`article_id`),
  CONSTRAINT `fk_article_revisions_article` FOREIGN KEY (`article_id`) REFERENCES `Content`.`articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_article_revisions_editor` FOREIGN KEY (`editor_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='아티클 버전 이력';

CREATE TABLE `Content`.`article_tags` (
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT '아티클 ID',
  `tag` VARCHAR(50) NOT NULL COMMENT '태그',
  PRIMARY KEY (`article_id`, `tag`),
  CONSTRAINT `fk_article_tags_article` FOREIGN KEY (`article_id`) REFERENCES `Content`.`articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='아티클 태그';

CREATE TABLE `Content`.`article_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT '아티클 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '작성자 ID',
  `parent_id` BIGINT UNSIGNED NULL COMMENT '부모 댓글 ID',
  `body` TEXT NOT NULL COMMENT '내용',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '상태(1:게시,0:숨김)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_article_comments_article_id` (`article_id`),
  CONSTRAINT `fk_article_comments_article` FOREIGN KEY (`article_id`) REFERENCES `Content`.`articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_article_comments_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_article_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `Content`.`article_comments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='아티클 댓글';

CREATE TABLE `Content`.`comment_votes` (
  `comment_id` BIGINT UNSIGNED NOT NULL COMMENT '댓글 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `is_upvote` TINYINT(1) NOT NULL COMMENT '업보트 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '투표일시',
  PRIMARY KEY (`comment_id`, `user_id`),
  CONSTRAINT `fk_comment_votes_comment` FOREIGN KEY (`comment_id`) REFERENCES `Content`.`article_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_votes_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='댓글 투표';

CREATE TABLE `Content`.`media_folders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `parent_id` INT UNSIGNED NULL COMMENT '부모 폴더 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '폴더명',
  `path` VARCHAR(500) NOT NULL COMMENT '폴더 경로',
  `created_by` BIGINT UNSIGNED NULL COMMENT '생성자 ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_media_folders_path` (`path`),
  CONSTRAINT `fk_media_folders_parent` FOREIGN KEY (`parent_id`) REFERENCES `Content`.`media_folders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_media_folders_creator` FOREIGN KEY (`created_by`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='미디어 폴더';

CREATE TABLE `Content`.`media_files` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `folder_id` INT UNSIGNED NULL COMMENT '폴더 ID',
  `uploader_id` BIGINT UNSIGNED NULL COMMENT '업로드자 ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '파일명',
  `original_name` VARCHAR(255) NOT NULL COMMENT '원본 파일명',
  `file_url` VARCHAR(500) NOT NULL COMMENT '파일 URL',
  `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME 타입',
  `file_size` BIGINT UNSIGNED NOT NULL COMMENT '파일 크기(bytes)',
  `width` INT UNSIGNED NULL COMMENT '이미지 너비(px)',
  `height` INT UNSIGNED NULL COMMENT '이미지 높이(px)',
  `alt_text` VARCHAR(255) NULL COMMENT '대체 텍스트',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_media_files_folder_id` (`folder_id`),
  CONSTRAINT `fk_media_files_folder` FOREIGN KEY (`folder_id`) REFERENCES `Content`.`media_folders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_media_files_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='미디어 파일';

CREATE TABLE `Content`.`media_tags` (
  `media_id` BIGINT UNSIGNED NOT NULL COMMENT '미디어 ID',
  `tag` VARCHAR(50) NOT NULL COMMENT '태그',
  PRIMARY KEY (`media_id`, `tag`),
  CONSTRAINT `fk_media_tags_media` FOREIGN KEY (`media_id`) REFERENCES `Content`.`media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='미디어 태그';

CREATE TABLE `Content`.`media_usages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `media_id` BIGINT UNSIGNED NOT NULL COMMENT '미디어 ID',
  `entity_type` VARCHAR(50) NOT NULL COMMENT '엔티티 유형',
  `entity_id` BIGINT UNSIGNED NOT NULL COMMENT '엔티티 ID',
  PRIMARY KEY (`id`),
  INDEX `idx_media_usages_media_id` (`media_id`),
  INDEX `idx_media_usages_entity` (`entity_type`, `entity_id`),
  CONSTRAINT `fk_media_usages_media` FOREIGN KEY (`media_id`) REFERENCES `Content`.`media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='미디어 사용 이력';

CREATE TABLE `Content`.`page_templates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '템플릿명',
  `code` VARCHAR(50) NOT NULL COMMENT '템플릿 코드',
  `description` TEXT NULL COMMENT '설명',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_page_templates_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='페이지 템플릿';

CREATE TABLE `Content`.`pages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `template_id` INT UNSIGNED NULL COMMENT '템플릿 ID',
  `author_id` BIGINT UNSIGNED NOT NULL COMMENT '작성자 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `slug` VARCHAR(255) NOT NULL COMMENT '슬러그',
  `meta_title` VARCHAR(255) NULL COMMENT 'SEO 제목',
  `meta_description` TEXT NULL COMMENT 'SEO 설명',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태',
  `published_at` DATETIME NULL COMMENT '발행일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pages_slug` (`slug`),
  CONSTRAINT `fk_pages_template` FOREIGN KEY (`template_id`) REFERENCES `Content`.`page_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pages_author` FOREIGN KEY (`author_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='페이지';

CREATE TABLE `Content`.`page_sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `page_id` BIGINT UNSIGNED NOT NULL COMMENT '페이지 ID',
  `section_type` VARCHAR(50) NOT NULL COMMENT '섹션 유형(text/image/banner/grid)',
  `content` JSON NOT NULL COMMENT '섹션 내용',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_page_sections_page_id` (`page_id`),
  CONSTRAINT `fk_page_sections_page` FOREIGN KEY (`page_id`) REFERENCES `Content`.`pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='페이지 섹션';

CREATE TABLE `Content`.`menus` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '메뉴명',
  `location` VARCHAR(50) NOT NULL COMMENT '위치(header/footer/sidebar)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_menus_location` (`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메뉴';

CREATE TABLE `Content`.`menu_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `menu_id` INT UNSIGNED NOT NULL COMMENT '메뉴 ID',
  `parent_id` BIGINT UNSIGNED NULL COMMENT '부모 항목 ID',
  `label` VARCHAR(100) NOT NULL COMMENT '레이블',
  `url` VARCHAR(500) NOT NULL COMMENT 'URL',
  `target` VARCHAR(10) NOT NULL DEFAULT '_self' COMMENT '링크 타깃',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_menu_items_menu_id` (`menu_id`),
  CONSTRAINT `fk_menu_items_menu` FOREIGN KEY (`menu_id`) REFERENCES `Content`.`menus` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_menu_items_parent` FOREIGN KEY (`parent_id`) REFERENCES `Content`.`menu_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메뉴 항목';

CREATE TABLE `Content`.`banner_groups` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(50) NOT NULL COMMENT '그룹 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '그룹명',
  `description` TEXT NULL COMMENT '설명',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_banner_groups_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배너 그룹';

CREATE TABLE `Content`.`banners` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `group_id` INT UNSIGNED NOT NULL COMMENT '그룹 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `image_url` VARCHAR(500) NOT NULL COMMENT '이미지 URL',
  `link_url` VARCHAR(500) NULL COMMENT '링크 URL',
  `alt_text` VARCHAR(255) NULL COMMENT '대체 텍스트',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  `starts_at` DATETIME NULL COMMENT '노출 시작일시',
  `ends_at` DATETIME NULL COMMENT '노출 종료일시',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_banners_group_id` (`group_id`),
  CONSTRAINT `fk_banners_group` FOREIGN KEY (`group_id`) REFERENCES `Content`.`banner_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배너';

CREATE TABLE `Content`.`sliders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '슬라이더명',
  `code` VARCHAR(50) NOT NULL COMMENT '슬라이더 코드',
  `auto_play` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '자동 재생 여부',
  `interval_ms` INT UNSIGNED NOT NULL DEFAULT 5000 COMMENT '전환 간격(ms)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sliders_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='슬라이더';

CREATE TABLE `Content`.`slider_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `slider_id` INT UNSIGNED NOT NULL COMMENT '슬라이더 ID',
  `title` VARCHAR(255) NULL COMMENT '제목',
  `image_url` VARCHAR(500) NOT NULL COMMENT '이미지 URL',
  `link_url` VARCHAR(500) NULL COMMENT '링크 URL',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_slider_items_slider_id` (`slider_id`),
  CONSTRAINT `fk_slider_items_slider` FOREIGN KEY (`slider_id`) REFERENCES `Content`.`sliders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='슬라이더 항목';

CREATE TABLE `Content`.`faq_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='FAQ 카테고리';

CREATE TABLE `Content`.`faqs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `question` TEXT NOT NULL COMMENT '질문',
  `answer` LONGTEXT NOT NULL COMMENT '답변',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '조회수',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_faqs_category_id` (`category_id`),
  CONSTRAINT `fk_faqs_category` FOREIGN KEY (`category_id`) REFERENCES `Content`.`faq_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='FAQ';

CREATE TABLE `Content`.`glossaries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '용어집명',
  `description` TEXT NULL COMMENT '설명',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='용어집';

CREATE TABLE `Content`.`glossary_terms` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `glossary_id` INT UNSIGNED NOT NULL COMMENT '용어집 ID',
  `term` VARCHAR(255) NOT NULL COMMENT '용어',
  `definition` TEXT NOT NULL COMMENT '정의',
  `slug` VARCHAR(255) NOT NULL COMMENT '슬러그',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_glossary_terms_glossary_slug` (`glossary_id`, `slug`),
  CONSTRAINT `fk_glossary_terms_glossary` FOREIGN KEY (`glossary_id`) REFERENCES `Content`.`glossaries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='용어';

CREATE TABLE `Content`.`feeds` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '피드명',
  `feed_type` VARCHAR(30) NOT NULL COMMENT '유형(rss/atom)',
  `source_url` VARCHAR(500) NOT NULL COMMENT '소스 URL',
  `last_fetched_at` DATETIME NULL COMMENT '마지막 수집일시',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='피드';

CREATE TABLE `Content`.`feed_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `feed_id` INT UNSIGNED NOT NULL COMMENT '피드 ID',
  `guid` VARCHAR(500) NOT NULL COMMENT '항목 GUID',
  `title` VARCHAR(500) NOT NULL COMMENT '제목',
  `url` VARCHAR(1000) NOT NULL COMMENT 'URL',
  `body` LONGTEXT NULL COMMENT '내용',
  `published_at` DATETIME NULL COMMENT '발행일시',
  `fetched_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수집일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feed_items_feed_guid` (`feed_id`, `guid`),
  CONSTRAINT `fk_feed_items_feed` FOREIGN KEY (`feed_id`) REFERENCES `Content`.`feeds` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='피드 항목';

CREATE TABLE `Content`.`webhooks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT 'Webhook명',
  `url` VARCHAR(500) NOT NULL COMMENT 'Webhook URL',
  `events` JSON NOT NULL COMMENT '구독 이벤트 목록',
  `secret` VARCHAR(255) NULL COMMENT '서명 시크릿',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Webhook';

CREATE TABLE `Content`.`webhook_deliveries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `webhook_id` BIGINT UNSIGNED NOT NULL COMMENT 'Webhook ID',
  `event_type` VARCHAR(50) NOT NULL COMMENT '이벤트 유형',
  `payload` JSON NOT NULL COMMENT '페이로드',
  `response_status` SMALLINT UNSIGNED NULL COMMENT 'HTTP 응답 코드',
  `response_body` TEXT NULL COMMENT '응답 내용',
  `attempt_count` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '시도 횟수',
  `delivered_at` DATETIME NULL COMMENT '전달 성공 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_webhook_deliveries_webhook_id` (`webhook_id`),
  CONSTRAINT `fk_webhook_deliveries_webhook` FOREIGN KEY (`webhook_id`) REFERENCES `Content`.`webhooks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Webhook 전달 이력';

CREATE TABLE `Content`.`file_transformations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `media_id` BIGINT UNSIGNED NOT NULL COMMENT '원본 미디어 ID',
  `transform_type` VARCHAR(30) NOT NULL COMMENT '변환 유형(thumbnail/resize/webp)',
  `width` INT UNSIGNED NULL COMMENT '너비(px)',
  `height` INT UNSIGNED NULL COMMENT '높이(px)',
  `file_url` VARCHAR(500) NOT NULL COMMENT '변환 파일 URL',
  `file_size` BIGINT UNSIGNED NOT NULL COMMENT '파일 크기(bytes)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_file_transforms_media_id` (`media_id`),
  CONSTRAINT `fk_file_transforms_media` FOREIGN KEY (`media_id`) REFERENCES `Content`.`media_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='파일 변환 이력';

-- ============================================================
-- Schema: HR (Domain 8: 조직/인사) - 30 tables
-- ============================================================

CREATE TABLE `HR`.`organizations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '조직명',
  `code` VARCHAR(30) NOT NULL COMMENT '조직 코드',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(company/subsidiary/branch)',
  `country` CHAR(2) NOT NULL DEFAULT 'KR' COMMENT '국가 코드',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul' COMMENT '타임존',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_organizations_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='조직';

CREATE TABLE `HR`.`departments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `org_id` INT UNSIGNED NOT NULL COMMENT '조직 ID',
  `parent_id` INT UNSIGNED NULL COMMENT '상위 부서 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '부서명',
  `code` VARCHAR(30) NOT NULL COMMENT '부서 코드',
  `head_employee_id` BIGINT UNSIGNED NULL COMMENT '부서장 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departments_org_code` (`org_id`, `code`),
  CONSTRAINT `fk_departments_org` FOREIGN KEY (`org_id`) REFERENCES `HR`.`organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_departments_parent` FOREIGN KEY (`parent_id`) REFERENCES `HR`.`departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부서';

CREATE TABLE `HR`.`employment_types` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(20) NOT NULL COMMENT '고용 유형 코드',
  `name` VARCHAR(50) NOT NULL COMMENT '고용 유형명',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employment_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고용 유형';

CREATE TABLE `HR`.`positions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `org_id` INT UNSIGNED NOT NULL COMMENT '조직 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '직위명',
  `level` TINYINT UNSIGNED NOT NULL COMMENT '직위 레벨',
  PRIMARY KEY (`id`),
  INDEX `idx_positions_org_id` (`org_id`),
  CONSTRAINT `fk_positions_org` FOREIGN KEY (`org_id`) REFERENCES `HR`.`organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직위';

CREATE TABLE `HR`.`employees` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '시스템 사용자 ID',
  `org_id` INT UNSIGNED NOT NULL COMMENT '조직 ID',
  `department_id` INT UNSIGNED NOT NULL COMMENT '부서 ID',
  `position_id` INT UNSIGNED NOT NULL COMMENT '직위 ID',
  `employment_type_id` INT UNSIGNED NOT NULL COMMENT '고용 유형 ID',
  `employee_number` VARCHAR(30) NOT NULL COMMENT '사원 번호',
  `full_name` VARCHAR(100) NOT NULL COMMENT '성명',
  `email` VARCHAR(255) NOT NULL COMMENT '이메일',
  `phone` VARCHAR(30) NULL COMMENT '전화번호',
  `hire_date` DATE NOT NULL COMMENT '입사일',
  `exit_date` DATE NULL COMMENT '퇴사일',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '상태(1:재직,0:휴직,2:퇴사)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employees_employee_number` (`employee_number`),
  UNIQUE KEY `uq_employees_email` (`email`),
  INDEX `idx_employees_org_id` (`org_id`),
  INDEX `idx_employees_department_id` (`department_id`),
  CONSTRAINT `fk_employees_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_employees_org` FOREIGN KEY (`org_id`) REFERENCES `HR`.`organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_employees_dept` FOREIGN KEY (`department_id`) REFERENCES `HR`.`departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_employees_position` FOREIGN KEY (`position_id`) REFERENCES `HR`.`positions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_employees_emp_type` FOREIGN KEY (`employment_type_id`) REFERENCES `HR`.`employment_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직원';

CREATE TABLE `HR`.`employee_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `doc_type` VARCHAR(50) NOT NULL COMMENT '문서 유형(resume/id_card/contract)',
  `file_name` VARCHAR(255) NOT NULL COMMENT '파일명',
  `file_url` VARCHAR(500) NOT NULL COMMENT '파일 URL',
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '업로드일시',
  PRIMARY KEY (`id`),
  INDEX `idx_employee_docs_employee_id` (`employee_id`),
  CONSTRAINT `fk_employee_docs_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직원 서류';

CREATE TABLE `HR`.`employee_contracts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `contract_type` VARCHAR(30) NOT NULL COMMENT '계약 유형',
  `start_date` DATE NOT NULL COMMENT '계약 시작일',
  `end_date` DATE NULL COMMENT '계약 종료일',
  `base_salary` DECIMAL(14,2) NOT NULL COMMENT '기본급',
  `file_url` VARCHAR(500) NULL COMMENT '계약서 파일 URL',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_employee_contracts_employee_id` (`employee_id`),
  CONSTRAINT `fk_employee_contracts_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='근로 계약';

CREATE TABLE `HR`.`work_schedules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '근무 일정명',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(fixed/flexible/shift)',
  `weekly_hours` DECIMAL(5,2) NOT NULL COMMENT '주간 근무시간',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='근무 일정';

CREATE TABLE `HR`.`schedule_shifts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `schedule_id` INT UNSIGNED NOT NULL COMMENT '근무 일정 ID',
  `day_of_week` TINYINT UNSIGNED NOT NULL COMMENT '요일(0:일~6:토)',
  `start_time` TIME NOT NULL COMMENT '시작 시간',
  `end_time` TIME NOT NULL COMMENT '종료 시간',
  `is_working` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '근무일 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_schedule_shifts_schedule_id` (`schedule_id`),
  CONSTRAINT `fk_schedule_shifts_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `HR`.`work_schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='근무 교대';

CREATE TABLE `HR`.`attendance_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `date` DATE NOT NULL COMMENT '날짜',
  `clock_in` DATETIME NULL COMMENT '출근 일시',
  `clock_out` DATETIME NULL COMMENT '퇴근 일시',
  `work_minutes` INT UNSIGNED NULL COMMENT '근무 시간(분)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'present' COMMENT '상태(present/absent/late/half)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_records_emp_date` (`employee_id`, `date`),
  CONSTRAINT `fk_attendance_records_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='출퇴근 기록';

CREATE TABLE `HR`.`leave_types` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(20) NOT NULL COMMENT '휴가 유형 코드',
  `name` VARCHAR(50) NOT NULL COMMENT '휴가 유형명',
  `is_paid` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '유급 여부',
  `max_days_per_year` INT UNSIGNED NULL COMMENT '연간 최대 일수',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='휴가 유형';

CREATE TABLE `HR`.`leave_balances` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `leave_type_id` INT UNSIGNED NOT NULL COMMENT '휴가 유형 ID',
  `year` YEAR NOT NULL COMMENT '연도',
  `total_days` DECIMAL(5,1) NOT NULL COMMENT '총 부여 일수',
  `used_days` DECIMAL(5,1) NOT NULL DEFAULT 0 COMMENT '사용 일수',
  `remaining_days` DECIMAL(5,1) NOT NULL COMMENT '잔여 일수',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave_balances_emp_type_year` (`employee_id`, `leave_type_id`, `year`),
  CONSTRAINT `fk_leave_balances_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_balances_type` FOREIGN KEY (`leave_type_id`) REFERENCES `HR`.`leave_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='휴가 잔여';

CREATE TABLE `HR`.`leave_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `leave_type_id` INT UNSIGNED NOT NULL COMMENT '휴가 유형 ID',
  `approver_id` BIGINT UNSIGNED NULL COMMENT '승인자 ID',
  `start_date` DATE NOT NULL COMMENT '시작일',
  `end_date` DATE NOT NULL COMMENT '종료일',
  `days_count` DECIMAL(5,1) NOT NULL COMMENT '일수',
  `reason` TEXT NULL COMMENT '사유',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태(pending/approved/rejected/canceled)',
  `approved_at` DATETIME NULL COMMENT '승인일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_leave_requests_employee_id` (`employee_id`),
  CONSTRAINT `fk_leave_requests_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_requests_type` FOREIGN KEY (`leave_type_id`) REFERENCES `HR`.`leave_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_requests_approver` FOREIGN KEY (`approver_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='휴가 신청';

CREATE TABLE `HR`.`salary_components` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '급여 항목 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '급여 항목명',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(base/allowance/deduction/bonus)',
  `is_taxable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '과세 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_salary_components_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='급여 항목';

CREATE TABLE `HR`.`salary_structures` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `component_id` INT UNSIGNED NOT NULL COMMENT '급여 항목 ID',
  `amount` DECIMAL(14,2) NOT NULL COMMENT '금액',
  `effective_date` DATE NOT NULL COMMENT '적용일',
  PRIMARY KEY (`id`),
  INDEX `idx_salary_structures_employee_id` (`employee_id`),
  CONSTRAINT `fk_salary_structures_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_salary_structures_component` FOREIGN KEY (`component_id`) REFERENCES `HR`.`salary_components` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='급여 구조';

CREATE TABLE `HR`.`payrolls` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `pay_period_start` DATE NOT NULL COMMENT '급여 기간 시작',
  `pay_period_end` DATE NOT NULL COMMENT '급여 기간 종료',
  `gross_salary` DECIMAL(14,2) NOT NULL COMMENT '총 급여',
  `total_deductions` DECIMAL(14,2) NOT NULL COMMENT '총 공제액',
  `net_salary` DECIMAL(14,2) NOT NULL COMMENT '실 수령액',
  `paid_at` DATETIME NULL COMMENT '지급일시',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/approved/paid)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_payrolls_employee_id` (`employee_id`),
  CONSTRAINT `fk_payrolls_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='급여 명세';

CREATE TABLE `HR`.`payroll_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `payroll_id` BIGINT UNSIGNED NOT NULL COMMENT '급여 명세 ID',
  `component_id` INT UNSIGNED NOT NULL COMMENT '급여 항목 ID',
  `amount` DECIMAL(14,2) NOT NULL COMMENT '금액',
  PRIMARY KEY (`id`),
  INDEX `idx_payroll_items_payroll_id` (`payroll_id`),
  CONSTRAINT `fk_payroll_items_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `HR`.`payrolls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_items_component` FOREIGN KEY (`component_id`) REFERENCES `HR`.`salary_components` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='급여 항목 명세';

CREATE TABLE `HR`.`performance_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `reviewer_id` BIGINT UNSIGNED NOT NULL COMMENT '평가자 ID',
  `review_period` VARCHAR(20) NOT NULL COMMENT '평가 기간(예: 2024-H1)',
  `overall_score` DECIMAL(4,2) NULL COMMENT '종합 점수',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_performance_reviews_employee_id` (`employee_id`),
  CONSTRAINT `fk_perf_reviews_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_perf_reviews_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='인사 평가';

CREATE TABLE `HR`.`review_goals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `review_id` BIGINT UNSIGNED NOT NULL COMMENT '평가 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '목표 제목',
  `description` TEXT NULL COMMENT '목표 설명',
  `target_value` VARCHAR(100) NULL COMMENT '목표 수치',
  `actual_value` VARCHAR(100) NULL COMMENT '실적 수치',
  `score` DECIMAL(4,2) NULL COMMENT '점수',
  PRIMARY KEY (`id`),
  INDEX `idx_review_goals_review_id` (`review_id`),
  CONSTRAINT `fk_review_goals_review` FOREIGN KEY (`review_id`) REFERENCES `HR`.`performance_reviews` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='평가 목표';

CREATE TABLE `HR`.`training_programs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '교육 프로그램명',
  `category` VARCHAR(50) NOT NULL COMMENT '카테고리',
  `description` TEXT NULL COMMENT '설명',
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '필수 교육 여부',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='교육 프로그램';

CREATE TABLE `HR`.`training_courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `program_id` INT UNSIGNED NOT NULL COMMENT '교육 프로그램 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '과정 제목',
  `duration_hours` DECIMAL(5,2) NOT NULL COMMENT '교육 시간',
  `instructor` VARCHAR(100) NULL COMMENT '강사명',
  PRIMARY KEY (`id`),
  INDEX `idx_training_courses_program_id` (`program_id`),
  CONSTRAINT `fk_training_courses_program` FOREIGN KEY (`program_id`) REFERENCES `HR`.`training_programs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='교육 과정';

CREATE TABLE `HR`.`training_enrollments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `course_id` INT UNSIGNED NOT NULL COMMENT '교육 과정 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'enrolled' COMMENT '상태(enrolled/in_progress/completed/failed)',
  `completed_at` DATETIME NULL COMMENT '완료일시',
  `score` DECIMAL(5,2) NULL COMMENT '점수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_training_enrollments_emp_course` (`employee_id`, `course_id`),
  CONSTRAINT `fk_training_enrollments_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_training_enrollments_course` FOREIGN KEY (`course_id`) REFERENCES `HR`.`training_courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='교육 수강';

CREATE TABLE `HR`.`assets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `org_id` INT UNSIGNED NOT NULL COMMENT '조직 ID',
  `asset_tag` VARCHAR(50) NOT NULL COMMENT '자산 태그',
  `name` VARCHAR(255) NOT NULL COMMENT '자산명',
  `category` VARCHAR(50) NOT NULL COMMENT '카테고리(laptop/phone/furniture)',
  `purchase_date` DATE NULL COMMENT '구매일',
  `purchase_cost` DECIMAL(12,2) NULL COMMENT '구매 비용',
  `status` VARCHAR(20) NOT NULL DEFAULT 'available' COMMENT '상태(available/assigned/retired)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assets_asset_tag` (`asset_tag`),
  CONSTRAINT `fk_assets_org` FOREIGN KEY (`org_id`) REFERENCES `HR`.`organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='자산';

CREATE TABLE `HR`.`asset_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `asset_id` BIGINT UNSIGNED NOT NULL COMMENT '자산 ID',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '배정일시',
  `returned_at` DATETIME NULL COMMENT '반납일시',
  PRIMARY KEY (`id`),
  INDEX `idx_asset_assignments_asset_id` (`asset_id`),
  CONSTRAINT `fk_asset_assignments_asset` FOREIGN KEY (`asset_id`) REFERENCES `HR`.`assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_assignments_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='자산 배정';

CREATE TABLE `HR`.`job_postings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `department_id` INT UNSIGNED NOT NULL COMMENT '부서 ID',
  `position_id` INT UNSIGNED NOT NULL COMMENT '직위 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '공고 제목',
  `description` LONGTEXT NOT NULL COMMENT '직무 설명',
  `requirements` TEXT NOT NULL COMMENT '자격 요건',
  `employment_type_id` INT UNSIGNED NOT NULL COMMENT '고용 유형 ID',
  `headcount` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '채용 인원',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/open/closed)',
  `published_at` DATETIME NULL COMMENT '게시일시',
  `closed_at` DATETIME NULL COMMENT '마감일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_job_postings_department_id` (`department_id`),
  CONSTRAINT `fk_job_postings_dept` FOREIGN KEY (`department_id`) REFERENCES `HR`.`departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_postings_position` FOREIGN KEY (`position_id`) REFERENCES `HR`.`positions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_postings_emp_type` FOREIGN KEY (`employment_type_id`) REFERENCES `HR`.`employment_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채용 공고';

CREATE TABLE `HR`.`job_applications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `job_posting_id` BIGINT UNSIGNED NOT NULL COMMENT '채용 공고 ID',
  `applicant_name` VARCHAR(100) NOT NULL COMMENT '지원자명',
  `email` VARCHAR(255) NOT NULL COMMENT '이메일',
  `phone` VARCHAR(30) NULL COMMENT '전화번호',
  `resume_url` VARCHAR(500) NULL COMMENT '이력서 URL',
  `status` VARCHAR(20) NOT NULL DEFAULT 'submitted' COMMENT '상태(submitted/reviewing/interview/offer/hired/rejected)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_job_applications_posting_id` (`job_posting_id`),
  CONSTRAINT `fk_job_applications_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `HR`.`job_postings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채용 지원서';

CREATE TABLE `HR`.`onboarding_checklists` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `task_name` VARCHAR(255) NOT NULL COMMENT '작업명',
  `description` TEXT NULL COMMENT '설명',
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '완료 여부',
  `completed_at` DATETIME NULL COMMENT '완료일시',
  `due_date` DATE NULL COMMENT '기한',
  PRIMARY KEY (`id`),
  INDEX `idx_onboarding_checklists_employee_id` (`employee_id`),
  CONSTRAINT `fk_onboarding_checklists_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='온보딩 체크리스트';

CREATE TABLE `HR`.`benefits` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '복리후생명',
  `category` VARCHAR(50) NOT NULL COMMENT '카테고리(health/welfare/education)',
  `description` TEXT NULL COMMENT '설명',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='복리후생';

CREATE TABLE `HR`.`benefit_plans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `benefit_id` INT UNSIGNED NOT NULL COMMENT '복리후생 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '플랜명',
  `monthly_cost` DECIMAL(12,2) NOT NULL COMMENT '월 비용',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_benefit_plans_benefit_id` (`benefit_id`),
  CONSTRAINT `fk_benefit_plans_benefit` FOREIGN KEY (`benefit_id`) REFERENCES `HR`.`benefits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='복리후생 플랜';

CREATE TABLE `HR`.`employee_benefits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `plan_id` INT UNSIGNED NOT NULL COMMENT '복리후생 플랜 ID',
  `enrolled_at` DATE NOT NULL COMMENT '가입일',
  `ended_at` DATE NULL COMMENT '종료일',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employee_benefits_emp_plan` (`employee_id`, `plan_id`),
  CONSTRAINT `fk_employee_benefits_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_employee_benefits_plan` FOREIGN KEY (`plan_id`) REFERENCES `HR`.`benefit_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직원 복리후생';


-- ============================================================
-- Schema: Finance (Domain 9: 재무/회계) - 30 tables
-- ============================================================

CREATE TABLE `Finance`.`currencies` (
  `code` CHAR(3) NOT NULL COMMENT '통화 코드(ISO 4217)',
  `name` VARCHAR(50) NOT NULL COMMENT '통화명',
  `symbol` VARCHAR(5) NOT NULL COMMENT '통화 기호',
  `decimal_places` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '소수점 자릿수',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='통화';

CREATE TABLE `Finance`.`exchange_rates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `base_currency` CHAR(3) NOT NULL COMMENT '기준 통화',
  `target_currency` CHAR(3) NOT NULL COMMENT '대상 통화',
  `rate` DECIMAL(18,6) NOT NULL COMMENT '환율',
  `valid_at` DATETIME NOT NULL COMMENT '적용 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exchange_rates_currencies_date` (`base_currency`, `target_currency`, `valid_at`),
  CONSTRAINT `fk_exchange_rates_base` FOREIGN KEY (`base_currency`) REFERENCES `Finance`.`currencies` (`code`) ON DELETE CASCADE,
  CONSTRAINT `fk_exchange_rates_target` FOREIGN KEY (`target_currency`) REFERENCES `Finance`.`currencies` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='환율';

CREATE TABLE `Finance`.`account_types` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(20) NOT NULL COMMENT '계정 유형 코드',
  `name` VARCHAR(50) NOT NULL COMMENT '계정 유형명',
  `normal_balance` VARCHAR(6) NOT NULL COMMENT '정상 잔액 방향(debit/credit)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_account_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='계정 유형';

CREATE TABLE `Finance`.`cost_centers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '비용 센터 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '비용 센터명',
  `department_id` INT UNSIGNED NULL COMMENT '부서 ID',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cost_centers_code` (`code`),
  CONSTRAINT `fk_cost_centers_dept` FOREIGN KEY (`department_id`) REFERENCES `HR`.`departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비용 센터';

CREATE TABLE `Finance`.`financial_periods` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(50) NOT NULL COMMENT '회계 기간명',
  `start_date` DATE NOT NULL COMMENT '시작일',
  `end_date` DATE NOT NULL COMMENT '종료일',
  `is_closed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '마감 여부',
  `closed_at` DATETIME NULL COMMENT '마감일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회계 기간';

CREATE TABLE `Finance`.`accounts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `account_type_id` INT UNSIGNED NOT NULL COMMENT '계정 유형 ID',
  `parent_id` INT UNSIGNED NULL COMMENT '상위 계정 ID',
  `code` VARCHAR(20) NOT NULL COMMENT '계정 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '계정명',
  `description` TEXT NULL COMMENT '설명',
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW' COMMENT '통화',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_code` (`code`),
  CONSTRAINT `fk_accounts_type` FOREIGN KEY (`account_type_id`) REFERENCES `Finance`.`account_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_accounts_parent` FOREIGN KEY (`parent_id`) REFERENCES `Finance`.`accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_accounts_currency` FOREIGN KEY (`currency`) REFERENCES `Finance`.`currencies` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='계정';

CREATE TABLE `Finance`.`journal_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `period_id` INT UNSIGNED NOT NULL COMMENT '회계 기간 ID',
  `entry_number` VARCHAR(30) NOT NULL COMMENT '전표 번호',
  `entry_date` DATE NOT NULL COMMENT '전표 일자',
  `description` TEXT NULL COMMENT '설명',
  `reference_type` VARCHAR(50) NULL COMMENT '참조 유형',
  `reference_id` BIGINT UNSIGNED NULL COMMENT '참조 ID',
  `total_debit` DECIMAL(16,2) NOT NULL COMMENT '총 차변 금액',
  `total_credit` DECIMAL(16,2) NOT NULL COMMENT '총 대변 금액',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/posted/reversed)',
  `created_by` BIGINT UNSIGNED NULL COMMENT '작성자 ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_journal_entries_number` (`entry_number`),
  INDEX `idx_journal_entries_period_id` (`period_id`),
  INDEX `idx_journal_entries_entry_date` (`entry_date`),
  CONSTRAINT `fk_journal_entries_period` FOREIGN KEY (`period_id`) REFERENCES `Finance`.`financial_periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='분개장';

CREATE TABLE `Finance`.`journal_entry_lines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `entry_id` BIGINT UNSIGNED NOT NULL COMMENT '분개 ID',
  `account_id` INT UNSIGNED NOT NULL COMMENT '계정 ID',
  `cost_center_id` INT UNSIGNED NULL COMMENT '비용 센터 ID',
  `debit` DECIMAL(16,2) NOT NULL DEFAULT 0 COMMENT '차변 금액',
  `credit` DECIMAL(16,2) NOT NULL DEFAULT 0 COMMENT '대변 금액',
  `description` VARCHAR(255) NULL COMMENT '설명',
  PRIMARY KEY (`id`),
  INDEX `idx_jel_entry_id` (`entry_id`),
  INDEX `idx_jel_account_id` (`account_id`),
  CONSTRAINT `fk_jel_entry` FOREIGN KEY (`entry_id`) REFERENCES `Finance`.`journal_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jel_account` FOREIGN KEY (`account_id`) REFERENCES `Finance`.`accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jel_cost_center` FOREIGN KEY (`cost_center_id`) REFERENCES `Finance`.`cost_centers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='분개 라인';

CREATE TABLE `Finance`.`transaction_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `parent_id` INT UNSIGNED NULL COMMENT '상위 카테고리 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  `type` VARCHAR(10) NOT NULL COMMENT '유형(income/expense)',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tx_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `Finance`.`transaction_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='거래 카테고리';

CREATE TABLE `Finance`.`transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `bank_account_id` BIGINT UNSIGNED NOT NULL COMMENT '은행 계좌 ID',
  `category_id` INT UNSIGNED NULL COMMENT '거래 카테고리 ID',
  `type` VARCHAR(10) NOT NULL COMMENT '유형(credit/debit)',
  `amount` DECIMAL(16,2) NOT NULL COMMENT '금액',
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW' COMMENT '통화',
  `description` VARCHAR(255) NULL COMMENT '설명',
  `reference_number` VARCHAR(100) NULL COMMENT '참조 번호',
  `transacted_at` DATETIME NOT NULL COMMENT '거래 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_transactions_bank_account_id` (`bank_account_id`),
  INDEX `idx_transactions_transacted_at` (`transacted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='거래';

CREATE TABLE `Finance`.`budgets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `period_id` INT UNSIGNED NOT NULL COMMENT '회계 기간 ID',
  `cost_center_id` INT UNSIGNED NULL COMMENT '비용 센터 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '예산안명',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/approved/active)',
  `total_amount` DECIMAL(16,2) NOT NULL COMMENT '총 예산액',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_budgets_period` FOREIGN KEY (`period_id`) REFERENCES `Finance`.`financial_periods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_budgets_cost_center` FOREIGN KEY (`cost_center_id`) REFERENCES `Finance`.`cost_centers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='예산';

CREATE TABLE `Finance`.`budget_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `budget_id` INT UNSIGNED NOT NULL COMMENT '예산 ID',
  `account_id` INT UNSIGNED NOT NULL COMMENT '계정 ID',
  `planned_amount` DECIMAL(16,2) NOT NULL COMMENT '계획 금액',
  `actual_amount` DECIMAL(16,2) NOT NULL DEFAULT 0 COMMENT '실제 금액',
  PRIMARY KEY (`id`),
  INDEX `idx_budget_items_budget_id` (`budget_id`),
  CONSTRAINT `fk_budget_items_budget` FOREIGN KEY (`budget_id`) REFERENCES `Finance`.`budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_budget_items_account` FOREIGN KEY (`account_id`) REFERENCES `Finance`.`accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='예산 항목';

CREATE TABLE `Finance`.`expense_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `parent_id` INT UNSIGNED NULL COMMENT '상위 카테고리 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  `code` VARCHAR(30) NOT NULL COMMENT '코드',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expense_categories_code` (`code`),
  CONSTRAINT `fk_expense_cats_parent` FOREIGN KEY (`parent_id`) REFERENCES `Finance`.`expense_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지출 카테고리';

CREATE TABLE `Finance`.`expense_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '직원 ID',
  `approver_id` BIGINT UNSIGNED NULL COMMENT '승인자 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `total_amount` DECIMAL(12,2) NOT NULL COMMENT '총액',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태',
  `submitted_at` DATETIME NULL COMMENT '제출일시',
  `approved_at` DATETIME NULL COMMENT '승인일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_expense_reports_employee_id` (`employee_id`),
  CONSTRAINT `fk_expense_reports_employee` FOREIGN KEY (`employee_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expense_reports_approver` FOREIGN KEY (`approver_id`) REFERENCES `HR`.`employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지출 보고서';

CREATE TABLE `Finance`.`expenses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `report_id` BIGINT UNSIGNED NOT NULL COMMENT '지출 보고서 ID',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '금액',
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW' COMMENT '통화',
  `expense_date` DATE NOT NULL COMMENT '지출일',
  `description` VARCHAR(255) NOT NULL COMMENT '설명',
  `receipt_url` VARCHAR(500) NULL COMMENT '영수증 파일 URL',
  `is_billable` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '청구 가능 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_expenses_report_id` (`report_id`),
  CONSTRAINT `fk_expenses_report` FOREIGN KEY (`report_id`) REFERENCES `Finance`.`expense_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `Finance`.`expense_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지출 항목';

CREATE TABLE `Finance`.`expense_report_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `expense_id` BIGINT UNSIGNED NOT NULL COMMENT '지출 ID',
  `account_id` INT UNSIGNED NOT NULL COMMENT '계정 ID',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '금액',
  PRIMARY KEY (`id`),
  INDEX `idx_expense_report_items_expense_id` (`expense_id`),
  CONSTRAINT `fk_expense_report_items_expense` FOREIGN KEY (`expense_id`) REFERENCES `Finance`.`expenses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expense_report_items_account` FOREIGN KEY (`account_id`) REFERENCES `Finance`.`accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지출 계정 매핑';

CREATE TABLE `Finance`.`bank_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `account_id` INT UNSIGNED NOT NULL COMMENT '계정(회계) ID',
  `bank_name` VARCHAR(100) NOT NULL COMMENT '은행명',
  `account_number` VARCHAR(50) NOT NULL COMMENT '계좌 번호',
  `account_holder` VARCHAR(100) NOT NULL COMMENT '예금주',
  `currency` CHAR(3) NOT NULL DEFAULT 'KRW' COMMENT '통화',
  `balance` DECIMAL(16,2) NOT NULL DEFAULT 0 COMMENT '잔액',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bank_accounts_number` (`account_number`),
  CONSTRAINT `fk_bank_accounts_account` FOREIGN KEY (`account_id`) REFERENCES `Finance`.`accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bank_accounts_currency` FOREIGN KEY (`currency`) REFERENCES `Finance`.`currencies` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='은행 계좌';

CREATE TABLE `Finance`.`bank_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `bank_account_id` BIGINT UNSIGNED NOT NULL COMMENT '은행 계좌 ID',
  `type` VARCHAR(10) NOT NULL COMMENT '유형(credit/debit)',
  `amount` DECIMAL(16,2) NOT NULL COMMENT '금액',
  `balance_after` DECIMAL(16,2) NOT NULL COMMENT '처리 후 잔액',
  `description` VARCHAR(255) NULL COMMENT '거래 내용',
  `reference_number` VARCHAR(100) NULL COMMENT '참조 번호',
  `transacted_at` DATETIME NOT NULL COMMENT '거래 일시',
  `is_reconciled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '대사 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_bank_tx_bank_account_id` (`bank_account_id`),
  INDEX `idx_bank_tx_transacted_at` (`transacted_at`),
  CONSTRAINT `fk_bank_tx_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `Finance`.`bank_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='은행 거래';

CREATE TABLE `Finance`.`bank_reconciliations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `bank_account_id` BIGINT UNSIGNED NOT NULL COMMENT '은행 계좌 ID',
  `period_id` INT UNSIGNED NOT NULL COMMENT '회계 기간 ID',
  `statement_balance` DECIMAL(16,2) NOT NULL COMMENT '통장 잔액',
  `book_balance` DECIMAL(16,2) NOT NULL COMMENT '장부 잔액',
  `difference` DECIMAL(16,2) NOT NULL COMMENT '차이',
  `status` VARCHAR(20) NOT NULL DEFAULT 'in_progress' COMMENT '상태',
  `reconciled_at` DATETIME NULL COMMENT '대사 완료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_bank_reconciliations_account` FOREIGN KEY (`bank_account_id`) REFERENCES `Finance`.`bank_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bank_reconciliations_period` FOREIGN KEY (`period_id`) REFERENCES `Finance`.`financial_periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='은행 대사';

CREATE TABLE `Finance`.`tax_rates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(30) NOT NULL COMMENT '세율 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '세율명',
  `rate` DECIMAL(5,2) NOT NULL COMMENT '세율(%)',
  `tax_type` VARCHAR(30) NOT NULL COMMENT '세금 유형(VAT/income/withholding)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tax_rates_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='세율';

CREATE TABLE `Finance`.`tax_returns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `period_id` INT UNSIGNED NOT NULL COMMENT '회계 기간 ID',
  `tax_type` VARCHAR(30) NOT NULL COMMENT '세금 유형',
  `due_date` DATE NOT NULL COMMENT '신고 기한',
  `taxable_amount` DECIMAL(16,2) NOT NULL COMMENT '과세 표준',
  `tax_amount` DECIMAL(16,2) NOT NULL COMMENT '세액',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태(pending/filed/paid)',
  `filed_at` DATETIME NULL COMMENT '신고일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_tax_returns_period_id` (`period_id`),
  CONSTRAINT `fk_tax_returns_period` FOREIGN KEY (`period_id`) REFERENCES `Finance`.`financial_periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='세금 신고';

CREATE TABLE `Finance`.`tax_return_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `tax_return_id` BIGINT UNSIGNED NOT NULL COMMENT '세금 신고 ID',
  `description` VARCHAR(255) NOT NULL COMMENT '항목 설명',
  `amount` DECIMAL(16,2) NOT NULL COMMENT '금액',
  PRIMARY KEY (`id`),
  INDEX `idx_tax_return_items_return_id` (`tax_return_id`),
  CONSTRAINT `fk_tax_return_items_return` FOREIGN KEY (`tax_return_id`) REFERENCES `Finance`.`tax_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='세금 신고 항목';

CREATE TABLE `Finance`.`contracts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `contract_number` VARCHAR(50) NOT NULL COMMENT '계약 번호',
  `title` VARCHAR(255) NOT NULL COMMENT '계약 제목',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(vendor/client/employment/lease)',
  `counterparty_name` VARCHAR(255) NOT NULL COMMENT '상대방 이름',
  `total_value` DECIMAL(16,2) NULL COMMENT '계약 총액',
  `start_date` DATE NOT NULL COMMENT '계약 시작일',
  `end_date` DATE NULL COMMENT '계약 종료일',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/active/expired/terminated)',
  `file_url` VARCHAR(500) NULL COMMENT '계약서 파일 URL',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contracts_number` (`contract_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='계약';

CREATE TABLE `Finance`.`contract_milestones` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `contract_id` BIGINT UNSIGNED NOT NULL COMMENT '계약 ID',
  `name` VARCHAR(255) NOT NULL COMMENT '마일스톤명',
  `due_date` DATE NOT NULL COMMENT '기한',
  `amount` DECIMAL(16,2) NOT NULL COMMENT '금액',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `completed_at` DATETIME NULL COMMENT '완료일시',
  PRIMARY KEY (`id`),
  INDEX `idx_contract_milestones_contract_id` (`contract_id`),
  CONSTRAINT `fk_contract_milestones_contract` FOREIGN KEY (`contract_id`) REFERENCES `Finance`.`contracts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='계약 마일스톤';

CREATE TABLE `Finance`.`contract_payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `contract_id` BIGINT UNSIGNED NOT NULL COMMENT '계약 ID',
  `milestone_id` BIGINT UNSIGNED NULL COMMENT '마일스톤 ID',
  `amount` DECIMAL(16,2) NOT NULL COMMENT '금액',
  `payment_date` DATE NOT NULL COMMENT '지급일',
  `status` VARCHAR(20) NOT NULL DEFAULT 'scheduled' COMMENT '상태',
  PRIMARY KEY (`id`),
  INDEX `idx_contract_payments_contract_id` (`contract_id`),
  CONSTRAINT `fk_contract_payments_contract` FOREIGN KEY (`contract_id`) REFERENCES `Finance`.`contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_contract_payments_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `Finance`.`contract_milestones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='계약 지급';

CREATE TABLE `Finance`.`credit_notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `invoice_id` BIGINT UNSIGNED NOT NULL COMMENT '청구서 ID',
  `credit_number` VARCHAR(50) NOT NULL COMMENT '크레딧 노트 번호',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '금액',
  `reason` TEXT NOT NULL COMMENT '사유',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_credit_notes_number` (`credit_number`),
  CONSTRAINT `fk_credit_notes_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `Order`.`invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='크레딧 노트';

CREATE TABLE `Finance`.`debit_notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `contract_id` BIGINT UNSIGNED NULL COMMENT '계약 ID',
  `debit_number` VARCHAR(50) NOT NULL COMMENT '데빗 노트 번호',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '금액',
  `reason` TEXT NOT NULL COMMENT '사유',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_debit_notes_number` (`debit_number`),
  CONSTRAINT `fk_debit_notes_contract` FOREIGN KEY (`contract_id`) REFERENCES `Finance`.`contracts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='데빗 노트';

CREATE TABLE `Finance`.`cost_allocations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `source_cost_center_id` INT UNSIGNED NOT NULL COMMENT '소스 비용 센터 ID',
  `target_cost_center_id` INT UNSIGNED NOT NULL COMMENT '대상 비용 센터 ID',
  `period_id` INT UNSIGNED NOT NULL COMMENT '회계 기간 ID',
  `amount` DECIMAL(16,2) NOT NULL COMMENT '배분 금액',
  `allocation_basis` VARCHAR(50) NOT NULL COMMENT '배분 기준',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_cost_allocations_source` (`source_cost_center_id`),
  CONSTRAINT `fk_cost_alloc_source` FOREIGN KEY (`source_cost_center_id`) REFERENCES `Finance`.`cost_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cost_alloc_target` FOREIGN KEY (`target_cost_center_id`) REFERENCES `Finance`.`cost_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cost_alloc_period` FOREIGN KEY (`period_id`) REFERENCES `Finance`.`financial_periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비용 배분';

CREATE TABLE `Finance`.`financial_reports` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '보고서명',
  `type` VARCHAR(30) NOT NULL COMMENT '유형(balance_sheet/income/cash_flow)',
  `period_id` INT UNSIGNED NOT NULL COMMENT '회계 기간 ID',
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `file_url` VARCHAR(500) NULL COMMENT '파일 URL',
  PRIMARY KEY (`id`),
  INDEX `idx_financial_reports_period_id` (`period_id`),
  CONSTRAINT `fk_financial_reports_period` FOREIGN KEY (`period_id`) REFERENCES `Finance`.`financial_periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='재무 보고서';

CREATE TABLE `Finance`.`report_configs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `report_id` INT UNSIGNED NOT NULL COMMENT '보고서 ID',
  `config_key` VARCHAR(100) NOT NULL COMMENT '설정 키',
  `config_value` TEXT NOT NULL COMMENT '설정 값',
  PRIMARY KEY (`report_id`, `config_key`),
  CONSTRAINT `fk_report_configs_report` FOREIGN KEY (`report_id`) REFERENCES `Finance`.`financial_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보고서 설정';


-- ============================================================
-- Schema: System (Domain 10: 시스템/로그) - 30 tables
-- ============================================================

CREATE TABLE `System`.`config_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `code` VARCHAR(50) NOT NULL COMMENT '카테고리 코드',
  `name` VARCHAR(100) NOT NULL COMMENT '카테고리명',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_config_categories_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='설정 카테고리';

CREATE TABLE `System`.`system_configs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `category_id` INT UNSIGNED NOT NULL COMMENT '카테고리 ID',
  `key` VARCHAR(100) NOT NULL COMMENT '설정 키',
  `value` LONGTEXT NOT NULL COMMENT '설정 값',
  `type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '값 유형(string/int/bool/json)',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '공개 여부',
  `description` TEXT NULL COMMENT '설명',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_system_configs_category_key` (`category_id`, `key`),
  CONSTRAINT `fk_system_configs_category` FOREIGN KEY (`category_id`) REFERENCES `System`.`config_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시스템 설정';

CREATE TABLE `System`.`feature_flags` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `key` VARCHAR(100) NOT NULL COMMENT '플래그 키',
  `name` VARCHAR(255) NOT NULL COMMENT '기능명',
  `description` TEXT NULL COMMENT '설명',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '활성 여부',
  `rollout_percentage` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '점진적 배포 비율(%)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feature_flags_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기능 플래그';

CREATE TABLE `System`.`feature_flag_rules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `flag_id` INT UNSIGNED NOT NULL COMMENT '플래그 ID',
  `condition_type` VARCHAR(30) NOT NULL COMMENT '조건 유형(user_id/segment/env)',
  `condition_value` JSON NOT NULL COMMENT '조건 값',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  PRIMARY KEY (`id`),
  INDEX `idx_feature_flag_rules_flag_id` (`flag_id`),
  CONSTRAINT `fk_feature_flag_rules_flag` FOREIGN KEY (`flag_id`) REFERENCES `System`.`feature_flags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기능 플래그 규칙';

CREATE TABLE `System`.`application_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `level` VARCHAR(10) NOT NULL COMMENT '로그 레벨(DEBUG/INFO/WARN/ERROR)',
  `channel` VARCHAR(50) NOT NULL COMMENT '채널',
  `message` TEXT NOT NULL COMMENT '메시지',
  `context` JSON NULL COMMENT '컨텍스트',
  `extra` JSON NULL COMMENT '추가 정보',
  `logged_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '기록일시',
  PRIMARY KEY (`id`),
  INDEX `idx_application_logs_level` (`level`),
  INDEX `idx_application_logs_logged_at` (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='애플리케이션 로그';

CREATE TABLE `System`.`error_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `error_code` VARCHAR(50) NULL COMMENT '에러 코드',
  `message` TEXT NOT NULL COMMENT '에러 메시지',
  `stack_trace` LONGTEXT NULL COMMENT '스택 트레이스',
  `file` VARCHAR(500) NULL COMMENT '파일 경로',
  `line` INT UNSIGNED NULL COMMENT '라인 번호',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `request_url` VARCHAR(1000) NULL COMMENT '요청 URL',
  `request_method` VARCHAR(10) NULL COMMENT '요청 메서드',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP 주소',
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '발생일시',
  PRIMARY KEY (`id`),
  INDEX `idx_error_logs_occurred_at` (`occurred_at`),
  INDEX `idx_error_logs_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='에러 로그';

CREATE TABLE `System`.`access_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `session_id` VARCHAR(128) NULL COMMENT '세션 ID',
  `method` VARCHAR(10) NOT NULL COMMENT 'HTTP 메서드',
  `url` VARCHAR(1000) NOT NULL COMMENT 'URL',
  `response_status` SMALLINT UNSIGNED NOT NULL COMMENT 'HTTP 응답 코드',
  `response_time_ms` INT UNSIGNED NULL COMMENT '응답 시간(ms)',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP 주소',
  `user_agent` VARCHAR(500) NULL COMMENT 'User-Agent',
  `accessed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '접근일시',
  PRIMARY KEY (`id`),
  INDEX `idx_access_logs_user_id` (`user_id`),
  INDEX `idx_access_logs_accessed_at` (`accessed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='접근 로그';

CREATE TABLE `System`.`security_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `event_type` VARCHAR(50) NOT NULL COMMENT '이벤트 유형(login_fail/brute_force/suspicious)',
  `user_id` BIGINT UNSIGNED NULL COMMENT '관련 사용자 ID',
  `ip_address` VARCHAR(45) NOT NULL COMMENT 'IP 주소',
  `details` JSON NULL COMMENT '상세 정보',
  `severity` VARCHAR(10) NOT NULL DEFAULT 'medium' COMMENT '심각도(low/medium/high/critical)',
  `is_resolved` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '해결 여부',
  `occurred_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발생일시',
  PRIMARY KEY (`id`),
  INDEX `idx_security_events_event_type` (`event_type`),
  INDEX `idx_security_events_ip_address` (`ip_address`),
  INDEX `idx_security_events_occurred_at` (`occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보안 이벤트';

CREATE TABLE `System`.`audit_trails` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `actor_id` BIGINT UNSIGNED NULL COMMENT '행위자 ID',
  `actor_type` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '행위자 유형(user/system/api)',
  `action` VARCHAR(50) NOT NULL COMMENT '액션(create/update/delete/read)',
  `entity_type` VARCHAR(100) NOT NULL COMMENT '엔티티 유형',
  `entity_id` VARCHAR(100) NOT NULL COMMENT '엔티티 ID',
  `changes` JSON NULL COMMENT '변경 내역',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP 주소',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_audit_trails_entity` (`entity_type`, `entity_id`),
  INDEX `idx_audit_trails_actor_id` (`actor_id`),
  INDEX `idx_audit_trails_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='감사 추적';

CREATE TABLE `System`.`data_exports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '요청자 ID',
  `export_type` VARCHAR(50) NOT NULL COMMENT '내보내기 유형',
  `filters` JSON NULL COMMENT '필터 조건',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태(pending/processing/done/failed)',
  `file_url` VARCHAR(500) NULL COMMENT '파일 URL',
  `row_count` INT UNSIGNED NULL COMMENT '행 수',
  `expires_at` DATETIME NULL COMMENT '만료일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_data_exports_user_id` (`user_id`),
  CONSTRAINT `fk_data_exports_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='데이터 내보내기';

CREATE TABLE `System`.`data_imports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '요청자 ID',
  `import_type` VARCHAR(50) NOT NULL COMMENT '가져오기 유형',
  `file_url` VARCHAR(500) NOT NULL COMMENT '파일 URL',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태',
  `total_rows` INT UNSIGNED NULL COMMENT '전체 행 수',
  `processed_rows` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '처리된 행 수',
  `error_rows` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '오류 행 수',
  `error_log_url` VARCHAR(500) NULL COMMENT '에러 로그 URL',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_data_imports_user_id` (`user_id`),
  CONSTRAINT `fk_data_imports_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='데이터 가져오기';

CREATE TABLE `System`.`import_mappings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `import_id` BIGINT UNSIGNED NOT NULL COMMENT '가져오기 ID',
  `source_field` VARCHAR(100) NOT NULL COMMENT '소스 필드명',
  `target_field` VARCHAR(100) NOT NULL COMMENT '대상 필드명',
  `transform` VARCHAR(50) NULL COMMENT '변환 함수',
  PRIMARY KEY (`id`),
  INDEX `idx_import_mappings_import_id` (`import_id`),
  CONSTRAINT `fk_import_mappings_import` FOREIGN KEY (`import_id`) REFERENCES `System`.`data_imports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='가져오기 필드 매핑';

CREATE TABLE `System`.`scheduled_jobs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '작업명',
  `command` VARCHAR(500) NOT NULL COMMENT '실행 명령',
  `cron_expression` VARCHAR(50) NOT NULL COMMENT 'Cron 표현식',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul' COMMENT '타임존',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `last_run_at` DATETIME NULL COMMENT '마지막 실행일시',
  `next_run_at` DATETIME NULL COMMENT '다음 실행 예정일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_scheduled_jobs_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스케줄 작업';

CREATE TABLE `System`.`job_executions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `job_id` INT UNSIGNED NOT NULL COMMENT '작업 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'running' COMMENT '상태(running/success/failed)',
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '시작일시',
  `completed_at` DATETIME NULL COMMENT '완료일시',
  `duration_ms` INT UNSIGNED NULL COMMENT '실행 시간(ms)',
  PRIMARY KEY (`id`),
  INDEX `idx_job_executions_job_id` (`job_id`),
  CONSTRAINT `fk_job_executions_job` FOREIGN KEY (`job_id`) REFERENCES `System`.`scheduled_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='작업 실행 이력';

CREATE TABLE `System`.`job_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `execution_id` BIGINT UNSIGNED NOT NULL COMMENT '실행 ID',
  `level` VARCHAR(10) NOT NULL COMMENT '로그 레벨',
  `message` TEXT NOT NULL COMMENT '메시지',
  `logged_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '기록일시',
  PRIMARY KEY (`id`),
  INDEX `idx_job_logs_execution_id` (`execution_id`),
  CONSTRAINT `fk_job_logs_execution` FOREIGN KEY (`execution_id`) REFERENCES `System`.`job_executions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='작업 실행 로그';

CREATE TABLE `System`.`queues` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '큐 이름',
  `driver` VARCHAR(20) NOT NULL DEFAULT 'redis' COMMENT '드라이버(redis/sqs/database)',
  `max_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT '최대 재시도 횟수',
  `retry_delay_sec` INT UNSIGNED NOT NULL DEFAULT 60 COMMENT '재시도 지연(초)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_queues_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='큐';

CREATE TABLE `System`.`queue_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `queue_id` INT UNSIGNED NOT NULL COMMENT '큐 ID',
  `payload` LONGTEXT NOT NULL COMMENT '페이로드',
  `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '시도 횟수',
  `available_at` DATETIME NOT NULL COMMENT '처리 가능 일시',
  `reserved_at` DATETIME NULL COMMENT '처리 중 일시',
  `failed_at` DATETIME NULL COMMENT '실패 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_queue_jobs_queue_id` (`queue_id`),
  INDEX `idx_queue_jobs_available_at` (`available_at`),
  CONSTRAINT `fk_queue_jobs_queue` FOREIGN KEY (`queue_id`) REFERENCES `System`.`queues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='큐 작업';

CREATE TABLE `System`.`search_indexes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `entity_type` VARCHAR(50) NOT NULL COMMENT '인덱스 대상 유형',
  `name` VARCHAR(100) NOT NULL COMMENT '인덱스명',
  `engine` VARCHAR(20) NOT NULL DEFAULT 'elasticsearch' COMMENT '검색 엔진',
  `index_name` VARCHAR(100) NOT NULL COMMENT '엔진 내 인덱스명',
  `schema` JSON NOT NULL COMMENT '인덱스 스키마',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='검색 인덱스';

CREATE TABLE `System`.`search_queries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `query` VARCHAR(500) NOT NULL COMMENT '검색어',
  `index_id` INT UNSIGNED NULL COMMENT '검색 인덱스 ID',
  `result_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '결과 수',
  `response_time_ms` INT UNSIGNED NULL COMMENT '응답 시간(ms)',
  `searched_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '검색일시',
  PRIMARY KEY (`id`),
  INDEX `idx_search_queries_user_id` (`user_id`),
  INDEX `idx_search_queries_searched_at` (`searched_at`),
  CONSTRAINT `fk_search_queries_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_search_queries_index` FOREIGN KEY (`index_id`) REFERENCES `System`.`search_indexes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='검색 쿼리 이력';

CREATE TABLE `System`.`recommendation_rules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '추천 규칙명',
  `algorithm` VARCHAR(50) NOT NULL COMMENT '알고리즘(collaborative/content/hybrid)',
  `entity_type` VARCHAR(50) NOT NULL COMMENT '추천 대상 유형',
  `config` JSON NOT NULL COMMENT '규칙 설정',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='추천 규칙';

CREATE TABLE `System`.`recommendations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `rule_id` INT UNSIGNED NOT NULL COMMENT '추천 규칙 ID',
  `entity_type` VARCHAR(50) NOT NULL COMMENT '추천 엔티티 유형',
  `entity_id` BIGINT UNSIGNED NOT NULL COMMENT '추천 엔티티 ID',
  `score` DECIMAL(6,4) NOT NULL DEFAULT 0 COMMENT '추천 점수',
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  INDEX `idx_recommendations_user_id` (`user_id`),
  CONSTRAINT `fk_recommendations_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recommendations_rule` FOREIGN KEY (`rule_id`) REFERENCES `System`.`recommendation_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='추천';

CREATE TABLE `System`.`analytics_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NULL COMMENT '사용자 ID',
  `session_token` VARCHAR(128) NOT NULL COMMENT '세션 토큰',
  `referrer` VARCHAR(1000) NULL COMMENT '레퍼러 URL',
  `utm_source` VARCHAR(100) NULL COMMENT 'UTM 소스',
  `utm_medium` VARCHAR(100) NULL COMMENT 'UTM 매체',
  `utm_campaign` VARCHAR(100) NULL COMMENT 'UTM 캠페인',
  `device_type` VARCHAR(20) NULL COMMENT '디바이스 유형(desktop/mobile/tablet)',
  `os` VARCHAR(50) NULL COMMENT '운영체제',
  `browser` VARCHAR(50) NULL COMMENT '브라우저',
  `country_code` CHAR(2) NULL COMMENT '국가 코드',
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '세션 시작일시',
  `ended_at` DATETIME NULL COMMENT '세션 종료일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_analytics_sessions_token` (`session_token`),
  INDEX `idx_analytics_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_analytics_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='분석 세션';

CREATE TABLE `System`.`analytics_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `session_id` BIGINT UNSIGNED NOT NULL COMMENT '세션 ID',
  `event_name` VARCHAR(100) NOT NULL COMMENT '이벤트명',
  `properties` JSON NULL COMMENT '이벤트 속성',
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '발생일시',
  PRIMARY KEY (`id`),
  INDEX `idx_analytics_events_session_id` (`session_id`),
  INDEX `idx_analytics_events_event_name` (`event_name`),
  CONSTRAINT `fk_analytics_events_session` FOREIGN KEY (`session_id`) REFERENCES `System`.`analytics_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='분석 이벤트';

CREATE TABLE `System`.`analytics_pageviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `session_id` BIGINT UNSIGNED NOT NULL COMMENT '세션 ID',
  `url` VARCHAR(1000) NOT NULL COMMENT 'URL',
  `title` VARCHAR(500) NULL COMMENT '페이지 제목',
  `time_on_page_sec` INT UNSIGNED NULL COMMENT '체류 시간(초)',
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '조회일시',
  PRIMARY KEY (`id`),
  INDEX `idx_analytics_pageviews_session_id` (`session_id`),
  CONSTRAINT `fk_analytics_pageviews_session` FOREIGN KEY (`session_id`) REFERENCES `System`.`analytics_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='페이지뷰';

CREATE TABLE `System`.`analytics_funnels` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '퍼널명',
  `description` TEXT NULL COMMENT '설명',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='분석 퍼널';

CREATE TABLE `System`.`funnel_steps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `funnel_id` INT UNSIGNED NOT NULL COMMENT '퍼널 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '단계명',
  `event_name` VARCHAR(100) NOT NULL COMMENT '이벤트명',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  PRIMARY KEY (`id`),
  INDEX `idx_funnel_steps_funnel_id` (`funnel_id`),
  CONSTRAINT `fk_funnel_steps_funnel` FOREIGN KEY (`funnel_id`) REFERENCES `System`.`analytics_funnels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='퍼널 단계';

CREATE TABLE `System`.`reports` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(255) NOT NULL COMMENT '보고서명',
  `type` VARCHAR(50) NOT NULL COMMENT '보고서 유형',
  `query` TEXT NOT NULL COMMENT '보고서 쿼리',
  `chart_type` VARCHAR(30) NULL COMMENT '차트 유형(bar/line/pie/table)',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '공개 여부',
  `created_by` BIGINT UNSIGNED NULL COMMENT '생성자 ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_reports_creator` FOREIGN KEY (`created_by`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보고서';

CREATE TABLE `System`.`report_filters` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `report_id` INT UNSIGNED NOT NULL COMMENT '보고서 ID',
  `filter_key` VARCHAR(100) NOT NULL COMMENT '필터 키',
  `filter_label` VARCHAR(100) NOT NULL COMMENT '필터 레이블',
  `filter_type` VARCHAR(20) NOT NULL COMMENT '필터 유형(date/select/text)',
  `default_value` VARCHAR(255) NULL COMMENT '기본값',
  PRIMARY KEY (`id`),
  INDEX `idx_report_filters_report_id` (`report_id`),
  CONSTRAINT `fk_report_filters_report` FOREIGN KEY (`report_id`) REFERENCES `System`.`reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보고서 필터';

CREATE TABLE `System`.`report_schedules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `report_id` INT UNSIGNED NOT NULL COMMENT '보고서 ID',
  `recipient_ids` JSON NOT NULL COMMENT '수신자 ID 목록',
  `format` VARCHAR(10) NOT NULL DEFAULT 'pdf' COMMENT '형식(pdf/csv/excel)',
  `cron_expression` VARCHAR(50) NOT NULL COMMENT 'Cron 표현식',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `last_sent_at` DATETIME NULL COMMENT '마지막 발송일시',
  PRIMARY KEY (`id`),
  INDEX `idx_report_schedules_report_id` (`report_id`),
  CONSTRAINT `fk_report_schedules_report` FOREIGN KEY (`report_id`) REFERENCES `System`.`reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보고서 발송 스케줄';


-- ============================================================
-- Schema: Social (Domain 11: 소셜/커뮤니티) - 10 tables
-- ============================================================

CREATE TABLE `Social`.`social_media_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `platform` VARCHAR(30) NOT NULL COMMENT '플랫폼(instagram/twitter/facebook/tiktok)',
  `handle` VARCHAR(100) NOT NULL COMMENT '계정 핸들',
  `follower_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '팔로워 수',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '인증 여부',
  `connected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '연결일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_social_media_accounts_user_platform` (`user_id`, `platform`),
  CONSTRAINT `fk_social_media_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='소셜 미디어 계정';

CREATE TABLE `Social`.`social_posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT '소셜 계정 ID',
  `content` TEXT NOT NULL COMMENT '게시글 내용',
  `media_urls` JSON NULL COMMENT '미디어 URL 목록',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '상태(draft/scheduled/published)',
  `scheduled_at` DATETIME NULL COMMENT '예약 발행 일시',
  `published_at` DATETIME NULL COMMENT '발행일시',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '좋아요 수',
  `comment_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '댓글 수',
  `share_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '공유 수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_social_posts_account_id` (`account_id`),
  CONSTRAINT `fk_social_posts_account` FOREIGN KEY (`account_id`) REFERENCES `Social`.`social_media_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='소셜 게시글';

CREATE TABLE `Social`.`social_engagements` (
  `post_id` BIGINT UNSIGNED NOT NULL COMMENT '게시글 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `type` VARCHAR(20) NOT NULL COMMENT '유형(like/comment/share/save)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '참여일시',
  PRIMARY KEY (`post_id`, `user_id`, `type`),
  INDEX `idx_social_engagements_user_id` (`user_id`),
  CONSTRAINT `fk_social_engagements_post` FOREIGN KEY (`post_id`) REFERENCES `Social`.`social_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_social_engagements_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='소셜 참여(좋아요/댓글/공유)';

CREATE TABLE `Social`.`user_contacts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `contact_user_id` BIGINT UNSIGNED NULL COMMENT '연락처 사용자 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '연락처명',
  `email` VARCHAR(255) NULL COMMENT '이메일',
  `phone` VARCHAR(30) NULL COMMENT '전화번호',
  `is_favorite` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '즐겨찾기 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '추가일시',
  PRIMARY KEY (`id`),
  INDEX `idx_user_contacts_user_id` (`user_id`),
  INDEX `idx_user_contacts_contact_user_id` (`contact_user_id`),
  CONSTRAINT `fk_user_contacts_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_contacts_contact` FOREIGN KEY (`contact_user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 연락처';

CREATE TABLE `Social`.`community_boards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `name` VARCHAR(100) NOT NULL COMMENT '게시판명',
  `slug` VARCHAR(100) NOT NULL COMMENT '슬러그',
  `description` TEXT NULL COMMENT '설명',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_community_boards_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='커뮤니티 게시판';

CREATE TABLE `Social`.`community_posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `board_id` INT UNSIGNED NOT NULL COMMENT '게시판 ID',
  `author_id` BIGINT UNSIGNED NOT NULL COMMENT '작성자 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '제목',
  `body` LONGTEXT NOT NULL COMMENT '내용',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '조회수',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '좋아요 수',
  `comment_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '댓글 수',
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '고정 여부',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '상태(1:게시,0:숨김)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_community_posts_board_id` (`board_id`),
  INDEX `idx_community_posts_author_id` (`author_id`),
  CONSTRAINT `fk_community_posts_board` FOREIGN KEY (`board_id`) REFERENCES `Social`.`community_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_community_posts_author` FOREIGN KEY (`author_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='커뮤니티 게시글';

CREATE TABLE `Social`.`community_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `post_id` BIGINT UNSIGNED NOT NULL COMMENT '게시글 ID',
  `author_id` BIGINT UNSIGNED NOT NULL COMMENT '작성자 ID',
  `parent_id` BIGINT UNSIGNED NULL COMMENT '부모 댓글 ID',
  `body` TEXT NOT NULL COMMENT '내용',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '좋아요 수',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '상태(1:게시,0:숨김)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`id`),
  INDEX `idx_community_comments_post_id` (`post_id`),
  CONSTRAINT `fk_community_comments_post` FOREIGN KEY (`post_id`) REFERENCES `Social`.`community_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_community_comments_author` FOREIGN KEY (`author_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_community_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `Social`.`community_comments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='커뮤니티 댓글';

CREATE TABLE `Social`.`community_reactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '사용자 ID',
  `entity_type` VARCHAR(20) NOT NULL COMMENT '대상 유형(post/comment)',
  `entity_id` BIGINT UNSIGNED NOT NULL COMMENT '대상 ID',
  `reaction` VARCHAR(20) NOT NULL DEFAULT 'like' COMMENT '반응 유형(like/love/haha/sad/angry)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '반응일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_community_reactions_user_entity` (`user_id`, `entity_type`, `entity_id`),
  CONSTRAINT `fk_community_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='커뮤니티 반응';

CREATE TABLE `Social`.`community_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `reporter_id` BIGINT UNSIGNED NOT NULL COMMENT '신고자 ID',
  `entity_type` VARCHAR(20) NOT NULL COMMENT '신고 대상 유형(post/comment)',
  `entity_id` BIGINT UNSIGNED NOT NULL COMMENT '신고 대상 ID',
  `reason` VARCHAR(50) NOT NULL COMMENT '신고 사유',
  `description` TEXT NULL COMMENT '상세 설명',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '처리 상태(pending/reviewed/dismissed)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '신고일시',
  PRIMARY KEY (`id`),
  INDEX `idx_community_reports_reporter_id` (`reporter_id`),
  CONSTRAINT `fk_community_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `Auth`.`users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='커뮤니티 신고';

CREATE TABLE `Social`.`hashtags` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `tag` VARCHAR(100) NOT NULL COMMENT '해시태그',
  `usage_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '사용 횟수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hashtags_tag` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='해시태그';
