### Visual States

Visual states allow objects to be styled a certain way based on it's state. An object's visual state rules can be edited by clicking "edit" -> "advanced edit" on the object status section.

```json
// Each grid object contains an element (elem) that has a background (back), these can be styled using CSS
{
	"condition":"",
	"back":{"style":{}},
	"elem":{"style":{}}
}

// Example:
{
	"condition":"is-on==true",
	"back":{"style":{"background":"blue","width":"50px"}},
	"elem":{"style":{"opacity":"0.25"}}
}
// When the "is-on" field is true, the object background will turn blue and be 50px wide, while making the object element have 25% opacity
```

&nbsp;

Object fields can have special properties that can also be used in visual states, these can be utilized by setting the "s_condition" property.

```json
{
	"s_condition": "time-left['lastAction']!=started",
	"elem": { "style": { "opacity": "0.25" } }
}
// Using the special property "lastAction", the object will have 25% opacity when the "time-left" timer field is inactive.
// These special properties are found in the grid object state, which can be accessed using the API
```

&nbsp;

#### Notes

- **Timer Field**
  - When this field is referenced in the "condition" property, note that it's based the current countdown value, not the value set to countdown from.
