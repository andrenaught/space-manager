# Space Manager

## About

Display the positioning and status of objects within a given space. The goal is to create something like a live map to visually communicate what's happening - whether it's to share with other people or for personal reference.

### Examples
* Parking Lot - show which parking spots are open
* Laundromat - show which washing machines are being used and how much time is left
* Seating - show which seats are taken, as well as the name of the person for each seat

## Setup

1. `npm install`
2. Follow Server & Client steps below
3. `npm run build`
4. `npm run start`

### Server

- In `/server` folder

1. `npm install`
2. Setup database using files in `db/_sql_files`, this project uses Postgres
   - Set DB password in `setup.sql` then run it
   - Run `tables.sql`
3. Create .env and set the variables `cp .env_template .env`

#### Notes

- Emailing is done through the sendEmail() function in `/utils/email.js`. Currently supported are 'smtp' or 'mailgun_api'

### Client

- In `/client` folder

1. `npm install`
2. Create .env and set the variables `cp .env_template .env`

### Misc

- Featured spaces (displayed in search page) can be set through the database table `featured_spaces`

## Development

- For development mode follow the setup steps, but instead of `npm run build && npm run start` run `npm run dev`

- `npm run lint` to run linter on project. Note that for the client folder, the `eslint` cli command must be ran while inside the client folder.
