# Global





* * *

### Lisa.Script.compile(source, beautify, keepComments, onStep)

Make a JavaScript code from a LIS program

**Parameters**

**source**: `string`, The LIS program

**beautify**: `boolean`, Display a beautified JavaScript code (default: false)

**keepComments**: `boolean`, Keep all comments from the source code (default: false)

**onStep**: `function`, A callback to run each time a line is compiled (default: null)

**Returns**: `string`, The built JavaScript code


### Lisa.Script.transpileVar(variable)

Transpile a LIS variable callNOTE: THis function does NOT check the expression's syntax ; functions can be opened without be closed

**Parameters**

**variable**: `string`, The variable to transpile into JavaScript call

**Returns**: `string`, Compiled JavaScript code


### Lisa.Script.transpile(str)

Transpile a LIS expression

**Parameters**

**str**: `string`, The content to transpile

**Returns**: `string`, Compiled JavaScript code


### Lisa.Script.exec(source)

Run a LIS program

**Parameters**

**source**: `string`, The LIS program

**Returns**: `void`


### Lisa.Script.download(url)

Load a LIS program from a specific URL

**Parameters**

**url**: `string`, The program's URL

**Returns**: `string`, The program's source code



* * *







**Overview:** Parse and run LIS (Lisa's Interface Script) programs
