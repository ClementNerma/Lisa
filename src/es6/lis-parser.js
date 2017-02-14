/** @file Parse and run LIS (Lisa's Interface Script) programs */

/**
 * A suite of tools built around the LIS features
 * @type {Object}
 * @constant
 */
const LisaInterface = {
  /**
   * Equivalent in JavaScript code for LIS comparators
   * @type {Object.<string, string>}
   */
  comparators: {
    '='     : '===' ,
    '=='    : '===' ,
    'is'    : '===' ,
    '!'     : '!==' ,
    '!='    : '!==' ,
    '!=='   : '!==' ,
    'is not': '!==' ,
    'isnt'  : '!==' ,
  },

  /**
   * Make a JavaScript code from a LIS program
   * @param {string} source The LIS program
   * @returns {string} The built JavaScript code
   */
  compile(source) {
    /**
     * Throw an error
     * @param {string} text The error's text
     * @returns {void}
     */
    function error(text) {
      throw new Error(`[LIS:compile] At line ${lineIndex} :\n${line}\n^\n${text}`);
    }

    /**
     * Format a variable's call in JavaScript call
     * @param {string} variable The called variable
     * @returns {string} Compiled JavaScript code
     */
    function formatVar(variable) {
      // If that's a caught argument...
      if (variable.startsWith('_'))
        return '_a.caught[' + variable.substr(1) + ']';
      // Else, if that's a standardly-formatted argument...
      else if (variable.startsWith('^'))
        return '_a.formatted[' + variable.substr(1) + ']';
      // Else, if that's a variable...
      else if (variable.match(/^([a-zA-Z][a-zA-Z0-9_]*)$/))
        return 'Lisa.thinksTo("' + variable + '")';
      // Else, that's a plain content
      else
        return variable;
    }

    /**
     * Close the missing indentation
     * @returns {void}
     */
    function closeIndent() {
      // For each missing indentation...
      for (let i = 0; i < indented - indent; i++) {
        // If this indentation matches with the end of a handler's callback...
        if (closing.includes(indented - i - 1)) {
          // Close the handler's callback
          // If no value was returned, it will at least return the FALSE value
          // to prevent automatic message displaying.
          program += 'return false;});'
          // Remove this mark from the 'closing' array
          closing.splice(closing.indexOf(indented - i - 1), 1);
        } else
          // Close the 'if' block
          program += '}';
      }

      // Set the new indentation
      indented = indent;
    }

    // If the source code is not a string...
    if (typeof source !== 'string')
      // Throw an error
      throw new Error('[LIS:compile] Invalid source code provided, must be a string');

    // Get all lines of the source code
    let lines = source.split(/\r\n|\r|\n/g);

    // The JavaScript code
    let program = '';

    // The expected line's indentation
    let indented = 0;

    // The current line's indentation
    let indent;

    // The result of the .match() function
    let match;

    // The current line's number (starting from 1)
    let lineIndex = 0;

    // The current line's content
    let line;

    // The indentations that must close handlers' callback
    let closing = [];

    // For each line of code...
    for (line of lines) {
      // Increase the line's index
      lineIndex ++;
      // Get the line's indentation (two spaces = 1 indent)
      // Method used here: Double spaces and tabs are both counted, then
      // in the regex's result double spaces are replaced by tabs. Then, tabs
      // are counted: that's the indentation of the line.
      indent = line.match(/^(  |\t)*/)[0].replace(/  /g, '\t').length;

      // Trim the line
      line = line.trim();

      // If the line is empty...
      if (!line)
        // Ignore it
        continue ;

      // Indentation treatment -> If a condition is opened...
      if (indented) {
        // If the indentation is higher than expected...
        if (indent > indented)
          // Throw an error
          error(`Wrong indentation, expecting ${indented} tab${indented>1?'s':''} but ${indent} given.`);
        // Else, if the indentation is lower than expected...
        else if (indent < indented)
          // Close the missing indentations
          closeIndent();

        // Else, the indentation is the expected one, so there is nothing to do
        // about it.
      }

      // Indentation treatment -> If no indentation is expected but given
      if (!indented && indent)
        // Throw an error
        error('Wrong indentation, expecting no tab');

      // That's a syntax error -> throw an error
      error('Syntax error');
    }

    // Set the indentation as null
    indent = 0;
    // Close the mission indentation
    closeIndent();

    // Return the built code
    return program;
  },

  /**
   * Run a LIS program
   * @param {string} source The LIS program
   * @returns {void}
   */
  exec(source) {
    // Compile the source code and run it
    new Function([], this.compile(source))();
  }
};
