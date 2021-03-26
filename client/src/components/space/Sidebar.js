import React, { useState, useContext } from 'react'
import PropTypes from 'prop-types'
import merge from 'deepmerge'
import { Modal } from 'src/components/UI'
import sty from './Space.module.scss'
import { InvitedUsers, SpaceDeleter } from './sidebarUtils'
import { SpaceContext } from './spaceUtils'

const Sidebar = (props) => {
	const { id, saveSpace } = useContext(SpaceContext)
	const {
		settings,
		setSettings,
		setGridEditingOn,
		gridEditingOn,
		isPublic,
		setIsPublic,
	} = props
	const [invitedUsersIsOpen, showInvitedUsers] = useState(false)
	const [settingsIsOpen, showSettings] = useState(false)

	const changeSettings = (newValues) => {
		const updatedSettings = merge(settings, newValues) // Updating settings - need deep object merging here (rather than shallow merging)

		setSettings(updatedSettings)
		saveSpace({
			spaceId: id,
			allPUT: false,
			settingsPUT: true,
			bodyOverride: {
				settings: updatedSettings,
			},
		})
	}

	return (
		<div className={sty.sidebarCont}>
			<div className={sty.sidebarHeader}>
				<span>{isPublic ? 'Public' : 'Private'}</span>
			</div>
			<div className={sty.sidebarItem}>
				<button
					type="button"
					disabled={invitedUsersIsOpen}
					className={invitedUsersIsOpen ? '' : 'faded-g clickable-g'}
					onClick={() => showInvitedUsers(true)}
				>
					Permissions
				</button>
				<Modal
					isOpen={invitedUsersIsOpen}
					closeFunc={() => showInvitedUsers(false)}
				>
					<div>
						<div>
							<button
								type="button"
								disabled={isPublic}
								className={isPublic ? '' : 'faded-g clickable-g'}
								onClick={() => {
									setIsPublic(true)
									saveSpace({
										spaceId: id,
										allPUT: false,
										publicPUT: true,
										bodyOverride: { isPublic: true },
									})
								}}
							>
								Public
							</button>
							<span className="faded-g"> / </span>
							<button
								type="button"
								disabled={!isPublic}
								className={isPublic ? 'faded-g clickable-g' : ''}
								onClick={() => {
									setIsPublic(false)
									saveSpace({
										spaceId: id,
										allPUT: false,
										publicPUT: true,
										bodyOverride: { isPublic: false },
									})
								}}
							>
								Private
							</button>
						</div>
						<div className="separator-g" />
						<div>
							<span className="label-g">Permissions</span>
							<div>
								<small>Users who can change object field values / state:</small>
							</div>
							<div className="radio-group-g">
								{isPublic && (
									<span className="radio-item">
										<label htmlFor="public">
											<input
												type="radio"
												name="who-can-change-grid-values"
												value="public"
												id="public"
												onChange={(e) =>
													changeSettings(
														e.target.checked
															? { permissions: { gridVals: e.target.value } }
															: {}
													)
												}
												checked={settings.permissions.gridVals === 'public'}
											/>
											<span>Any</span>
										</label>
									</span>
								)}
								<span className="radio-item">
									<label htmlFor="member">
										<input
											type="radio"
											name="who-can-change-grid-values"
											value="member"
											id="member"
											onChange={(e) =>
												changeSettings(
													e.target.checked
														? { permissions: { gridVals: e.target.value } }
														: {}
												)
											}
											checked={
												settings.permissions.gridVals === 'member' ||
												(!isPublic &&
													settings.permissions.gridVals === 'public')
											}
										/>
										<span>Members</span>
									</label>
								</span>
								<span className="radio-item">
									<label htmlFor="owner">
										<input
											type="radio"
											name="who-can-change-grid-values"
											value="owner"
											id="owner"
											onChange={(e) =>
												changeSettings(
													e.target.checked
														? { permissions: { gridVals: e.target.value } }
														: {}
												)
											}
											checked={settings.permissions.gridVals === 'owner'}
										/>
										<span>Owner</span>
									</label>
								</span>
							</div>
						</div>
					</div>
					<div className="separator-g" />
					<InvitedUsers id={id} invitedUsersIsOpen={invitedUsersIsOpen} />
				</Modal>
			</div>

			<div className={sty.sidebarItem}>
				<button
					type="button"
					className="faded-g clickable-g"
					onClick={() => setGridEditingOn(!gridEditingOn)}
				>
					{gridEditingOn ? 'Lock Grid Size' : 'Edit Grid Size'}
				</button>
			</div>

			<div className={sty.sidebarItem}>
				<button
					type="button"
					className="faded-g clickable-g"
					onClick={() => showSettings(!settingsIsOpen)}
				>
					Settings
				</button>
				<Modal isOpen={settingsIsOpen} closeFunc={() => showSettings(false)}>
					<div>
						<span>Settings</span>
					</div>
					<div className="separator-g" />
					<SpaceDeleter id={id} />
				</Modal>
			</div>
		</div>
	)
}

Sidebar.propTypes = {
	settings: PropTypes.shape({
		permissions: PropTypes.shape({
			gridVals: PropTypes.string,
		}).isRequired,
	}).isRequired,
	setSettings: PropTypes.func.isRequired,
	setGridEditingOn: PropTypes.func.isRequired,
	gridEditingOn: PropTypes.bool.isRequired,
	isPublic: PropTypes.bool.isRequired,
	setIsPublic: PropTypes.func.isRequired,
}

export default Sidebar
