const express = require('express')
const bcrypt = require('bcrypt')
const db = require('../../db/index')
const { isNumeric } = require('../../utils/core')
const { isLoggedIn, checkAuth } = require('../../middleware/auth')
const { isSpaceOwner } = require('../../utils/auth')

const router = express.Router()
const defaultGridSettings = {
	permissions: {
		gridVals: 'public',
	},
}

router.get('/custom/featured', async (_req, res) => {
	try {
		const { rows } = await db.query(`
			SELECT s.id, s.owner, s.is_public, s.name, s.description, s.grid, u.username AS owner_username
			FROM featured_spaces fs
			INNER JOIN spaces s ON fs.space_id = s.id
			INNER JOIN users u ON u.id = s.owner
			WHERE s.is_public=TRUE`)

		return res.json({ spaces: rows })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// get one
router.get('/:space_id', checkAuth, async (req, res) => {
	try {
		const { user_id } = req
		const { space_id } = req.params
		const { get_summary } = req.query
		if (space_id == null || !isNumeric(space_id))
			return res.status(400).json({})
		const { rows } = await db.query('SELECT * FROM spaces WHERE id=$1', [
			space_id,
		])
		if (rows.length === 0) return res.status(404).json({})

		// Check Permissions
		// check if private or is owner
		const space = rows[0] || null
		const isOwner = user_id && user_id === space.owner
		const canEdit = isOwner
		// check if invited user
		const isMemberRes = await db.query(
			'SELECT id FROM space_participants WHERE user_id=$1 AND invite_accepted=TRUE',
			[user_id]
		)
		const isMember = isMemberRes.rows && isMemberRes.rows.length !== 0

		const canView = canEdit || space.is_public || isMember
		if (!canView) return res.status(403).json({})
		let permissionType = 'public'
		if (isMember) permissionType = 'member'
		if (isOwner) permissionType = 'owner'
		const permissions = { type: permissionType, canView, canEdit }

		// Check if favorited
		const isFavoritedRes = await db.query(
			'SELECT id FROM favorited_spaces WHERE user_id=$1 AND space_id=$2',
			[user_id, space_id]
		)
		const isFavorited = isFavoritedRes.rows && isFavoritedRes.rows.length !== 0

		// "Summary" specific queries
		let summary = null
		if (get_summary) {
			const userQuery = await db.query(
				'SELECT username FROM users WHERE id=$1',
				[space.owner]
			)
			const owner = userQuery.rows[0] || null
			summary = { owner }
		}

		return res.json({ space, permissions, isFavorited, summary })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// get all (public only)
const getSearchQuery = (search_val, search_type) => {
	switch (search_type) {
		case 'space_id':
			return {
				string: 'WHERE s.is_public=TRUE AND s.id=$1',
				vals: [search_val],
			}
		case 'keyword':
			return {
				string:
					"WHERE s.is_public=TRUE AND to_tsvector(s.name || ' ' || s.description) @@ plainto_tsquery($1)",
				vals: [search_val],
			}
		default:
			return false
	}
}
router.get('/', async (req, res) => {
	const { search_val, search_type, page = 0, per_page, get_summary } = req.query
	const limit = per_page || 3
	let mainQuery = {
		string: 'WHERE is_public=TRUE',
		vals: [],
	}
	if (page != null && !isNumeric(page))
		return res.status(400).json({ message: '[page] param must be numerical' })
	if (search_val != null) {
		if (search_type == null)
			return res.status(400).json({ message: 'Missing search type' })
		mainQuery = getSearchQuery(search_val, search_type)
		if (!mainQuery)
			return res.status(400).json({ message: 'Invalid search type' })
	}

	try {
		let fullQuery = `SELECT s.id, s.owner, s.is_public, s.name, s.description, s.grid FROM spaces s`
		if (get_summary)
			fullQuery = `
			SELECT s.id, s.owner, s.is_public, s.name, s.description, s.grid, u.username AS owner_username
			FROM spaces s
			INNER JOIN users u ON u.id = s.owner`
		fullQuery += ` ${mainQuery.string} LIMIT ${limit}`
		if (page != null) fullQuery += ` OFFSET ${page * limit}`

		const { rows } = await db.query(fullQuery, mainQuery.vals)
		return res.json({ spaces: rows })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// create
router.post('/', isLoggedIn, async (req, res) => {
	try {
		const { user_id } = req
		const { name, objects, grid, gridValues } = req.body
		const {
			rows,
		} = await db.query(
			'INSERT INTO spaces (name, owner, objects, grid, grid_values, settings) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
			[
				name,
				user_id,
				JSON.stringify(objects),
				JSON.stringify(grid),
				JSON.stringify(gridValues),
				JSON.stringify(defaultGridSettings),
			]
		)
		return res.json({ space: rows[0] })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// update
router.put('/:space_id', checkAuth, async (req, res) => {
	try {
		const { user_id } = req
		const { space_id } = req.params
		const {
			name,
			description,
			isPublic,
			objects,
			grid,
			gridValues,
			settings,
		} = req.body
		const cols = [
			{ slug: 'name', value: name },
			{ slug: 'description', value: description },
			{ slug: 'is_public', value: isPublic },
			{ slug: 'objects', value: objects },
			{ slug: 'grid', value: grid },
			{ slug: 'grid_values', value: gridValues },
			{ slug: 'settings', value: settings },
		]
		const validCols = cols.filter((col) => col.value != null)
		if (validCols.length === 0)
			return res
				.status(400)
				.json({ message: 'Request does not have any valid updates' })

		const spacesRes = await db.query(
			'SELECT id, owner, is_public, settings FROM spaces WHERE id=$1',
			[space_id]
		)
		if (spacesRes.rows.length === 0)
			return res.status(404).json({ message: 'space not found' })
		const space = spacesRes.rows[0] || null
		const isOwner = space.owner === user_id

		if (space.settings == null) space.settings = defaultGridSettings
		const nonMembersCanChangeGridValues =
			space.settings.permissions.gridVals === 'public'
		const onlyOwnersCanChangeGridValues =
			space.settings.permissions.gridVals === 'owner'

		// If not logged in, they cannot make any changes to private spaces
		if (!space.is_public && user_id == null) {
			return res.status(401).json({})
		}

		// Dont allow non-owners to make changes to certain fields
		if (
			isPublic != null ||
			name != null ||
			description != null ||
			objects != null ||
			grid != null ||
			settings != null
		) {
			// for these fields, must atleast be a logged in user, return 401 for non-logged in users
			if (user_id == null) {
				return res.status(401).json({})
			}
			if (!isOwner) {
				return res.status(403).json({})
			}
		}

		// Check if is member, if user is the owner they are considered members
		let isMember = isOwner
		if (!isOwner) {
			const isMemberRes = await db.query(
				'SELECT id FROM space_participants WHERE user_id=$1 AND invite_accepted=TRUE',
				[user_id]
			)
			isMember = isMemberRes.rows && isMemberRes.rows.length !== 0
		}

		// if private, and is not a member, this user shouldn't have access to this grid
		if (!space.is_public && !isMember) {
			return res.status(403).json({})
		}

		// User is trying to make change grid values.
		if (gridValues != null) {
			// if public, and is not a member, and non-members cant change grid values - 403
			if (space.is_public && !isMember && !nonMembersCanChangeGridValues) {
				return res.status(403).json({})
			}
			if (!isOwner && onlyOwnersCanChangeGridValues) {
				return res.status(403).json({})
			}
		}

		let queryString = `UPDATE spaces SET`
		const queryCols = []
		let queryIndex = 1
		validCols.forEach((col, i) => {
			if (col.value == null) return
			const isLast = i === validCols.length - 1
			queryString += ` ${col.slug}=$${queryIndex}`
			if (!isLast) {
				queryString += ','
			}
			if (typeof col.value === 'string') {
				queryCols.push(col.value)
			} else {
				queryCols.push(JSON.stringify(col.value))
			}
			queryIndex += 1
		})
		queryString += ` WHERE id=${space_id} RETURNING id`

		const { rows } = await db.query(queryString, queryCols)
		if (rows.length === 0)
			return res.status(404).json({ message: 'space not found' })
		return res.json({})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.delete(`/:space_id`, isLoggedIn, async (req, res) => {
	try {
		const { user_id } = req
		const { space_id } = req.params
		const { password } = req.body

		// check password
		const usersRes = await db.query('SELECT password FROM users WHERE id=$1', [
			user_id,
		])
		if (usersRes.rows.length === 0)
			return res.status(404).json({ message: 'user not found' })
		const user = usersRes.rows[0]
		const passwordGood = await bcrypt.compare(password, user.password)
		if (!passwordGood)
			return res.status(401).json({ message: 'password is incorrect' })

		const {
			rows,
		} = await db.query('DELETE FROM spaces WHERE id=$1 returning id', [
			space_id,
		])
		if (rows.length === 0)
			return res.status(404).json({ message: 'space not found' })

		return res.json({})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// Space Participants
// get all
router.get(`/:space_id/participants`, isLoggedIn, async (req, res) => {
	try {
		const { user_id } = req
		const { space_id } = req.params

		// Only owner can see invites
		const spacesRes = await db.query(
			'SELECT id, owner FROM spaces WHERE id=$1',
			[space_id]
		)
		if (spacesRes.rows.length === 0)
			return res.status(404).json({ message: 'space not found' })
		const space = spacesRes.rows[0] || null
		const isOwner = space.owner === user_id
		if (!isOwner) return res.status(403).json({})

		const { rows } = await db.query(
			`
			SELECT
				sp.user_id,
				sp.invite_accepted,
				u.username
			FROM space_participants sp
			INNER JOIN users u
			ON u.id = sp.user_id
			WHERE sp.space_id=$1 AND invite_accepted IS NOT FALSE`,
			[space_id]
		)

		return res.json({ participants: rows })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// add participant to space
router.post('/:space_id/participants', isLoggedIn, async (req, res) => {
	try {
		const { user_id } = req
		const { space_id } = req.params
		const { username } = req.body

		// Check if user is authorized to insert
		const spacesRes = await db.query(
			'SELECT id, owner FROM spaces WHERE id=$1',
			[space_id]
		)
		if (spacesRes.rows.length === 0)
			return res.status(404).json({ message: 'space not found' })
		const space = spacesRes.rows[0] || null
		if (space.owner !== user_id) return res.status(403).json({})

		// Insert
		// - Owner cannot be invited to own space
		await db.query(
			`
			INSERT INTO space_participants (user_id, space_id)
			VALUES ((SELECT id FROM users WHERE username = $1 AND id != $2), $3)
			RETURNING *`,
			[username, space.owner, space_id]
		)
		return res.json({})
	} catch (err) {
		// Unique constraint error, for this table specifically it means user has already been invited
		if (err.code === '23505') {
			return res.status(409).json({ message: 'User has already been invited.' })
		}

		// user_id was null, which means no user was found with that username
		if (err.code === '23502' && err.column === 'user_id') {
			return res.status(404).json({ message: 'Username not found' })
		}
		console.error(err)
		return res.status(500).json({})
	}
})

// accept invitation
router.put(
	'/:space_id/participants/accept_invite',
	isLoggedIn,
	async (req, res) => {
		try {
			const { user_id } = req
			const { space_id } = req.params

			const { rows } = await db.query(
				`
			UPDATE space_participants SET invite_accepted=TRUE WHERE space_id=$1 AND user_id=$2 RETURNING id
		`,
				[space_id, user_id]
			)
			if (rows.length === 0) return res.status(404).json({})
			return res.json({})
		} catch (err) {
			console.error(err)
			return res.status(500).json({})
		}
	}
)
// decline invitation
router.put(
	'/:space_id/participants/decline_invite',
	isLoggedIn,
	async (req, res) => {
		try {
			const { user_id } = req
			const { space_id } = req.params

			const { rows } = await db.query(
				`
			DELETE FROM space_participants WHERE user_id=$1 AND space_id=$2 RETURNING id
		`,
				[user_id, space_id]
			)
			if (rows.length === 0) return res.status(404).json({})
			return res.json({})
		} catch (err) {
			console.error(err)
			return res.status(500).json({})
		}
	}
)

// uninvite someone from space
router.delete('/:space_id/participants', isLoggedIn, async (req, res) => {
	try {
		const { space_id } = req.params
		const invitedUser = req.body.user_id
		const { user_id } = req

		// Only owner or user themselves (uninviting self) can delete an invite
		const isOwner = await isSpaceOwner(user_id, space_id)
		if (!isOwner) return res.status(403).json({})

		const {
			rows,
		} = await db.query(
			'DELETE FROM space_participants WHERE user_id=$1 AND space_id=$2 RETURNING id',
			[invitedUser, space_id]
		)
		if (rows.length === 0) return res.status(404).json({})
		return res.json({})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// add to favorites
router.post('/:space_id/favorites', isLoggedIn, async (req, res) => {
	try {
		const { space_id } = req.params
		const { user_id } = req
		await db.query(
			`
			INSERT INTO favorited_spaces (user_id, space_id)
			VALUES ($1, $2)`,
			[user_id, space_id]
		)
		return res.json({})
	} catch (err) {
		// Unique constraint error, for this table specifically it means user has already favorited
		if (err.code === '23505') {
			return res
				.status(409)
				.json({ message: 'User has already favorited this space.' })
		}
		console.error(err)
		return res.status(500).json({})
	}
})

// remove from favorites
router.delete('/:space_id/favorites', isLoggedIn, async (req, res) => {
	try {
		const { space_id } = req.params
		const { user_id } = req
		const {
			rows,
		} = await db.query(
			'DELETE FROM favorited_spaces WHERE user_id=$1 AND space_id=$2 RETURNING id',
			[user_id, space_id]
		)
		if (rows.length === 0) return res.status(404).json({})
		return res.json({})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

module.exports = router
