# Global





* * *

## Class: Lisa
The Lisa's interface (constructor)

### Lisa.escapeHtml(unsafe) 

Espace HTML special characters from a string

**Parameters**

**unsafe**: `string`, The string to espace

**Returns**: `string`, The string, escaped

### Lisa.getStandard(input, catcher) 

Format a string in standard format

**Parameters**

**input**: `string`, The string to format

**catcher**: `string`, The catcher used to get this string

**Returns**: `string`, The string, in standard format

**Example**:
```js
"28 february 2000", "date" => "28/02/2000"
```

### Lisa.format(message) 

Format a message

**Parameters**

**message**: `string`, The message to format

**Returns**: `string`, The message, formatted with HTML tags

### Lisa.makeHandlerRegex(handler, getCatchers, tolerant, locale) 

Make a regex from an handler

**Parameters**

**handler**: `string`, The handler to make a regex with

**getCatchers**: `boolean`, Get the list of all catchers use in the regex (from left to right, in the right order). It will also return the handler's tolerant regex (default: false).

**tolerant**: `boolean`, Get the tolerant regex associated to this handler (see the doc. for further informations about it, default: false)

**locale**: `string`, Use a particular locale (default: the current one)

**Returns**: `RegExp | Array`, The regex made from the handler and, if asked, the list of catchers use

### Lisa.when(event, callback) 

Run a callback when a specific event occures

**Parameters**

**event**: `string`, Event's name (listed in the private variable 'eventsHandler')

**callback**: `function`, The callback to run when the event ocurres

**Returns**: `void`

### Lisa.understands(handler, callback, store, helpTexts) 

Register a callback for a given request

**Parameters**

**handler**: `string`, The request to handle, in Lisa's parser format

**callback**: `string | function`, A function to call when the handler is used, and which must return a string or a DOM element

**store**: `Object.&lt;string, string&gt;`, When this handler is used, store some answer's variables in the memory

**helpTexts**: `Array.&lt;string&gt;`, The help text for each part of the command (see the doc. for explanation)

**Returns**: `RegExp`, A regex made from the handler (the result of the .makeHandlerRegex(handler) function)

### Lisa.displayMessage(author, message, className, allowHtml) 

Display a message from anyone

**Parameters**

**author**: `string`, The message's author

**message**: `string`, The message's content

**className**: `string`, A CSS class to add to the message's <div> (will be prefixed by 'message-')

**allowHtml**: `boolean`, Display the message as HTML content (default: false)


### Lisa.helpsAbout(handler, getArray) 

Get help text about any handler

**Parameters**

**handler**: `string`, The handler to get help on

**getArray**: `boolean`, Get the array of help texts instead of a full message (default: false)

**Returns**: `string | boolean`, The help message, FALSE if there is no message

### Lisa.registersCatcher(name, regex) 

Register a new catcher

**Parameters**

**name**: `string`, The catcher's name

**regex**: `string`, The catcher's regex


### Lisa.hasRegistered(name) 

Check if a catcher has been registered (works for native catchers)

**Parameters**

**name**: `string`, The catcher's name

**Returns**: `boolean`, TRUE if the catcher has been registered, FALSE else

### Lisa.thinksToRegisteredCatchers() 

Get the list of all registered catchers

**Returns**: `Array.&lt;string&gt;`

### Lisa.thinksToCatcher(name) 

Get a specific catcher

**Parameters**

**name**: `string`, The catcher's name

**Returns**: `string | void`, The catcher (undefined if the catcher is not found)

### Lisa.learns(cell, value) 

Assign a value to a cell in the memory

**Parameters**

**cell**: `string`, The memory's cell

**value**: `string | number | boolean`, The cell's value

**Returns**: `void`

### Lisa.isValidInList(value, type) 

Check if a value is valid in a list

**Parameters**

**value**: `*`, The value to check

**type**: `string`, The value's expected type

**Returns**: `boolean`, TRUE if the value's type is the expected one, FALSE else

### Lisa.learnsList(cell, list, type) 

Learn a list of values

**Parameters**

**cell**: `string`, The memory's cell

**list**: `Array`, List of values

**type**: `string`, Values' type

**Returns**: `void`

### Lisa.learnsBoolList(cell, list) 

Learn a list of boolean values

**Parameters**

**cell**: `string`, The memory's cell

**list**: `Array.&lt;boolean&gt;`, List of booleans

**Returns**: `void`

### Lisa.learnsIntList(cell, list) 

Learn a list of integer values

**Parameters**

**cell**: `string`, The memory's cell

**list**: `Array.&lt;number&gt;`, List of integers

**Returns**: `void`

### Lisa.learnsFloatList(cell, list) 

Learn a list of floating numbers

**Parameters**

**cell**: `string`, The memory's cell

**list**: `Array.&lt;number&gt;`, List of floating numbers

**Returns**: `void`

### Lisa.learnsStrList(cell, list) 

Learn a list of string values

**Parameters**

**cell**: `string`, The memory's cell

**list**: `Array.&lt;string&gt;`, List of strings

**Returns**: `void`

### Lisa.thinksToList(cell) 

Get a list as an array

**Parameters**

**cell**: `string`, The memory's cell

**Returns**: `Array`, The list (undefined if the cell is not found)

### Lisa.thinksToListValue(cell, index) 

Get a specific value of a list

**Parameters**

**cell**: `string`, The memory's cell

**index**: `number`, The value's index in the memory (starts at 0)

**Returns**: `*`, The list's value (undefined if the cell or the value is not found)

### Lisa.thinksToListLastValue(cell) 

Get the last value of a list

**Parameters**

**cell**: `string`, The memory's cell

**Returns**: `*`, The list's value (undefined if the cell is not found or if it doesn't contain any value)

### Lisa.thinksToListType(cell) 

Get the type of a list

**Parameters**

**cell**: `string`, The memory's cell

**Returns**: `string`, The list's type (undefined if the cell is not found)

### Lisa.learnsListValue(cell, value) 

Push a value into a list

**Parameters**

**cell**: `string`, The memory's cell

**value**: `*`, The value to push

**Returns**: `void`

### Lisa.sortsList(cell, assign, asc) 

Sort a list

**Parameters**

**cell**: `string`, The list to sort

**assign**: `boolean`, Write the result as the list's new value (default: false)

**asc**: `boolean`, Ascendant order if true, descendant order else (default: true)

**Returns**: `Array`

### Lisa.shufflesList(cell, assign) 

Sort a list in a random order

**Parameters**

**cell**: `string`, The list to sort

**assign**: `boolean`, Write the result as the list's new value (default: false)

**Returns**: `void`

### Lisa.reversesList(cell, assign) 

Reverse a list

**Parameters**

**cell**: `string`, The list to reverse

**assign**: `boolean`, Write the result as the list's new value (default: false)

**Returns**: `Array`

### Lisa.knows(cell) 

Check if a cell exists in Lisa's memory

**Parameters**

**cell**: `string`, The cell to check

**Returns**: `boolean`, TRUE if the cell is found, FALSE else

### Lisa.knowsValue(value) 

Check if Lisa knows a specific valueNOTE: This function ses strict equalities ; "3" and 3 are considered as different valuesNOTE: This function does not search through the lists ; use the 'searchesValue' function for that

**Parameters**

**value**: `string | number | boolean`, The value to search

**Returns**: `boolean`, TRUE if the memory contains this value, FALSE else

### Lisa.knowsValueInList(cell, value) 

Check is a value is contained in a list

**Parameters**

**cell**: `string`, The memory's cell which is the list to test

**value**: `*`, The value to search in the list

**Returns**: `boolean`, TRUE if the list exists and contains this value, FALSE else

### Lisa.searchesValue(value, searchInList) 

Check if Lisa knows a specific value and get its locationNOTE: This function uses strict equalities ; "3" and 3 are considered as different values

**Parameters**

**value**: `string | number | boolean`, The value to search

**searchInList**: `boolean`, Search through the lists (default: false)

**Returns**: `string | boolean`, The cell or list's name or FALSE if the value is not found

### Lisa.isList(cell) 

Check if a cell is a list or not

**Parameters**

**cell**: `string`, The memory's cell

**Returns**: `boolean`, TRUE if the cell is a list, FALSE else or if the cell is not found

### Lisa.thinksTo(cell) 

Get a value from a cell in the memory

**Parameters**

**cell**: `string`, The cell to get

**Returns**: `string | number | boolean | void`, The cell's value (undefined if the cell is not found)

### Lisa.thinksToCell(cell) 

Get a value using its natural form

**Parameters**

**cell**: `string`, The cell to get

**Returns**: `string | number | boolean | Array | void`, Plain value for plain cells, arrays for lists

### Lisa.forgets(cell) 

Remove a cell from the memory

**Parameters**

**cell**: `string`, The cell to remove

**Returns**: `string | number | bolean | void`, The cell's value before removing

### Lisa.thinksToListLength(cell) 

Get the length of a list

**Parameters**

**cell**: `string`, The memory's cell

**Returns**: `number | void`, The length of the list, undefined if the list is not found

### Lisa.says(message, allowHtml) 

Display a message from Lisa

**Parameters**

**message**: `string`, The message's content

**allowHtml**: `boolean`, Display the message as HTML content (default: false)

**Returns**: `void`

### Lisa.hears(message, allowHtml) 

Display a message from the user

**Parameters**

**message**: `string`, The message's content

**allowHtml**: `boolean`, Display the message as HTML content (default: false)

**Returns**: `void`

### Lisa.does(request, display) 

Perform a request

**Parameters**

**request**: `string`, The request

**display**: `boolean`, Display the message as a Lisa's answer (default: true)

**Returns**: `string`, An HTML code or a text answer

### Lisa.treatLocaleText(text) 

Make a regex string from a locale's replacement text

**Parameters**

**text**: `string`, The locale's replacement text to make a regex from

**Returns**: `string`, The regex, as a string

### Lisa.createsLocaleRegex(texts, regex) 

Create a regex from a set of replacement texts (for locales)NOTE: The 'texts' argument is not verified to save much time

**Parameters**

**texts**: `Array.&lt;string&gt;`, The replacement texts to use

**regex**: `boolean`, Make a RegExp instead of a string (default: false)

**Returns**: `string | RegExp`, The build regex

### Lisa.learnsLocaleTexts(locale, texts) 

Learn a locale's pattern

**Parameters**

**locale**: `string`, The locale to use

**texts**: `Array.&lt;string&gt;`, The texts that can replace themselves mutually

**Returns**: `void`

### Lisa.translatesLocaleText(text, locale) 

Format a text using a locale

**Parameters**

**text**: `string`, The text to turn into a RegExp

**locale**: `string`, The locale to use (default: the current one)

**Returns**: `string`, A RegExp, as a string

### Lisa.usesLocale(locale) 

Set the current locale

**Parameters**

**locale**: `string`, The locale to set

**Returns**: `void`

### Lisa.knowsTextsIdenticals(left, right, locale) 

Check if a text matches with another using a locale

**Parameters**

**left**: `string`, The first text

**right**: `string`, The second text

**locale**: `string`, The locale to use (default: the current one)

**Returns**: `boolean`, TRUE if the both texts are identical according to the locale

### Lisa.thinksToLocale() 

Get the current locale

**Returns**: `string`, The locale currently used

### Lisa.knowsLocale(locale) 

Check if Lisa knows a specific locale

**Parameters**

**locale**: `string`, The locale to check

**Returns**: `boolean`, TRUE if the given locale is known, FALSE else

### Lisa.nowRemembersMessages() 

Make Lisa remembering all messages and requests

**Returns**: `void`

### Lisa.doesntRememberMessages() 

Don't make Lisa remembering all messages and requests

**Returns**: `void`

### Lisa.thinksToMessage(id) 

Get a message from the history

**Parameters**

**id**: `number`, An integer, which is the message you want from the very end (default: 0 = last message)

**Returns**: `Array`

### Lisa.export() 

Export the whole Lisa's state (could take time if there is many data to export - e.g. messages and requests history, memory, ...)

**Returns**: `string`, The whole Lisa's state



* * *










