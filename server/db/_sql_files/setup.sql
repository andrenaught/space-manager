CREATE USER spacemanager WITH PASSWORD [password];
CREATE DATABASE spacemanager WITH OWNER spacemanager;
REVOKE connect ON DATABASE spacemanager FROM PUBLIC;
GRANT connect ON DATABASE spacemanager TO spacemanager;

-- Might need to execute these permission commands after adding in new tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spacemanager; -- allows select, update, delete
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public to spacemanager; -- allows insert