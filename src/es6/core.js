/**
 * The Lisa's interface
 * @type {Lisa}
 * @constant
 * @global
 */
const Lisa = new ((function() {

/**
 * The Lisa's interface (constructor)
 * @class
 * @constructor
 * @global
 */
let Lisa = function() {
  /**
   * The catcher usable in regex
   * @type {Object.<string, string>}
   * @private
   */
  let RegexCatchers = {
    // NOTE 1: Some of the regex used for catchers can certainly be optimised.
    // So feel free to contact me if you have ideas !
    // NOTE 2: All regex are isolated in functions because they use Lisa's memory,
    // which can change at any moment. This way, the memory is called again each
    // time a regex is called, without losing much performances.

    // Anything
    '*': () => `.+?`,
    // Single digit
    digit: () => `\\d`,
    // Number (integer or floating)
    number: () => `\\d+[.]?|\\d*\\.\\d+`,
    // Unsigned number (integer or floating)
    unsigned_number: () => `[\-]?${RegexCatchers.number()}`,
    // Integer
    integer: () =>  `\\d+`,
    // Unsigned integer
    unsigned_integer: () => `[\-]?${RegexCatchers.integer()}`,
    // Single letter
    letter: () => `[a-zA-Z]`,
    // Single alphanumeric character
    alphanum: () => `[a-zA-Z0-9]`,
    // Time (hours and minutes)
    short_time: () => `(?:[01]?\\d|2[0-3])(?: *: *| +${this.thinksTo('HOURS_NAME')} +)[0-5]\\d(?:| +${this.thinksTo('MINUTES_NAME')})`,
    // Time (hours, minutes and seconds)
    time: () => `(?:[01]?\\d|2[0-3])(?: *: *| +${this.thinksTo('HOURS_NAME')} +)[0-5]\\d(?: *: *| +${this.thinksTo('MINUTES_NAME')} +)[0-5]\\d))(?:|${this.thinksTo('SECONDS_NAME')}`,
    // Date (dd.mm dd-mm dd/mm)
    short_date: () => `(?:[1-9]|0[1-9]|[12]\\d|3[01])(?: *[\\/\\-\\.] *(?:[1-9]|0[1-9]|1[0-2]) *| +(?:${this.thinksTo('MONTHS').split(',').join('|')}))`,
    // Date (dd.mm.yyyy dd-mm-yyyy dd/mm/yyyy)
    date: () => `(?:[1-9]|0[1-9]|[12]\\d|3[01])(?: *[\\/\\-\\.] *(?:[1-9]|0[1-9]|1[0-2]) *[\\/\\-\\.] *| +(?:${this.thinksTo('MONTHS').split(',').join('|')}) +)\\d{4}`,
    // Email adress
    email: () => `(?:(?:[^<>\\(\\)\\[\\]\\.,;:\\s@\\"]+(?:\\.[^<>()\\[\\]\\.,;:\\s@\\"]+)*)|(?:\\".+\\"))@(?:(?:[^<>()[\\]\\.,;:\\s@\\"]+\\.)+[^<>\\(\\)[\\]\\.,;:\\s@\\"]{2,})`,
    // URL
    url: () => `(?:https?:\\/\\/|)(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b[-a-zA-Z0-9@:%_\\+.~#?&//=]*(?:#.*|)`
  };

  /**
   * The list of native catchers
   * @type {Array.<string>}
   * @constant
   * @private
   */
  const nativeCatchers = Reflect.ownKeys(RegexCatchers);

  /**
   * Available locales
   * @type {Object.<string, Array>}
   * @private
   */
  let locales = {};

  /**
   * The current locale
   * @type {string}
   * @private
   */
  let currentLocale = 'en';

  // Initialize the current locale
  locales[currentLocale] = [];

  /**
   * The list of all messages received by Lisa
   * NOTE: This array will only get data if the 'rememberMessages' variable is
   *       turned on.
   * @type {Array.<Array>}
   * @private
   */
  let messages = [];

  /**
   * The list of all requests performed by Lisa
   * NOTE: This array will only get data if the 'rememberMessages' variable is
   *       turned on.
   * @type {Array.<Array>}
   * @private
   */
  let requests = [];

  /**
   * Should the messages be remembered?
   * @type {boolean}
   * @private
   */
  let rememberMessages = true;

  /**
   * The Lisa's memory
   * @type {Object}
   * @private
   */
  let memory = { $: {} };

  /**
   * The list of all handler in use
   * @type {Array.<string>}
   * @private
   */
  let handled = [];

  /**
   * The association of handlers with their respective callback and help message
   * @type {Array.<Array>}
   * @private
   */
  let handlers = [];

  /**
   * Callbacks that handle some events
   * @param {Object.<string, Function>}
   * @private
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
   * Get a catcher, with opening and closing parenthesis
   * @param {string} catcher The catcher's name
   * @returns {string} The full catcher
   * @private
   */
  function getCatcher(catcher) {
    // Return the catcher, with opening and closing parenthesis
    return '(' + RegexCatchers[catcher]() + ')';
  }

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
    if (!RegexCatchers.hasOwnProperty(catcher) && catcher !== '?' && catcher !== '#')
      // Throw an error
      throw new Error(`[Lisa] Unknown catcher "${catcher}"`);

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
        months = this.thinksTo('MONTHS').split(',');
        // For each existing month...
        for (let i = 0; i < months.length; i++)
          // If it is contained in the string...
          if (input.includes(months[i]))
            // Return the corresponding string
            return zero(input.match(/\d+/)[0]) + '/' + zero((i /* Starts at 0 */ + 1).toString());

        // Else...
        return input.replace(/(\d+).*?(\d+)/, ($0, $1, $2) => zero($1) + '/' + zero($2));

      // Date (dd/mm/yyyy)
      case 'date':
        // Get all months of the year
        months = this.thinksTo('MONTHS').split(',');

        // For each existing month...
        for (let i = 0; i < months.length; i++)
          // If it is contained in the string...
          if (input.includes(months[i]))
            // Return the corresponding string
            return input.replace(/(\d+).*?(\d+)/, ($0, $1, $2) => zero($1) + '/' + zero((i /* starts at 0 */ + 1).toString()) + '/' + zero($2, 4 /* 4 digits */));

        // Else...
        return input.replace(/(\d+).*?(\d+).*?(\d+)/, ($0, $1, $2, $3) => zero($1) + '/' + zero($2) + '/' + zero($3, 4 /* 4 digits */));

      // Here go all catchers that does not need a treatment after catching
      default:
        // Return the caught string without changing anything
        return input;
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
        if (this.knows(variable))
          return this.thinksTo(variable)
        else
          throw new Error(`[Lisa] Variable "${variable}" is not defined in message "${message}"`);
      });

  /**
   * Make a regex from an handler
   * @param {string} handler The handler to make a regex with
   * @param {boolean} [getCatchers] Get the list of all catchers use in the regex (from left to right, in the right order). It will also return the handler's tolerant regex (default: false).
   * @param {boolean} [tolerant] Get the tolerant regex associated to this handler (see the doc. for further informations about it, default: false)
   * @param {string} [locale] Use a particular locale (default: the current one)
   * @returns {RegExp|Array} The regex made from the handler and, if asked, the list of catchers use
   */
  this.makeHandlerRegex = (handler, getCatchers = false, tolerant = false, locale = currentLocale) => {
    // Declare a variable which will contain the list of catchers used in the
    // handler
    let catchers = [];

    // If the provided locale is not known...
    if (!locales.hasOwnProperty(locale))
      // Throw an error
      throw new Error('[Lisa] Unknown locale provided');

    // Create a RegExp object
    let regex = new RegExp('^' +
      // Format the handler using the locales
      // NOTE: The @.translatesLocaleText() function also escapes the
      // RegExp-reserved symbols, so there is no need to do it here.
      // NOTE: Because replacement texts can't contain RegExp-reserved symbols,
      // they won't interfere with the catchers below.
      this.translatesLocaleText( handler, locale )
      // Allow any space to be written multiple times
      .replace(/ /g, ' +')
      // === Catchers ===
      .replace(/\\\{(.*?)\\\}/g, (match, catcher) => {
        // NOTE: The catchers below are even let in the tolerant regex.

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

        // If the catcher starts with the '#' symbol...
        // (Because it's a regex symbol it has been escaped so a backslash is
        //  added before the symbol itself)
        if (catcher.startsWith('#')) {
          // This catcher allows to put a plain regex in the handler's
          // expression.
          // NOTE: The plain regex must contain one and only one capturing
          // group, else the catchers order will be destructured and may
          // throw fatal JavaScript errors.
          // Register this part as a catcher
          catchers.push('#');

          // Unescape the regex and return it inside a capturing group
          return '(' +
            // Remove the catcher's symbol ('#') from the string
            catcher.substr(1)
            // Unescape the regex' special symbols
            .replace(/\\([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])/g, "$1")
            // Close the regex capturing group
            + ')';
        }

        // If the catcher is '\\*'...
        if (catcher === '\\*') {
          // This catcher was escaped because the '*' symbol is a
          // RegExp-exclusive characters
          // Mark this catcher as used
          catchers.push('*');

          // Return its RegExp equivalent
          return getCatcher('*');
        }

        // If this catcher is not known...
        if (!RegexCatchers.hasOwnProperty(catcher))
          // Throw an error
          throw new Error(`[Lisa] Unknown catcher "${catcher}"`);

        // If the regex in construction is the tolerant one...
        if (tolerant)
          // Return the tolerant catcher
          return '(.*?)';

        // Mark this catcher as used
        // Because JavaScript regex searches from left to right, the 'catchers'
        // array will contain all catchers used in the right order
        catchers.push(catcher);

        // Return the catcher's RegExp equivalent
        return getCatcher(catcher);
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
    return (getCatchers ? [ regex, catchers, this.makeHandlerRegex(handler, false, true) ] : regex);
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
      // If the 'store' argument was provided, and if it's not empty...
      if (store && Reflect.ownKeys(store).length) {
        // Save the original callback under an other name
        let original = callback;
        // Make the callback a new function
        // Here a lambda function is used instead of an arrow function
        // because in this last case the 'arguments' variable cannot be
        // accessed (that may be due to the fact this file is babelified)
        callback = new Function(['requested'], 'var ret=(' + original.toString() + ')(requested);(' +
        (function(store, Lisa) {
          // For each variable in 'store'...
          for (let variable of Reflect.ownKeys(store))
            // Store its value in the memory
            Lisa.learns(variable, store[variable]
                // Standardly-formatted variables
                .replace(/%\^(\d|[1-9]\d+)%/g, (match, n) => requested.formatted[n])
                // Original variables
                .replace(/%_(\d|[1-9]\d+)%/g, (match, n) => requested.caught[n])
            );

          // Run the original callback and return its result as the Lisa's
          // answer
        }).toString() + ')(' + JSON.stringify(store) + ', requested.caller);return ret;');
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
    // Register it in the handlers array
    // 0: Handler, as a strict regex
    // 1: Catchers used by the handler
    // 2: Handler, as a tolerant regex
    // 3: Callback
    // 4: Help texts (can be the NULL value)
    handlers.push([regexArr[0], regexArr[1], regexArr[2], callback, helpTexts || null]);

    // Mark this handler as already used
    handled.push(handler);

    // If the related event has a handler...
    if (eventsHandler['understood'])
      // Trigger its callback
      eventsHandler['understood'](new RegExp(regexArr[0].toString().slice(1, -2)), regexArr[1].slice(0), regexArr[2].toString().slice(1, -2), callback, helpTexts ? helpTexts.slice(0) : null);

    // Return the regex made from the handler
    return regexArr[0];
  };

  /**
   * Display a message from anyone
   * @param {string} author The message's author
   * @param {string} message The message's content
   * @param {string} className A CSS class to add to the message's <div> (will be prefixed by 'message-')
   * @param {boolean} [allowHtml] Display the message as HTML content (default: false)
   */
  this.displayMessage = (author, message, className, allowHtml = false) => {
    // In case of the message has no .toString() function (like undefined),
    // give it a default content.
    if (message === undefined || message === null || typeof message.toString !== 'function')
      // Set the message as an empty string
      message = '';
    // If the message can be stringified (numbers, strings, objects)...
    else
      // Make the message a string (grant support for booleans, numbers...)
      message = message.toString();

    // If HTML is not allowed...
    if (!allowHtml)
      // Format the message
      message = this.format(message);

    // If allowed to...
    if (rememberMessages)
      // Remember this message
      messages.push([ Date.now(), author, message, className, !!allowHtml ]);

    // If the related event has a handler...
    if (eventsHandler['message'])
      // Trigger its callbackhor, message, className);
      eventsHandler['message'](Date.now(), author, message, className, !!allowHtml);
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
    let helpTexts = handlers[handled.indexOf(handler)][4];

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
   * Register a new catcher
   * @param {string} name The catcher's name
   * @param {string} regex The catcher's regex
   */
  this.registersCatcher = (name, regex) => {
    // If the catcher's name is not valid...
    if (typeof name !== 'string' || !name || ({})[name] || !/^[a-z_][a-z0-9_#\*\?\!\+\-\/\\]*$/.test(name))
      // Throw an error
      throw new Error('[Lisa] Illegal catcher\'s name provided');

    // If the catcher's regex is not valid...
    if (typeof regex !== 'string' || !regex)
      // Throw an error
      throw new Error('[Lisa] Invalid catcher\'s regex provided, must be a not-empty string');

    // If this catcher is already registered...
    if (RegexCatchers.hasOwnProperty(name))
      // Throw an error
      throw new Error(`[Lisa] Catcher "${name}" is already registered`);

    // Register the catcher
    RegexCatchers[name] = () => regex;
  };

  /**
   * Check if a catcher has been registered (works for native catchers)
   * @param {string} name The catcher's name
   * @returns {boolean} TRUE if the catcher has been registered, FALSE else
   */
  this.hasRegistered = name => RegexCatchers.hasOwnProperty(name);

  /**
   * Get the list of all registered catchers
   * @returns {Array.<string>}
   */
  this.thinksToRegisteredCatchers = () => Reflect.ownKeys(RegexCatchers);

  /**
   * Get a specific catcher
   * @param {string} name The catcher's name
   * @returns {string|void} The catcher (undefined if the catcher is not found)
   */
  this.thinksToCatcher = name => RegexCatchers.hasOwnProperty(name) ? getCatcher(name) : undefined;

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
   * Get the last value of a list
   * @param {string} cell The memory's cell
   * @returns {*} The list's value (undefined if the cell is not found or if it doesn't contain any value)
   */
  this.thinksToListLastValue = cell => memory['$'].hasOwnProperty(cell) ? memory[cell].slice(-1)[0] : undefined;

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
   * @param {number} [index] The index to push the value in (default: a new one)
   * @returns {void}
   */
  this.learnsListValue = (cell, value, index) => {
    // If the cell is not found...
    if (!memory['$'].hasOwnProperty(cell))
      // Throw an error
      throw new Error(`[Lisa] Unknown list "${cell}"`);

    // If the value is not valid...
    if (!isValidInList(value, memory['$'][cell]))
      // Throw an error
      throw new Error(`[Lisa] Provided value for list "${cell}" is not an ${memory['$'][cell]}`);

    // If an index was provided...
    if (typeof index !== 'undefined') {
      // If the index is not valid...
      if (typeof index !== 'number' || index < 0 || Math.floor(index) !== index)
        // Throw an error
        throw new Error(`[Lisa] List\'s index must be a positive integer`);

      // If the index exceed the list's size of 1...
      if (index === memory[cell].length)
        // Push the new value at the end of the list
        memory[cell].push(value);

      // Else, if the index exceed the list's size...
      else if (index > memory[cell].length)
        // Throw an error
        throw new Error(`[Lisa] Length mismatch: List contains ${memory[cell].length} values, can't push a value as the ${index} index.`);

      // Else...
      else
        // Just set the value to its place
        memory[cell][index] = value;
    }
    // Else, no index was given...
    else
      // Append the value to the end of the list
      memory[cell].push(value);

    // If the related event has a handler...
    if (eventsHandler['learnt'])
      // Trigger its callback
      eventsHandler['learnt'](cell, value, typeof index === 'undefined' ? memory[cell].length - 1 : index);
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

    // If the new value was assigned to the list and if a handler is present
    // for the related event...
    if (assign && eventsHandler['learnt'])
      // Trigger its callback
      eventsHandler['learnt'](cell, list.slice(0));

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

    // If the new value was assigned to the list and if a handler is present
    // for the related event...
    if (assign && eventsHandler['learnt'])
      // Trigger its callback
      eventsHandler['learnt'](cell, list.slice(0));

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
   * Reverse a list
   * @param {string} cell The list to reverse
   * @param {boolean} [assign] Write the result as the list's new value (default: false)
   * @returns {Array}
   */
  this.reversesList = (cell, assign) => {
    // If the list is not found...
    if (!memory['$'].hasOwnProperty(cell))
      // Throw an error
      throw new Error(`[Lisa] List "${cell}" was not found`);

    // Get the list and clone it if it won't be assigned as the list's new
    // value, because the sort will override the 'list' array
    // Then, reverse the got array
    let list = (assign ? memory[cell] : memory[cell].slice(0)).reverse();

    // If the new value was assigned to the list and if a handler is present
    // for the related event...
    if (assign && eventsHandler['learnt'])
      // Trigger its callback
      eventsHandler['learnt'](cell, list.slice(0));

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
   * Get a value using its natural form
   * @param {string} cell The cell to get
   * @returns {string|number|boolean|Array|void} Plain value for plain cells, arrays for lists
   */
  this.thinksToCell = cell =>
    // If it's a list...
    memory['$'].hasOwnProperty(cell) ?
      // Return an array
      memory[cell].slice(0) :
      // Else, return a plain value
      memory[cell];

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
   * @param {boolean} [allowHtml] Display the message as HTML content (default: false)
   * @returns {void}
   */
  this.says = (message, allowHtml) => this.displayMessage('Lisa', message, 'lisa', allowHtml);

  /**
   * Display a message from the user
   * @param {string} message The message's content
   * @param {boolean} [allowHtml] Display the message as HTML content (default: false)
   * @returns {void}
   */
  this.hears = (message, allowHtml) => this.displayMessage('You', message, 'user', allowHtml);

  /**
   * Perform a request
   * @param {string} request The request
   * @param {boolean} [display] Display the message as a Lisa's answer (default: true)
   * @returns {string} An HTML code or a text answer
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
      // If the handler matches with the request...
      // NOTE: The handler's tolerant regex is used for the match, the strict
      // regex will be applied after, to test if all works.
      // NOTE: Because of that, if two handlers are gave with the same tolerant
      // regex, the second one will never be runned.
      // NOTE: Also, because the matches have to be got from the strict regex,
      // the 'match' variable is not assigned in the line below anymore but when
      // the strict regex' test happens.
      if (handler[2].test(request)) {
        // If the request's syntax matches with the tolerant regex but not with
        // the strict one...
        if (!(match = request.match(handler[0]))) {
          // Get the error message to use as the answer
          let error = this.thinksTo('REQUEST_SYNTAX_ERROR');

          // If no message was got...
          if (typeof error !== 'string')
            // Set a default error message
            error = 'A part of your answer is not valid. Please check it.';

          // If the answer have to be displayed...
          if (display)
            // Display it, as a text message (not an HTML code)
            this.says(error);

          // Return the error message as the request's answer
          return error;
        }

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
          // The handler (as a tolerant regex) used for this request
          handlerRegex: handler[2],
          // The handler (as a strict regex) used for this request
          handlerStrictRegex: handler[0],
          // All catchers used by the hanlder
          catchers: handler[1],
          // The callback used by the handler (the one which will be runned)
          callback: handler[3],
          // All help texts about this handler
          help: handler[4],
          // The original handler (a string)
          // NOTE: Because the 'Hello' and 'Hello !' handlers will give the same
          // regex handler, the 'originalHandler' can contain a bad handler.
          // But, it will be an equivalent of this original string.
          handler: handled[handlers.indexOf(handler)],
          // Will the message be displayed as a Lisa's one ?
          display: !!display,
          // The Lisa's instance which called the callback
          caller: this
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
        let output = handler[3].call(this, prepare);

        // Is the result an HTML content ?
        let html = false;

        // If the result is a number...
        if (typeof output === 'number')
          // Make it a string
          output = output.toString();
        // If the result is a DOM element...
        else if (typeof HTMLElement !== 'undefined' && output && output instanceof HTMLElement) {
          // Get its HTML content
          output = output.innerHTML;
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
          eventsHandler['did'](requests.slice(-1)[0] /* Date.now() */, output);

        // Return the result
        return output;
      }
    }

    // If no handler was selected, Lisa says she didn't understand
    // NOTE: There is often a '*' handler that handles any unhandled request,
    //       so that line is here to prevent potential problem if this handler
    //       is removed from the source code.
    // Get the error message to use as the answer
    let error = this.thinksTo('MISUNDERSTOOD_ERROR');

    // If no message was got...
    if (typeof error !== 'string')
      // Set a default error message
      error = 'I didn\'t understand your request.';

    // If the answer have to be displayed...
    if (display)
      // Display it, as a text message (not an HTML code)
      this.says(error);

    // Return the error message as the request's answer
    return error;
  };

  /**
   * Make a regex string from a locale's replacement text
   * @param {string} text The locale's replacement text to make a regex from
   * @returns {string} The regex, as a string
   */
   function treatLocaleText(text) {
     // Return the made regex
     // NOTE: Here, only spaces are used instead of regex because it allows a
     // very faster test speed. For tests where a replacement text is placed at
     // the beginning of the string (like [ "'d}", "{would}" ] on "would like")
     // there's just to put a space at the left and right of the tested string :
     // e.g. " would like " and that works fine.
     return (
       // If the text must be a single word...
       (text.startsWith('_') && text.endsWith('_'))
         ? ' ' + text.slice(1, -1) + ' '

         // If the text must have a word on its left...
         : text.startsWith('_')
           ? ' ' + text.slice(1)

           // If the text must have a word on its right...
           : text.endsWith('_')
             ? text.slice(0, -1) + ' '

             // If it can be placed anywhere (like an accentuated symbol)
             : text
    );
   }

  /**
   * Create a regex from a set of replacement texts (for locales)
   * NOTE: The 'texts' argument is not verified to save much time
   * @param {Array.<string>} texts The replacement texts to use
   * @param {boolean} [regex] Make a RegExp instead of a string (default: false)
   * @returns {string|RegExp} The build regex
   */
  this.createsLocaleRegex = (texts, regex = false) => {
    // Declare a variable to contain the future regex' content
    let str = '';

    // For each text that can be used as replacement...
    for (let text of texts)
      // Add the text to the regex
      str += '|' + treatLocaleText(text);

    // Make the final regex (as a string)
    // NOTE: The .substr(1) is here to remove the first '|' symbol from the
    // 'regex' variable.
    str = `(?:${str.substr(1)})`;

    // Return it in the asked form
    return regex ? new RegExp(str, 'g') : str;
  };

  /**
   * Learn a locale's pattern
   * @param {string} locale The locale to use
   * @param {Array.<string>} texts The texts that can replace themselves mutually
   * @returns {void}
   */
  this.learnsLocaleTexts = (locale, texts) => {
    // If the locale is not valid...
    if (typeof locale !== 'string' || locale.length !== 2)
      // Throw an error
      throw new Error('[Lisa] Bad locale given, must be a two-characters long string');

    // If the replacement is not valid...
    if (!Array.isArray(texts))
      // Throw an error
      throw new Error('[Lisa] Bad locale\'s replacement texts given, must be an array');

    // If no replacement text was given...
    if (!texts.length)
      // Throw an error
      throw new Error(`[Lisa] No text was provided for locale "${locale}"'s pattern`);

    // For each text that can be used as replacement...
    for (let text of texts) {
      // If the text is not valid...
      if (typeof text !== 'string' || !text)
        // Throw an error
        throw new Error(`[Lisa] Bad replacement text given for locale "${locale}"'s pattern, must be a not-empty string`);

      // If the text has not a valid syntax...
      // (The '{' and '}' symbols are removed respectively from the beginning
      //  and the end of the text because they are allowed)
      if (!/^[^\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|\!]+$/.test(text))
        // Throw an error
        throw new Error(`[Lisa] Locales' replacement texts cannot contain RegExp-reserved symbols (while registering pattern for locale "${locale}")`);
    }

    // If this locale is unknown...
    if (!locales.hasOwnProperty(locale))
      // Initialize it
      locales[locale] = [];

    // Register this pattern, after cloning the replacement texts to prevent
    // modifications from the outside.
    // Also, the subject is a possible value, so it has to be registed as a
    // replacement text.
    locales[locale].push([ this.createsLocaleRegex(texts, true), texts.slice(0) ]);
  };

  /**
   * Format a text using a locale
   * @param {string} text The text to turn into a RegExp
   * @param {string} locale The locale to use (default: the current one)
   * @returns {string} A RegExp, as a string
   */
  this.translatesLocaleText = (text, locale = currentLocale) => {
    // If the text is not valid...
    if (typeof text !== 'string' || !text)
      // Throw an error
      throw new Error('[Lisa] Bad text provided, must be a not-empty string');

    // If this locale is not known...
    if (!locales.hasOwnProperty(locale))
      // Throw an error
      throw new Error('[Lisa] Unknown locale provided');

    // Escape all RegExp characters from the text
    text = text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|\!]/g, "\\$&");

    // For each patterns defined for this locale...
    for (let rep of locales[locale])
      // Use it in the text
      // A string regex is made to replace the pattern by the possible texts
      text = text.replace(rep[0], this.createsLocaleRegex(rep[1]));

    // Return the translated text
    return text;
  };

  /**
   * Set the current locale
   * @param {string} locale The locale to set
   * @returns {void}
   */
  this.usesLocale = locale => {
    // If this locale is not known...
    if (!locales.hasOwnProperty(locale))
      // Throw an error
      throw new Error('[Lisa] Unknown locale given');

    // Set the locale
    currentLocale = locale;
  };

  /**
   * Check if a text matches with another using a locale
   * @param {string} left The first text
   * @param {string} right The second text
   * @param {string} locale The locale to use (default: the current one)
   * @returns {boolean} TRUE if the both texts are identical according to the locale
   */
  this.knowsTextsIdenticals = (left, right, locale = currentLocale) => {
    // If one of the text is not valid...
    if (typeof left !== 'string' || !left || typeof right !== 'string' || !right)
      // Throw an error
      throw new Error('[Lisa] Invalid texts given, must be not-empty strings');

    // If this locale is not known...
    if (!locales.hasOwnProperty(locale))
      // Throw an error
      throw new Error('[Lisa] Unknown locale given');

    // Get the smaller text, because regex making takes a longer time
    let smallerText = left.length > right.length ? right : left;

    // Compare the two texts using a RegExp
    // For that, build a RegExp
    // NOTE: A space is allowed at the beginning and at the end of the string
    // because texts will often contain those spaces in case if there would be
    // a replacement texts set that operates at the beginning/end of the string
    // e.g. [ "'d}", "{would}" ] => Operates at the beginning of "would like to"
    //      So a space is put at the beginning and the end of the string :
    //      " would like to " but maybe the "would" keyword has not been
    //      registered or the locale will be changed, so these two spaces must
    //      be allowed, in any case.
    return new RegExp('^ ' + this.translatesLocaleText(smallerText, locale) + ' $')
      // ...and test it on the larger text
      .test(' ' + (smallerText === left ? right : left) + ' ');
  };

  /**
   * Get the current locale
   * @returns {string} The locale currently used
   */
  this.thinksToLocale = () => locale;

  /**
   * Check if Lisa knows a specific locale
   * @param {string} locale The locale to check
   * @returns {boolean} TRUE if the given locale is known, FALSE else
   */
  this.knowsLocale = locale => locales.hasOwnProperty(locale);

  /**
   * Make Lisa remembering all messages and requests
   * @returns {void}
   */
  this.nowRemembersMessages = () => void (rememberMessages = true);

  /**
   * Don't make Lisa remembering all messages and requests
   * @returns {void}
   */
  this.doesntRememberMessages = () => void (rememberMessages = false);

  /**
   * Get a message from the history
   * @param {number} [id] An integer, which is the message you want from the very end (default: 0 = last message)
   * @returns {Array}
   */
  this.thinksToMessage = (id = 0) => {
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
    return messages[messages.length - 1 - id].slice(0);
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
      // Copy it into the '_handlers' array, as an array of strings
      _handlers.push([
        // Strict regex, as a string
        handler[0].toString(),
        // Catchers (which are already strings)
        handler[1],
        // Tolerant regex, as a string
        handler[2].toString(),
        // Callback, as a string
        handler[3].toString(),
        // Optionnal help texts (which are already strings)
        handler[4]
      ]);

    // Declare a variable which will contain the catchers (as strings)
    let _catchers = {};

    // For each registered catcher...
    for (let catcher of Reflect.ownKeys(RegexCatchers))
      // If this catcher is not a native one...
      // (This condition is here to avoid exporting uselessly native catchers)
      if (!nativeCatchers.includes(catcher))
        // Copy it into the '_catchers' array (without opening and closing
        // parenthesis)
        _catchers[catcher] = RegexCatchers[catcher]();

    // Declare a variable which will contain the locales (as strings)
    let _locales = {};

    // For each registered locale...
    for (let locale of Reflect.ownKeys(locales)) {
      // Create a sub-object in the '_locales' one
      _locales[locale] = [];

      // For each pattern registered for this locale...
      for (let texts of locales[locale])
        // Copy it into the '_locales' array
        // Only the possible texts are kept, not the built RegExp.
        _locales[locale].push(texts[1]);
    }

    // Then, stringify this data (that makes a string and prevent modifications from
    // outside)
    return JSON.stringify({
      // Native data
      memory,
      handled,
      rememberMessages,
      messages,
      requests,
      currentLocale,
      // Modified data
      handlers: _handlers,
      catchers: _catchers,
      locales: _locales
    });
  };

  // Initialize some memory's variables
  this.learns('HOURS_NAME', 'hours');
  this.learns('MINUTES_NAME', 'minutes');
  this.learns('SECONDS_NAME', 'secondes');
  this.learns('MONTHS', 'january,february,march,april,may,june,july,august,september,october,november,december');

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
  // Set the current locale
  this.__defineSetter__('locale', (l) => this.usesLocale(l));
  // Get the current locale
  this.__defineGetter__('locale', () => currentLocale);
};

return Lisa; })());

// If the 'module' object is available...
if (typeof module === 'object' && module && !Array.isArray(module)) {
  // Export Lisa as a Node.js module
  module.exports = Lisa;
  // Allow to load LIS parser
  module.exports.loadParser = () => {
    // Read the parser's file and run it
    eval(require('fs').readFileSync(require('path').join(__dirname, 'lis-parser.js'), 'utf-8'));
    // Destroy this function
    delete module.exports.loadParser;
  };
  // Allow to load the state manager
  module.exports.loadManager = () => {
    // Read the manager's file and run it
    eval(require('fs').readFileSync(require('path').join(__dirname, 'localdata.js'), 'utf-8'));
    // Destroy this function
    delete module.exports.loadManager;
  };
}
