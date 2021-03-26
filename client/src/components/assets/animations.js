import React from 'react'
import PropTypes from 'prop-types'

const LoadingSpinner = ({ style, className }) => (
	<div
		style={style}
		className={`lds-ring-g${className ? ` ${className}` : ''}`}
	>
		<div />
		<div />
		<div />
		<div />
	</div>
)

LoadingSpinner.propTypes = {
	style: PropTypes.shape({}),
	className: PropTypes.string,
}
LoadingSpinner.defaultProps = {
	style: {},
	className: '',
}

// eslint-disable-next-line import/prefer-default-export
export { LoadingSpinner }
