import React from 'react'
import { MdCheckBoxOutlineBlank } from 'react-icons/md'

const emptyObject = {
	isEmpty: true,
	element: <MdCheckBoxOutlineBlank style={{ fontSize: '28px' }} />,
}

// convertGridToDB & convertGridToFrontend will act as the bridge from frontend to backend
// Takes a grid object from frontend and returns an optimized and database storable object
const convertGridToDB = (grid) => {
	const cols = grid[0].length
	const rows = grid.length
	const DBGridValues = new Array(rows).fill().map(() => new Array(cols).fill())

	const DBGrid = grid.map((row, i) =>
		row.map((object, j) => {
			DBGridValues[i][j] = object.state
			if (object.isEmpty) return null
			return {
				localId: object.localId,
			}
		})
	)
	return { DBGrid, DBGridValues }
}

// Takes a grid object from database and returns grid object to be rendered by frontend
// This should be called any time there are changes to ObjectKit (removing, field changes)
// - since this is what connects the grid data to the ObjectKit
const convertGridToFrontend = (grid, gridValues, objectKit) => {
	// Kit positions {localId: arrIndex}, for performance vs doing Array.find() - not tested, just assumed
	const kitPositions = {}
	objectKit.forEach((obj, i) => {
		kitPositions[obj.localId] = i
	})

	const frontendGrid = grid.map((row, y) =>
		row.map((object, x) => {
			if (!object || object.localId == null) {
				return {
					...emptyObject,
					pos: { x, y },
				}
			}

			const hasValue = gridValues != null
			const objectKitIndex = kitPositions[object.localId]
			const srcObject = objectKit[objectKitIndex]
			return {
				isEmpty: false,
				...srcObject,
				...object,
				state: hasValue ? gridValues[y][x] : null,
				pos: { x, y },
			}
		})
	)

	return frontendGrid
}

const applyKitUpdatesToGrid = (grid, objectKit) => {
	const { DBGrid, DBGridValues } = convertGridToDB(grid)
	const frontendGrid = convertGridToFrontend(DBGrid, DBGridValues, objectKit)
	return frontendGrid
}

const removeFromGrid = (grid, objectsToRemove) => {
	if (!objectsToRemove?.length > 0) return grid
	const newGrid = grid.map((row, y) =>
		row.map((object, x) => {
			const objectFound = objectsToRemove.find((z) => z.slug === object.slug)
			if (objectFound) {
				return {
					...emptyObject,
					pos: { x, y },
				}
			}
			return object
		})
	)

	return newGrid
}

const addRow = (grid) => {
	const newGrid = grid.slice()
	const xLength = grid[0].length
	const yLength = grid.length
	const newRow = new Array(xLength).fill().map((col, x) => ({
		...emptyObject,
		pos: { x, y: yLength },
	}))
	newGrid.push(newRow)

	return newGrid
}

const removeRow = (grid) => {
	const newGrid = grid.slice()
	newGrid.pop()

	return newGrid
}

const addCol = (grid) => {
	const newGrid = grid.slice()
	const xLength = grid[0].length

	newGrid.map((row, y) => {
		row.push({
			...emptyObject,
			pos: { x: xLength, y },
		})
		return true
	})

	return newGrid
}

const removeCol = (grid) => {
	const newGrid = grid.slice()

	newGrid.map((row) => {
		row.pop()
		return true
	})

	return newGrid
}

const getDefaultGrid = (rows, cols) =>
	Array(rows)
		.fill()
		.map((_row, y) =>
			Array(cols)
				.fill()
				.map((_col, x) => ({
					...emptyObject,
					pos: { x, y },
				}))
		)

export {
	emptyObject,
	convertGridToDB,
	convertGridToFrontend,
	applyKitUpdatesToGrid,
	removeFromGrid,
	addRow,
	removeRow,
	addCol,
	removeCol,
	getDefaultGrid,
}
