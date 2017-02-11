/**
 * The Lisa's interface
 * @type {Object}
 * @param {HTMLDivElement} [area] The area to write the discussion in
 * @constant
 */
const Lisa = (new (function(area) {
  // If a DOM discussion area was specified and if the area is not valid...
  if (area && !(area instanceof HTMLDivElement))
    // Throw an error
    throw new Error('[Lisa] Invalid DOM area provided');

  /**
   * The DOM discussion area (DDA)
   * @type {HTMLDivElement}
   * @constant
   */
  const discuss = (area || document.createElement('div'));

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
      .replace(/$/, '( *[!|\\.])*')
    // Finish the instanciation
    // Make the regex case-insensitive
    + '$', 'i');

  /**
   * Register a callback for a given request
   * @param {string} handler The request to handle, in Lisa's parser format
   * @param {function} callback A function to call when the handler is used, and which must return a string or a DOM element
   * @returns {RegExp} A regex made from the handler (the result of the .makeHandlerRegex(handler) function)
   */
  this.register = (handler, callback) => {
    // If this handler is already in used...
    if (handled.includes(handler))
      // Throw an error
      throw new Error('[Lisa] Handler is already in use');

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
   * Display a message from Lisa
   * @param {string} message The message's content
   * @returns {void}
   */
  this.says = message => {
    // Inject a DOM element
    let dom = document.createElement('div');
    // Set its attributes
    dom.setAttribute('class', 'message message-lisa');
    // Set the message, with the author's name
    dom.innerHTML = '<strong>Lisa : </strong>' + this.format(message);
    // Append the element to the area
    discuss.appendChild(dom);
    // Scroll to the end of the container
    this.scrollToEnd();
  };

  /**
   * Display a message from the user
   * @param {string} message The message's content
   * @returns {void}
   */
  this.hears = message => {
    // Inject a DOM element
    let dom = document.createElement('div');
    // Set its attributes
    dom.setAttribute('class', 'message message-user');
    // Set the message, with the author's name
    dom.innerHTML = '<strong>You : </strong>' + this.format(message);
    // Append the element to the area
    discuss.appendChild(dom);
    // Scroll to the end of the container
    this.scrollToEnd();
  };

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

  /**
   * Scroll to the end of the discussion area
   * @param {number} [speed] The time to take for the scroll (default: 1000 ms)
   * @returns {void}
   */
  this.scrollToEnd = () => {
    // Get the amount of pixels until the scroll's maximum value
    let remaining = discuss.scrollHeight - discuss.scrollTop;
    // For a duration of 2000 ms (2 seconds), regurarily scroll near to the
    // bottom of the discussion area
    let interval = setInterval(() => discuss.scrollTop ++, Math.floor(2000 / remaining));
    // After this delay, don't scroll anymore
    setTimeout(() => clearInterval(interval), 2000);
  };

  // Get the DDA and its children
  this.__defineGetter__('dom', () => discuss);
})());
