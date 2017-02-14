/**
 * The catcher usable in regex
 * @type {Object.<string, string>}
 * @constant
 */
const RegexCatchers = {
  // NOTE 1: Some of the regex used for catchers can certainly be optimised.
  // So feel free to contact me if you have ideas !
  // NOTE 2: All regex are isolated in functions because they use Lisa's memory,
  // which can change at any moment. This way, the memory is called again each
  // time a regex is called, without losing much performances.

  // Anything
  '*': () => `(.*?)`,
  // Number (integer or floating)
  number: () => `(\\d+[.]?|\\d*\\.\\d+)`,
  // Integer
  integer: () =>  `(\\d+)`,
  // Time (hours and minutes)
  short_time: () => `((?:[01]?\\d|2[0-3])(?: *: *| +${Lisa.thinksTo('HOURS_NAME')} +)[0-5]\\d(?:| +${Lisa.thinksTo('MINUTES_NAME')}))`,
  // Time (hours, minutes and seconds)
  time: () => `((?:[01]?\\d|2[0-3])(?: *: *| +${Lisa.thinksTo('HOURS_NAME')} +)[0-5]\\d(?: *: *| +${Lisa.thinksTo('MINUTES_NAME')} +)[0-5]\\d))(?:|${Lisa.thinksTo('SECONDS_NAME')})`,
  // Date (dd.mm dd-mm dd/mm)
  short_date: () => `((?:[1-9]|0[1-9]|[12]\\d|3[01])(?: *[\\/\\-\\.] *(?:[1-9]|0[1-9]|1[0-2]) *[\\/\\-\\.] *| +(?:${Lisa.thinksTo('MONTHS').split(',').join('|')}))`,
  // Date (dd.mm.yyyy dd-mm-yyyy dd/mm/yyyy)
  date: () => `((?:[1-9]|0[1-9]|[12]\\d|3[01])(?: *[\\/\\-\\.] *(?:[1-9]|0[1-9]|1[0-2]) *[\\/\\-\\.] *| +(?:${Lisa.thinksTo('MONTHS').split(',').join('|')}) +)\\d{4})`
};

/**
 * The Lisa's interface
 * @type {Object}
 * @constant
 */
const Lisa = (new (function() {
  /**
   * The DOM discussion area (DDA)
   * @type {HTMLDivElement}
   * @constant
   */
  const discuss = document.createElement('div');

  /**
   * The list of all messages received by Lisa
   * NOTE: This array will only get data if the 'rememberMessages' variable is
   *       turned on.
   * @type {Array.<Array>}
   */
  let messages = [];

  /**
   * The list of all requests performed by Lisa
   * NOTE: This array will only get data if the 'rememberMessages' variable is
   *       turned on.
   * @type {Array.<Array>}
   */
  let requests = [];

  /**
   * Should the messages be remembered?
   * @type {boolean}
   */
  let rememberMessages = true;

  /**
   * The Lisa's memory
   * @type {Object}
   */
  let memory = { $: {} };

  /**
   * The list of all handler in use
   * @type {Array.<string>}
   */
  let handled = [];

  /**
   * The association of handlers with their respective callback and help message
   * @type {Array.<Array>}
   */
  let handlers = [];

  /**
   * Callbacks that handle some events
   * @param {Object.<string, Function>}
   */
  let eventsHandler = {
    // When a message is displayed
    // @.displayMessage()
    message: null,
    // When Lisa did an action
    // @.does()
    did: null,
    // When Lisa learnt something
    // @.learns()
    learnt: null,
    // When Lisa forgot something
    // @.forgots()
    forgot: null,
    // When Lisa understood something
    // @.understands()
    understood: null
  };

  /**
   * Make a string number having a length of a fixed amount characters (digits). Used in @.getStandard().
   * @example "2" -> "02" (add a zero) / "23" -> "23" (the same)
   * @param {string} strnum The number to make having a fixed length
   * @param {number} length The length the number should have (default: 2)
   * @returns {void}
   * @private
   */
  function zero(strnum, length = 2) {
    // Add one or more '0' if needed, then return the number as a string
    return '0'.repeat(length - strnum.length) + strnum;
  }

  /**
   * Espace HTML special characters from a string
   * @param {string} unsafe The string to espace
   * @returns {string} The string, escaped
   */
  this.escapeHtml = unsafe =>
      unsafe.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

  /**
   * Format a string in standard format
   * @example "28 february 2000", "date" => "28/02/2000"
   * @param {string} input The string to format
   * @param {string} catcher The catcher used to get this string
   * @returns {string} The string, in standard format
   */
  this.getStandard = (input, catcher) => {
    // If the provided catcher is not known...
    if (!RegexCatchers.hasOwnProperty(catcher) && catcher !== '?')
      // Throw an error
      throw new Error(`[Lisa] Unknown catcher "${catcher}"`);

    // For some catchers, there is nothing to change between the formatted
    // string and the original one
    if (['*', '?',  'number', 'integer'].includes(catcher))
      // Nothing to change for these catchers
      return input;

    // Declare a variable which will contain the list of the months in year
    // This variable won't be used by all catchers but must be defined here
    // because it's not possible to declare local (let) variables in a 'switch'
    // block. Also, this variable can't be initialized here because that would
    // take time (see the code which assigns to this variable below).
    // So, we just define an empty and potentially useless variable here.
    let months;

    // Depending on the catcher...
    switch(catcher) {
      // NOTE: The format described besides the catcher is the "standard" format,
      // which is returned.

      // Time (hh:mm)
      case 'short_time':
        return input.replace(/^([0-9]+).*([0-9]+)$/, ($0, $1, $2) => zero($1) + ':' + zero($2));

      // Time (hh:mm:ss)
      case 'time':
        return input.replace(/^([0-9]+).*([0-9]+).*([0-9]+)$/, zero($1) + ':' + zero($2) + ':' + zero($3));

      // Date (dd/mm)
      case 'short_date':
        // Get all months of the year
        months = Lisa.thinksTo('MONTHS').split(',');
        // For each existing month...
        for (let i = 0; i < months.length; i++)
          // If it is contained in the string...
          if (input.includes(months))
            // Return the corresponding string
            return input.replace(/\d+/, ($0) => zero($0) + '/' + zero(i.toString()));

        // Else...
        return input.replace(/(\d+).*?(\d+)/, ($0, $1, $2) => zero($1) + '/' + zero($2));

      // Date (dd/mm/yyyy)
      case 'date':
        // Get all months of the year
        months = Lisa.thinksTo('MONTHS').split(',');

        // For each existing month...
        for (let i = 0; i < months.length; i++)
          // If it is contained in the string...
          if (input.includes(months[i]))
            // Return the corresponding string
            return input.replace(/(\d+).*?(\d+)/, ($0, $1, $2) => zero($1) + '/' + zero((i /* starts at 0 */ + 1).toString()) + '/' + zero($2, 4 /* 4 digits */));

        // Else...
        return input.replace(/(\d+).*?(\d+).*?(\d+)/, ($0, $1, $2, $3) => zero($1) + '/' + zero($2) + '/' + zero($3, 4 /* 4 digits */));

      // Unknown catcher ! This is a bug, all catchers should be referenced with
      // their standard format.
      default:
        throw new Error(`[Lisa] [BUG] Unreferenced catcher "${catcher}"`);
    }
  };

  /**
   * Format a message
   * @param {string} message The message to format
   * @returns {string} The message, formatted with HTML tags
   */
  this.format = message =>
    // Espace HTML special characters
    this.escapeHtml(message)
    // Bold
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    // Italic
      .replace(/_(.*?)_/g, '<em>$1</em>')
    // Strike
      .replace(/~(.*?)~/g, '<del>$1</del>')
    // Variables
    // NOTE: Here, variables can't start by the '_' symbol because that's a
    // reserved notation which is used by the LIS programs.
      .replace(/%([a-zA-Z][a-zA-Z0-9_]*)%/g, (match, variable) => {
        if (Lisa.knows(variable))
          return Lisa.thinksTo(variable)
        else
          throw new Error(`[Lisa] Variable "${variable}" is not defined in message "${message}"`);
      });

  /**
   * Make a regex from an handler
   * @param {string} handler The handler to make a regex with
   * @param {boolean} [getCatchers] Get the list of all catchers use in the regex (from left to right, in the right order, default: false)
   * @returns {RegExp|Array} The regex made from the handler and, if asked, the list of catchers use
   */
  this.makeHandlerRegex = (handler, getCatchers = false) => {
    // Declare a variable which will contain the list of catchers used in the
    // handler
    let catchers = [];

    // Create a RegExp object
    let regex = new RegExp('^' + handler
      // Espace all regex characters from it
      .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
      // Allow any space to be written multiple times
      .replace(/ /g, ' +')
      // === Catchers ===
      .replace(/\\\{(.*?)\\\}/g, (match, catcher) => {
        // If the catcher starts with the '?' symbol...
        // (Because it's a regex symbol it has been escaped so a backslash is
        //  added before the symbol itself)
        if (catcher.startsWith('\\?')) {
          // This catcher lists different texts that can be put this place.
          // e.g. "I am some{?one|thing}" propose two texts two be written :
          //      "one" or "thing" after the "I am some" text.
          // There aren't optionnal, excepted if there is only one proposition
          // e.g. "I am something [?strange]" make the "strange" part optionnal.
          // Register this part as a catcher
          catchers.push('?');

          // These propositions make a part of the regex, so return a regex
          // as a string here :
          // If there is a single proposed text...
          return !catcher.substr(2).includes('\\|') ?
            // Just return it as an optionnal text
            `(${catcher.substr(2)}|)` :
          // Else, return it as multiple possible texts
          // If the list starts by a ':' symbol...
            catcher.substr(2, 1) === ':' ?
              // Return it as a list of optionnal texts
              '(' + catcher.substr(3).split('\\|').join('|') + '|)' :
              // Else, return the list as it's
              '(' + catcher.substr(2).split('\\|').join('|') + ')';
        }

        // If the catcher is '\\*'...
        if (catcher === '\\*')
          // Remove the '\' symbol ; this catcher was escaped because the '*'
          // symbol is a RegExp-exclusive characters
          catcher = '*';

        // If this catcher is not known...
        if (!RegexCatchers.hasOwnProperty(catcher))
          // Throw an error
          throw new Error(`[Lisa] Unknown catcher "${catcher}"`);

        // Mark this catcher as used
        // Because JavaScript regex searches from left to right, the 'catchers'
        // array will contain all catchers used in the right order
        catchers.push(catcher);

        // Return the catcher's RegExp equivalent
        return RegexCatchers[catcher]();
      })
      // ================
      // Allow any '.' or '?' symbol at the end of the handler to be ignored
      // Also, allow them to be preceded by one or more spaces, or nothing
      .replace(/( \+)?\\\.$/, ' *(?:[\\.]*)?')
      .replace(/( \+)?\\\?$/, ' *(?:[\\?]*)?')
      // Allow to put '!', '.' and '?' symbols with spaces at the end of a string
      + '(?: *[!\\.])*'
    // Finish the instanciation
    // Make the regex case-insensitive
    + '$', 'i');

    // Return the result
    return (getCatchers ? [ regex, catchers ] : regex);
  };

  /**
   * Run a callback when a specific event occures
   * @param {string} event Event's name (listed in the private variable 'eventsHandler')
   * @param {Function} callback The callback to run when the event ocurres
   * @returns {void}
   */
  this.when = (event, callback) => {
    // If the event is not known...
    if (!eventsHandler.hasOwnProperty(event))
      // Throw an error
      throw new Error('[Lisa] Unknown event name');

    // If the callback is not valid...
    if (typeof callback !== 'function')
      // Throw an error
      throw new Error('[Lisa] Illegal callback provided, must be a function');

    // Register the callback as the handler of this event
    // NOTE: If there was a callback previously registered, it will be removed
    eventsHandler[event] = callback;
  };

  /**
   * Register a callback for a given request
   * @param {string} handler The request to handle, in Lisa's parser format
   * @param {string|function} callback A function to call when the handler is used, and which must return a string or a DOM element
   * @param {Object.<string, string>} [store] When this handler is used, store some answer's variables in the memory
   * @param {Array.<string>} [helpTexts] The help text for each part of the command (see the doc. for explanation)
   * @returns {RegExp} A regex made from the handler (the result of the .makeHandlerRegex(handler) function)
   */
  this.understands = (handler, callback, store = {}, helpTexts) => {
    // If this handler is already in used...
    if (handled.includes(handler))
      // Throw an error
      throw new Error('[Lisa] Handler is already in use');

    // If the callback is a string...
    if (typeof callback === 'string')
      // Make it becoming a callback
      callback = new Function([],
        // For each variable of the store...
        Reflect.ownKeys(store).map(variable =>
          // Make Lisa remember the variable...
          'Lisa.learns("' + variable + '","'
          + store[variable]
            // Espace all '\' symbols
            .replace(/\\/g, '\\\\')
            // Espace all '"' symbols
            .replace(/"/g, '\\"')
            // Standardly-formatted variables calling
            .replace(/\$\^(\d|[1-9]\d+)/g, (match, n) => '"+arguments[0].formatted[' + n + ']+"')
            // Original variables calling
            .replace(/\$_(\d|[1-9]\d+)/g, (match, n) => '"+arguments[0].caught[' + n + ']+"')
          // Finish the @.remember call
          + '");'
        )
        // Add a return statement which will return the Lisa's answer
        + 'return "' + callback
            // Espace all '\' symbols
            .replace(/\\/g, '\\\\')
            // Espace all '"' symbols
            .replace(/"/g, '\\"')
            // Standardly-formatted variables calling
            .replace(/\$\^(\d|[1-9]\d+)/g, (match, n) => '"+arguments[0].formatted[' + n + ']+"')
            // Original variables calling
            .replace(/\$_(\d|[1-9]\d+)/g, (match, n) => '"+arguments[0].caught[' + n + ']+"')
        + '"');
    // Else, if it's a function...
    else if (typeof callback === 'function') {
      // If the 'store' argument was provided...
      if (store) {
        // Save the original callback under an other name
        let original = callback;
        // Make the callback a new function
        // Here a lambda function is used instead of an arrow function
        // because in this last case the 'arguments' variable cannot be
        // accessed (that may be due to the fact this file is babelified)
        callback = new Function(['requested'], '(' + (function(store) {
          // For each variable in 'store'...
          for (let variable of Reflect.ownKeys(store))
            // Store its value in the memory
            Lisa.learns(variable, store[variable]
                // Standardly-formatted variables
                .replace(/\$\^(\d|[1-9]\d+)/g, (match, n) => requested.formatted[n])
                // Original variables
                .replace(/\$_(\d|[1-9]\d+)/g, (match, n) => requested.caught[n])
            );

          // Run the original callback and return its result as the Lisa's
          // answer
        }).toString() + ')(' + JSON.stringify(store) + ');return (' + original.toString() + ')(requested);');
      }
    }
    // Else, that's not a valid callback
    else
      throw new Error('[Lisa] Illegal handler\'s callback provided');

    // Make a RegExp from this handler
    let regexArr = this.makeHandlerRegex(handler, true);

    // If an help text was specified...
    if (helpTexts) {
      // If it's not an array...
      if (!Array.isArray(helpTexts))
        // Throw an error
        throw new Error('[Lisa] Illegal help text argument provided');

      // If its length is not valid...
      if (helpTexts.length !== regexArr[1].length)
        // Throw an error
        throw new Error(`[Lisa] Insufficient help for parameters in handler "${handler}"`);

      // For each help text given...
      for (let text of helpTexts)
        // If it's not a string or a function...
        if (!['string', 'function'].includes(typeof text))
          // Throw an error
          throw new Error(`[Lisa] Illegal help text given for handler "${handler}"`);
    }

    // Register it in the handlers array
    // 0: Handler, as a regex
    // 1: Catchers used by the handler
    // 2: Callback
    // 3: Help texts (can be the NULL value)
    handlers.push([regexArr[0], regexArr[1], callback, helpTexts || null]);

    // Mark this handler as already used
    handled.push(handler);

    // If the related event has a handler...
    if (eventsHandler['understood'])
      // Trigger its callback
      eventsHandler['understood'](new RegExp(regexArr[0].toString().slice(1, -2)), regexArr[1].slice(0), callback, helpTexts ? helpTexts.slice(0) : null);

    // Return the regex made from the handler
    return regexArr[0];
  };

  /**
   * Display a message from anyone
   * @param {string} author The message's author
   * @param {string} message The message's content
   * @param {string} className A CSS class to add to the message's <div> (will be prefixed by 'message-')
   */
  this.displayMessage = (author, message, className) => {
    // Inject a DOM element
    let dom = document.createElement('div');
    // Set its attributes
    dom.setAttribute('class', `message message-${className}`);
    // Set the message, with the author's name
    dom.innerHTML = `<strong>${author} : </strong>` + this.format(message);
    // Append the element to the area
    discuss.appendChild(dom);

    // Scroll to the end of the container
    // Get the amount of pixels until the scroll's maximum value
    let remaining = discuss.scrollHeight - discuss.scrollTop;
    // For a duration of 2000 ms (2 seconds), regurarily scroll near to the
    // bottom of the discussion area
    let interval = setInterval(() => discuss.scrollTop ++, Math.floor(2000 / remaining));
    // After this delay, don't scroll anymore
    setTimeout(() => clearInterval(interval), 2000);

    // If allowed to...
    if (rememberMessages)
      // Remember this message
      messages.push([ Date.now(), author, message, className ]);

    // If the related event has a handler...
    if (eventsHandler['message'])
      // Trigger its callbackhor, message, className);
      eventsHandler['message'](Date.now(), author, message, className);
  };

  /**
   * Get help text about any handler
   * @param {string} handler The handler to get help on
   * @param {boolean} [getArray] Get the array of help texts instead of a full message (default: false)
   * @returns {string|boolean} The help message, FALSE if there is no message
   */
  this.helpsAbout = (handler, getArray = false) => {
    // If the handler is not known...
    if (!handled.includes(handler))
      // Throw an error
      throw new Error(`[Lisa] Unknown handler "${handler}"`);

    // Get the help array about this handler
    let helpTexts = handlers[handled.indexOf(handler)][3]

    // If there is no help text...
    if (!helpTexts)
      // Return false
      return false;

    // If asked for, just return the array of help texts (cloned to make code
    // unable to change the texts)
    if (getArray)
      // Return the cloned array
      return helpTexts.slice(0);

    // Declare a variable that contains the current help text's index
    let i = 0;

    // Replace every catcher by the corresponding help text
    // Then, return the help text
    return handler.replace(/\{(.*?)\}/g, catcher => '[' + helpTexts[i ++] + ']');
  };

  /**
   * Assign a value to a cell in the memory
   * @param {string} cell The memory's cell
   * @param {string|number|boolean} value The cell's value
   * @returns {void}
   */
  this.learns = (cell, value) => {
    // If the cell is not valid...
    if (typeof cell !== 'string' || !cell.length || ({})[cell] || cell === '$')
      // Throw an error
      throw new Error('[Lisa] Illegal name provided for memory\'s cell');

    // If the value is not valid...
    if (!['string', 'number', 'boolean'].includes(typeof value))
      // Throw an error
      throw new Error(`[Lisa] Illegal value provided for memory's cell "${cell}"`);

    // If the cell already exists and is a cell...
    if (memory['$'].hasOwnProperty(cell))
      // This line permits, if the cell is a list, to remove its type from
      // memory['$']. If this data remains after the list's deletion, it will
      // make some bugs happening (like @.isList() for example).
      // The previous fix was calling the @.forgets() function, which was
      // taking too much time by performing a second remove on memory[cell]
      // and calling the 'forgot' callback, which was an error because the
      // cell is not forgot at all, its value is simply changed.
      // So this new fix allows better performances.
      delete memory['$'][cell];

    // Store the value into the memory
    memory[cell] = value;

    // If the related event has a handler...
    if (eventsHandler['learnt'])
      // Trigger its callback
      eventsHandler['learnt'](cell, value);
  };

  /**
   * Check if a value is valid in a list
   * @param {*} value The value to check
   * @param {string} type The value's expected type
   * @returns {boolean} TRUE if the value's type is the expected one, FALSE else
   */
  function isValidInList(value, type) {
    // Depending on the expected type...
    switch (type) {
      // NOTE: Testing these two values may be faster than using the 'typeof'
      // operator, which needs to call a native function to perform the test
      case 'boolean': return value === false || value === true;
      // NOTE: Here a '!' operator is used because when one (and only one) of
      // the conditions written here is seen as FALSE, the other conditions
      // won't be tested. With a suite of conditions linked by the '&&' operator,
      // all conditions would have to be tested, which can be significantly
      // slower.
      case 'integer': return !(typeof value !== 'number' || Math.floor(value) !== value || value < 0);
      // These two tests are just check the value's type
      case 'floating': return typeof value === 'number';
      case 'string': return typeof value === 'string';
    }
  }

  /**
   * Learn a list of values
   * @param {string} cell The memory's cell
   * @param {Array} list List of values
   * @param {string} type Values' type
   * @returns {void}
   */
  this.learnsList = (cell, list, type) => {
    // If the cell is not valid...
    if (typeof cell !== 'string' || !cell.length || ({})[cell] || cell === '$')
      // Throw an error
      throw new Error('[Lisa] Illegal name provided for memory\'s cell');

    // Allow aliases for types
    type = ({bool: 'boolean', int: 'integer', float: 'floating', str: 'string'})[type] || type;

    // If the provided type is not valid...
    if (!['boolean', 'integer', 'floating', 'string'].includes(type))
      // Throw an error
      throw new Error(`[Lisa] Unknown type "${type}", must be "boolean", "integer", "floating" or "string"`);

    // If the list is not valid...
    if (!Array.isArray(list))
      // Throw an error
      throw new Error('[Lisa] Illegal list provided, must be an array');

    // Clone the list to prevent every modification from the outside
    list = list.slice(0);

    // For each value in the list...
    for (let i = 0; i < list.length; i++)
      // If the value is not valid...
      if (!isValidInList(list[i], type))
        // Throw an error
        throw new Error(`[Lisa] Value at index ${i} is not a ${type}`);

    // Store the list into the memory
    memory[cell] = list;

    // Remember the list's type
    memory['$'][cell] = type;

    // If the related event has a handler...
    if (eventsHandler['learnt'])
      // Trigger its callback
      eventsHandler['learnt'](cell, list.slice(0));
  }

  /**
   * Learn a list of boolean values
   * @param {string} cell The memory's cell
   * @param {Array.<boolean>} list List of booleans
   * @returns {void}
   */
  this.learnsBoolList = (cell, list) => this.learnsList(cell, list, 'boolean');

  /**
   * Learn a list of integer values
   * @param {string} cell The memory's cell
   * @param {Array.<number>} list List of integers
   * @returns {void}
   */
  this.learnsIntList = (cell, list) => this.learnsList(cell, list, 'integer');

  /**
   * Learn a list of floating numbers
   * @param {string} cell The memory's cell
   * @param {Array.<number>} list List of floating numbers
   * @returns {void}
   */
  this.learnsFloatList = (cell, list) => this.learnsList(cell, list, 'floating');

  /**
   * Learn a list of string values
   * @param {string} cell The memory's cell
   * @param {Array.<string>} list List of strings
   * @returns {void}
   */
  this.learnsStrList = (cell, list) => this.learnsList(cell, list, 'string');

  /**
   * Get a list as an array
   * @param {string} cell The memory's cell
   * @returns {Array} The list (undefined if the cell is not found)
   */
  this.thinksToList = cell => memory['$'].hasOwnProperty(cell) ? memory[cell].slice(0) : undefined;

  /**
   * Get a specific value of a list
   * @param {string} cell The memory's cell
   * @param {number} index The value's index in the memory (starts at 0)
   * @returns {*} The list's value (undefined if the cell or the value is not found)
   */
  this.thinksToListValue = (cell, index) =>
    memory['$'].hasOwnProperty(cell) && memory[cell].length > index ?
    memory[cell][index] : undefined;

  /**
   * Get the type of a list
   * @param {string} cell The memory's cell
   * @returns {string} The list's type (undefined if the cell is not found)
   */
  this.thinksToListType = cell => memory['$'].hasOwnProperty(cell) ? memory['$'][cell] : undefined;

  /**
   * Push a value into a list
   * @param {string} cell The memory's cell
   * @param {*} value The value to push
   * @returns {void}
   */
  this.learnsListValue = (cell, value) => {
    // If the cell is not found...
    if (!memory['$'].hasOwnProperty(cell))
      // Throw an error
      throw new Error(`[Lisa] Unknown list "${cell}"`);

    // If the value is not valid...
    if (!isValidInList(value, memory['$'][cell]))
      // Throw an error
      throw new Error(`[Lisa] Provided value for list "${cell}" is not an ${memory['$'][cell]}`);

    // Append the value to the end of the list
    memory[cell].push(value);

    // If the related event has a handler...
    if (eventsHandler['learnt'])
      // Trigger its callback
      eventsHandler['learnt'](cell, value, memory[cell].length - 1);
  };

  /**
   * Sort a list
   * @param {string} cell The list to sort
   * @param {boolean} [assign] Write the result as the list's new value (default: false)
   * @param {boolean} [asc] Ascendant order if true, descendant order else (default: true)
   * @returns {Array}
   */
  this.sortsList = (cell, assign, asc = true) => {
    // If the list is not found...
    if (!memory['$'].hasOwnProperty(cell))
      // Throw an error
      throw new Error(`[Lisa] List "${cell}" was not found`);

    // Get the list and sort it
    // Use a different sorting method, depending on the list's type
    // NOTE: The performed sort will be ascendant, if the 'asc' parameter is set
    // to false a .reverse() will be made on the new array.
    // NOTE: If the new array will be assigned as the list's new value, there's
    // no need to clone the array (the .sort() method directly affects the
    // original array)
    let sorted = (assign ? memory[cell] : memory[cell].slice(0)).sort(
      // If that's a list of number...
      ['integer', 'floating'].includes(memory['$'][cell])
        // Use a custom sort method
        ? (a, b) => a - b
        // Else, use the native .sort() function, wich only sorts following the
        // Unicode equivalent of the values (which is not adapted to numbers
        // because they are sorted as strings : [ 10, 2, 1 ] make [ 1, 10, 2 ])
        : null
    );

    // If the order must be 'desc'...
    if (!asc)
      // Reverse the array
      sorted = sorted.reverse();

    // If the 'asc' parameter is turned on...
    return assign
      // There's no need to assign the new array to memory[cell] because the
      // sort has already affected the original list
      // Return the list, cloned to prevent modifications from the outside
      ? sorted.slice(0)
      // Else, return the sorted list without cloning it (the list was already
      // cloned before sorting)
      : sorted;
  };

  /**
   * Sort a list in a random order
   * @param {string} cell The list to sort
   * @param {boolean} [assign] Write the result as the list's new value (default: false)
   * @returns {void}
   */
  this.shufflesList = (cell, assign) => {
    // If the list is not found...
    if (!memory['$'].hasOwnProperty(cell))
      // Throw an error
      throw new Error(`[Lisa] List "${cell}" was not found`);

    // Get the list and clone it if it won't be assigned as the list's new
    // value, because the sort will override the 'list' array
    let list = assign ? memory[cell] : memory[cell].slice(0);

    // Credits to Frank Mitchell
    // (https://www.frankmitchell.org/2015/01/fisher-yates/)
    // Credits to @ChristopheD from StackOverflow
    // (http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array#answer-2450976)
    // The code below uses the Fisher-Yates shuffle algorithm
    // NOTE: This code is not mine but the @ChristopheD's one

    // Get the list's lengt
    let currentIndex = list.length,
        // Define two local variables for the algorithm
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex --;

      // And swap it with the current element.
      temporaryValue = list[currentIndex];
      list[currentIndex] = list[randomIndex];
      list[randomIndex] = temporaryValue;
    }

    // If the 'assign' parameter is turned on...
    return assign
      // There's no need to assign the new array to memory[cell] because the
      // sort has already affected the original list
      // Then, return the list, cloned to prevent modifications from the outside
      ? list.slice(0)
      // Else, return the sorted list without cloning it (the list was already
      // cloned before sorting)
      : list;
  };

  /**
   * Check if a cell exists in Lisa's memory
   * @param {string} cell The cell to check
   * @returns {boolean} TRUE if the cell is found, FALSE else
   */
  this.knows = cell => cell !== '$' && memory.hasOwnProperty(cell);

  /**
   * Check if Lisa knows a specific value
   * NOTE: This function ses strict equalities ; "3" and 3 are considered as different values
   * NOTE: This function does not search through the lists ; use the 'searchesValue' function for that
   * @param {string|number|boolean} value The value to search
   * @returns {boolean} TRUE if the memory contains this value, FALSE else
   */
  this.knowsValue = value => Object.values(memory).includes(value);

  /**
   * Check is a value is contained in a list
   * @param {string} cell The memory's cell which is the list to test
   * @param {*} value The value to search in the list
   * @returns {boolean} TRUE if the list exists and contains this value, FALSE else
   */
  this.knowsValueInList = (cell, value) => memory['$'].hasOwnProperty(cell) && memory[cell].includes(value);

  /**
   * Check if Lisa knows a specific value and get its location
   * NOTE: This function uses strict equalities ; "3" and 3 are considered as different values
   * @param {string|number|boolean} value The value to search
   * @param {boolean} [searchInList] Search through the lists (default: false)
   * @returns {string|boolean} The cell or list's name or FALSE if the value is not found
   */
  this.searchesValue = (value, searchInList) => {
    // For each known cell...
    for (let cell of Reflect.ownKeys(memory))
      // If it's a plain value, perform the test. If it's a list, the test will
      // fail, so it will perform the second test (see below)
      if (memory[cell] === value)
        // It worked!
        return cell;
      // If the cell is a list
      else if (memory['$'][cell]) {
        // If the function is not allowed to search through...
        if (!searchInList)
          // Ignore it
          continue ;

        // If the value is found in the list...
        if (memory[cell].includes(value))
          // It worked!
          return cell;
      }

    // The value wasn't found in the memory -> return FALSE
    return false;
  };

  /**
   * Check if a cell is a list or not
   * @param {string} cell The memory's cell
   * @returns {boolean} TRUE if the cell is a list, FALSE else or if the cell is not found
   */
  this.isList = cell => memory['$'].hasOwnProperty(cell);

  /**
   * Get a value from a cell in the memory
   * @param {string} cell The cell to get
   * @returns {string|number|boolean|void} The cell's value (undefined if the cell is not found)
   */
  this.thinksTo = cell =>
    // If the cell exists in Lisa's memory..
    memory.hasOwnProperty(cell) && cell !== '$' ?
      // If that's a list, join its values with the semi-colon ';' symbol
      Array.isArray(memory[cell]) ? memory[cell].join(';') : memory[cell]
    : undefined;

  /**
   * Remove a cell from the memory
   * @param {string} cell The cell to remove
   * @returns {string|number|bolean|void} The cell's value before removing
   */
  this.forgets = cell => {
    // If the cell doesn't exist...
    if (!memory.hasOwnProperty(cell) || cell === '$')
      // Throw an error
      throw new Error('[Lisa] Can\'t forget unexisting cell');

    // Get the cell's value
    let value = memory[cell];

    // Remove the cell from the memory
    delete memory[cell];
    // If it exists, the list's type must also be deleted
    delete memory['$'][cell];

    // If the related event has a handler...
    if (eventsHandler['forgot'])
      // Trigger its callback
      eventsHandler['forgot'](cell, value);

    // Return the cell's value before deletion
    return value;
  };

  /**
   * Get the length of a list
   * @param {string} cell The memory's cell
   * @returns {number|void} The length of the list, undefined if the list is not found
   */
  this.thinksToListLength = cell => memory['$'].hasOwnProperty(cell) ? memory[cell].length : undefined;

  /**
   * Display a message from Lisa
   * @param {string} message The message's content
   * @returns {void}
   */
  this.says = message => this.displayMessage('Lisa', message, 'lisa');

  /**
   * Display a message from the user
   * @param {string} message The message's content
   * @returns {void}
   */
  this.hears = message => this.displayMessage('You', message, 'user');

  /**
   * Perform a request
   * @param {string} request The request
   * @param {boolean} [display] Display the message as a Lisa's answer (default: true)
   * @returns {string} An HTML code
   */
  this.does = (request, display = true) => {
    // Save the original request, before trimming
    let originalRequest = request;
    // Trim the spaces at the beginning and the end of the request
    request = request.trim();
    // Declare a variable which will contain the regex match's result
    let match ;

    // For each registered handler...
    for (let handler of handlers) {
      // If the handler matches with the request
      if (match = request.match(handler[0])) {
        // Prepare the arguments to send to the callback
        let prepare = {
          // The whole request
          request: request,
          // The original request, with spaces (before trimming)
          requestWithSpaces: originalRequest,
          // All catchers' values
          caught: match.slice(1),
          // The catcher's values, in standard format (see below)
          formatted: [],
          // The handler (as a regex) used for this request
          handlerRegex: handler[0],
          // All catchers used by the hanlder
          catchers: handler[1],
          // The callback used by the handler (the one which will be runned)
          callback: handler[2],
          // All help texts about this handler
          help: handler[3],
          // The original handler (a string)
          // NOTE: Because the 'Hello' and 'Hello !' handlers will give the same
          // regex handler, the 'originalHandler' can contain a bad handler.
          // But, it will be an equivalent of this original string.
          handler: handled[handlers.indexOf(handler)],
          // Will the message be displayed as a Lisa's one ?
          display: !!display,
        };

        // NOTE: This step could be ignored, that would be to the callback to
        // get the "standard" format of the variables given to it. But generally
        // callbacks will only treat standardly-formatted string (even if they
        // use the original string from time to time). Also, this operation
        // doesn't take a very long time, there's only a few regex to do
        // (one regex replacement per given argument)
        // For each catcher used in the handler...
        for (let i = 0; i < handler[1].length; i++)
          // Get the string associated to this handler
          // Then, transform it to the standard format (e.g. "28 february 2012" -> "28/02/2012")
          // Finally, push it to the 'standard' array
          prepare.formatted.push(this.getStandard(match[i + 1] /* Value */, handler[1][i] /* Catcher's name */));

        // Select this handler !
        // Call its callback and get the result
        let output = handler[2].call(this, prepare);

        // Is the result an HTML content ?
        let html = false;

        // If the result is a number...
        if (typeof output === 'number')
          // Make it a string
          output = html.toString();
        // If the result is a DOM element...
        else if (output && output instanceof HTMLElement) {
          // Get its HTML content
          output = html.innerHTML;
          // Consider the message as a HTML content instead of a string
          html = true;
        // Else, if that's not a string or the FALSE value that's not a valid
        // content
      } else if (typeof output !== 'string' && output !== false)
          // Set the default result
          output = 'Sorry, I encountered a problem. Please try again.';

        // If asked for in the function's arguments, and if the callback didn't
        // refuse to output a message...
        if (display && output !== false)
          // Display the answer as a Lisa's message
          // If the answer is an HTML message, indicates to the function to
          // display it as an HTML content
          this.says(output, html);

        // If allowed to, and if the callback didn't refuse to output a message
        // ...
        if (rememberMessages && output !== false)
          // Remember this request
          // NOTE: Only a few fields of the 'prepare' object are remembered,
          // because all the others can be found from these ones.
          // e.g. "formatted": only needs to @.getStandard() every string of
          //      "caught", etc.
          // NOTE: Technically, the "handler" and "caught" fields too, but it
          //       would takes time to find them, especially if there is a lot
          //       of requests to treat.
          requests.push([
            // The request's date
            Date.now(),
            // The original request, without trimming its spaces
            prepare.requestWithSpaces,
            // The handler (as a string) used to catch this request
            prepare.handler,
            // The different parts handled by the handler thanks to its catchers
            prepare.caught.slice(0),
            // Was the message displayed? (boolean)
            prepare.display
          ]);

        // Make a cloned version of the 'prepare' object
        // After a few tests, it seems the cloning takes less than a milisecond
        // to perform with a very big 'prepare' object and a low-end computer
        // If the related event has a handler...
        if (eventsHandler['did'])
          // Trigger its callback
          eventsHandler['did'](requests.slice(-1)[0] /* Date.now() */, JSON.parse(JSON.stringify(prepare)), output);

        // Return the result
        return output;
      }
    }

    // If no handler was selected, lisa says she didn't understand
    // NOTE: There is a '*' handler that handles any unhandled request,
    //       so that line is here to prevent potential problem if this handler
    //       is removed from the source code.
    this.says('I didn\'t understand your request.', true);
  };

  /**
   * Make Lisa remembering all messages and requests
   * @returns {void}
   */
  this.nowRemembersMessages = () => { rememberMessages = true; return ; };

  /**
   * Don't make Lisa remembering all messages and requests
   * @returns {void}
   */
  this.doesntRememberMessages = () => { rememberMessages = false; return ; };

  /**
   * Get a message displayed in the web page
   * @param {number} [id] An integer, which is the message you want from the very end (default: 0 = last message)
   * @returns {Array}
   */
  this.getMessage = (id = 0) => {
    // If the ID is not valid...
    if (typeof id !== 'number' || Math.floor(id) !== id)
      // Throw an error
      throw new Error('[Lisa] Invalid ID given while getting message');

    // If the ID is a negative number...
    if (id < 0)
      // Just get its opposite
      id = -id;

    // If the message is not found...
    if (messages.length <= id)
      // Throw an error
      throw new Error(`[Lisa] There is no message with id "${id}"`);

    // Return the message (cloned to prevent modifications)
    return messages.slice(0);
  };

  /**
   * Export the whole Lisa's state (could take time if there is many data to
   *  export - e.g. messages and requests history, memory, ...)
   * @returns {string} The whole Lisa's state
   */
  this.export = () => {
    // Declare a variable which will contain the handlers (as strings)
    let _handlers = [];

    // For each known handler...
    for (let handler of handlers)
      // Copy it into the '_handlers' array, and a an array of strings
      _handlers.push([
        // Regex, as a string
        handler[0].toString(),
        // Catchers (which are already strings)
        handler[1],
        // Callback, as a string
        handler[2].toString(),
        // Optionnal help texts (which are already strings)
        handler[3]
      ]);

    // Then, stringify this data (that makes a string and prevent modifications from
    // outside)
    return JSON.stringify({ memory, handled, handlers: _handlers, rememberMessages, messages, requests });
  };

  // Initialize some memory's variables
  this.learns('HOURS_NAME', 'hours');
  this.learns('MINUTES_NAME', 'minutes');
  this.learns('SECONDS_NAME', 'secondes');
  this.learns('MONTHS', 'january,february,march,april,may,june,july,august,september,october,november,december');

  // Get the DDA and its children
  this.__defineGetter__('dom', () => discuss);
  // Get the whole Lisa's memory (could be slow)
  this.__defineGetter__('memory', () => JSON.parse(JSON.stringify(memory)));
  // Get the whole messages' history (could be slow)
  this.__defineGetter__('messages', () => JSON.parse(JSON.stringify(messages)));
  // Get the whole requests' history (could be slow)
  this.__defineGetter__('history', () => JSON.parse(JSON.stringify(requests)));
  // Are the messages remembered? (NOTE: The code below isn't misspelled)
  this.__defineGetter__('remembersMessages', () => rememberMessages);
  // Remember messages or not
  this.__defineSetter__('remembersMessages', (b) => b ? this.nowRemembersMessages() : this.doesntRememberMessages());
})());
