import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { useSpring, animated } from 'react-spring'
import { InfoIcon, ScrollArrow } from 'src/components/assets/svg'
import useFetch from 'src/components/utils/useFetch'
import style from './SpaceList.module.scss'

const SpaceList = (props) => {
	const appFetch = useFetch()
	const { spaces, type, onInviteAnswer } = props
	const spaceType = type

	const answerInvitation = async (spaceId, action) => {
		let fetchString = ''
		if (action === 'accept') {
			fetchString = `/api/spaces/${spaceId}/participants/accept_invite`
		} else if (action === 'decline') {
			fetchString = `/api/spaces/${spaceId}/participants/decline_invite`
		} else {
			throw new Error('Invalid action')
		}
		const { ok } = await appFetch(fetchString, {
			method: 'PUT',
		})

		if (!ok) return

		onInviteAnswer()
	}

	let mainList = []
	const toAcceptList = []
	if (spaceType === 'shared') {
		spaces.forEach((space) => {
			if (space.invite_accepted) {
				mainList.push(space)
			} else {
				toAcceptList.push(space)
			}
		})
	} else {
		mainList = spaces
	}

	return (
		<div className={style.list}>
			{mainList.map((space) => (
				<SpaceItem
					key={space.id}
					space={space}
					showSummary={props.showSummary}
					hasSummary={props.hasSummary}
				/>
			))}
			{toAcceptList.length > 0 && (
				<div className="label-g small" style={{ marginTop: '25px' }}>
					pending
				</div>
			)}
			{toAcceptList.map((space) => (
				<div key={space.id} className={style.item}>
					<div className={style.itemBar}>
						<Link className={style.link} to={`/spaces/${space.id}`}>
							<span className={`${style.name}${!space.name ? ' faded-g' : ''}`}>
								{space.name || 'Untitled'}
							</span>
							{!space.is_public && (
								<span className="label-g small">PRIVATE </span>
							)}
						</Link>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
							}}
						>
							<button
								style={{ margin: '0px 10px' }}
								className="btn-g primary small"
								type="button"
								onClick={() => answerInvitation(space.id, 'accept')}
							>
								accept
							</button>
							<button
								style={{
									margin: '5px 10px 0px 10px',
									padding: '3px 6px 0px 6px',
								}}
								type="button"
								className="clickable-g danger small"
								onClick={() => answerInvitation(space.id, 'decline')}
							>
								decline
							</button>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
SpaceList.defaultProps = {
	hasSummary: false,
	showSummary: false,
	type: null,
	onInviteAnswer: () => {},
}
SpaceList.propTypes = {
	spaces: PropTypes.arrayOf(PropTypes.object).isRequired,
	type: PropTypes.string,
	onInviteAnswer: PropTypes.func,
	hasSummary: PropTypes.bool,
	showSummary: PropTypes.bool,
}

const getGridDimensions = (grid) => {
	if (grid) {
		return `${grid[0].length} x ${grid.length}`
	}
	return null
}
const SpaceItem = (props) => {
	const { space, hasSummary, showSummary } = props
	const appFetch = useFetch()
	const [isInitLoading, setIsInitLoading] = useState(true)
	const [summaryIsOpen, openSummary] = useState(showSummary)
	const [summary, setSummary] = useState(
		hasSummary
			? {
					owner: {
						username: space.owner_username,
					},
			  }
			: null
	)
	const [scrolledDown, setScrolledDown] = useState(false)
	const [isScrollable, setIsScrollable] = useState(false)
	const infoBoxRef = useRef(null)
	const contentRef = useRef(null)

	const summaryOpenSpring = useSpring({
		height: summaryIsOpen ? 125 : 0,
		from: { height: showSummary ? 125 : 0 },
		onStart: () => {},
		onRest: () => {
			// Once open is complete
			if (summaryIsOpen) {
				setIsScrollable(
					infoBoxRef.current?.offsetHeight < contentRef.current?.offsetHeight
				)
			}
		},
	})

	const getSummary = async () => {
		if (hasSummary) return // no need to fetch again if its already been preloaded
		const { data, ok } = await appFetch(`/api/spaces/${space.id}?get_summary=1`)
		if (!ok) {
			openSummary(false)
			return
		}

		setSummary({ ...data.summary })
	}

	const onInfoBoxScroll = () => {
		if (infoBoxRef?.current == null) return
		if (infoBoxRef.current.scrollTop > 0) {
			setScrolledDown(true)
		}
	}

	useEffect(() => {
		setIsInitLoading(false)
	}, [])

	useEffect(() => {
		if (isInitLoading) return // ignore state initialization
		if (summary != null) return // once data is loaded, dont refetch on re-opens
		// only load data when opening
		if (summaryIsOpen) {
			getSummary()
		}
	}, [summaryIsOpen])

	let classList = `${style.item}`
	if (summaryIsOpen) classList += ` ${style.opened}`

	return (
		<div key={space.id} className={classList}>
			<div className={style.itemBar}>
				<Link className={style.link} to={`/spaces/${space.id}`}>
					<span className={`${style.name}${!space.name ? ' faded-g' : ''}`}>
						{space.name || 'Untitled'}
					</span>
					{!space.is_public && <span className="label-g small">PRIVATE </span>}
				</Link>
				<InfoIcon
					className={`faded icon-g clickable-g ${style.icon}`}
					onClick={() => {
						openSummary(!summaryIsOpen)
					}}
				/>
			</div>
			<animated.div
				ref={infoBoxRef}
				style={summaryOpenSpring}
				onScroll={() => onInfoBoxScroll()}
				className={`${style.itemInfoBox} box-g`}
			>
				<div ref={contentRef} className={`${style.content}`}>
					<div style={{ display: 'flex', marginBottom: '15px' }}>
						<div style={{ marginRight: '15px' }}>
							<div className="label-g small">owned by</div>
							<div>{summary?.owner?.username}</div>
						</div>
						{space.grid && (
							<div>
								<div className="label-g small">Dimensions</div>
								<div>{getGridDimensions(space.grid)}</div>
							</div>
						)}
					</div>
					<div>
						<div className="label-g small">description</div>
						<div style={{ whiteSpace: 'pre-wrap' }}>{space.description}</div>
					</div>
				</div>
				<ScrollArrow
					className="icon-g faded"
					style={{
						position: 'absolute',
						bottom: '5px',
						right: '5px',
						transitionDuration: '0.2s',
						...((!isScrollable || scrolledDown) && { opacity: '0' }),
					}}
				/>
			</animated.div>
		</div>
	)
}
SpaceItem.propTypes = {
	space: PropTypes.shape({
		id: PropTypes.number,
		name: PropTypes.string,
		description: PropTypes.string,
		is_public: PropTypes.bool,
		grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.shape({}))),
		owner_username: PropTypes.string,
	}).isRequired,
	hasSummary: PropTypes.bool.isRequired,
	showSummary: PropTypes.bool,
}
SpaceItem.defaultProps = {
	showSummary: false,
}

export default SpaceList
