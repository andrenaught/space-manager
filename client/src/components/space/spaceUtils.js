import React, { useState, useEffect, useContext } from 'react'
import PropTypes from 'prop-types'
import { MdStarBorder, MdStar } from 'react-icons/md'
import { IoIosRemoveCircle, IoIosAddCircle } from 'react-icons/io'
import useFetch from 'src/components/utils/useFetch'
import { AuthContext } from 'src/Store'
import { convertGridToDB, removeFromGrid } from './grid/gridUtils'
import sty from './Space.module.scss'

// Have to define it here to prevent import/no-cycle
export const SpaceContext = React.createContext()

// For extracting database object data to frontend,
// - similar to "convertGridToFrontend" but for individual objects (used for object kits)
const convertObjectToFrontend = (objects) => {
	if (!objects || !objects.length || objects.length === 0) {
		return []
	}

	let lastIndex = 0
	return objects.map((object) => {
		let element = null
		if (object.type === 'image') {
			element = (
				<img
					style={{ height: '28px', width: '28px' }}
					src={object.display}
					alt=""
				/>
			)
		}

		// Local index is crucial to proper grid rendering - used as a reference as to which object to use
		const index = object.localId || lastIndex + 1
		lastIndex = index
		// const index = i
		return { ...object, element, localId: index }
	})
}

// For extracting frontend object data to database,
// - similar to "convertGridToDB" but for individual objects (used for object kits)
const convertObjectToDB = (objects) =>
	objects.map((object) => {
		const objectCopy = { ...object } // want to get a COPY of object before deleting - this way we dont mess with the original (aka 'parent') object
		delete objectCopy.element // dont want to store elements on database
		return objectCopy
	})

// Rendering an individual object
const RenderedObject = (props) => {
	const { object } = props
	if (!object) return null

	if (object.type === 'image') {
		return (
			<img
				style={{ height: '28px', width: '28px' }}
				src={object.display}
				alt=""
			/>
		)
	}

	return (
		<img
			style={{ height: '28px', width: '28px' }}
			src="/static/placeholder.jpg"
			alt=""
		/>
	)
}
RenderedObject.propTypes = {
	object: PropTypes.shape({
		display: PropTypes.string,
		type: PropTypes.string.isRequired,
	}).isRequired,
}

const QuickActions = (props) => {
	const { id } = useContext(SpaceContext)
	const { isLoggedIn } = useContext(AuthContext)
	const appFetch = useFetch()
	const { isFavorited, setIsFavorited } = props

	const [tooltipIsHidden, hideTooltip] = useState(false)
	const addToFavorites = async () => {
		const { ok } = await appFetch(`/api/spaces/${id}/favorites`, {
			method: 'POST',
		})
		if (!ok) return

		hideTooltip(true)
		setIsFavorited(true)
	}

	const removeFromFavorites = async () => {
		const { ok } = await appFetch(`/api/spaces/${id}/favorites`, {
			method: 'DELETE',
		})
		if (!ok) return

		hideTooltip(true)
		setIsFavorited(false)
	}

	let classList = `${sty.quickActionList}`
	if (tooltipIsHidden) classList += ` ${sty.hideTooltip}`

	if (!isLoggedIn) return null

	return (
		<div className={classList} onMouseEnter={() => hideTooltip(false)}>
			<div className={sty.actionItem}>
				{
					// if already saved
					isFavorited ? (
						<>
							<div className={sty.tooltip}>Remove from your saved spaces</div>
							<MdStar
								onClick={() => removeFromFavorites()}
								style={{ color: '#f0be78' }}
								className={`${sty.icon} icon inactive`}
							/>
						</>
					) : (
						// if not yet saved
						<>
							<div className={sty.tooltip}>Add to your saved spaces</div>
							<MdStarBorder
								onClick={() => addToFavorites()}
								className={`${sty.icon} icon inactive`}
							/>
						</>
					)
				}
			</div>
		</div>
	)
}

QuickActions.propTypes = {
	isFavorited: PropTypes.bool.isRequired,
	setIsFavorited: PropTypes.func.isRequired,
}

const ObjectKitEditor = (props) => {
	const { id, saveSpace } = useContext(SpaceContext)
	const { onCancel, grid, setGrid, objectToolbox, setObjectToolbox } = props
	const appFetch = useFetch()

	const [thisObjectToolbox, setThisObjectToolbox] = useState(objectToolbox)
	const [changeOccured, setChangeOccured] = useState(false)
	const [selectedKit, selectKit] = useState(null)
	const [mounted, setMounted] = useState(false)
	const [removeWarningShown, showRemoveWarning] = useState(false)
	const [coreObjectKits, setCoreObjectKits] = useState([])
	const [objects, setObjects] = useState([])

	const saveObjectKit = () => {
		// remove instances of objects that have been removed from the kit
		const objectsRemoved = objectToolbox.filter((x) => {
			const notFound = !thisObjectToolbox.find((y) => y.slug === x.slug)
			return notFound
		})

		const newGrid = removeFromGrid(grid, objectsRemoved)
		setGrid(newGrid)

		// edit kit
		setObjectToolbox(thisObjectToolbox)
		const { DBGrid, DBGridValues } = convertGridToDB(newGrid)
		saveSpace({
			spaceId: id,
			allPUT: false,
			bodyOverride: {
				grid: DBGrid,
				gridValues: DBGridValues,
				objects: convertObjectToDB(thisObjectToolbox),
			},
		})
		props.onConfirm()
	}
	const getCoreObjectKits = async () => {
		const { data, ok } = await appFetch(`/api/objects/object_kits`)
		if (!ok) return

		setCoreObjectKits(data.object_kits)
	}
	const loadObjectKit = async (catId) => {
		const { data, ok } = await appFetch(`/api/objects/object_kits/${catId}`)
		if (!ok) return

		setObjects(data.object_kit.objects)
	}

	const removeObject = (i) => {
		const copy = thisObjectToolbox.slice()
		copy.splice(i, 1)
		setThisObjectToolbox(copy)
		showRemoveWarning(true)
	}

	const addObject = (object) => {
		const alreadyExists = thisObjectToolbox.find((x) => x.slug === object.slug)
		if (alreadyExists) return
		setThisObjectToolbox(
			convertObjectToFrontend([...thisObjectToolbox, object])
		)
	}

	useEffect(() => {
		getCoreObjectKits()
		setMounted(true)
	}, [])

	useEffect(() => {
		if (mounted) {
			setChangeOccured(true)
		}
	}, [thisObjectToolbox])

	return (
		<div className="box-g" style={{ margin: '10px 0px', padding: '10px' }}>
			<div className="label-g" style={{ marginBottom: '5px' }}>
				Prebuilt kits
			</div>
			{coreObjectKits.map((kit) => {
				const selected = kit.id === selectedKit?.id
				return (
					<button
						type="button"
						key={kit.id}
						className="btn-g small"
						disabled={selected}
						style={{ marginRight: '5px' }}
						onClick={() => {
							selectKit(kit)
							loadObjectKit(kit.id)
						}}
					>
						{kit.name}
					</button>
				)
			})}
			{selectedKit && (
				<div style={{ marginBottom: '10px' }}>
					<div className={`label-g ${sty.kitLabel}`}>
						{`${selectedKit.name} Kit`}
					</div>
					<div style={{ display: 'flex' }}>
						{objects?.map((object) => {
							const alreadyExists = thisObjectToolbox.find(
								(x) => x.slug === object.slug
							)
							const isSelected = false
							return (
								<div key={object.id} className={sty.kitObjectCont}>
									<div
										className={`${isSelected && sty.selected} ${sty.object}`}
									>
										<RenderedObject object={object} />
									</div>
									<button
										type="button"
										disabled={alreadyExists}
										style={alreadyExists ? { color: '#ddd' } : {}}
										onClick={() => addObject(object)}
									>
										<IoIosAddCircle />
									</button>
								</div>
							)
						})}
					</div>
				</div>
			)}
			{/* Current Kit */}
			<div className={`label-g ${sty.kitLabel}`}>Current Kit</div>
			<div style={{ display: 'flex' }}>
				{thisObjectToolbox.map((object, i) => {
					const isSelected = false
					return (
						<div key={object.id} className={sty.kitObjectCont}>
							<div className={`${isSelected && sty.selected} ${sty.object}`}>
								<RenderedObject object={object} />
							</div>
							<button
								className="color-danger-g"
								type="button"
								onClick={() => removeObject(i)}
							>
								<IoIosRemoveCircle />
							</button>
						</div>
					)
				})}
			</div>

			{removeWarningShown && (
				<div>
					<small className="danger-color-g">
						WARNING: Removing objects from the kit will also remove all
						instances of it in the space.
					</small>
				</div>
			)}
			<div style={{ display: 'flex', marginTop: '10px' }}>
				{changeOccured && (
					<button
						type="button"
						onClick={() => saveObjectKit()}
						className="btn-g primary small"
						style={{ marginRight: '5px' }}
					>
						Confirm
					</button>
				)}
				<button
					type="button"
					onClick={() => onCancel()}
					className="btn-g small"
				>
					Cancel
				</button>
			</div>
		</div>
	)
}

ObjectKitEditor.propTypes = {
	onConfirm: PropTypes.func.isRequired,
	onCancel: PropTypes.func.isRequired,
	grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.shape({}))).isRequired,
	setGrid: PropTypes.func.isRequired,
	objectToolbox: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
	setObjectToolbox: PropTypes.func.isRequired,
}

export {
	convertObjectToFrontend,
	convertObjectToDB,
	QuickActions,
	ObjectKitEditor,
}
