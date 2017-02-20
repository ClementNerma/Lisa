# Global





* * *

### Lisa.State.load(state)

Load Lisa's state from an object

**Parameters**

**state**: `Object`, The state to load

**Returns**: `void`


### Lisa.State.convertPlainSave(data, success, corrupted)

Convert a plain save to a save object

**Parameters**

**data**: `string`, The save to convert

**success**: `function`, A callback to call with the save (as an object)

**corrupted**: `function`, A callback to call with the error string

**Returns**: `void`


### Lisa.State.save()

Save Lisa's state as an object

**Returns**: `Object`, A save object


### Lisa.State.convertObjectSave(toExport)

Convert a save object to plain data

**Parameters**

**toExport**: `Object`, The save object

**Returns**: `string`, The plain save



* * *







**Overview:** Load and save the Lisa's data from and to the browser's localStorage
