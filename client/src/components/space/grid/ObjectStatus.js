import React, { useState, useEffect, useContext } from 'react'
import PropTypes from 'prop-types'
import { IoIosAdd, IoIosRemoveCircle } from 'react-icons/io'
import merge from 'deepmerge'
import { Modal } from 'src/components/UI'
import { stringToJSON } from 'src/components/utils/core'
import { conStringIsValid } from 'src/components/utils/exprEval'
import sty from './Grid.module.scss'
import {
	FieldAdderForm,
	getObjectFieldInfo,
	ObjectFieldInput,
	objectFieldValue,
} from './objectStatusUtils'
import { emptyObject } from './gridUtils'
import { SpaceContext } from '../spaceUtils'

const ObjectStatus = (props) => {
	const { userPermissions, settings } = useContext(SpaceContext)
	const {
		object,
		clipBoardedObject,
		userSettings,
		canEdit,
		refreshObject,
		potentialObjStatusChanges,
	} = props
	const isFromObjectKit = Boolean(clipBoardedObject)
	const [fieldAdderIsOpen, openFieldAdder] = useState(false)
	const [confirmRemoveIsOpen, openConfirmRemove] = useState(false)
	const [changeOccured, setChangeOccured] = useState(false)
	// if !userSettings.fieldsLocked then editing is never locked
	const [editingIsEnabled, enableEditing] = useState(!userSettings.fieldsLocked)
	const [advEditingIsEnabled, enableAdvEditing] = useState(false)
	// --- Logic ---
	// adding parts of the object to state, to make editable
	const [fields, setFields] = useState(null) // fields of the object, can be edited
	const [state, setState] = useState(null) // values for the fields of an object
	const [visStates, setVisStates] = useState([]) // visual states of an object

	const submitEdits = ({
		newState,
		newFields,
		newVisStates,
		updateBackend = false,
	}) => {
		props.editObject({
			allPUT: false,
			objectKitPUT: isFromObjectKit,
			gridValuesPUT: !isFromObjectKit,
			pos: object.pos,
			newObject: {
				...object,
				...(newState != null && { state: newState }),
				...(newFields != null && { fields: newFields }),
				...(newVisStates != null && { visual_states: newVisStates }),
			},
			updateBackend,
		})
		refreshObject()
	}

	// Warn user if closing tab while editing
	useEffect(() => {
		const onWindowClose = (event) => {
			if (editingIsEnabled && changeOccured) {
				event.preventDefault()
				// eslint-disable-next-line no-param-reassign
				event.returnValue = ''
			}
		}

		window.addEventListener('beforeunload', onWindowClose)

		return () => {
			window.removeEventListener('beforeunload', onWindowClose)
		}
	}, [editingIsEnabled, changeOccured])

	const refresh = () => {
		enableEditing(!isFromObjectKit)
		setChangeOccured(false)
		enableAdvEditing(false)
		openConfirmRemove(false)
	}

	// On Object change, update state
	useEffect(() => {
		if (object) {
			setFields(object.fields || [])
			setState(object.state || {})
			setVisStates(object.visual_states || [])
		}
		refresh()
	}, [object])

	useEffect(() => {
		if (potentialObjStatusChanges === 0) return
		if (!changeOccured) {
			// dont interrupt current editing
			refreshObject()
		}
	}, [potentialObjStatusChanges])

	const fieldInputOnChange = ({ key, slug, overrideVal, e }) => {
		const value = objectFieldValue({ overrideVal, e })

		setChangeOccured(true)
		const newState = { [slug]: { value } }
		const updatedState = merge(state, newState) // Updating state - need deep object merging here (rather than shallow merging)
		setState(updatedState)
		if (isFromObjectKit) {
			const newFields = fields.map((field) => ({ ...field })) // do a deep clone to ensure it does not reference old array
			newFields[key].value = value
			setFields(newFields)
		}
	}

	const undoChanges = () => {
		setFields(object.fields || [])
		setState(object.state || {})
		setVisStates(object.visual_states || [])
		setChangeOccured(false)
		if (userSettings.fieldsLocked || isFromObjectKit) {
			enableAdvEditing(false)
			enableEditing(false)
		}
	}

	const confirmEdits = ({ isValid }) => {
		if (!isValid) return

		const visStatesClean = visStates.map((vs) => stringToJSON(vs) || vs) // Remove unecessary white space
		if (editingIsEnabled)
			submitEdits({
				updateBackend: true,
				newState: state,
				newFields: fields,
				newVisStates: visStatesClean,
				gridPUT: true,
			})
		setChangeOccured(false)
		if (userSettings.fieldsLocked || isFromObjectKit) {
			enableAdvEditing(false)
			enableEditing(false)
		}
	}

	// Interacting with the supplement buttons that use onActionClick on grid objects will trigger a state save
	const onActionClick = (
		newState,
		updateBackend,
		{ mustSaveFirst = false } = {}
	) => {
		// For preview
		if (advEditingIsEnabled && isFromObjectKit) {
			const updatedState = merge(state, newState)
			setState(updatedState) // create previewState state instead so it cant be saved in backend
			setChangeOccured(true)
			return
		}

		if (mustSaveFirst && changeOccured) {
			alert('Save changes first')
			return
		}
		const updatedState = merge(state, newState) // Updating state - need deep object merging here (rather than shallow merging)
		setState(updatedState)
		if (updateBackend) {
			submitEdits({ newState: updatedState, updateBackend, gridPUT: true })
		}
	}

	const addField = (newField) => {
		setFields([...fields, newField])
		setChangeOccured(true)
	}

	const deleteObject = () => {
		props.editObject({
			allPUT: false,
			gridPUT: true,
			gridValuesPUT: true,
			pos: object.pos,
			newObject: {
				...emptyObject,
				pos: { x: object.x, y: object.y },
			},
			updateBackend: true,
		})
	}

	if (!object || object.isEmpty) return null

	const canEditFields =
		userPermissions.type === 'owner' ||
		(!isFromObjectKit &&
			userPermissions.type === 'member' &&
			settings.permissions.gridVals === 'member') ||
		(!isFromObjectKit && settings.permissions.gridVals === 'public')

	const showConfirmCancel =
		isFromObjectKit || (!userSettings.fieldsLocked && changeOccured)

	let backStyles = {}
	let elemStyles = {}
	visStates.forEach((vs) => {
		let vState = vs
		vState = stringToJSON(vState)
		if (!vState) return

		const fieldInfo = {}
		fields.forEach((field) => {
			fieldInfo[field.slug] = field
		})
		let conditionMet
		if (vState.s_condition) {
			conditionMet = conStringIsValid(
				vState.s_condition,
				{ state, fields: fieldInfo },
				{ isPreview: true, isSpecialCon: true }
			)
		} else {
			conditionMet = conStringIsValid(
				vState.condition,
				{ state, fields: fieldInfo },
				{ isPreview: true }
			)
		}

		if (!conditionMet) return
		backStyles = { ...backStyles, ...vState.back?.style }
		elemStyles = { ...elemStyles, ...vState.elem?.style }
	})

	const visStateObjPreview = (
		<button
			type="button"
			onClick={() => {}}
			className={`${sty.object}${object.isEmpty ? ' empty-object' : ''}`}
			style={{
				...backStyles,
			}}
		>
			{React.cloneElement(object.element, {
				style: { ...object.element.props.style, ...elemStyles },
			})}
		</button>
	)

	let hasInvalidInput = false

	return (
		<div
			className={`${sty.objectStatusContainer} ${
				isFromObjectKit ? sty.isFromObjectKit : ''
			}`}
		>
			<div className={sty.header}>
				<span className={sty.element}>{object.element}</span>
				<span className={sty.name}>{object.name}</span>
			</div>

			{/* Object editing */}
			<form onSubmit={(e) => e.preventDefault()}>
				{fields && (
					<>
						<div className="label-g">
							<span style={{ paddingRight: '6px' }}>
								{isFromObjectKit ? 'FIELDS (DEFAULTS)' : 'FIELDS'}
							</span>
							{!isFromObjectKit ||
								(userPermissions.type === 'owner' && (
									<button
										type="button"
										className="clickable-g primary"
										onClick={() => {
											enableEditing(true)
										}}
										style={editingIsEnabled ? { display: 'none' } : {}}
									>
										EDIT
									</button>
								))}
						</div>
						{editingIsEnabled && isFromObjectKit && !advEditingIsEnabled && (
							<div className="label-g" style={{ marginBottom: '15px' }}>
								<button
									type="button"
									className="clickable-g primary small"
									onClick={() => enableAdvEditing(true)}
								>
									ADVANCED EDIT
								</button>
							</div>
						)}

						{/* Visual State editing */}
						{advEditingIsEnabled && (
							<div>
								<div className="label-g">Advanced</div>
								<div className={sty.advEditing}>
									<div className="label-g small">Visual State</div>
									{visStates.map((visualState, i) => {
										let isValid = true
										if (!stringToJSON(visualState)) {
											isValid = false
											hasInvalidInput = true
										}
										const key = i
										return (
											<div key={key} style={{ display: 'flex' }}>
												<input
													className={`input-g small${
														!isValid ? ' invalid' : ''
													}`}
													type="text"
													value={
														typeof visualState === 'object'
															? JSON.stringify(visualState)
															: visualState
													}
													onChange={(e) => {
														const newVisState = visStates.slice()
														newVisState[i] = e.target.value
														setVisStates(newVisState)
														setChangeOccured(true)
													}}
												/>
												<button
													className="color-danger-g"
													type="button"
													style={{ marginLeft: '5px', marginBottom: '10px' }}
													onClick={() => {
														const newVisState = visStates.filter(
															(_vs, index) => index !== i
														)
														setVisStates(newVisState)
														setChangeOccured(true)
													}}
												>
													<IoIosRemoveCircle />
												</button>
											</div>
										)
									})}
									<button
										className="btn-g small"
										type="button"
										onClick={() => {
											setVisStates([
												...visStates,
												{
													condition: '',
													back: { style: {} },
													elem: { style: {} },
												},
											])
											setChangeOccured(true)
										}}
									>
										+ add
									</button>
									<div style={{ margin: '5px 0px' }}>
										<small>Preview (based on default values)</small>
										<div style={{ marginTop: '5px' }}>{visStateObjPreview}</div>
									</div>
								</div>
							</div>
						)}

						{/* Object fields */}
						<div style={{ marginTop: '15px' }}>
							{fields.length > 0 &&
								fields.map((field, i) => {
									let { value } = field
									const fieldState = state[field.slug]
									if (fieldState) {
										value = fieldState.value
									}
									const fieldInfo = getObjectFieldInfo(
										field,
										fieldState,
										onActionClick
									)
									return (
										<div className={sty.objectField} key={field.slug}>
											<div className="label-g small">
												<span style={{ paddingRight: '3px' }}>
													{field.name}
												</span>
												{fieldInfo.icon}
											</div>
											{advEditingIsEnabled && (
												<div
													className="label-g small no-marg no-upper"
													style={{ marginBottom: '3px' }}
												>
													<span>{`(${field.slug})`}</span>
												</div>
											)}
											{canEdit && (
												<ObjectFieldInput
													name={field.slug}
													type={field.type}
													value={value || ''}
													className="input-g small no-marg"
													disabled={!canEditFields || !editingIsEnabled}
													onChange={(e, overrideVal) => {
														fieldInputOnChange({
															key: i,
															slug: field.slug,
															overrideVal,
															e,
														})
													}}
												/>
											)}
											{fieldInfo.supplement &&
												(!isFromObjectKit ||
													(isFromObjectKit && advEditingIsEnabled)) && (
													<div>{fieldInfo.supplement}</div>
												)}
										</div>
									)
								})}
							{isFromObjectKit && editingIsEnabled && (
								<div>
									<button
										type="button"
										className="btn-g striped faded"
										style={{ marginBottom: '20px' }}
										onClick={() => openFieldAdder(true)}
									>
										<IoIosAdd
											style={{ fontSize: '20px', marginRight: '5px' }}
										/>
										Add field
									</button>
								</div>
							)}
						</div>
					</>
				)}

				{/* Confirm edits */}
				{editingIsEnabled && showConfirmCancel && (
					<>
						<div style={{ display: 'flex', marginBottom: '10px' }}>
							{showConfirmCancel && (
								<button
									type="submit"
									className="btn-g primary"
									style={{ marginRight: '10px' }}
									onClick={() => {
										confirmEdits({
											isValid: !(!changeOccured || hasInvalidInput),
										})
									}}
									disabled={!changeOccured || hasInvalidInput}
								>
									Confirm
								</button>
							)}
							{showConfirmCancel && (
								<button
									type="button"
									className="btn-g clear"
									onClick={() => {
										undoChanges()
										enableAdvEditing(false)
										if (isFromObjectKit) {
											enableEditing(false)
										}
									}}
								>
									Cancel
								</button>
							)}
						</div>
						{isFromObjectKit && (
							<div className="faded-g" style={{}}>
								<small>(applies to all objects of this type)</small>
							</div>
						)}
					</>
				)}
			</form>

			{/* Modal - Add new field */}
			<Modal
				isOpen={fieldAdderIsOpen}
				closeFunc={() => openFieldAdder(false)}
				boxStyle={{ width: '550px', height: '400px' }}
			>
				<FieldAdderForm
					openFieldAdder={openFieldAdder}
					addField={addField}
					fields={fields}
				/>
			</Modal>

			{/* Remove object */}
			{userPermissions.type === 'owner' && !isFromObjectKit && !changeOccured && (
				<div
					className="label-g"
					style={{ marginTop: '0px', marginBottom: '15px' }}
				>
					{confirmRemoveIsOpen ? (
						<div>
							<span className="label-g small" style={{ marginTop: '0px' }}>
								Are you sure?
							</span>
							<button
								type="button"
								className="btn-g danger small"
								onClick={() => deleteObject()}
							>
								REMOVE OBJECT
							</button>
							<button
								type="button"
								className="btn-g clear small"
								onClick={() => openConfirmRemove(false)}
							>
								Cancel
							</button>
						</div>
					) : (
						<button
							type="button"
							className="clickable-g danger small"
							style={!editingIsEnabled ? { display: 'none' } : {}}
							onClick={() => openConfirmRemove(true)}
						>
							REMOVE OBJECT
						</button>
					)}
				</div>
			)}
		</div>
	)
}

ObjectStatus.defaultProps = {
	clipBoardedObject: {},
}
ObjectStatus.propTypes = {
	object: PropTypes.shape({
		name: PropTypes.string,
		pos: PropTypes.shape({}),
		element: PropTypes.element,
		isEmpty: PropTypes.bool,
		x: PropTypes.number,
		y: PropTypes.number,
		fields: PropTypes.arrayOf(PropTypes.shape({})),
		state: PropTypes.shape({}),
		visual_states: PropTypes.arrayOf(PropTypes.shape({})),
	}).isRequired,
	clipBoardedObject: PropTypes.shape({}),
	userSettings: PropTypes.shape({
		fieldsLocked: PropTypes.bool,
	}).isRequired,
	editObject: PropTypes.func.isRequired,
	refreshObject: PropTypes.func.isRequired,
	canEdit: PropTypes.bool.isRequired,
	potentialObjStatusChanges: PropTypes.number.isRequired,
}

export default ObjectStatus
