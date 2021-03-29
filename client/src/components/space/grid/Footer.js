import React, { useContext } from 'react'
import { MdPerson } from 'react-icons/md'
import PropTypes from 'prop-types'
import { SpaceContext } from '../spaceUtils'
import sty from '../Space.module.scss'

const Footer = (props) => {
	const { userPermissions } = useContext(SpaceContext)
	const { description, setDescription, totalConnectedUsers } = props

	return (
		<div>
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<MdPerson style={{ marginTop: '2px', marginRight: '2px' }} />
				{totalConnectedUsers}
			</div>
			<textarea
				className={`input-g ${sty.descriptionInput}`}
				maxLength="200"
				rows="10"
				value={description}
				placeholder="Description"
				style={{}}
				onChange={(e) => {
					setDescription(e.target.value)
				}}
				disabled={userPermissions.type !== 'owner'}
			/>
		</div>
	)
}

Footer.propTypes = {
	description: PropTypes.string.isRequired,
	setDescription: PropTypes.func.isRequired,
	totalConnectedUsers: PropTypes.number.isRequired,
}

export default Footer
