import React, { useState, useEffect, useRef, useContext } from 'react'
import { IoIosAdd, IoIosRemove } from 'react-icons/io'
import PropTypes from 'prop-types'
import merge from 'deepmerge'
import { conStringIsValid } from 'src/components/utils/exprEval'
import sty from './Grid.module.scss'
import ObjectStatus from './ObjectStatus'
import Footer from './Footer'
import {
	applyKitUpdatesToGrid,
	addRow,
	removeRow,
	addCol,
	removeCol,
} from './gridUtils'
import { useOutsideClick } from '../../utils/core'
import { SpaceContext } from '../spaceUtils'

const Grid = (props) => {
	const { id, saveSpace, userPermissions } = useContext(SpaceContext)
	const {
		description,
		setDescription,
		setObjectToolbox,
		objectToolbox,
		setGrid,
		grid,
		currStep,
		clearClipboard,
		copyObject,
		copiedObject,
		gridEditingOn,
		isSaving,
		undoGridChanges,
		userSettings,
		totalConnectedUsers,
		isUpdating,
	} = props
	const hasStarted = currStep === 1
	const [selectedCoords, selectCoords] = useState({ x: -1, y: -1 })
	const [selectedObject, selectObject] = useState(null)
	const [gridChecks, setGridChecks] = useState(0)
	const [potentialObjStatusChanges, setPotentialObjStatusChanges] = useState(0)
	const gridRef = useRef()
	const gridContRef = useRef()

	useOutsideClick(gridRef, (e) => {
		// reset clipboard on clicks outside grid (but inside grid container)
		if (gridContRef.current && gridContRef.current.contains(e.target)) {
			clearClipboard()
			selectCoords({ x: -1, y: -1 })
			selectObject(null)
		}
	})

	const refreshObject = () => {
		// If selected object is from the object kit, recopy the object.
		// - if it was removed, clear clipboard and deselect the object (set to null)
		if (!selectedObject.pos) {
			// find in object kit by slug
			const masterObject =
				objectToolbox.find((x) => x.slug === selectedObject.slug) || null
			copyObject(masterObject)
			selectObject(masterObject)
			return
		}
		const uptoDateObject = grid[selectedObject.pos.y][selectedObject.pos.x]
		selectObject(uptoDateObject)
	}

	// rerender grid every few seconds (useful for timers)
	useEffect(() => {
		const interval = setInterval(() => {
			setGridChecks(gridChecks + 1)
		}, 1000)
		return () => clearInterval(interval)
	}, [gridChecks])

	useEffect(() => {
		// grid or object kit has been updated
		setPotentialObjStatusChanges(potentialObjStatusChanges + 1)
	}, [objectToolbox, grid])

	const editObject = ({
		pos,
		newObject,
		allPUT = true,
		objectKitPUT = false,
		gridPUT = false,
		gridValuesPUT = false,
		updateBackend,
	}) => {
		if (objectKitPUT) {
			const i = objectToolbox.findIndex((object) => object.id === newObject.id)
			const copy = objectToolbox
			copy[i] = newObject
			setObjectToolbox(copy)
			// update grid to reflect changes made on the object
			const newGrid = applyKitUpdatesToGrid(grid, copy)
			setGrid(newGrid)
		}

		if (pos) {
			// if its an object within the grid (not from object kit)
			const { x, y } = pos
			const copy = grid
			copy[y][x] = newObject
			setGrid(copy)

			if (newObject.isEmpty) {
				selectObject(null)
			}
		}

		if (updateBackend) {
			saveSpace({
				spaceId: id,
				allPUT,
				objectKitPUT,
				gridPUT,
				gridValuesPUT,
			})
		}
	}
	const coordClickHandler = (y, x) => {
		setPotentialObjStatusChanges(0) // manually picked new object
		if (copiedObject && !hasStarted) {
			// If theres already an object in the slot dont overwrite it
			// - also only owners can add new objects to grid
			if (!grid[y][x].isEmpty || userPermissions.type !== 'owner') {
				selectObject(grid[y][x])
				selectCoords({ x, y })
				clearClipboard()
				return
			}

			const newGrid = grid.slice()
			newGrid[y][x] = { ...copiedObject, pos: { x, y } }
			setGrid(newGrid)
			clearClipboard()
			saveSpace({ spaceId: id, allPUT: false, gridPUT: true })
		}

		selectObject({ ...grid[y][x] }) // use copy to force a refresh
		selectCoords({ x, y })
	}
	useEffect(() => {
		if (copiedObject != null) {
			selectCoords({ x: -1, y: -1 })
			selectObject(copiedObject)
		}
	}, [copiedObject])

	const changeGridSize = ({ action = null }) => {
		let newGrid = []
		switch (action) {
			case 'add-row':
				newGrid = addRow(grid)
				break
			case 'remove-row':
				newGrid = removeRow(grid)
				break
			case 'add-col':
				newGrid = addCol(grid)
				break
			case 'remove-col':
				newGrid = removeCol(grid)
				break
			default:
				console.error('changeGridSize: invalid action')
				return false
		}
		setGrid(newGrid)
		return true
	}

	const canEdit = currStep === 0
	let classList = ''
	if (copiedObject && userPermissions.type === 'owner') {
		classList += ` ${sty.showEmpties}` // only owners can add new objects
	}

	return (
		<div className={`${sty.container}${classList}`}>
			<div
				style={{ gridArea: 'grid' }}
				ref={gridContRef}
				className={sty.gridContainer}
			>
				<div className={sty.inner}>
					<div className={sty.inner2}>
						<div ref={gridRef} className={sty.mainGrid}>
							<MainGrid
								grid={grid}
								selectedCoords={selectedCoords}
								coordClickHandler={coordClickHandler}
							/>
						</div>
					</div>
					{gridEditingOn && (
						<div className={sty.editY}>
							<button
								type="button"
								className="faded-g clickable-g"
								onClick={() => changeGridSize({ action: 'remove-row' })}
							>
								<IoIosRemove className={sty.icon} />
							</button>
							<button
								type="button"
								className="faded-g clickable-g"
								onClick={() => changeGridSize({ action: 'add-row' })}
							>
								<IoIosAdd className={sty.icon} />
							</button>
						</div>
					)}
				</div>
				{gridEditingOn && (
					<div className={sty.editX}>
						<button
							type="button"
							className="faded-g clickable-g"
							onClick={() => changeGridSize({ action: 'remove-col' })}
						>
							<IoIosRemove className={sty.icon} />
						</button>
						<button
							type="button"
							className="faded-g clickable-g"
							onClick={() => changeGridSize({ action: 'add-col' })}
						>
							<IoIosAdd className={sty.icon} />
						</button>
					</div>
				)}
			</div>
			<div style={{ gridArea: 'statusbar' }}>
				<GridStatusBar
					isSaving={isSaving}
					gridEditingOn={gridEditingOn}
					undoGridChanges={undoGridChanges}
					isUpdating={isUpdating}
				/>
			</div>
			<div style={{ gridArea: 'objectstatus' }}>
				{selectedObject && (
					<ObjectStatus
						object={selectedObject}
						refreshObject={refreshObject}
						canEdit={canEdit}
						clipBoardedObject={copiedObject}
						editObject={editObject}
						userSettings={userSettings}
						potentialObjStatusChanges={potentialObjStatusChanges}
					/>
				)}
			</div>
			<div style={{ gridArea: 'footer' }}>
				<Footer
					description={description}
					setDescription={setDescription}
					totalConnectedUsers={totalConnectedUsers}
				/>
			</div>
		</div>
	)
}

Grid.propTypes = {
	description: PropTypes.string.isRequired,
	setDescription: PropTypes.func.isRequired,
	setObjectToolbox: PropTypes.func.isRequired,
	objectToolbox: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
	setGrid: PropTypes.func.isRequired,
	grid: PropTypes.arrayOf(
		PropTypes.arrayOf(
			PropTypes.shape({
				isEmpty: PropTypes.bool,
			})
		)
	).isRequired,
	currStep: PropTypes.number.isRequired,
	clearClipboard: PropTypes.func.isRequired,
	copyObject: PropTypes.func.isRequired,
	copiedObject: PropTypes.shape({}),
	gridEditingOn: PropTypes.bool.isRequired,
	isSaving: PropTypes.bool.isRequired,
	undoGridChanges: PropTypes.func.isRequired,
	userSettings: PropTypes.shape({}),
	totalConnectedUsers: PropTypes.number.isRequired,
	isUpdating: PropTypes.bool.isRequired,
}
Grid.defaultProps = {
	copiedObject: null,
	userSettings: {},
}

const MainGrid = (props) => {
	const { grid, selectedCoords, coordClickHandler } = props

	// Render the grid
	const gridEl = grid.map((row, y) => {
		const rowKey = y
		const cols = row.map((object, x) => {
			const selected = selectedCoords.x === x && selectedCoords.y === y
			const coordKey = x + y
			let backStyles = {}
			let elemStyles = {}
			if (!object.isEmpty) {
				const fieldsInfo = {}
				object.fields.forEach((field) => {
					fieldsInfo[field.slug] = field
				})

				// Manage visual state
				const defaultState = {}
				object.fields.forEach((field) => {
					defaultState[field.slug] = { value: field.value }
				})
				const objectState = merge(defaultState, object.state || {})
				object.visual_states.forEach((vs) => {
					let vState = vs
					let isValid = true
					if (typeof vState === 'string') {
						try {
							vState = JSON.parse(vState)
						} catch (e) {
							isValid = false
						}
					}
					if (!isValid) return
					// special conditions
					let conditionMet = false
					if (vState.s_condition != null) {
						conditionMet = conStringIsValid(
							vState.s_condition,
							{ state: objectState, fields: fieldsInfo },
							{ isSpecialCon: true }
						)
					} else {
						conditionMet = conStringIsValid(vState.condition, {
							state: objectState,
							fields: fieldsInfo,
						})
					}

					if (!conditionMet) return
					backStyles = { ...backStyles, ...vState.back?.style }
					elemStyles = { ...elemStyles, ...vState.elem?.style }
				})
			}

			const styledChild = React.cloneElement(object.element, {
				style: { ...object.element.props.style, ...elemStyles },
			})

			return (
				<button
					type="button"
					key={coordKey}
					onClick={() => coordClickHandler(y, x)}
					className={`${sty.object}${selected ? ` ${sty.selected}` : ''}${
						object.isEmpty ? ` ${sty.isEmpty}` : ''
					}`}
					style={{
						...backStyles,
					}}
				>
					{styledChild}
				</button>
			)
		})
		return (
			<div key={rowKey} style={{ display: 'flex' }}>
				{cols}
			</div>
		)
	})

	return gridEl
}

const GridStatusBar = (props) => {
	const { id, saveSpace } = useContext(SpaceContext)
	const { isSaving, gridEditingOn, undoGridChanges, isUpdating } = props
	let textStatus = 'status bar'
	let textStatusStyle = { color: '#aaa' }
	if (isSaving) {
		textStatus = '...saving'
		textStatusStyle = { ...textStatusStyle, color: '#222' }
	} else if (isUpdating) {
		textStatus = '...updating'
		textStatusStyle = { ...textStatusStyle, color: '#222' }
	} else if (gridEditingOn) {
		textStatus = ''
	}

	return (
		<div
			className="box-g"
			style={{
				display: 'flex',
				justifyContent: 'flex-end',
				padding: '10px',
			}}
		>
			<div style={{ fontWeight: '300', ...textStatusStyle }}>{textStatus}</div>
			{gridEditingOn && (
				<div style={{ display: 'flex' }}>
					<button
						type="button"
						className="btn-g primary"
						style={{ marginRight: '10px' }}
						onClick={() =>
							saveSpace({ spaceId: id, allPUT: false, gridPUT: true })
						}
					>
						Confirm Grid
					</button>
					<button
						type="button"
						className="btn-g clear"
						style={{ marginBottom: '0' }}
						onClick={() => {
							undoGridChanges()
						}}
					>
						Cancel
					</button>
				</div>
			)}
		</div>
	)
}

GridStatusBar.propTypes = {
	isSaving: PropTypes.bool.isRequired,
	gridEditingOn: PropTypes.bool.isRequired,
	undoGridChanges: PropTypes.func.isRequired,
	isUpdating: PropTypes.bool.isRequired,
}

export default Grid
