#!/usr/bin/env node

// Enable strict mode
"use strict";

/**
 * Load Lisa (and reset it)
 * @returns {void}
 */
function reset() {
  // Remove Lisa from the cache
  delete require.cache[require.resolve('./core.js')];

  // Load the Lisa's core
  Lisa = require('./core.js');

  // Load the LIS parser
  Lisa.loadParser();

  // Load the state manager
  Lisa.loadManager();

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
}

/**
 * Exit the CLI
 * @returns {void}
 */
function exit() {
  // If the Lisa's state should be saved to a file...
  if (typeof args.o === 'string' || typeof args.output === 'string') {
    // Enable the debug mode to run the 'export' command
    // If this assignment is not done, depending on if the debug mode is enabled
    // or not, the command will throw an error or work fine.
    debugMode = true;

    // Save it
    exportState(args.output || args.o);
  }

  // Close the process
  process.exit(0);
}

/**
 * Write the Lisa's state in a file
 * @param {string} file The file to write in
 * @param {boolean} [beautify] Write a beautified file (default: false)
 * @returns {void}
 */
function exportState(file, beautify = false) {
  try {
    // Write the data in a file
    // For that, get the Lisa's state
    fs.writeFileSync(
      // Normalize the path and make it relative to the current path
      path.normalize(file),
      // If data must be beautified...
      beautify ?
          // Beautify it
          // NOTE: Because the string is not reversed and does not contain
          // a header, this state file will not be loadable with the 'import'
          // command.
          JSON.stringify(Lisa.State.save(), null, 2) :
          // ELse,minimize and reverse it
          Lisa.State.convertObjectSave(Lisa.State.save()), 'utf-8');

    // Success!
    return true;
  } catch(e) {
    // An error occured
    // Display the error message
    console.error(chalk.red(e.message));
    // Failed
    return false;
  }
}

/**
 * Run a CLI command
 * @param {string} input The command to run
 * @param {boolean} [avoidNewLine] Do not display a white line (default: false)
 * @returns {void}
 */
function command(input, avoidNewLine = false) {
  // Trim the input (useful if it comes from the command-line of from the '&&'
  // operator)
  input = input.trim();

  // If nothing was input...
  if (!input.length) {
    // Ask again
    console.log('Please input something.\n');
    return ;
  }

  // Split the input using the '&&' operator to get the list of the commands
  let inputs = input.split(/&&(?=(?:(?:[^"]*"){2})*[^"]*$)/);

  // If there is more than one command...
  if (inputs.length > 1) {
    // For each command...
    for (let i = 0; i < inputs.length - 1; i++)
      // Run it (avoid new line)
      command(inputs[i], true);

    // Set the current command as the last one (trim it)
    input = inputs.slice(-1)[0].trim();
  }

  // Debug mode  + input starts by a point = run a LIS command
  // Normal mode + input starts by a point = run a debug instruction

  // Debug mode
  // Instructions that starts by a point are considered as debug instructions
  // This is made to allow users to type debug commands without entering and
  // leaving again the debug mode.
  if ((debugMode && !input.startsWith('.')) || (!debugMode && input.startsWith('.'))) {
    // If the input starts by a point...
    if (input.startsWith('.'))
      // Remove the point
      input = input.substr(1);

    // debug
    if (!debugMode && input === 'debug')
      // Enable the debug mode
      debugMode = true;

    // quit / debug
    else if (input === 'quit' || (debugMode && input === 'debug'))
      // Disable the debug mode
      debugMode = false;

    // exit the CLI
    else if (input === 'exit')
      // Exit the process
      exit();

    // clear
    else if (input === 'clear')
      // Clear the console
      clear();

    // show <name>
    else if (match = input.match(/^show +([a-z][a-z0-9_]*)$/i)) {
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

    // forget <name>
    else if (match = input.match(/^forget +([a-z][a-z0-9_]*)$/i)) {
      // : Unknown cell
      if (!Lisa.knows(match[1]))
        console.error(chalk.red(`Unknown cell <${match[1]}>`));
      // : Known cell
      else
        // Forget the cell
        Lisa.forgets(match[1]);
    }

    // list_type <name>
    // list_length <name>
    else if (match = input.match(/^list_(?:type|length) +([a-z0-9_]+)$/i)) {
      // If the list does not exists...
      if (!Lisa.knows(match[1]))
        // Display an error message
        console.error(chalk.red(`Unknown cell <${match[1]}>`));
      // Else...
      else
        // Display the list's type, colored, with its length
        console.log(chalk[listColors[Lisa.thinksToListType(match[1])]](Lisa.thinksToListType(match[1]))
                  + chalk.bold[colors.number](' x ' + Lisa.thinksToListLength(match[1])));
    }

    // understand <handler> <answer> [<store>]
    // e.g.: understand "I love {integer} bananas" "Mee too!" ^0 => bananas ; true => askedforbananas
    else if (match = input.match(/^understand +"(.*?)" +"(.*?)" *(.*?)$/i)) {
      // Prepare the LIS script
      let script = [
        `with "${match[1]}" =>`
      ];

      // If a store was provided...
      if (match[3]) {
        // Declare a local variable to contain the regex' matches
        let store_match;
        // Split it by ';' and trim all parts
        let store_str = match[3].split(/ *; */g);

        // For each part...
        for (let part of store_str) {
          // Get the part's syntax
          // If the part has not a valid syntax...
          if (!(store_match = part.match(/^(\$?[a-z][a-z0-9_]*|_(?:\d|[1-9]\d+)|\^(?:\d|[1-9]\d+)|"(?:.*?)"|\d+) *=> *([a-z][a-z0-9_]*)$/i))) {
            // Display an error message
            console.error(chlak.red(`Invalid syntax in store "${part}"`));
            // Exit the function
            return ;
          }

          // Add this part to the store
          script.push(`  store ${store_match[1]} => ${store_match[2]}`);
        }
      }

      // Complete the script with the handler's answer
      script.push(`  end "${match[2]}"`);

      try {
        // Run the full script as a LIS program
        Lisa.Script.exec(script.join('\n'));
      } catch(e) {
        // The handler's registration failed
        // Display an error message
        console.error(chalk.red(e.message));
      }
    }

    // dump <filepath> [beautify]
    else if (match = input.match(/^dump +([a-z0-9\.\\\/\:]+)( +beautify|)$/i)) {
      // Normalize the path and make it relative to the current path
      let file = path.normalize(match[1]);
      // Export the Lisa's state
      let state = Lisa.export();

      // If it must be beautified...
      if (match[2])
        // Beautify it
        state = JSON.stringify(JSON.parse(state), null, 2);

      try {
        // Write the data in a file
        fs.writeFileSync(file, state, 'utf-8');
        // Display a warning message
        console.warn(chalk.yellow('/!\\ The Lisa\'s state is readable by any program, including the messages history and the memory! /!\\'));
      } catch(e) {
        // An error occured
        // Display the error message
        console.error(chalk.red(e.message));
      }
    }

    // export <filepath> [beautify]
    else if (match = input.match(/^export +([a-z0-9\.\\\/\:]+)( +beautify|)$/i)) {
      // Export the file
      // If it worked...
      if (exportState(match[1], !!match[2]))
        // Display a warning message
        console.warn(chalk.yellow('/!\\ The Lisa\'s state is readable by any program, including the messages history and the memory! /!\\'));
    }

    // import <filepath>
    else if (match = input.match(/^import +([a-z0-9\.\\\/\:]+)$/i)) {
      // Get the real file's path
      let file = path.normalize(match[1]);
      // Declare a variable which will contain it
      let data;

      // Check if the file exists
      let exists;
      try { exists = fs.lstatSync(file).isFile(); }
      catch(e) { }

      // If the file does not exist...
      if (!exists)
        // Display an error message
        console.error(chalk.red('File was not found'));
      // Else...
      else {
        try {
          // Read the file
          data = fs.readFileSync(file, 'utf-8');
        } catch(e) {
          // An error occured
          // Display the error message
          console.error(chalk.red(e.message));
          // Exit the function
          return ;
        }

        // If and only if data was read...
        if (data)
          // Convert it as a save object
          // If it works, load it as the current Lisa's state
          // If it fails, display an error message
          // Convert it to a save object
          Lisa.State.convertPlainSave(data, out => {
            // Reset Lisa
            // If she already understands some requests, or have a memory, that
            // will cause duplicate values. Also, Lisa can throw an error if a
            // handler is already in use. In order to avoid that, the Lisa's
            // state it fully reset.
            reset();
            // Load the (new) Lisa's state
            Lisa.State.load(out);
          }, err => {
            // Compressed data
            if (err === 'lzstring')
              console.error(chalk.red('The state file is compressed (LZString).'));
            // Unknown header
            else if (err === 'unknown_header')
              console.error(chalk.red('The state file uses an invalid header.'));
            // That's an unknown kind of data
            // If the 'console' object is defined...
            else
              // Log an error into it
              console.error(chalk.red('The state file is corrupted'));
          });
      }
    }

    // run <filepath>
    else if (match = input.match(/^run +([a-z0-9\.\\\/\:]+)$/i)) {
      // Get the real file's path
      let file = path.normalize(match[1]);
      // Declare a variable which will contain it
      let data;

      // Check if the file exists
      let exists;
      try { exists = fs.lstatSync(file).isFile(); }
      catch(e) { }

      // If the file does not exist...
      if (!exists)
        // Display an error message
        console.error(chalk.red('File was not found'));
      // Else...
      else {
        try {
          // Read the file
          data = fs.readFileSync(file, 'utf-8');
        } catch(e) {
          // An error occured
          // Display the error message
          console.error(chalk.red(e.message));
          // Exit the function
          return ;
        }

        // If and only if data was read...
        if (data) {
          // Save the debug mode's state (to restore it after)
          let current = debugMode;
          // Disable the debug mode to run the file
          debugMode = false;
          // Run the file as a group of LIS commands
          // Because the commands are joined with line breaks, the script won't
          // be able to run debug commands (excepted on the very first line).
          // Also, avoid a new line after the instructions because the 'run'
          // function will display a new line (at the end of command()).
          command(data.replace(/\r\n|\r|\n/g, '\n'), true);
          // Restore the debug mode's state
          debugMode = current;
        }
      }
    }

    // Syntax error
    else
      console.error(chalk.red('Unknown debug instruction'));
  }
  else {
    // If the input starts by a point...
    if (input.startsWith('.'))
      // Remove the point
      // In debug mode, input can start by a point to run a LIS command
      input = input.substr(1);

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
        return ;
      }
    } catch(e) {
      // Display the error message
      console.error(chalk.red(e.message));
    }
  }

  // If not forbidden...
  if (!avoidNewLine)
    // Display a white line
    console.log();

  // If asked for...
  if (syncFile)
    // Write the Lisa's state to a file
    exportState(syncFile);
}

/**
 * Get a colored content from a plain content
 * @param {*} content The content to get colored
 * @returns {string} The content, as a string and colored
 */
function getColored(content) {
  // Get the value as a JSON string
  // Then get the value's color and assign it to the string
  return chalk[colors[typeof content]](JSON.stringify(content));
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
      clear = require('clear'),
      args  = require('optimist').argv;

// Declare two variables to contain Lisa and the 'localdata' module
let Lisa, local;

// Load the Lisa's library
reset();

// Is the debug mode enabled?
// TRUE: Inputs are debug instructions
// FALSE: Inputs are LIS instructions
let debugMode = false;

// Declare a local variable to store .match()'s result
let match;

// The file CLI should be synchronised with
let syncFile = (typeof args.s === 'string' || typeof args.sync === 'string') ? (args.sync || args.s) : null;

// If the CLI should be synchronised with a state file...
if (syncFile)
  // Set it
  args.input = syncFile;

// If a state file should be loaded...
if (typeof args.i === 'string' || typeof args.input === 'string')
  // Load it
  command('.import ' + (args.input || args.i));

// If a command should be runned now...
if (typeof args.e === 'string' || typeof args.execute === 'string') {
  // Run it
  command(args.execute || args.e, true);

  // If not forbidden...
  if (!args.cli && !args['keep-cli'])
    // Close the CLI
    exit();
}

// Forever...
while (true)
  // Handle any command-line input
  command(rl.question('> '));
