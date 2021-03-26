const express = require('express')
const { selfSocket } = require('../../../sockets/index').get()
const { isNumeric } = require('../../../utils/core')

const router = express.Router()
const db = require('../../../db/index')

const getAPIKeyOwner = async (key) => {
	try {
		const {
			rows,
		} = await db.query(
			`SELECT id, username FROM users WHERE secret_api_key=$1`,
			[key]
		)

		if (rows.length === 0 || !rows[0]) return false
		const user = rows[0]
		return user
	} catch (err) {
		console.error(err)
		return false
	}
}

const checkAPICreds = async (req, _res, next) => {
	const secretKey = req.headers.authorization?.split(' ')[1]
	req.hasCreds = false
	req.APIKeyOwner = null
	if (secretKey == null || secretKey === 'null') return next()
	req.hasCreds = true

	// Get user
	const APIKeyOwner = await getAPIKeyOwner(secretKey)
	if (!APIKeyOwner) return next()
	req.APIKeyOwner = APIKeyOwner
	return next()
}

router.get('/ping', checkAPICreds, async (req, res) => {
	const { hasCreds, APIKeyOwner } = req

	if (!hasCreds) return res.status(400).json({ message: 'API Key not found' })
	if (APIKeyOwner == null)
		return res.status(401).json({ message: 'Invalid API Key' })
	return res.json({ message: 'pong' })
})

router.get('/space/:space_id/grid_object', checkAPICreds, async (req, res) => {
	const { hasCreds, APIKeyOwner } = req
	const { space_id } = req.params
	let { row, col } = req.query

	if (![space_id, row, col].every((x) => x != null))
		return res.status(400).json({ message: 'Missing values' })

	// Convert to number since it's from query
	row = Number(row)
	col = Number(col)
	if (!isNumeric(space_id) || !isNumeric(row) || !isNumeric(col))
		return res.status(400).json({ message: 'Invalid values' })

	// auth
	if (!hasCreds) return res.status(400).json({ message: 'API Key not found' })
	if (APIKeyOwner == null)
		return res.status(401).json({ message: 'Invalid API Key' })

	try {
		// Get space grid
		const {
			rows,
		} = await db.query(
			'SELECT grid, grid_values, owner FROM spaces WHERE id=$1',
			[space_id]
		)

		if (rows.length === 0)
			return res.status(404).json({ message: 'Space not found' })

		const { grid, grid_values, owner } = rows[0]
		if (owner !== APIKeyOwner.id) return res.status(403).json({})

		const gridObject = (grid[row] && grid[row][col]) || null
		if (gridObject == null)
			return res.status(404).json({ message: 'Grid object not found' })

		const defaultGridVals = new Array(grid.length)
			.fill()
			.map(() => new Array(grid[0].length).fill().map(() => null))
		const gridVals = grid_values != null ? grid_values : defaultGridVals

		const gridObjectState = gridVals[row][col]

		return res.json({ grid_object: gridObjectState })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/space/:space_id/grid_object', checkAPICreds, async (req, res) => {
	const { hasCreds, APIKeyOwner } = req
	const { space_id } = req.params
	const { row, col, new_state } = req.body

	if (![space_id, row, col, new_state].every((x) => x != null))
		return res.status(400).json({ message: 'Missing values' })
	if (!isNumeric(space_id) || !isNumeric(row) || !isNumeric(col))
		return res.status(400).json({ message: 'Invalid values' })

	// auth
	if (!hasCreds) return res.status(400).json({ message: 'API Key not found' })
	if (APIKeyOwner == null)
		return res.status(401).json({ message: 'Invalid API Key' })

	try {
		// Get space grid
		const {
			rows,
		} = await db.query(
			'SELECT objects, grid, grid_values, owner FROM spaces WHERE id=$1',
			[space_id]
		)

		if (rows.length === 0)
			return res.status(404).json({ message: 'Space not found' })

		const { objects, grid, grid_values, owner } = rows[0]
		if (owner !== APIKeyOwner.id) return res.status(403).json({})

		const gridObject = (grid[row] && grid[row][col]) || null
		if (gridObject == null)
			return res.status(404).json({ message: 'Grid object not found' })

		const defaultGridVals = new Array(grid.length)
			.fill()
			.map(() => new Array(grid[0].length).fill().map(() => null))
		const gridVals = grid_values != null ? grid_values : defaultGridVals

		const gridObjectState = gridVals[row][col]

		const masterObject = objects.find((x) => x.localId === gridObject.localId)
		const updatedState = {}

		masterObject.fields.forEach((field) => {
			// return field // ignore fields that the object cant have
			if (new_state[field.slug] == null) {
				if (gridObjectState != null && gridObjectState[field.slug])
					updatedState[field.slug] = gridObjectState[field.slug] // return current state
				return // ignore field if no current or new state exists for it
			}

			updatedState[field.slug] = new_state[field.slug]
		})

		const newGridValues = gridVals
		newGridValues[row][col] = updatedState

		// update grid
		const query2 = await db.query(
			'UPDATE spaces SET grid_values=$2 WHERE id=$1 RETURNING id',
			[space_id, JSON.stringify(newGridValues)]
		)
		if (query2.rows.length === 0)
			return res.status(404).json({ message: 'Space not found' })

		// update people in the 'space' room
		selfSocket.emit('update space', {
			spaceId: space_id,
		})

		return res.json({})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.get('/space/:space_id/description', checkAPICreds, async (req, res) => {
	const { hasCreds, APIKeyOwner } = req
	const { space_id } = req.params

	if (![space_id].every((x) => x != null))
		return res.status(400).json({ message: 'Missing values' })
	if (!isNumeric(space_id))
		return res.status(400).json({ message: 'Invalid values' })

	// auth
	if (!hasCreds) return res.status(400).json({ message: 'API Key not found' })
	if (APIKeyOwner == null)
		return res.status(401).json({ message: 'Invalid API Key' })

	try {
		// Get space grid
		const {
			rows,
		} = await db.query('SELECT description, owner FROM spaces WHERE id=$1', [
			space_id,
		])

		if (rows.length === 0)
			return res.status(404).json({ message: 'Space not found' })

		const { description, owner } = rows[0]
		if (owner !== APIKeyOwner.id)
			return res.status(403).json({ message: 'Unauthorized' })

		return res.json({ space: { description } })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/space/:space_id/description', checkAPICreds, async (req, res) => {
	const { hasCreds, APIKeyOwner } = req
	const { space_id } = req.params
	const { description } = req.body

	if (![space_id, description].every((x) => x != null))
		return res.status(400).json({ message: 'Missing values' })
	if (!isNumeric(space_id))
		return res.status(400).json({ message: 'Invalid values' })

	// auth
	if (!hasCreds) return res.status(400).json({ message: 'API Key not found' })
	if (APIKeyOwner == null)
		return res.status(401).json({ message: 'Invalid API Key' })

	try {
		// Get space grid
		const {
			rows,
		} = await db.query(
			'UPDATE spaces SET description=$3 WHERE id=$1 AND owner=$2 returning id',
			[space_id, APIKeyOwner.id, description]
		)

		if (rows.length === 0)
			return res
				.status(404)
				.json({ message: 'Space not found or unauthorized' })

		// update people in the 'space' room
		selfSocket.emit('update space', {
			spaceId: space_id,
		})

		return res.json({})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

module.exports = router
