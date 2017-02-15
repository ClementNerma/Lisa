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
 */
Lisa.Script = {
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
   * Equivalent in JavaScript code for LIS functions
   * @type {Object.<string, string>}
   */
  functions: {},

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
     * Transpile a LIS variable call
     * NOTE: THis function does NOT check the expression's syntax ; functions can be opened without be closed
     * @param {string} variable The variable to transpile into JavaScript call
     * @returns {string} Compiled JavaScript code
     */
    function transpileVar(variable) {
      // If that's a caught argument...
      if (variable.startsWith('_'))
        return '_a.caught[' + variable.substr(1) + ']';
      // Else, if that's a standardly-formatted argument...
      else if (variable.startsWith('^'))
        return '_a.formatted[' + variable.substr(1) + ']';
      // Else, that's a variable...
      else
        return 'Lisa.thinksTo("' + variable + '")';
    }

    /**
     * Transpile a LIS expression
     * @param {string} str The content to transpile
     * @returns {string} Compiled JavaScript code
     */
    const transpile = str => {
      // A quote is put at the beginning and the end of the string to transpile,
      // so the regex put below can capture originally unquoted contents to
      // transpile them!
      // Else, that regex would capture quoted strings, which are the contents
      // that doesn't have to be transpiled (strings are immutable contents).
      return ('"' + str + '"')
        // Get the originally unquoted parts of the string to transpile
        .replace(/"(.*?)"/g, match =>
          // In this expression, replace all function calls by their JavaScript
          // equivalent.
          // NOTE: The 'match' variable contains the quotes at the beginning
          // and the end of the part, because they need to be saved. Else, the
          // content will be considered as a originally quoted string for the
          // next regex tests and will be confused with the really originally
          // quoted strings (complex, right?)
          match.replace(/([a-z]+) *\(/i, (m, call) => {
            // If this function is known...
            // NOTE: Here, the 'this' keyword wasn't working. This may be due
            // to the 'babel' usage, but it can also be due to JavaScript's
            // behaviors. In all cases, the 'that' alias is used instead to
            // prevent the keyword to be 'undefined' and throw a fatal
            // JavaScript error inside this block of code.
            if (this.functions.hasOwnProperty(call))
              // Return it with an opening parenthesis for the call
              return this.functions[call] + '(';
            // Else...
            else
              // Throw an error
              error(`Unknown function "${call}"`);
          })
        )
        // Remove the first and last quotes in the string
        .slice(1, -1)
        // Replace all variables (all [a-z\^_0-9]+ content which is not followed
        // by potential space(s) and an opening parenthesis, else that's a
        // function call ; or by a point, else that could be a transpiled
        // function call like Math.random())
        .replace(/([^a-z0-9\^_]|^)([a-z][a-z0-9_]*|_(?:\d|[1-9]\d+)|\^(?:\d|[1-9]\d+))(?! *[\(\.a-z])/ig,
          (m, before, variable) =>
            // Transpile the variable call
            before + transpileVar(variable)
        )
        // Now, replace some things in the really quoted strings
        // The .slice() call above inversed all quoted strings with not-quoted
        // strings and not-quotes strings with quoted strings.
        .replace(/"(.*?)"/g, match =>
          // Match all variable calls in the captured quoted string and
          // transpile them
          match.replace(/%([a-z][a-z0-9_]*|_(?:\d|[1-9]\d+)|\^(?:\d|[1-9]\d+))%/g, (match, variable) =>
              `"+${transpileVar(variable)}+"`
          )
        )
        // There could be some parts like ""+Lisa.thinksTo("variable")+"", so
        // it's useful to avoid them to make the JavaScript code more readable
        // and smaller.
        .replace(/""\+/g, '').replace(/\+""/g, '');
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

    // The program's variables
    let vars = [ 'stack' ];

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

      // -> Variable assignment
      // NOTE: This condition is placed as one of the first of the chain because
      // it matches a very commonly used syntax and because it's faster to test
      else if (match = line.match(/^([a-z][a-z0-9_]*) *= *(.*)$/i)) {
        // Write it
        //ast.push([ 'assign', match[1], match[2] ]);
        program += `${match[1]}=${transpile(match[2])};`;

        // If this variable is not defined in the function...
        if (!vars.includes(match[1]))
          // List it as a variable to declare
          vars.push(match[1]);
      }

      // -> If it's a boolean condition...
      else if (match = line.match(/^if( +NOT *|) +([a-z][a-z0-9_]*|_\d+|\^\d+)$/i)) {
        // Write it
        //ast.push([ 'if', match[1] ? true : false, 'true', match[2] ]);
        program += `if(${match[1]?'!':''}${transpile(match[2])}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's an existance condition...
      else if (match = line.match(/^if( +NOT *|) +knows +([a-z][a-z0-9_]*|_\d+|\^\d+)$/i)) {
        // Write it
        //ast.push([ 'if', match[1] ? true : false, 'know', match[2] ]);
        program += `if(${match[1]?'!':''}Lisa.knows("${match[2]}")){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> Test if a cell is a list
      else if (match = line.match(/^if( +NOT *|) +(islist|is_list|list) +([a-z][a-z0-9_]*)$/i)) {
        // Write it
        //ast.push([ 'if', match[1] ? true : false, 'islist', match[3] ])
        program += `if(${match[1]?'!':''}Lisa.isList("${match[3]}")){`;
        // Expect for a new indentatino
        indented ++;
      }

      // -> If it's a mathematical condition...
      else if (match = line.match(/^if +([a-z][a-z0-9_]*|_\d+|\^\d+) *(<=|>=|<|>) *(\d+[.]?|\d*\.\d+)$/i)) {
        // Write it
        //ast.push([ 'if', match[2], match[1], match[3] ]);
        program += `if(Lisa.thinksTo("${match[1]}")${match[2]}${match[3]}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's a comparative condition...
      else if (match = line.match(/^if +(.*?) *(=|==|\!|\!=|\!==|is not|isnt|is) *(.*?)$/i)) {
        // Write it
        //ast.push([ 'if', this.comparators[match[2]] || match[2], match[1], match[3] ]);
        program += `if(${transpile(match[1])}${this.comparators[match[2]]}${transpile(match[3])}){`;
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
      else if (match = line.match(/^(end|return|die|output) +(.*?)$/i))
        // Write it
        //ast.push([ 'return', match[2] ]);
        program += 'return ' + transpile(match[2]) + ';';

      // -> If it's a store instruction...
      // NOTE: In the store's target the '_' symbol is not allowed at the
      // beginning of the target's name, because it's reserved to the function's
      // arguments, which cannot be the store's target
      else if (match = line.match(/^(store|set|learn|rem|remember|mem|memorize|save)[s]? +(.*?) *=> *([a-z][a-z0-9_]*)$/i))
        // Write it
        //ast.push([ 'store', match[1], match[2] ]),
        program += `Lisa.learns("${match[3]}",${transpile(match[2])});`;

      // -> If it's a new hanlder...
      else if (match = line.match(/^"(.*)" *=>$/)) {
        // Write it
        program += `Lisa.understands("${match[1]}",function(){var _a=arguments[0],stack;`;
        // Mark this indentation as closing a handler
        closing.push(indented);
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's an unstore instruction...
      else if (match = line.match(/^(unstore|unset|unlearn|unremember|unmemorize|unsave|forget)[s]? +([a-z][a-z0-9_]*)$/i))
        // Write it
        //ast.push([ 'forget', match[2] ])
        program += `Lisa.forgets("${match[2]}");`;

      // -> List creation
      else if (match = line.match(/^(makelist|createlist|setlist) +(bool|boolean|int|integer|float|floating|str|string) +([a-z][a-z0-9_]*)$/i))
        // Write it
        //ast.push([ 'makelist', match[2], match[3] ]);
        program += `Lisa.learnsList("${match[3]}",[],"${match[2]}");`;

      // -> Push a value into a list
      else if (match = line.match(/^(pushlist|push|append|add) +(.*?) +in +([a-z][a-z0-9_]*)$/i))
        // Write it
        //ast.push([ 'push', match[3], match[2] ]);
        program += `Lisa.learnsListValue("${match[3]}",${transpile(match[2])});`;

      // -> Sort a list with ascending order
      else if (match = line.match(/^(sorts?_?a?|sorts?_?asc|sorts?_?list|sorts?_?list_?asc) +([a-zA-Z][a-zA-Z0-9_]*)$/))
        // Write it
        //ast.push([ 'sortasc', match[2] ])
        program += `Lisa.sortsList("${match[2]}",true);`;

      // -> Sort a list with descending order
      else if (match = line.match(/^(sorts?|sorts?_?d?|sorts?_?desc|sorts?_?list_?d|sorts?_?list_?desc) +([a-z][a-z0-9_]*)$/i))
        // Write it
        //ast.push([ 'sortdesc', match[2] ])
        program += `Lisa.sortsList("${match[2]}",true,false);`;

      // -> Shuffle a list
      else if (match = line.match(/^(shuffles?|shuffles?_?list|rand_?list|randomize_?list|randomize) +([a-z][a-z0-9_]*)$/i))
        // Write it
        //ast.push([ 'shuffle', match[2] ]);
        program += `Lisa.shufflesList("${match[2]}",true);`;

      // -> Reverse a list
      else if (match = line.match(/^(reverses?|reverses?_?list) +([a-z][a-z0-9_]*)$/i))
        // Write it
        //ast.push([ 'reverse', match[2] ]);
        program += `Lisa.reversesList("${match[2]},true);`

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
    // NOTE: The built code is contained into a closure. That permits to avoid
    // polution of the global environment with the program's variables, which
    // stay accessible from the program's inside code. Also, closures are
    // usually faster than code running into the global scope.
    return `(function(){var ${vars.join(',')};${program}}();`;
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
    if (match = url.match(/^presets?:\/\/\/?((?:[a-zA-Z_0-9][\/\\]?)+)(\.lis|)$/i))
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
