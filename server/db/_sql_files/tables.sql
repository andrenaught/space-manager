-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  email_is_verified BOOLEAN DEFAULT false,
  email_code VARCHAR(255),
  email_code_date TIMESTAMP,
  password_code VARCHAR(255),
  password_code_date TIMESTAMP,
  secret_api_key VARCHAR(255) NOT NULL UNIQUE
);
ALTER TABLE users
  ADD CONSTRAINT lowercase_username
  CHECK (username = lower(username));

-- User login sessions
CREATE TABLE sessions (
	id SERIAL PRIMARY KEY,
	r_token VARCHAR(255) NOT NULL,
	user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	last_refresh TIMESTAMP DEFAULT NOW()
);

-- Spaces contain the grid and it's objects
CREATE TABLE spaces (
  id SERIAL PRIMARY KEY,
  owner INT NOT NULL REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  name VARCHAR(255) DEFAULT '',
  description VARCHAR(1000) DEFAULT '',
  objects JSON,
  grid JSON,
  grid_values JSON,
  settings JSON
);

-- Objects are the main contents of the space's grid
-- IDEA: gif & svg object_type could allow for animated objects
CREATE TYPE object_type AS ENUM ('image', 'gif');
CREATE TABLE objects (
	id SERIAL PRIMARY KEY,
	name VARCHAR(255),
	slug VARCHAR(255) UNIQUE NOT NULL,
	type object_type,
	category VARCHAR(255),
	display TEXT,
	visual_states JSON DEFAULT '[]' NOT NULL,
	fields JSON DEFAULT '[]' NOT NULL
);

-- Adding core objects
INSERT INTO objects (name, slug, type, category, display, visual_states, fields)
VALUES (
	'Square',
	'square',
	'image',
	'core',
	'/static/objects/square.svg',
	'[]',
	'[]'
),
(
	'Circle',
	'circle',
	'image',
	'core',
	'/static/objects/circle.svg',
	'[]',
	'[]'
),
(
	'Triangle',
	'triangle',
	'image',
	'core',
	'/static/objects/triangle.svg',
	'[]',
	'[]'
),
(
	'Washing Machine',
	'washing-machine',
	'image',
	'core',
	'/static/objects/washing-machine.png',
	'[{"condition":"time-left<=00:01:30","back":{"style":{"background":"#ffd17c"}}}, {"condition":"time-left<=00:00:00","back":{"style":{"background":"#e26262"}}}, {"s_condition":"time-left[''lastAction'']!=started","elem":{"style":{"opacity":"0.25"}}}, {"condition": "issues!=''''", "elem": {"style": {"background": "#6b6b6b", "opacity": "1"}}}]',
	'[{"type": "timer", "name": "Time Left", "slug": "time-left", "value": ""}, {"type": "text", "name": "Name", "slug": "name", "value": ""}, {"type": "text", "name": "Issues", "slug": "issues", "value": ""}]'
),
(
	'Tumble Dryer',
	'tumble-dryer',
	'image',
	'core',
	'/static/objects/tumble-dryer.png',
	'[{"condition":"time-left<=00:01:30","back":{"style":{"background":"#ffd17c"}}}, {"condition":"time-left<=00:00:00","back":{"style":{"background":"#e26262"}}}, {"s_condition":"time-left[''lastAction'']!=started","elem":{"style":{"opacity":"0.25"}}}, {"condition": "issues!=''''", "elem": {"style": {"background": "#6b6b6b", "opacity": "1"}}}]',
	'[{"type": "timer", "name": "Time Left", "slug": "time-left", "value": ""}, {"type": "text", "name": "Name", "slug": "name", "value": ""}, {"type": "text", "name": "Issues", "slug": "issues", "value": ""}]'
),
(
	'Parking Spot',
	'parking-spot',
	'image',
	'core',
	'/static/objects/parking-spot.svg',
	'[{"condition": "is-vacant==true", "elem": {"style": {"content": "url(''/static/objects/car.svg'')"}}}]',
	'[{"type": "toggle", "name": "Is Vacant", "slug": "is-vacant", "value": false}]'
),
(
	'Chair',
	'chair',
	'image',
	'core',
	'/static/objects/chair.svg',
	'[{"condition": "taken==false", "elem": {"style": {"filter": "opacity(0.25)"}}}]',
	'[{"type": "toggle", "name": "Taken", "slug": "taken", "value": false}, {"type": "text", "name": "User", "slug": "user", "value": ""}]'
);

-- Object kits - to group up objects
create table object_kits (
	id SERIAL PRIMARY KEY,
	name VARCHAR(255),
	slug VARCHAR(255) UNIQUE NOT NULL
);

-- Adding core objects kits
INSERT INTO object_kits (name, slug)
VALUES (
	'Laundromat',
	'laundromat'
),
(
	'Parking Lot',
	'parking-lot'
),
(
	'Seating',
	'seating'
),
(
	'Misc',
	'misc'
);

-- Relationship table to represent an object_kit's objects
create table object_kits_objects (
	id SERIAL PRIMARY KEY,
	object_kit_id INT NOT NULL REFERENCES object_kits(id) ON DELETE CASCADE,
	object_id INT NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
	unique (object_kit_id, object_id)
);

-- Adding objects to core objects kits
INSERT INTO object_kits_objects (object_kit_id, object_id)
VALUES (
	(SELECT id FROM object_kits WHERE slug = 'laundromat'), (SELECT id FROM objects WHERE slug = 'washing-machine')
),
(
	(SELECT id FROM object_kits WHERE slug = 'laundromat'), (SELECT id FROM objects WHERE slug = 'tumble-dryer')
),
(
	(SELECT id FROM object_kits WHERE slug = 'parking-lot'), (SELECT id FROM objects WHERE slug = 'parking-spot')
),
(
	(SELECT id FROM object_kits WHERE slug = 'seating'), (SELECT id FROM objects WHERE slug = 'chair')
),
(
	(SELECT id FROM object_kits WHERE slug = 'misc'), (SELECT id FROM objects WHERE slug = 'square')
),
(
	(SELECT id FROM object_kits WHERE slug = 'misc'), (SELECT id FROM objects WHERE slug = 'circle')
),
(
	(SELECT id FROM object_kits WHERE slug = 'misc'), (SELECT id FROM objects WHERE slug = 'triangle')
);

-- Relationship table to represent the members (users) of a "space"
CREATE TABLE space_participants (
	id SERIAL PRIMARY KEY,
	user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
	invite_accepted BOOLEAN DEFAULT null,
	unique (user_id, space_id)
);

-- Relationship table to represent which "spaces" users have saved
CREATE TABLE favorited_spaces (
	id SERIAL PRIMARY KEY,
	user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
	unique (user_id, space_id)
);

-- List of spaces to be featured to public
CREATE TABLE featured_spaces (
	id SERIAL PRIMARY KEY,
	space_id INT NOT NULL UNIQUE REFERENCES spaces(id) ON DELETE CASCADE
);