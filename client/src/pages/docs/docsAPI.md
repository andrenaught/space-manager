The provided REST API allows owners to automatically update their **spaces**.

**Example use case:**

Someone who wants to display availability in their parking lot can set up parking sensors and use the API to automatically update the corresponding object in their grid to show which parking spots are occupied.

&nbsp;

## Authentication

Each user has an Secret API Key to control the **spaces** that they own. This key is needed to make API calls. Your API Key can be found in your account page. Do not share your secret API Keys, if you think your API has been compromised, you can generate a new one.

```bash
$ curl "{API_URL}/api/v1/ping" \
-H "Authorization: Bearer {API KEY}"
```

```json
// Response
{ "message": "pong" }
```

&nbsp;

## Reference

REST API endpoints

&nbsp;

### Grid Object

Get the state of an object within the grid.

```bash
$ curl "{API_URL}/api/v1/space/{:space_id}/grid_object?row=4&col=2" \
-H "Authorization: Bearer {API KEY}"
```

**row** - row position of object\
**col** - col position of object

&nbsp;

Update the state of an object within the grid.

```bash
# "user" & "taken" are the field slugs, field slugs can be seen by going in "advanced edit" on the object status section
$ curl "{API_URL}/api/v1/space/{:space_id}/grid_object" \
-X PUT \
-d '
{
	"row": 4,
	"col": 2,
	"new_state": {
		"user": {"value": "bob"},
		"taken": {"value": true}
	}
}
' \
-H "Content-Type: application/json" \
-H "Authorization: Bearer {API KEY}"
```

**row** - row position of object\
**col** - col position of object\
**new_state** - The new state, it will only overwrite the included properties. It will only work on fields that exist.

&nbsp;

### Description

Get description of a space.

```bash
$ curl "{API_URL}/api/v1/space/{:space_id}/description" \
-H "Authorization: Bearer {API KEY}"
```

&nbsp;

Update description of a space.

```bash
$ curl "{API_URL}/api/v1/space/{:space_id}/description" \
-X PUT \
-d '{"description": "New description text"}' \
-H "Content-Type: application/json" \
-H "Authorization: Bearer {API KEY}"
```

**description** - new description to update to the space.

&nbsp;
