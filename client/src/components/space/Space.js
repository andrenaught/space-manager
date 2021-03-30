import React, { useContext, useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { useParams } from 'react-router-dom'
import { MdModeEdit } from 'react-icons/md'
import io from 'socket.io-client'
import { DownChevron } from 'src/components/assets/svg'
import useFetch from 'src/components/utils/useFetch'
import { ErrorPage } from 'src/components/utils/ErrorPage'
import Grid from './grid/Grid'
import Sidebar from './Sidebar'
import sty from './Space.module.scss'
import {
	convertGridToDB,
	convertGridToFrontend,
	getDefaultGrid,
} from './grid/gridUtils'
import {
	SpaceContext,
	convertObjectToFrontend,
	convertObjectToDB,
	QuickActions,
	ObjectKitEditor,
} from './spaceUtils'
import { useDebounce } from '../utils/core'
import { AuthContext } from '../../Store'

const socket = io({
	autoConnect: false,
})
const userSettings = {
	lockedFields: false,
}

const Space = (props) => {
	const { rows, cols } = props
	const appFetch = useFetch()
	const { id } = useParams()
	const { user, isLoggedIn } = useContext(AuthContext)

	const [statusCode, setStatusCode] = useState(null)
	const [isUpdating, setIsUpdating] = useState(false)
	const [totalConnectedUsers, setTotalConnectedUsers] = useState(0)
	const [spaceIsLoading, setSpaceIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [objectToolbox, setObjectToolbox] = useState([])
	const [userPermissions, setUserPermissions] = useState(null)
	const [name, setName] = useState(null)
	const [origName, setOrigName] = useState(null)
	const debouncedName = useDebounce(name, 3000, { isReady: name != null })
	const [description, setDescription] = useState(null)
	const [origDescription, setOrigDescription] = useState(null)
	const debouncedDescription = useDebounce(description, 3000, {
		isReady: description != null,
	})
	const [isFavorited, setIsFavorited] = useState(false)
	const [settings, setSettings] = useState({})
	const [grid, setGrid] = useState(getDefaultGrid(rows, cols))
	const [origGrid, setOrigGrid] = useState([[]])
	const [copiedObject, copyObject] = useState(null)
	const [currStep, goToStep] = useState(0)
	const [pendingChanges, setPendingChanges] = useState({})

	// Using refs to have access to react state when unmounting
	const idRef = useRef(null)
	idRef.current = id
	const nameRef = useRef(null)
	nameRef.current = name
	const descriptionRef = useRef(null)
	descriptionRef.current = description
	const userPermissionsRef = useRef(null)
	userPermissionsRef.current = userPermissions
	const pendingChangesRef = useRef(null)
	pendingChangesRef.current = pendingChanges

	// Sidebar settings
	const [isPublic, setIsPublic] = useState(null)
	const [gridEditingOn, setGridEditingOn] = useState(false)
	const [objectKitEditingOn, setObjectKitEditingOn] = useState(false)

	const loadSpace = async (spaceId) => {
		const { data, ok, response } = await appFetch(`/api/spaces/${spaceId}`)
		if (!ok) {
			setStatusCode(response.status)
			return
		}
		const { space, permissions } = data
		setUserPermissions(permissions)
		setName(space.name)
		setOrigName(space.name)
		setDescription(space.description || '')
		setOrigDescription(space.description || '')
		setIsPublic(space.is_public)
		setSettings(space.settings || {})
		setIsFavorited(data.isFavorited)
		let objects1
		if (space.objects) {
			objects1 = convertObjectToFrontend(space.objects)
			setObjectToolbox(objects1)
		}
		if (space.grid && objects1) {
			const grid1 = convertGridToFrontend(
				space.grid,
				space.grid_values,
				objects1
			)
			setGrid(grid1)
			setOrigGrid(grid1)
		}
		if (!space.objects || !space.grid) {
			setGrid(getDefaultGrid(rows, cols))
			setOrigGrid(getDefaultGrid(rows, cols))
		}

		setSpaceIsLoading(false)
	}

	const saveSpace = async ({
		spaceId,
		allPUT,
		objectKitPUT = false,
		gridPUT = false,
		gridValuesPUT = false,
		namePUT = false,
		descriptionPUT = false,
		publicPUT = false,
		settingsPUT = false,
		triggerSocket = false, // when true, the server will emit an update for this space (including self - so this is only used when user leaves)
		bodyOverride = null, // This is useful for when react state has not updated yet, in other words: the new values aren't available yet.
	}) => {
		if (allPUT == null || spaceId == null)
			throw new Error('required parameters missings')

		const { DBGrid, DBGridValues } = convertGridToDB(grid)
		const DBOjbectToolbox = convertObjectToDB(objectToolbox)
		const defaultBody = {
			...((allPUT || gridPUT) && { grid: DBGrid }),
			...((allPUT || gridValuesPUT) && { gridValues: DBGridValues }),
			...((allPUT || objectKitPUT) && {
				objects: DBOjbectToolbox,
			}),
			...((allPUT || namePUT) && { name }),
			...((allPUT || descriptionPUT) && { description }),
			...((allPUT || publicPUT) && { isPublic }),
			...((allPUT || settingsPUT) && { settings }),
			...(triggerSocket && { triggerSocket }),
		}
		const body = bodyOverride != null ? bodyOverride : defaultBody
		setIsSaving(true)
		const { ok } = await appFetch(`/api/spaces/${spaceId}`, {
			method: 'PUT',
			body: JSON.stringify(body),
		})

		setTimeout(() => {
			setIsSaving(false)
		}, 400)
		setGridEditingOn(false)

		if (!ok) {
			setIsSaving(false)
			return
		}

		if (body.grid || body.gridValues || body.objects) {
			const updatedGrid = convertGridToFrontend(
				body.grid ? body.grid : DBGrid,
				body.gridValues ? body.gridValues : DBGridValues,
				body.objects ? body.objects : DBOjbectToolbox
			)
			setOrigGrid(updatedGrid)
		}
		if (body.name) setOrigName(name)
		if (body.description) setOrigDescription(description)
		// Prevent double updates
		if (!body.triggerSocket) {
			socket.emit('update space', {
				spaceId,
			})
		}
	}

	const undoGridChanges = () => {
		setGrid(origGrid)
		setGridEditingOn(false)
	}

	// Handle before user leaves page
	const onUserLeave = () => {
		if (Object.entries(pendingChangesRef.current).length === 0) return

		// save changes to data that is normally debounced
		// since only owner can change name and description anyways (save server resources)
		// Using refs so that we can still access react state when unmounting
		if (userPermissionsRef.current.type !== 'owner') return
		const body = {
			...(pendingChangesRef.current.name && { name: nameRef.current }),
			...(pendingChangesRef.current.description && {
				description: descriptionRef.current,
			}),
			triggerSocket: true,
		}
		saveSpace({
			spaceId: idRef.current,
			allPUT: false,
			bodyOverride: body,
		})
	}

	useEffect(() => {
		const isValid = id && !Number.isNaN(Number(id))
		if (isLoggedIn && user == null) return () => {} // wait for user info

		if (isValid) {
			// Load
			socket.open()
			setPendingChanges({})
			setSpaceIsLoading(true)
			loadSpace(id)

			// On socket connect or reconnect, send user info if available
			socket.on('connect', () => {
				socket.emit('join room', {
					id,
					...(user != null && {
						user: { id: user.id, username: user.username },
					}),
				})
			})
			// "user joined" will include current client, so this will run initially no matter what
			socket.on('user joined', (val) => {
				setTotalConnectedUsers(val.totalConnectedUsers)
			})
			socket.on('user disconnected', () => {
				setTotalConnectedUsers((curr) => curr - 1)
			})
			// When another user has updated the space, reload the space.
			// POSSIBLE IMPROVEMENT:
			// - We could either:
			//   (1) Only reload column from DB that has changed
			//   (2) dont save to DB yet, instead save changed data in server memory. Then periodically clear changed data in server memory and save to DB.
			//   (3) a mixture of 1 and 2, depending on the data.
			// - Will need to research more on optimizing this.
			socket.on('space has updated', async () => {
				setIsUpdating(true)
				await loadSpace(id) // refresh data
				setIsUpdating(false)
			})
		} else {
			setStatusCode(404)
		}

		if (isValid) {
			window.addEventListener('beforeunload', onUserLeave) // Will run when user completely leaves from app (refresh, tab close, window close)
			return () => {
				// Will run when user leaves page (but still within the app)
				window.removeEventListener('beforeunload', onUserLeave)
				onUserLeave()
				socket.close()
			}
		}
		return () => {}
	}, [id, user])

	// auto save on name & description
	useEffect(() => {
		// skip initial state & precaution if no changes were made (helpful in dev mode)
		if (spaceIsLoading || name === origName) return

		setPendingChanges({ ...pendingChanges, name: true })
	}, [name])
	useEffect(() => {
		if (spaceIsLoading || description === origDescription) return

		setPendingChanges({ ...pendingChanges, description: true })
	}, [description])
	useEffect(() => {
		// skip initial state & precaution if no changes were made (helpful in dev mode)
		if (spaceIsLoading || debouncedName === origName) return

		saveSpace({ spaceId: id, allPUT: false, namePUT: true })
		const copy = pendingChanges
		delete copy.name
		setPendingChanges(copy)
	}, [debouncedName])
	useEffect(() => {
		if (spaceIsLoading || debouncedDescription === origDescription) return

		saveSpace({ spaceId: id, allPUT: false, descriptionPUT: true })
		const copy = pendingChanges
		delete copy.description
		setPendingChanges(copy)
	}, [debouncedDescription])

	if (statusCode) return <ErrorPage code={statusCode} />
	if (spaceIsLoading)
		return (
			<div className="content-section-g screen-centered">Loading space...</div>
		)

	return (
		<SpaceContext.Provider
			value={{
				id,
				saveSpace,
				userPermissions,
				settings,
				setPendingChanges,
			}}
		>
			<div className={sty.container}>
				{userPermissions.type === 'owner' && (
					<Sidebar
						clearClipboard={() => {
							copyObject(null)
						}}
						settings={settings}
						setSettings={setSettings}
						gridEditingOn={gridEditingOn}
						setGridEditingOn={setGridEditingOn}
						isPublic={isPublic}
						setIsPublic={setIsPublic}
					/>
				)}
				<div className={`container-g ${sty.mainContainer}`}>
					<div>
						<QuickActions
							isFavorited={isFavorited}
							setIsFavorited={setIsFavorited}
						/>
						<div>
							<input
								className={`input-g ${sty.titleInput}`}
								maxLength="15"
								type="text"
								value={name || ''}
								placeholder="Name"
								onChange={(e) => {
									setName(e.target.value)
								}}
								disabled={userPermissions.type !== 'owner'}
							/>
						</div>
						<div style={{ marginBottom: '20px' }}>
							<ObjectKit
								objectKitEditingOn={objectKitEditingOn}
								setObjectKitEditingOn={setObjectKitEditingOn}
								objectToolbox={objectToolbox}
								copiedObject={copiedObject}
								copyObject={copyObject}
							/>

							{objectKitEditingOn && (
								<ObjectKitEditor
									grid={grid}
									setGrid={setGrid}
									onConfirm={() => setObjectKitEditingOn(false)}
									onCancel={() => setObjectKitEditingOn(false)}
									objectToolbox={objectToolbox}
									setObjectToolbox={setObjectToolbox}
								/>
							)}
						</div>
						<div>
							<Grid
								setObjectToolbox={setObjectToolbox}
								objectToolbox={objectToolbox}
								setGrid={setGrid}
								grid={grid}
								onGridUpdate={(updatedGrid) => setGrid(updatedGrid)}
								gridEditingOn={gridEditingOn}
								copyObject={copyObject}
								copiedObject={copiedObject}
								clearClipboard={() => {
									copyObject(null)
								}}
								currStep={currStep}
								userSettings={userSettings}
								undoGridChanges={undoGridChanges}
								// For footer
								isSaving={isSaving}
								goToStep={goToStep}
								description={description}
								setDescription={setDescription}
								totalConnectedUsers={totalConnectedUsers}
								isUpdating={isUpdating}
							/>
						</div>
					</div>
				</div>
			</div>
		</SpaceContext.Provider>
	)
}

Space.defaultProps = {
	rows: 4,
	cols: 6,
}
Space.propTypes = {
	rows: PropTypes.number,
	cols: PropTypes.number,
}

const ObjectKit = (props) => {
	const { userPermissions } = useContext(SpaceContext)
	const {
		objectKitEditingOn,
		setObjectKitEditingOn,
		objectToolbox,
		copiedObject,
		copyObject,
	} = props

	return (
		<div className={sty.objectKit}>
			<button
				type="button"
				className={`${sty.label} ${objectKitEditingOn && sty.toggledOn}`}
				onClick={() => setObjectKitEditingOn(true)}
				disabled={userPermissions.type !== 'owner'}
			>
				<div className={sty.text}>OBJECT KIT</div>
				{userPermissions.type === 'owner' && (
					<>
						<div className={sty.showOnIdle}>
							<DownChevron style={{ fontSize: '10px' }} />
						</div>
						<div className={sty.showOnHover}>
							<div>
								<span>EDIT</span>
								<MdModeEdit
									style={{ verticalAlign: 'middle', marginBottom: '3px' }}
								/>
							</div>
						</div>
					</>
				)}
			</button>
			<div className={sty.separator} />
			<div style={{ display: 'flex', margin: '0px 10px', overflow: 'auto' }}>
				{objectToolbox.map((object) => {
					const isSelected = copiedObject && object.name === copiedObject.name
					return (
						<button
							key={object.id}
							type="button"
							onClick={() => {
								copyObject(object)
							}}
							className={`${isSelected && sty.selected} ${sty.object}`}
						>
							{object.element}
						</button>
					)
				})}
			</div>
		</div>
	)
}

ObjectKit.propTypes = {
	objectKitEditingOn: PropTypes.bool.isRequired,
	setObjectKitEditingOn: PropTypes.func.isRequired,
	objectToolbox: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
	copiedObject: PropTypes.shape({
		name: PropTypes.string,
	}),
	copyObject: PropTypes.func.isRequired,
}
ObjectKit.defaultProps = {
	copiedObject: null,
}

export default Space
