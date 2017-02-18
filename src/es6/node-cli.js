#!/usr/bin/env node

// Enable strict mode
"use strict";

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

// Forever...
while (true) {
  // Handle any command-line input (and trim it)
  let input = rl.question(chalk.bold.blue('>') + ' ').trim();

  // If nothing was input...
  if (!input.length) {
    // Ask again
    console.log('Please input something.\n');
    continue ;
  }

  // If the input starts by a point...
  if (input.startsWith('.')) {
    // Get the action to do
    input = input.substr(1).toLocaleLowerCase();

    // -> "clear"
    if (input === 'clear')
      // Clear the console
      clear();

    // Unknown command
    else
      console.log(`Unknown command "${input}"`);
  } else
    // --- Do something with the input

  // Display a white line
  console.log();
}
