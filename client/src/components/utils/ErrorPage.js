import React from 'react'
import PropTypes from 'prop-types'

const ErrorPage = (props) => {
	const { code } = props
	return (
		<div className="content-section-g screen-centered">{`${code} Error`}</div>
	)
}
ErrorPage.defaultProps = {
	code: 404,
}
ErrorPage.propTypes = {
	code: PropTypes.number,
}

// eslint-disable-next-line import/prefer-default-export
export { ErrorPage }
