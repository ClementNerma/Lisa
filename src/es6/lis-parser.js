/** @file Parse and run LIS (Lisa's Interface Script) programs */

/**
 * Get an insance of the XMLHttpRequest Object
 * @returns {XMLHttpRequest}
 */
function getXMLHttpRequest() {
  if (window.ActiveXObject) {
		try {
			return new ActiveXObject("Msxml2.XMLHTTP");
		} catch(e) {
			return new ActiveXObject("Microsoft.XMLHTTP");
		}
	} else
		return new XMLHttpRequest();
}

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

      // If the line starts by a 'ELSE' block (with something after)...
      if (match = line.match(/^else +/)) {
        // Write it
        program += 'else '

        // NOTE: This syntax doesn't expect for a new indentation because it's
        // an 'inline' else block, so there won't be any '{' or '}' symbol.

        // Remove the 'else' part from the line
        line = line.substr(match[0].length);
      }

      // Test the line

      // -> If it's a 'ELSE' block...
      // NOTE: This condition is the first of the chain because it's the faster
      //       to test
      if (line === 'else') {
        // Write it
        //ast.push([ 'else' ]);
        program += 'else{';
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's a boolean condition...
      else if (match = line.match(/^if( +NOT *|) +([a-zA-Z][a-zA-Z0-9_]*|_\d+|\^\d+)$/)) {
        // Write it
        //ast.push([ 'if', match[1] ? true : false, 'true', match[2] ]);
        program += `if(${match[1]?'!':''}${formatVar(match[2])}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's an existance condition...
      else if (match = line.match(/^if( +NOT *|) +knows +([a-zA-Z][a-zA-Z0-9_]*|_\d+|\^\d+)$/)) {
        // Write it
        //ast.push([ 'if', match[1] ? true : false, 'know', match[2] ]);
        program += `if(${match[1]?'!':''}Lisa.knows("${match[2]}")){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> Test if a cell is a list
      else if (match = line.match(/^if( +NOT *|) +(islist|is_list|list) +([a-zA-Z[a-zA-Z0-9_]*)$/)) {
        // Write it
        //ast.push([ 'if', match[1] ? true : false, 'islist', match[3] ])
        program += `if(${match[1]?'!':''}Lisa.isList("${match[3]}")){`;
        // Expect for a new indentatino
        indented ++;
      }

      // -> If it's a mathematical condition...
      else if (match = line.match(/^if +([a-zA-Z][a-zA-Z0-9_]*|_\d+|\^\d+) *(<=|>=|<|>) *(\d+[.]?|\d*\.\d+)$/)) {
        // Write it
        //ast.push([ 'if', match[2], match[1], match[3] ]);
        program += `if(Lisa.thinksTo("${match[1]}")${match[2]}${match[3]}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's a comparative condition...
      else if (match = line.match(/^if +("(?:.*)"|\d+[.]?|\d*\.\d+|[a-zA-Z][a-zA-Z0-9_]*|_\d+|\^\d+) *(=|==|\!|\!=|\!==|is not|isnt|is) *("(?:.*)"|\d+[.]?|\d*\.\d+|[a-zA-Z][a-zA-Z0-9_]*|_\d+|\^\d+)$/)) {
        // Write it
        //ast.push([ 'if', this.comparators[match[2]] || match[2], match[1], match[3] ]);
        program += `if(${formatVar(match[1])}${this.comparators[match[2]]}${formatVar(match[3])}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's a Lisa's message to display...
      else if (match = line.match(/^say +"(.*)"$/))
        // Write it
        //ast.push([ 'say', match[1] ]);
        program += 'Lisa.says("' +
            // Caught part
            match[1].replace(/%_(\d|[1-9]\d*)%/g, '"+_a.caught[$1]+"')
            // Standardly-formatted part
                    .replace(/%\^(\d|[1-9]\d*)%/g, '"+_a.formatted[$1]+"')
          // Finish the function call
          + '");';

      // -> If it's a return instruction...
      else if (match = line.match(/^(end|return|die|output) +("(?:.*)"|\d+[.]?|\d*\.\d+|[a-zA-Z][a-zA-Z0-9_]*|_\d+|\^\d+)$/))
        // Write it
        //ast.push([ 'return', match[2] ]);
        program += 'return ' + formatVar(match[2]) + ';';

      // -> If it's a store instruction...
      // NOTE: In the store's target the '_' symbol is not allowed at the
      // beginning of the target's name, because it's reserved to the function's
      // arguments, which cannot be the store's target
      else if (match = line.match(/^(store|set|learn|rem|remember|mem|memorize|save)[s]? +("(?:.*)"|\d+[.]?|\d*\.\d+|[a-zA-Z][a-zA-Z0-9_]*|_\d+|\^\d+) *=> *([a-zA-Z][a-zA-Z0-9_]*)$/))
        // Write it
        //ast.push([ 'store', match[1], match[2] ]),
        program += `Lisa.learns("${match[3]}",${formatVar(match[2])});`;

      // -> If it's a new hanlder...
      else if (match = line.match(/^"(.*)" *=>$/)) {
        // Write it
        program += `Lisa.understands("${match[1]}",function(){var _a=arguments[0];`;
        // Mark this indentation as closing a handler
        closing.push(indented);
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's an unstore instruction...
      else if (match = line.match(/^(unstore|unset|unlearn|unremember|unmemorize|unsave|forget)[s]? +([a-zA-Z][a-zA-Z0-9_]*)$/))
        // Write it
        //ast.push([ 'forget', match[2] ])
        program += `Lisa.forgets("${match[2]}");`;

      // -> List creation
      else if (match = line.match(/^(makelist|createlist|setlist) +(bool|boolean|int|integer|float|floating|str|string) +([a-zA-Z][a-zA-Z0-9_]*)$/))
        // Write it
        //ast.push([ 'makelist', match[2], match[3] ])
        program += `Lisa.learnsList("${match[3]}",[],"${match[2]}");`;

      // Else...
      else
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
  },

  /**
   * Load a LIS program from a specific URL
   * @param {string} url The program's URL
   * @returns {string} The program's source code
   */
  download(url) {
    // Declare a local variable to test the URL's protocol
    let match;

    // If the URL is not a string or is empty...
    if (typeof url !== 'string' || !url)
      // Throw an error
      throw new Error('[LIS:download] Illegal URL provided, must be a not-empty string');

    // If the request refers to the 'file' protocol...
    // NOTE: There may be a third slash after the second one, but there's no
    // need to test its presence.
    if (url.startsWith('file://'))
      // Throw an error
      throw new Error('[LIS:download] Protocol "file:///" is forbidden: Lisa is not allowed to load local computer\'s resources');

    // If the request refers to the 'presets' protocol...
    // NOTE: This regex make the '.lis' file extension optionnal.
    // NOTE: Also, it forbids the '..' path, as much as the '/<...>' path
    if (match = url.match(/^presets?:\/\/\/?((?:[a-zA-Z_0-9][\/\\]?)+)(\.lis|)$/))
      // Set the URL to the Lisa's 'presets' path
      url = location.href.split('/').slice(0, -1).join('/') + '/presets/' + match[1].split('\\').join('/') + '.lis';

    // Initialize an Ajax object
    let xhr = getXMLHttpRequest();
    // Set up its URL
    xhr.open('GET', url, true);
    // When the request's state changes...
    xhr.addEventListener('readystatechange', e => {
      // If the request is done...
      if (xhr.readyState === 4) {
        // If the LIS program was downloaded successfully...
        if (xhr.status === 200)
          // Compile and run it
          this.exec(xhr.responseText);
        // Else...
        else
          // Throw an error
          throw new Error(`[LIS:download] Failed to download the LIS program (status code: ${xhr.status})`);
      }
    });
    // Launch the request
    xhr.send(null);
  }
};
