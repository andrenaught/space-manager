const express = require('express')
const db = require('../../db/index')
const { isNumeric } = require('../../utils/core')

const router = express.Router()

// get all
router.get('/', async (_req, res) => {
	try {
		const { rows } = await db.query('SELECT * FROM objects LIMIT 10')
		return res.json({ objects: rows })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.get('/default_kit', async (_req, res) => {
	try {
		const { rows } = await db.query(
			`SELECT * FROM objects WHERE slug = 'square'`
		)
		return res.json({ objects: rows })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// get object kits
router.get('/object_kits', async (_req, res) => {
	try {
		const { rows } = await db.query('SELECT * FROM object_kits LIMIT 10')
		return res.json({ object_kits: rows })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

// get object kit objects
router.get('/object_kits/:object_kit_id', async (req, res) => {
	const { object_kit_id } = req.params
	if (object_kit_id == null || !isNumeric(object_kit_id))
		return res.status(400).json({ message: 'Missing category id' })

	try {
		const { rows } = await db.query(
			`
			SELECT objects.*
			FROM objects INNER JOIN object_kits_objects
			ON object_kits_objects.object_id=objects.id
			WHERE object_kit_id = $1 LIMIT 10`,
			[object_kit_id]
		)
		return res.json({ object_kit: { objects: rows } })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

module.exports = router
