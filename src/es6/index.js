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
   * @returns {RegExp} The regex made from the handler
   */
  this.makeHandlerRegex = handler =>
    // Create a RegExp object
    new RegExp('^' + handler
      // Espace all regex characters from it
      .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
      // Allow any space to be written multiple times
      .replace(/ /g, ' +')
      // === Catchers ===
      // Everything catchers
      .replace(/\\\*/g, '(.*?)')
      // ================
      // Allow any '.' or '?' symbol at the end of the handler to be ignored
      // Also, allow them to be preceded by one or more spaces, or nothing
      .replace(/( \+)?\\\.$/, ' *[\\.]?')
      .replace(/( \+)?\\\?$/, ' *[\\?]?')
      // Allow to put '!' and '.' symbols with spaces at the end of a string
      .replace(/$/, '( *[!\\.])*')
    // Finish the instanciation
    // Make the regex case-insensitive
    + '$', 'i');

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
            .replace(/\$\^([0-9]|[1-9][0-9]+)/g, (match, n) => '"+arguments[' + n + ']+"')
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
            .replace(/\$\^([0-9]|[1-9][0-9]+)/g, (match, n) => '"+arguments[' + n + ']+"')
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
            Lisa.remembers(variable, store[variable].replace(/\$\^([0-9]|[1-9][0-9]+)/g, (match, n) => arguments[n]));

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
    let regex = this.makeHandlerRegex(handler);

    // Register it in the handlers array
    handlers.push([regex, callback]);

    // Mark this handler as already used
    handled.push(handler);

    // Return the regex made from the handler
    return regex;
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
        // Select this handler !
        // Call its callback and get the result
        let output = handler[1].apply(this, match.slice(1).concat(match[0]));

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

  // Get the DDA and its children
  this.__defineGetter__('dom', () => discuss);
  // Get the whole Lisa's memory (could be slow)
  this.__defineGetter__('memory', () => JSON.parse(JSON.stringify(memory)));
})());
