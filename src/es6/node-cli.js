#!/usr/bin/env node

// Enable strict mode
"use strict";

/**
 * Get a colored content from a plain content
 * @param {*} content The content to get colored
 * @returns {string} The content, as a string and colored
 */
function getColored(content) {
  // Get the value as a JSON string
  // Then get the value's color and assign it to the string
  return chalk[colors[typeof value]](JSON.stringify(value));
}

// The colors assigned to the different types of contents
const colors = {
  object: 'yellow',
  undefined: 'magenta',
  boolean: 'cyan',
  number: 'red',
  string: 'blue'
};

// The colors assigned to the different types of lists
const listColors = {
  boolean: colors.boolean,
  integer: colors.number,
  floating: colors.floating,
  string: colors.string
};

// Load some Node.js modules
const fs    = require('fs'),
      path  = require('path'),
      rl    = require('readline-sync'),
      chalk = require('chalk'),
      clui  = require('clui'),
      sync  = require('sync-request'),
      clear = require('clear');

// Load the Lisa's core
const Lisa = require('./core.js');

// Load the LIS parser
Lisa.loadParser();

// When a message is displayed...
Lisa.when('message', (date, author, message) => {
  // Message from Lisa
  if (author === 'Lisa')
    console.log(chalk.green(message));

  // Message from the user
  else if (author === 'You')
    console.log(chalk.blue(message));

  // Message from someone else
  else
    console.log(chalk.yellow(`[${author}] ${message}`));
});

// Is the debug mode enabled?
// TRUE: Inputs are debug instructions
// FALSE: Inputs are LIS instructions
let debugMode = false;

// Declare a local variable to store .match()'s result
let match;

// Forever...
while (true) {
  // Handle any command-line input
  // NOTE: This input is already trimmed by the 'readline-sync' module
  let input = rl.question(chalk.bold.blue('>') + ' ');

  // If nothing was input...
  if (!input.length) {
    // Ask again
    console.log('Please input something.\n');
    continue ;
  }

  // Debug mode
  if (debugMode) {
    // show_cell <name>
    if (match = input.match(/^show_cell +([a-z0-9_]+)$/i)) {
      // : Unknown cell
      if (!Lisa.knows(match[1]))
        console.error(chalk.red(`Unknown cell <${match[1]}>`));
      // : List
      else if (Lisa.isList(match[1]))
        console.log(
          // List's type and length
          chalk.green(`<List:${Lisa.thinksToListLength(match[1])}> `) +
          // If the list contain at least one value...
          (Lisa.thinksToListLength(match[1]) ?
            // Color the list's content
            chalk[ listColors[Lisa.thinksToListType(match[1])] ](
              // List's values (use a space to separate each value)
              Lisa.thinksToList(match[1]).map(value => JSON.stringify(value))
              // Get the list as a string
                .join(' ')
            ) :
          // Empty list
          chalk[ colors['undefined'] ]( '<Empty>' ))
        );
      // : Single value
      else
        // Get the value's color and display it
        console.log( chalk.green('<Plain>') + ' ' + getColored(Lisa.thinksTo(match[1])) );
    }

    // Syntax error
    else
      console.error(chalk.red('Syntax error'));
  }
  // LIS inputs
  else {
    // If the input starts by a point...
    if (input.startsWith('.')) {
      // Get the action to do (case-insensitive)
      input = input.substr(1).toLocaleLowerCase();

      // -> "clear"
      if (input === 'clear')
        // Clear the console
        clear();

      // -> "exit"
      else if (input === 'exit')
        // Exit the CLI
        process.exit(0);

      // -> "debug"
      else if (input === 'debug')
        // Enable debug mode
        debugMode = true;

      // Unknown command
      else
        console.log(`Unknown command "${input}"`);
    } else {
      // If the script ends with a backslash '\' symbol...
      if (input.endsWith('\\')) {
        // It is not terminated.
        // Declare a variable to contain the next inputs
        let tmp_input = '\\';
        // Another will contain the final input
        let inputs = [ input.slice(0, -1) /* Remove the backslash */ ];

        // While the temporary input ends by a slash...
        while (tmp_input.endsWith('\\')) {
          // Ask for the next line of the input
          tmp_input = rl.question('? ', { keepWhitespace: true });
          // Add it to the final input
          inputs.push(tmp_input.endsWith('\\') ? tmp_input.slice(0, -1) : tmp_input);
        }

        // Make the final input from it
        input = inputs.join('\n');
        // Free the memory
        inputs = null;
      }

      // The JavaScript code to run
      let code;

      try {
        // Try to compile the command as LIS program
        code = Lisa.Script.compile(input);

        try {
          // Try to run the script (should be without errors)
          new Function(['Lisa'], code)(Lisa);
        } catch(e) {
          // Display the error message and its stack
          console.error(chalk.red(e.stack));
          continue ;
        }
      } catch(e) {
        // Display the error message
        console.error(chalk.red(e.message));
      }
    }
  }

  // Display a white line
  console.log();
}
