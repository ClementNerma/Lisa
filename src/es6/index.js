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
   * The Lisa's private memory
   * @param {Object}
   * @private
   */
  let memory = {};

  /**
   * The list of all handler in use
   * @type {Array.<string>}
   * @private
   */
  let handled = [];

  /**
   * The association of handlers with their respective callback
   * @type {Array.<Array>}
   * @private
   */
  let handlers = [];

  /**
   * Make a string number having a length of a fixed amount characters (digits). Used in @.getStandard().
   * @example "2" -> "02" (add a zero) / "23" -> "23" (the same)
   * @param {string} strnum The number to make having a fixed length
   * @param {number} length The length the number should have (default: 2)
   * @returns {void}
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
    if (!RegexCatchers.hasOwnProperty(catcher))
      // Throw an error
      throw new Error(`[Lisa] Unknown catcher "${catcher}"`);

    // Get the string, in standard format
    if (['*', 'number', 'integer'].includes(catcher))
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
      .replace(/~(.*?)~/g, '<del>$1</del>');

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
      .replace(/\\\^(.*?)\\\^/g, (match, catcher) => {
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
      .replace(/( \+)?\\\.$/, ' *[\\.]?')
      .replace(/( \+)?\\\?$/, ' *[\\?]?')
      // Allow to put '!' and '.' symbols with spaces at the end of a string
      .replace(/$/, '(?: *[!\\.])*')
    // Finish the instanciation
    // Make the regex case-insensitive
    + '$', 'i');

    // Return the result
    return (getCatchers ? [ regex, catchers ] : regex);
  };

  /**
   * Register a callback for a given request
   * @param {string} handler The request to handle, in Lisa's parser format
   * @param {string|function} callback A function to call when the handler is used, and which must return a string or a DOM element
   * @param {Object.<string, string>} [store] When this handler is used, store some answer's variables in the memory
   * @returns {RegExp} A regex made from the handler (the result of the .makeHandlerRegex(handler) function)
   */
  this.understands = (handler, callback, store = {}) => {
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
          'Lisa.remembers("' + variable + '","'
          + store[variable]
            // Espace all '\' symbols
            .replace(/\\/g, '\\\\')
            // Espace all '"' symbols
            .replace(/"/g, '\\"')
            // Variables calling
            .replace(/\$\^(\d|[1-9]\d+)/g, (match, n) => '"+arguments[' + n + ']+"')
          // Finish the @.remember call
          + '");'
        )
        // Add a return statement which will return the Lisa's answer
        + 'return "' + callback
            // Espace all '\' symbols
            .replace(/\\/g, '\\\\')
            // Espace all '"' symbols
            .replace(/"/g, '\\"')
            // Variables calling
            .replace(/\$\^(\d|[1-9]\d+)/g, (match, n) => '"+arguments[' + n + ']+"')
        + '"');
    // Else, if it's a function...
    else if (typeof callback === 'function') {
      // If the 'store' argument was provided...
      if (store) {
        // Save the original callback under an other name
        let original = callback;
        // Define an alias to the current instance
        let that = this;
        // Make the callback a new function
        // Here a lambda function is used instead of an arrow function
        // because in this last case the 'arguments' variable cannot be
        // accessed (that may be due to the fact this file is babelified)
        callback = function () {
          // For each variable in 'store'...
          for (let variable of Reflect.ownKeys(store))
            // Store its value in the memory
            Lisa.remembers(variable, store[variable].replace(/\$\^(\d|[1-9]\d+)/g, (match, n) => arguments[n]));

          // Run the original callback and return its result as the Lisa's
          // answer
          return original.apply(that, arguments);
        };
      }
    }
    // Else, that's not a valid callback
    else
      throw new Error('[Lisa] Illegal handler\'s callback provided');

    // Make a RegExp from this handler
    let regexArr = this.makeHandlerRegex(handler, true);

    // Register it in the handlers array
    handlers.push([regexArr[0], regexArr[1], callback]);

    // Mark this handler as already used
    handled.push(handler);

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
  };

  /**
   * Assign a value to a cell in the memory
   * @param {string} cell The memory's cell
   * @param {string|number|boolean} value The cell's value
   * @returns {void}
   */
  this.remembers = (cell, value) => {
    // If the cell is not valid...
    if (typeof cell !== 'string' || !cell.length || ({})[cell])
      throw new Error('[Lisa] Illegal name provided for memory\'s cell');

    // If the value is not valid...
    if (!['string', 'number', 'boolean'].includes(typeof value))
      throw new Error(`[Lisa] Illegal value provided for memory's cell "${cell}"`);

    // Store the value into the memory
    memory[cell] = value;
  };

  /**
   * Get a value from a cell in the memory
   * @param {string} cell The cell to get
   * @returns {string|number|boolean|void} The cell's value (undefined if the cell is not found)
   */
  this.thinksTo = cell => memory[cell];

  /**
   * Remove a cell from the memory
   * @param {string} cell The cell to remove
   * @returns {string|number|bolean|void} The cell's value before removing
   */
  this.forgets = cell => {
    // If the cell doesn't exist...
    if (!memory.hasOwnProperty(cell))
      // Throw an error
      throw new Error('[Lisa] The provided cell doesn\'t exist');

    // Get the cell's value
    let value = memory[cell];

    // Remove the cell from the memory
    delete memory[cell];

    // Return the cell's value before deletion
    return value;
  };

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
          whole: request,
          // The original request, with spaces (before trimming)
          originalRequest: arguments[0],
          // All catchers' values
          caught: match.slice(1),
          // The catcher's values, in standard format (see below)
          standard: [],
          // The handler used for this request
          handler: handler,
          // The original handler (a string)
          // NOTE: Because the 'Hello' and 'Hello !' handlers will give the same
          // regex handler, the 'originalHandler' can contain a bad handler.
          // But, it will be an equivalent of this original string.
          originalHandler: handled[handlers.indexOf(handler)],
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
          prepare.standard.push(this.getStandard(match[i + 1] /* Value */, handler[1][i] /* Catcher's name */));

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
        // Else, if that's not a string that's not a valid content
        } else if (typeof output !== 'string')
          // Set the default result
          output = 'Sorry, I encountered a problem. Please try again.';

        // If asked for in the function's arguments...
        if (display)
          // Display the answer as a Lisa's message
          // If the answer is an HTML message, indicates to the function to
          // display it as an HTML content
          this.says(output, html);

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

  // Initialize some memory's variables
  this.remembers('HOURS_NAME', 'hours');
  this.remembers('MINUTES_NAME', 'minutes');
  this.remembers('SECONDS_NAME', 'secondes');
  this.remembers('MONTHS', 'january,february,march,april,may,june,july,august,september,october,november,december');

  // Get the DDA and its children
  this.__defineGetter__('dom', () => discuss);
  // Get the whole Lisa's memory (could be slow)
  this.__defineGetter__('memory', () => JSON.parse(JSON.stringify(memory)));
})());
