// Acts as the UI kit
import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { IoIosClose, IoIosArrowDropdown } from 'react-icons/io'
import { IoCopy } from 'react-icons/io5'
import { LoadingSpinner } from './assets/animations'
import sty from './UI.module.scss'

const calculateTimeLeft = (targetDate) => {
	if (!targetDate) return null
	const difference = +targetDate - +new Date()
	if (difference <= 0) return `done`

	let hours = Math.floor(difference / 1000 / 60 / 60)
	let minutes = Math.floor((difference / 1000 / 60) % 60)
	let seconds = Math.floor((difference / 1000) % 60)

	if (hours < 10) hours = `0${hours}`
	if (minutes < 10) minutes = `0${minutes}`
	if (seconds < 10) seconds = `0${seconds}`

	return `${hours}:${minutes}:${seconds}`
}

const CountdownTimer = (props) => {
	let { targetDate } = props
	const { onDone } = props
	targetDate = targetDate ? new Date(targetDate) : null
	const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate))
	const [timerDone, setTimerDone] = useState(false)

	useEffect(() => {
		if (targetDate) {
			setTimeLeft(calculateTimeLeft(targetDate))
			const interval = setInterval(() => {
				if (timerDone) {
					clearInterval(interval)
					return
				}

				const timeLeftTemp = calculateTimeLeft(targetDate)
				if (timeLeftTemp === 'done') {
					onDone()
					setTimerDone(true)
				}
				setTimeLeft(timeLeftTemp)
			}, 1000)
			return () => clearInterval(interval)
		}
		return null
	}, [targetDate])
	if (!targetDate) return null
	return (
		<div style={{ fontFamily: `"Courier New", Courier, monospace` }}>
			{timeLeft}
		</div>
	)
}
CountdownTimer.propTypes = {
	targetDate: PropTypes.string.isRequired,
	onDone: PropTypes.func,
}
CountdownTimer.defaultProps = {
	onDone: () => {},
}

const Modal = (props) => {
	const { closeFunc, isOpen, children, boxStyle } = props
	const modalRef = useRef(null)

	useEffect(() => {
		const handleClick = (e) => {
			if (!modalRef.current || modalRef.current.contains(e.target)) return

			// If click outside of the modal, close the modal
			closeFunc()
		}

		document.addEventListener('mousedown', handleClick, false)

		return () => {
			window.removeEventListener('mousedown', handleClick, false)
		}
	}, [])

	let classList = ''
	if (isOpen) classList += ` ${sty['modal-open']}`

	return (
		<>
			<div className={`${sty['ui-modal-filter']}${classList}`} />
			<div className={`${sty['ui-modal']}${classList}`}>
				<div className={`${sty['modal-content-container']}`}>
					<div className={`${sty['modal-content-container-inner']}`}>
						<div className={`${sty['modal-outer']}`}>
							<button
								type="button"
								className={`${sty['close-btn']}`}
								onClick={() => closeFunc()}
							>
								<IoIosClose className={`${sty.icon}`} />
							</button>
							<div
								className={`${sty['modal-content']}`}
								ref={modalRef}
								style={{ ...boxStyle }}
							>
								{children}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
Modal.propTypes = {
	closeFunc: PropTypes.func.isRequired,
	isOpen: PropTypes.bool.isRequired,
	children: PropTypes.node.isRequired,
	boxStyle: PropTypes.shape({}),
}
Modal.defaultProps = {
	boxStyle: {},
}

// Dropdown type timer picker
const genTimeField = (length) => {
	const arr = ['00']
	for (let i = 1; i < length + 1; i += 1) {
		if (i < 10) {
			arr.push(`0${i}`.toString())
		} else {
			arr.push(i.toString())
		}
	}
	return arr
}
const TimePicker = (props) => {
	const { value, onChange, disabled } = props
	const timeRegex = new RegExp(/(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/)
	const isHHMMSS = timeRegex.test(value)
	const inputRef = useRef(null)
	const selectorRef = useRef(null)

	const secondsList = genTimeField(59)
	const minutesList = genTimeField(59)
	const hoursList = genTimeField(23)
	const timeSections = isHHMMSS ? value.split(':') : [null, null, null]
	const [hours, setHours] = useState(timeSections[0])
	const [minutes, setMinutes] = useState(timeSections[1])
	const [seconds, setSeconds] = useState(timeSections[2])
	const [selectorIsOpen, openSelector] = useState(false)

	useEffect(() => {
		const handleClick = (e) => {
			if (!selectorRef.current || selectorRef.current.contains(e.target)) return

			// If click outside of the selector, close the selector
			openSelector(false)
		}

		document.addEventListener('mousedown', handleClick, false)

		return () => {
			window.removeEventListener('mousedown', handleClick, false)
		}
	}, [])

	const handleOnClick = () => {
		if (!inputRef.current.disabled) {
			openSelector(true)
		}
	}

	const onInputChange = (e) => {
		onChange(e)
		openSelector(false)
	}

	useEffect(() => {
		if (hours && minutes && seconds) {
			openSelector(false)
		}
	}, [hours, minutes, seconds])

	useEffect(() => {
		setHours(timeSections[0])
		setMinutes(timeSections[1])
		setSeconds(timeSections[2])
	}, [value])

	const onTimePickerClick = ({ h, m, s }) => {
		if (selectorIsOpen && h && m && s) {
			const newTimeString = `${h}:${m}:${s}`
			if (!timeRegex.test(newTimeString)) return
			onChange({ target: { value: newTimeString } })
		}
	}

	return (
		<div className={`${sty['ui-time-picker']}`}>
			<button
				type="button"
				onClick={() => handleOnClick()}
				style={{ display: 'flex', alignItems: 'center' }}
			>
				<input
					className="input-g small no-marg"
					ref={inputRef}
					placeholder="minutes or hh:mm:ss"
					autoComplete="off"
					type="text"
					onChange={(e) => onInputChange(e)}
					value={value}
					disabled={disabled}
				/>
			</button>
			{selectorIsOpen && (
				<div ref={selectorRef} className={`${sty['time-selector']} box-g`}>
					<div className={`${sty['time-section-list']}`}>
						{hoursList.map((item) => (
							<li key={item} className={hours === item ? sty.selected : ''}>
								<button
									type="button"
									onClick={() => {
										setHours(item)
										onTimePickerClick({ h: item, m: minutes, s: seconds })
									}}
								>
									{item}
								</button>
							</li>
						))}
					</div>
					<div className={`${sty['time-section-list']}`}>
						{minutesList.map((item) => (
							<li key={item} className={minutes === item ? sty.selected : ''}>
								<button
									type="button"
									onClick={() => {
										setMinutes(item)
										onTimePickerClick({ h: hours, m: item, s: seconds })
									}}
								>
									{item}
								</button>
							</li>
						))}
					</div>
					<div className={`${sty['time-section-list']}`}>
						{secondsList.map((item) => (
							<li key={item} className={seconds === item ? sty.selected : ''}>
								<button
									type="button"
									onClick={() => {
										setSeconds(item)
										onTimePickerClick({ h: hours, m: minutes, s: item })
									}}
								>
									{item}
								</button>
							</li>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
TimePicker.propTypes = {
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	onChange: PropTypes.func,
	disabled: PropTypes.bool,
}
TimePicker.defaultProps = {
	onChange: () => {},
	disabled: false,
}

const ToggleButton = (props) => {
	const { name, onChange, disabled, value } = props
	const [isOn, setIsOn] = useState(Boolean(Number(value)))
	useEffect(() => {
		setIsOn(Boolean(Number(value)))
	}, [value])

	return (
		<label className={sty['ui-toggle']} htmlFor={name}>
			<button
				disabled={disabled}
				type="button"
				onClick={() => {
					onChange(null, !isOn)
					setIsOn(!isOn)
				}}
			>
				<input
					disabled={disabled}
					type="checkbox"
					name={name}
					checked={isOn}
					onChange={() => {}}
				/>
				<span className={`${sty.slider} ${sty.round}`} />
			</button>
		</label>
	)
}
ToggleButton.defaultProps = {
	onChange: () => {},
	disabled: false,
	value: false,
}
ToggleButton.propTypes = {
	name: PropTypes.string.isRequired,
	onChange: PropTypes.func,
	disabled: PropTypes.bool,
	value: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
}

const LoadMoreButton = (props) => {
	const { children, isLoading, onClick, style } = props
	return (
		<button
			type="button"
			className="btn-g"
			onClick={() => onClick()}
			style={style}
		>
			{children}
			<span style={{ display: 'flex', marginLeft: '5px' }}>
				{isLoading ? (
					<LoadingSpinner />
				) : (
					<IoIosArrowDropdown style={{ fontSize: '16px' }} />
				)}
			</span>
		</button>
	)
}
LoadMoreButton.propTypes = {
	children: PropTypes.node.isRequired,
	isLoading: PropTypes.bool.isRequired,
	onClick: PropTypes.func.isRequired,
	style: PropTypes.shape({}),
}
LoadMoreButton.defaultProps = {
	style: {},
}

const TextWithCopy = ({ text }) => {
	const textRef = useRef(null)
	const [feedbackIsOpen, setFeedbackIsOpen] = useState(false)
	let classList = ''
	if (feedbackIsOpen) classList += ` ${sty['show-feedback']}`

	return (
		<div className={`${sty['ui-text-with-copy']}${classList}`}>
			<div className={sty.main}>
				<div ref={textRef} className={sty.text}>
					{text}
				</div>
				<div className={sty['btn-cont']}>
					<button
						className={sty.btn}
						disabled={feedbackIsOpen}
						type="button"
						aria-label="copy"
						onClick={() => {
							navigator.clipboard.writeText(text)
							setFeedbackIsOpen(true)
							setTimeout(() => {
								setFeedbackIsOpen(false)
							}, 1000)
						}}
					>
						<IoCopy />
					</button>
					<div className={`${sty.feedback} box-g`}>Copied</div>
				</div>
			</div>
		</div>
	)
}

TextWithCopy.propTypes = {
	text: PropTypes.string.isRequired,
}

export {
	CountdownTimer,
	Modal,
	TimePicker,
	ToggleButton,
	LoadMoreButton,
	TextWithCopy,
}
