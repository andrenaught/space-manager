// Functions and components relating to fields of object
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
	TimerFieldIcon,
	TextFieldIcon,
	SwitchIcon,
} from 'src/components/assets/svg'
import { CountdownTimer, TimePicker, ToggleButton } from 'src/components/UI'
import { slugify } from 'src/components/utils/core'

// For "timer" field
const getMilliseconds = (value, isHHMMSS, timeUnit) => {
	let milliseconds = 0
	if (isHHMMSS) {
		const timeSections = value.split(':')
		const secondsLeft =
			timeSections[0] * 3600 +
			timeSections[1] * 60 +
			parseInt(timeSections[2], 10)
		milliseconds = secondsLeft * 1000
	} else if (timeUnit === 'm') {
		milliseconds = Number(value) * 1000 * 60
	} else if (timeUnit === 's') {
		milliseconds = Number(value) * 1000
	}

	return milliseconds
}
const getTargetDate = (value, { offsetDate, oper } = {}) => {
	if (!value) return null
	const timeRegex = new RegExp(/(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/)
	const isHHMMSS = timeRegex.test(value)
	if (!isHHMMSS && Number.isNaN(Number(value))) return null

	const offsetInMilliSecs = getMilliseconds(value, isHHMMSS, 'm') // by default value is minutes

	let targetDate = new Date()
	if (offsetDate && oper) {
		if (oper === '-') {
			targetDate = new Date(offsetDate.getTime() - offsetInMilliSecs)
		} else if (oper === '+') {
			targetDate = new Date(offsetDate.getTime() + offsetInMilliSecs)
		} else {
			return null
		}
	} else if (oper === '-') {
		targetDate = new Date(new Date().getTime() - offsetInMilliSecs)
	} else {
		targetDate = new Date(new Date().getTime() + offsetInMilliSecs)
	}
	return targetDate.toISOString()
}
const timerActionHandler = (field, value) => {
	if (!value)
		return { [field.slug]: { targetDate: null, lastAction: 'stopped' } }

	const targetDate = getTargetDate(value)
	const stateToAdd = {
		[field.slug]: {
			targetDate,
			lastAction: 'started',
		},
	}
	return stateToAdd
}
const TimerActionBtn = ({ onActionClick, field, state }) => {
	const targetDate = state?.targetDate
	const lastAction = state?.lastAction
	const timeDifference = targetDate ? +new Date(targetDate) - +new Date() : -1
	const timerIsOn = timeDifference > 0
	const fieldValue = state?.value || field.value

	if (timerIsOn) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
				<CountdownTimer targetDate={state?.targetDate || null} />
				&nbsp;
				<button
					type="button"
					onClick={() => onActionClick(timerActionHandler(field, null), true)}
					className="btn-g danger small"
				>
					Stop
				</button>
			</div>
		)
	}

	if (lastAction === 'started') {
		return (
			<div style={{ marginTop: '10px' }}>
				<small style={{ marginRight: '5px' }}>Timer done</small>
				<button
					type="button"
					className="btn-g small"
					onClick={() =>
						onActionClick({ [field.slug]: { lastAction: 'cleared' } }, true)
					}
				>
					clear
				</button>
			</div>
		)
	}

	return (
		<button
			type="button"
			className="btn-g small"
			style={{ margin: '0', marginTop: '10px' }}
			onClick={() => onActionClick(timerActionHandler(field, fieldValue), true)}
			disabled={fieldValue == null || fieldValue === ''}
		>
			Start timer
		</button>
	)
}
TimerActionBtn.defaultProps = {
	state: null,
}
TimerActionBtn.propTypes = {
	onActionClick: PropTypes.func.isRequired,
	field: PropTypes.shape({
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		slug: PropTypes.string,
	}).isRequired,
	state: PropTypes.shape({
		targetDate: PropTypes.string,
		lastAction: PropTypes.string,
		value: PropTypes.string,
	}),
}

// Object field
const getObjectFieldInfo = (field, state, onActionClick) => {
	let icon = ''
	let supplement = ''
	switch (field.type) {
		case 'timer':
			icon = (
				<TimerFieldIcon
					className="icon-g"
					style={{ color: '#999', width: '10px' }}
				/>
			)
			supplement = (
				<TimerActionBtn
					field={field}
					state={state}
					onActionClick={onActionClick}
				/>
			)
			break
		case 'toggle':
			break
		default:
	}

	return { icon, supplement }
}

const ObjectFieldInput = (props) => {
	/* eslint-disable react/jsx-props-no-spreading */
	const { type } = props

	if (type === 'timer') {
		return <TimePicker {...props} />
	}

	if (type === 'toggle') {
		return <ToggleButton {...props} />
	}

	return <input type="text" {...props} />
}
ObjectFieldInput.propTypes = {
	type: PropTypes.string.isRequired,
}

const objectFieldValue = ({ overrideVal, e }) => {
	let value
	if (overrideVal != null) {
		value = overrideVal
	} else if (e && e.target && e.target.value) {
		value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
	}
	return value
}

// Object field adder
const fieldAdderSteps = [{ title: 'Select Type' }, { title: 'Set Values' }]
const fieldTypes = [
	{
		name: 'text',
		icon: <TextFieldIcon className="icon-g" />,
	},
	{
		name: 'timer',
		icon: (
			<TimerFieldIcon
				className="icon-g"
				style={{ height: '20px', width: '20px' }}
			/>
		),
	},
	{
		name: 'toggle',
		icon: <SwitchIcon className="icon-g" />,
	},
]
const FieldAdderForm = (props) => {
	const [fieldAdderStep, setFieldAdderStep] = useState(0)
	const [fieldType, setFieldType] = useState(null)
	const [fieldName, setFieldName] = useState('')
	const [fieldSlug, setFieldSlug] = useState('')
	const [fieldDefaultVal, setDefaultFieldVal] = useState('')
	const { isFromObjectKit, openFieldAdder } = props

	const refresh = () => {
		setFieldAdderStep(0)
		setFieldType(null)
		setFieldName('')
		setFieldSlug('')
		setDefaultFieldVal('')
	}

	const addField = (e) => {
		e.preventDefault()

		if (fieldSlug === '') {
			alert('Form Error: slug not found')
			return
		}
		const slugIsUniq = !props.fields.find((field) => field.slug === fieldSlug)
		if (!slugIsUniq) {
			alert('Form Error: slug is not unique. Try a different name')
			return
		}
		props.addField({
			type: fieldType.name,
			name: fieldName,
			slug: fieldSlug,
			value: fieldDefaultVal,
		})
		openFieldAdder(false)
		refresh()
	}

	const onFieldNameChange = (val) => {
		setFieldName(val)
		setFieldSlug(slugify(val))
	}

	const onDefaultValChange = ({ e, overrideVal }) => {
		const value = objectFieldValue({ overrideVal, e })
		setDefaultFieldVal(value)
	}

	const steps = [
		{
			isDone: fieldType !== null,
		},
	]

	return (
		<>
			{isFromObjectKit && (
				<div className="label-g" style={{ paddingBottom: '10px' }}>
					<span style={{ color: '#222' }}>OBJECT:</span>
					&nbsp;FROM OBJECT KIT
				</div>
			)}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-around',
					marginBottom: '20px',
					borderBottom: '1px solid #eee',
					paddingBottom: '15px',
				}}
			>
				{fieldAdderSteps.map((step, i) => {
					let classList = ''
					const isPrevStep = i < fieldAdderStep // allow to go back to previous step
					const prevStepDone = steps[i - 1]?.isDone // if previous step is done, can directly select next one
					let canSelect = isPrevStep || prevStepDone
					if (i === fieldAdderStep) canSelect = false

					classList += i === fieldAdderStep ? '' : ' faded-g'
					if (!prevStepDone && i > fieldAdderStep)
						classList += ' not-clickable-g'
					if (canSelect) classList += ' clickable-g' // allow user to go back to previous step

					return (
						<button
							type="button"
							onClick={canSelect ? () => setFieldAdderStep(i) : null}
							className={`${classList}`}
							key={step.title}
						>
							{step.title}
						</button>
					)
				})}
			</div>
			{fieldAdderStep === 0 && (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr 1fr 1fr',
						gridGap: '10px',
					}}
				>
					{fieldTypes.map((field) => {
						let classList = ''
						if (field.name === fieldType) classList += ' selected'
						return (
							<button
								type="button"
								key={field.name}
								onClick={() => {
									setFieldType(field)
									setFieldAdderStep(1)
								}}
								className={`card-g${classList}`}
								style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'space-between',
									alignItems: 'center',
									padding: '10px',
								}}
							>
								<div>{field.icon}</div>
								<div>{field.name}</div>
							</button>
						)
					})}
				</div>
			)}

			{/* STEP 2 */}
			{fieldAdderStep === 1 && (
				<div>
					<span className="label-g" style={{ marginBottom: '15px' }}>
						field type:
						{fieldType.name}
					</span>
					<form onSubmit={(e) => addField(e)}>
						<span className="label-g small">Name</span>
						<input
							required
							type="text"
							value={fieldName}
							onChange={(e) => onFieldNameChange(e.target.value)}
							className="input-g small"
							style={{ marginBottom: '2px' }}
							placeholder=""
						/>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								fontSize: '10px',
								color: '#aaa',
								marginBottom: '15px',
							}}
						>
							<span>slug: </span>
							<input
								type="text"
								value={fieldSlug}
								disabled
								onChange={(e) => setFieldSlug(e.target.value)}
								style={{ border: '0' }}
							/>
						</div>
						<span className="label-g small">Default Value</span>
						<div style={{ marginBottom: '10px' }}>
							<ObjectFieldInput
								type={fieldType.name}
								value={fieldDefaultVal}
								onChange={(e, overrideVal) =>
									onDefaultValChange({ e, overrideVal })
								}
								className="input-g small"
							/>
						</div>

						<button
							type="submit"
							className="btn-g primary"
							style={{ textTransform: 'capitalize' }}
						>
							{`Create ${fieldType.name} Field`}
						</button>
					</form>
				</div>
			)}
		</>
	)
}

FieldAdderForm.defaultProps = {
	fields: [],
	isFromObjectKit: false,
}
FieldAdderForm.propTypes = {
	isFromObjectKit: PropTypes.bool,
	openFieldAdder: PropTypes.func.isRequired,
	fields: PropTypes.arrayOf(PropTypes.shape({})),
	addField: PropTypes.func.isRequired,
}

export {
	FieldAdderForm,
	getObjectFieldInfo,
	ObjectFieldInput,
	objectFieldValue,
	getTargetDate,
}
