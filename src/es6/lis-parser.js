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
  functions: {
    // Get the length of a list
    listLength: 'Lisa.thinksToListLength',
    // Get the last value of a list
    lastValue: 'Lisa.thinksToListLastValue',
    // Does Lisa knows a value?
    knowsValue: 'Lisa.knowsValue',
    // Get help about a handler
    helpsAbout: 'Lisa.helpsAbout',
    // Check if a variable is a list
    isList: 'Lisa.isList',
    // Sort a list
    sort: 'Lisa.sortsList',
    // Shuffle a list
    shuffle: 'Lisa.shufflesList',
    // Reverse a list
    reverse: 'Lisa.reversesList',
    // Get the variable associated to a value
    search: 'Lisa.searchesValue',
    // Generate a random integer between 0 and 1 (floating number)
    random: 'Math.random',
    // Round a number
    round: 'Math.round',
    // Truncate a number
    trunc: 'Math.trunc',
    // Get the absolute value of a number
    abs: 'Math.abs',
    // Sinus
    sin: 'Math.sin',
    // Cosinus
    cos: 'Math.cos',
    // Exponential
    exp: 'Math.exp',
    // Logarithm
    log: 'Math.log',
    // Power
    pow: 'Math.pow',
    // Square root
    sqrt: 'Math.sqrt',
    // Make a string an integer
    int: 'parseInt',
    // Make a string a floating number
    float: 'parseFloat',
    // Make anything a string
    string: 'Lisa.Script.libString',
    // Get the standard form of a content
    standard: 'Lisa.getStandard',
    // Split a string to make an array
    split: 'String.prototype.split.call',
    // Join an array to make a string
    join: 'Array.prototype.join.call',
    // Concatenate values
    concat: 'Array.prototype.concat.call',
    // Get a variable by its name
    get: 'Lisa.thinksToCell'
  },

  /**
   * Transpile a LIS variable call
   * NOTE: THis function does NOT check the expression's syntax ; functions can be opened without be closed
   * @param {string} variable The variable to transpile into JavaScript call
   * @returns {string} Compiled JavaScript code
   */
  transpileVar(variable) {
    // If that's a local variable...
    if (variable.startsWith('$'))
      return variable.substr(1);
    // If that's a caught argument...
    else if (variable.startsWith('_'))
      return '_a.caught[' + variable.substr(1) + ']';
    // If that's a standardly-formatted argument...
    else if (variable.startsWith('^'))
      return '_a.formatted[' + variable.substr(1) + ']';
    // If that's a boolean...
    else if (variable === 'true' || variable === 'false')
      return variable;
    // Else, that's a variable...
    else
      return 'Lisa.thinksToCell("' + variable + '")';
  },

  /**
   * Transpile a LIS expression
   * @param {string} str The content to transpile
   * @returns {string} Compiled JavaScript code
   */
  transpile(str) {
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
        match.replace(/([a-z]+) *\(/ig, (m, call) => {
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
        // Replace all variables (all [a-z\^_0-9]+ content which is not followed
        // by potential space(s) and an opening parenthesis, else that's a
        // function call ; or by a point, else that could be a transpiled
        // function call like Math.random())
        // NOTE: Imbricated lists calls are not supported
        // e.g. list[another[index]] won't work, it will throw a syntax error
        .replace(/([^a-z0-9\^_\$]|^)(\$?[a-z][a-z0-9_]*|_(?:\d|[1-9]\d+)|\^(?:\d|[1-9]\d+))( *\[ *(.*?) *\]|)(?! *[\(\.a-z])/ig,
          (m, before, variable, isList, index) =>
            // Conserve the symbol placed before the call
            before + (
            // If that's a list call...
            isList
              // Transpile the variable call
              // If it's a local list...
              ? variable.startsWith('$')
                // NOTE: In the two next lines, the '~' operand refers to the
                // last value of a given list.

                // Transpile the call as a local call
                ? index === '~' ? variable.substr(1) + '.slice(-1)[0]' : variable.substr(1) + '[' + this.transpile(index) + ']'
                // Else, transpile it as a Lisa's memory's cell
                : index === '~' ? `Lisa.thinksToListLastValue("${variable}")` : `Lisa.thinksToListValue("${variable}",${this.transpile(index)})`

              // Else, that's a plain variable call
              // Transpile the variable call
              : this.transpileVar(variable)
            )
        )
      )
      // Remove the first and last quotes in the string
      .slice(1, -1)
      // Now, replace some things in the really quoted strings
      // The .slice() call above inversed all quoted strings with not-quoted
      // strings and not-quotes strings with quoted strings.
      .replace(/"(.*?)"/g, match =>
        // Match all variable calls in the captured quoted string and
        // transpile them
        match.replace(/%([a-z][a-z0-9_]*|_(?:\d|[1-9]\d+)|\^(?:\d|[1-9]\d+))%/g, (match, variable) =>
            `"+${this.transpileVar(variable)}+"`
        )
      )
      // There could be some parts like ""+Lisa.thinksToCell("variable")+"", so
      // it's useful to avoid them to make the JavaScript code more readable
      // and smaller.
      .replace(/""\+/g, '').replace(/\+""/g, '');
  },

  /**
   * Make a JavaScript code from a LIS program
   * @param {string} source The LIS program
   * @param {boolean} [beautify] Display a beautified JavaScript code (default: false)
   * @param {boolean} [keepComments] Keep all comments from the source code (default: false)
   * @param {Function} [onStep] A callback to run each time a line is compiled (default: null)
   * @returns {string} The built JavaScript code
   */
  compile(source, beautify = false, keepComments = false, onStep = null) {
    /**
     * Throw an error
     * @param {string} text The error's text
     * @returns {void}
     */
    function error(text) {
      throw new Error(`[LIS:compile] At line ${lineIndex} :\n${line}\n^\n${text}`);
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
          // NOTE: The indentation is increased by 2 instead of 1 because the
          // 'return' instruction is part of the function and not its closing
          // symbol.
          program += (beautify ? '\n' + '  '.repeat(indent + i + 2) : '') + 'return false;'
                  +  (beautify ? '\n' + '  '.repeat(indent + i + 1) : '') + '});'
          // Remove this mark from the 'closing' array
          closing.splice(closing.indexOf(indented - i - 1), 1);
        } else
          // Close the 'if' block
          program += (beautify ? '\n' + '  '.repeat(indent + i + 1) : '') + '}';
      }

      // Set the new indentation
      indented = indent;
    }

    /**
     * Generate a temporary variable
     * @returns {string} The temporary variable's name
     */
    function generateTemp() {
      // Get the variable's name
      let name = '_tmp' + (temporary ++);
      // Push it to the list of the variables to declare
      vars.push(name);
      // Return the name
      return name;
    }

    // If the source code is not a string...
    if (typeof source !== 'string')
      // Throw an error
      throw new Error('[LIS:compile] Invalid source code provided, must be a string');

    // The program's new line symbols. If the code is not beautified (minified),
    // it'll be an empty string. Else, it will contain the '\n' symbol plus the
    // line's expected indentation.
    // NOTE: This variable is re-generated many times
    // The default value written below is for minified codes, because the 'nl'
    // variable won't change in this case.
    let nl = '';

    // Get all lines of the source code
    const lines = source.split(/\r\n|\r|\n/g);

    // The JavaScript code
    let program = '';

    // The program's variables
    let vars = [];

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

    // The temporary variables counter
    let temporary = 0;

    // For each line of code...
    while (lineIndex < lines.length) {
      // Increase the line's index and get the current line
      line = lines[lineIndex++];

      // Get the line's indentation (two spaces = 1 indent)
      // Method used here: Double spaces and tabs are both counted, then
      // in the regex's result double spaces are replaced by tabs. Then, tabs
      // are counted: that's the indentation of the line.
      indent = line.match(/^(  |\t)*/)[0].replace(/  /g, '\t').length;

      // Trim the line
      line = line.trim();

      // If the line is empty and if no callback was provided for each step...
      // (Because the 'onStep' callback must be called after each line, and
      //  in the next lines an empty line is ignored, without calling the
      //  callback)
      if (!line && !onStep)
        // Ignore it
        continue ;

      // Only if the line is not empty...
      if (line) {
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

        // If the code is beautified...
        if (beautify)
          // Re-generate the new line symbols
          // NOTE: The indentation is increased by one because the program is
          // wrapped in a closure, which needs a level of indentation, but the
          // 'indented' variable starts from 0
          nl = '\n' + '  '.repeat(indented + 1);
      }

      // If the line starts by a 'ELSE' block (with something after)...
      if (match = line.match(/^else +/)) {
        // Write it
        program += nl + 'else ';

        // NOTE: This syntax doesn't expect for a new indentation because it's
        // an 'inline' else block, so there won't be any '{' or '}' symbol.

        // Remove the 'else' part from the line
        line = line.substr(match[0].length);
      }

      // Test the line

      // -> If it's a 'ELSE' block...
      // NOTE: This condition is the first of the chain because it's the faster
      //       to test
      if (line.toLocaleLowerCase() /* Case-insensitive */ === 'else') {
        // Write it
        program += nl + 'else{';
        // Expect for a new indentation
        indented ++;
      }

      // -> Comments
      // NOTE: This condition is placed as one of the first of the chain because
      // it matches a very commonly used syntax and because it's faster to test
      else if (line.startsWith('#')) {
        // If the comments have to be kept..
        if (keepComments)
          // Keep this one
          program += nl + `/*${line.substr(1)}*/`;

        // Else, ignore the comment, it will not appear in the source code.
      }

      // -> Variable assignment
      // NOTE: This condition is placed as one of the first of the chain because
      // it matches a very commonly used syntax and because it's faster to test
      else if (match = line.match(/^(\$|)([a-z][a-z0-9_]*)( *\[ *(.*?) *\])? *= *(.*)$/i)) {
        // Define some local variables
        let isLocal = !!match[1], target = match[2], isArray = !!match[3],
            index = match[4] ? this.transpile(match[4]) : null,
            value = this.transpile(match[5]);

        // If the '$' symbol was provided, the assignment is about a local
        // variable
        if (isLocal) {
          // : $... = ...
          // If this variable is not defined in the function...
          if (!vars.includes(target))
            // List it as a variable to declare
            vars.push(target);

          // If the assignment points to an index of an array...
          if (isArray) {
            // : $...[...] = ...
            // If an index was given...
            if (index)
              // : $....[...] = ...
              // The value must be assigned to this index
              program += nl + `${target}[${index}]=${value};`;
            // Else...
            else
              // : $...[] = ...
              // The value must be pushed
              program += nl + `${target}.push(${value});`
          }
          // Else, it refers to a plain assignment
          else
            // : $... = ...
            // Write it
            program += nl + `${target}=${value};`;
        }
        // Else, it refers to a Lisa's memory's cell
        else {
          // If the assignment points to an index of a list...
          if (isArray) {
            // : ...[...] = ...
            // If an index was given...
            if (index)
              // : ....[...] = ...
              // The value must be assigned to this index
              program += nl + `Lisa.learnsListValue("${target}",${value},${index});`;
            // Else...
            else
              // : ...[] = ...
              // The value must be pushed
              program += nl + `Lisa.learnsListValue("${target}",${value});`
          }
          // Else, it refers to a plain assignment
          else
            // : ... = ...
            // Write it
            program += nl + `Lisa.learns("${target}",${value});`;
        }

        // if (match[1] /* Local variable */ && match[3] /* Array */ && !match[4] /* No index */)
        // if (match[1] /* Local variable */ && match[3] /* Array */ && match[4] /* Index given */)
        // if (match[1] /* Local varibale */ && !match[3] /* Plain assignment */)

        // if (!match[1] /* Memory's cell */ && match[3] /* Array */ && !match[4] /* No index */)
        // if (!match[1] /* Memory's cell */ && match[3] /* Array */ && match[4] /* Index given */)
        // if (!match[1] /* Memory's cell */ && !match[3] /* Plain assignment */)
      }

      // -> Block of JavaScript code
      else if (line === '{{{') {
        // Define a variable to store the final JavaScript code inside
        let code = '';
        // Go to the previous line (fix a bug)
        lineIndex --;

        // While the script doesn't end...
        while (++ lineIndex /* Forever */) {
          // If the code's end has been reached...
          if (lineIndex === lines.length)
            // Throw an error
            throw new Error(`[Lisa] JavaScript code's block has no end`);

          // Get the current line
          line = lines[lineIndex].trim();

          // If the closing string is encounted...
          if(line === '}}}')
            // Break the loop
            break ;

          // Add the line's code to the script
          // NOTE: Line breaks cannot be removed because multiple lines strings
          // (`...\n...`) could be used in the block of code.
          code += '\n' // A \n is needed, even if the script mustn't be beautified
               + nl.substr(1) // Just remove the '\n'
               + line; // The line's content (JavaScript code)
        }

        // Write the code
        program += nl + code;
        // Increase the line's index
        lineIndex ++;
      }

      // -> If it's a boolean condition...
      else if (match = line.match(/^if( +NOT *|) +([a-z][a-z0-9_]*|_\d+|\^\d+)$/i)) {
        // Write it
        program += nl + `if(${match[1]?'!':''}${this.transpile(match[2])}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's an existance condition...
      else if (match = line.match(/^if( +NOT *|) +knows +([a-z][a-z0-9_]*|_\d+|\^\d+)$/i)) {
        // Write it
        program += nl + `if(${match[1]?'!':''}Lisa.knows("${match[2]}")){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If a list if empty...
      else if (match = line.match(/^if( +NOT *|) +empty +([a-z][a-z0-9_]*)$/i)) {
        // Write it (inversed condition here)
        program += nl + `if(${match[1]?'':'!'}Lisa.thinksToListLength("${match[2]}")){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> Test if a cell is a list
      else if (match = line.match(/^if( +NOT *|) +(islist|is_list|list) +([a-z][a-z0-9_]*)$/i)) {
        // Write it
        program += nl + `if(${match[1]?'!':''}Lisa.isList("${match[3]}")){`;
        // Expect for a new indentatino
        indented ++;
      }

      // -> If it's a mathematical condition...
      else if (match = line.match(/^if +(\$?[a-z][a-z0-9_]*|_\d+|\^\d+) *(<=|>=|<|>) *(\d+[.]?|\d*\.\d+)$/i)) {
        // Write it
        program += nl + `if(${this.transpileVar(match[1])}${match[2]}${match[3]}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's a comparative condition...
      else if (match = line.match(/^if +(.*?) *(\b(?:=|==|\!|\!=|\!==|is not|isnt|is)\b) *(.*?)$/i)) {
        // Write it
        program += nl + `if(${this.transpile(match[1])}${this.comparators[match[2]]}${this.transpile(match[3])}){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> If it's a Lisa's message to display...
      else if (match = line.match(/^say +(.*)$/i))
        // Write it
        program += nl + `Lisa.says(${this.transpile(match[1])});`;

      // -> If it's a return instruction...
      else if (match = line.match(/^(end|return|die|output) +(.*)$/i))
        // Write it
        program += nl + 'return ' + this.transpile(match[2]) + ';';

      // -> If it's a store instruction...
      // NOTE: In the store's target the '_' symbol is not allowed at the
      // beginning of the target's name, because it's reserved to the function's
      // arguments, which cannot be the store's target
      else if (match = line.match(/^(store|set|learn|rem|remember|mem|memorize|save)[s]? +(.*?) *(=>|in|to) *([a-z][a-z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.learns("${match[3]}",${this.transpile(match[2])});`;

      // -> If it's a new handler...
      else if (match = line.match(/^(for +|understands? +|with +|)"(.*)" *(=>|do)$/i)) {
        // Write it
        // NOTE: If the output has to be beautified, a new indentation is set
        // for the first line of the closure (var _a...) because this line is
        // part of the function and is not at the same indentation level.
        // NOTE: A 'Lisa' variable is created because the main Lisa's reference
        // can be lost on some cases (like in the CLI).
        program += nl + `Lisa.understands("${match[2]}",function(){${nl?nl+'  ':''}var _a=arguments[0],Lisa=_a.caller;`;
        // Mark this indentation as closing a handler
        closing.push(indented);
        // Expect for a new indentation
        indented ++;
      }

      // -> Iterate from a number to another...
      // NOTE: Iterator must be a local variable
      else if (match = line.match(/^for +\$([a-z][a-z0-9_]*) +(in|of) +(.*?) +(to|\.\.|=>|->) +(.*)$/i)) {
        // If this variable is not defined in the function...
        if (!vars.includes(match[1]))
          // List it as a variable to declare
          vars.push(match[1]);

        // Write the code
        program += nl + `for(${match[1]}=${this.transpile(match[3])};${match[1]}<=${this.transpile(match[5])};i++){`;
        // Expect for a new indentation
        indented ++;
      }

      // -> Iterate for each value of a list or array...
      // NOTE: Iterator must be a local variable
      else if (match = line.match(/^for *each +\$([a-z][a-z0-9_]*) +(in|of) +(.*?)$/i)) {
        // If this variable is not defined in the function...
        if (!vars.includes(match[1]))
          // List it as a variable to declare
          vars.push(match[1]);

        // Generate two new random variables
        let subject = generateTemp(), iterator = generateTemp();

        // Write the code
        program += nl + `${subject}=${this.transpile(match[3])};`
                +  nl + `for(${iterator}=0;${iterator}<${subject}.length;${iterator}++){`
                +  nl + `  ${match[1]}=${subject}[${iterator}];`;

        // Expect for a new indentation
        indented ++;
      }

      // -> Ask something
      else if (match = line.match(/^(requests?|asks?|does) +"(.*)"$/i))
        // Write it
        program += nl + `Lisa.hears("${match[2]}");Lisa.does("${match[2]}");`;

      // -> If it's an unstore instruction...
      else if (match = line.match(/^(unstore|unset|unlearn|unremember|unmemorize|unsave|forget|delete)[s]? +([a-z][a-z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.forgets("${match[2]}");`;

      // -> List creation
      else if (match = line.match(/^(makelist|createlist|setlist) +(bool|boolean|int|integer|float|floating|str|string) +([a-z][a-z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.learnsList("${match[3]}",[],"${match[2]}");`;

      // -> Push a value into a list
      else if (match = line.match(/^(pushlist|push|append|add) +(.*?) +(=>|in|to) +([a-z][a-z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.learnsListValue("${match[4]}",${this.transpile(match[2])});`;

      // -> Sort a list with ascending order
      else if (match = line.match(/^(sorts?_?a?|sorts?_?asc|sorts?_?list|sorts?_?list_?asc) +([a-zA-Z][a-zA-Z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.sortsList("${match[2]}",true);`;

      // -> Sort a list with descending order
      else if (match = line.match(/^(sorts?|sorts?_?d?|sorts?_?desc|sorts?_?list_?d|sorts?_?list_?desc) +([a-z][a-z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.sortsList("${match[2]}",true,false);`;

      // -> Shuffle a list
      else if (match = line.match(/^(shuffles?|shuffles?_?list|rand_?list|randomize_?list|randomize) +([a-z][a-z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.shufflesList("${match[2]}",true);`;

      // -> Reverse a list
      else if (match = line.match(/^(reverses?|reverses?_?list) +([a-z][a-z0-9_]*)$/i))
        // Write it
        program += nl + `Lisa.reversesList("${match[2]},true);`

      // -> Locale setting
      else if (match = line.match(/^(set_?locale|use_?locale|locale) +"([a-z]{2})"$/i))
        // Write it
        program += nl + `Lisa.usesLocale("${match[2].toLocaleLowerCase()}");`;

      // -> Locale's pattern registration
      else if (match = line.match(/^(in +|for +|with +|)locale +"([a-z]{2})" +(use|register|pattern) +\{ *(.*?) *\}$/i))
        // Write it
        // NOTE: Double single quotes are replaced by one single quotes for
        // syntax highlighting.
        program += nl + `Lisa.learnsLocaleTexts("${match[2].toLocaleLowerCase()}",${JSON.stringify(match[4].replace(/''/g, "'").split(/ *\| */))});`;

      // -> JavaScript code
      else if (match = line.match(/^(js|javascript|script) +(.*)$/i))
        // Write it
        program += nl + `eval(${this.transpile(match[2])});`;

      // -> LIS code
      else if (match = line.match(/^(eval|evaluate|lis|run) +(.*)$/i))
        // Write it
        program += nl + `eval(Lisa.Script.compile(${this.transpile(match[2])}));`;

      // -> Assure that a list exists
      // NOTE: Only memory's cells can be imported, that doesn't make sense for
      // local variables.
      // NOTE: Also, only lists can be imported
      else if (match = line.match(/^define +(bool|boolean|int|integer|float|floating|str|string) +([a-z][a-z0-9_]*) *\[ *\]$/i))
        // Write it
        program += nl + `if(!Lisa.knows("${match[2]}"))Lisa.learnsList("${match[2]}",[],"${match[1]}");`;

      // -> Run a code if a variable depending on an interrupt
      // NOTE: That's an equivalent to:
      // if NOT knows <variable>
      //   <variable> = true
      //   [code]
      else if (match = line.match(/^init +([a-z][a-z0-9_]*)$/)) {
        // Write it
        program += nl + `if(!Lisa.knows("${match[1]}")){`
                +  nl + (nl ? '  ' : '') + `Lisa.learns("${match[1]}",true);`
        // Expect for a new indentation
        indented ++;
      }

      // Else, if the line is not empty...
      else if (line)
        // That's a syntax error -> throw an error
        error('Syntax error');

      // If a callback was given for each step...
      if (onStep)
        // Call it
        onStep({
          // The current line
          line,
          // The line's index
          lineIndex,
          // The line's indentation
          indent,
          // Expected indentation
          indented,
          // The total amount of lines
          total: lines.length,
          // The compilation's progress (in purcents)
          progress: Math.floor(lineIndex / lines.length * 100)
        });
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
    return `(function(){${vars.length ? `var ${vars.join(',')};` : ''}${program}${beautify?'\n':''}})();`;
  },

  /**
   * Run a LIS program
   * @param {string} source The LIS program
   * @returns {void}
   */
  exec(source) {
    // Compile the source code and run it
    // Give the 'Lisa' object to the program
    new Function(['Lisa'], this.compile(source))(Lisa);
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

// If the 'utils' module is not present...
if (!Lisa.hasOwnProperty('Utils'))
  // Load it
  Lisa.loadUtils();

// For each key in it...
for (let key of Reflect.ownKeys(Lisa.Utils))
  // If the given key is a function...
  if (typeof Lisa.Utils[key] === 'function')
    // Register it in the LIS' functions library
    Lisa.Script.functions[key] = 'Lisa.Utils.' + key;
