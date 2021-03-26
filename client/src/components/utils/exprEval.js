import { getTargetDate } from 'src/components/space/grid/objectStatusUtils'
// Expression Evaluators
// Instead of using something like jexl, decided to just build own for performance and flexibility (full control)

const valueValidate = (
	val,
	state = {},
	{ inputType, isFromExpr, isSpecialCon }
) => {
	if (!isSpecialCon) {
		if (inputType === 'timer') {
			const { targetDate } = state

			if (isFromExpr && state.lastAction === 'started') {
				return getTargetDate(val)
			}

			return targetDate
		}
	}

	if (val === 'true') return true
	if (val === 'false') return false
	if (val === "''") return ''
	if (val === undefined) return ''
	return val
}

// Check if a given "conditional statement" string is valid
// - currently only supporting single (no &&, ||) & very simple conditions (==, !=)
const conStringIsValid = (
	conString,
	context,
	{ isSpecialCon = false } = {}
) => {
	if (!conString || !context || !context.state || !context.fields) return false
	const { state, fields } = context

	// Define type of operation
	let type = null
	if (conString.includes('==')) {
		type = '=='
	} else if (conString.includes('!=')) {
		type = '!='
	} else if (conString.includes('<=')) {
		type = '<='
	} else if (conString.includes('<')) {
		type = '<'
	} else if (conString.includes('>=')) {
		type = '>='
	} else if (conString.includes('>')) {
		type = '>'
	}
	if (type == null) return false

	// pull and validate values
	const [normalSlug, rawExprValue] = conString.split(type)
	const [specialSlug, specialPropTemp] = normalSlug.split("['")
	const [specialProp] = specialPropTemp ? specialPropTemp.split("']") : []

	const slug = !isSpecialCon ? normalSlug : specialSlug
	if (!state[slug] || !fields[slug]) return false // if property doesnt exist
	const inputType = fields[slug].type

	// Special cases
	// When timer is not active dont do anything
	if (
		inputType === 'timer' &&
		!isSpecialCon &&
		state[slug].lastAction !== 'started'
	) {
		return false
	}

	const rawActualValue = !isSpecialCon
		? state[slug].value
		: state[slug][specialProp]
	const exprValue = valueValidate(rawExprValue, state[slug], {
		inputType,
		isFromExpr: true,
		isSpecialCon,
	})
	const actualValue = valueValidate(rawActualValue, state[slug], {
		inputType,
		isFromExpr: false,
		isSpecialCon,
	})

	// do the check
	switch (type) {
		case '==':
			if (actualValue === exprValue) {
				return true
			}
			return false
		case '!=':
			if (actualValue !== exprValue) {
				return true
			}
			return false
		case '<=':
			if (actualValue <= exprValue) {
				return true
			}
			return false
		case '<':
			if (actualValue < exprValue) {
				return true
			}
			return false
		case '>=':
			if (actualValue >= exprValue) {
				return true
			}
			return false
		case '>':
			if (actualValue > exprValue) {
				return true
			}
			return false
		default:
			return false
	}
}

// eslint-disable-next-line import/prefer-default-export
export { conStringIsValid }
