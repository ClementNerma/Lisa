/** @file Load and save the Lisa's data from and to the browser's localStorage */

/**
 * Load Lisa's state from an object
 * @param {Object} state The state to load
 * @returns {void}
 */
function loadState(state) {
  // If the state is not a valid object...
  if (typeof state !== 'object' || !state || Array.isArray(state))
    // Throw an error
    throw new Error('[Lisa:load] State to load must be an object');

  // If the state doesn't contain the right fields...
  if (!Array.isArray(state.handlers) || (typeof state.memory !== 'object' ||
      !state.memory || Array.isArray(state.memory)) || !Array.isArray(state.messages) ||
      typeof state.histories !== 'boolean')
    // Throw an error
    throw new Error('[Lisa:load] Fields are missing or corrupted in the state object');

  // For each handler in the state...
  for (let handler of state.handlers) {
    // Get the handler's callback and extract some variables
    let extracted = handler[1].match(/^function.*?\((?:(?: |\n)*)([a-zA-Z][a-zA-Z0-9_]*|)(?:\n\/\*\*\/|)(?:(?: |\n)*)\)(?:(?: |\n)*)\{((?:.|\n)*)\}$/);

    // Register the handler
    Lisa.understands(
      // The original handler, as a string
      handler[0],
      // The handler's callback
      new Function([
          // The (optionnal) callback's main variable
          // If the callback didn't have any argument, extract[1] will contain
          // an empty string, which result in a lambad function without argument
          // (new Function([''], 'code();')) works in JavaScript
          extracted[1]
        ],
          // The callback's code
          extracted[2]
      ),
      // The store (there is no store in the current case)
      null,
      // The optionnal help texts
      handler[2]
    );
  }

  // For each cell in the backuped memory...
  for (let cell of Reflect.ownKeys(state.memory)) {
    // If that's the '$' cell...
    if (cell === '$')
      // Ignore it
      continue ;

    // If that's a list...
    if (state.memory['$'].hasOwnProperty(cell))
      // Copy it into the real memory
      Lisa.learnsList(cell, state.memory[cell], state.memory['$'][cell]);
    // Else...
    else
      // Copy it into the real memory
      Lisa.learns(cell, state.memory[cell]);
  }

  // For now, turn on the messages history because all of the backuped messages
  // were stored into. Because it's empty for now, the messages must be copied
  // into it again.
  Lisa.remembersMessages = true;

  // For each message in the history...
  for (let message of state.messages)
    // Display it
    Lisa.displayMessage(message[1] /* Author */, message[2] /* Message */, message[3] /* Class name */);

  // Turn on or off the messages history, depending on the save's parameters
  Lisa.rememberMessages = state.histories;
}

/**
 * Save Lisa's state to the local storage
 * @returns {void}
 */
function saveState() {
  // Save the current Lisa's state to the local storage
  // Get the whole Lisa's state
  let data = JSON.parse(Lisa.export());
  // Declare a variable which will contain the final data
  let toExport = { handlers: [], memory: data.memory, messages: data.messages };
  // For each handler understood by Lisa...
  for (let i = 0; i < data.handlers.length; i++)
    // Backup it as a data to export
    toExport.handlers.push([
      // The original string handler
      data.handled[i],
      // The handler's callback
      data.handlers[i][2],
      // The optionnal help texts
      data.handlers[i][3]
    ]);
  // Remember if the messages and requests histories were enabled
  toExport.histories = Lisa.remembersMessages;
  // Stringify the final data
  toExport = JSON.stringify(toExport);
  // Free the memory
  data = null;
  // Remove the unneeded fields
  // If its length is under 100 kb
  if (toExport < 100 * 1024)
    // Don't compress it and write it as plain data
    localStorage.setItem('lisa_state', 'P' /* Data type indicator */ + toExport);
  // Else...
  else
    // Step 4: Write the final dat in the local storage
    localStorage.setItem('lisa_state', 'L' /* Data type indicator */ +
      // Step 3: Reverse the compressed data
      reverse(
        // Step 2: Compress it using the 'LZString' object
        LZString.compressToUTF16(
          // Step 1: Reverse the data to export
          reverse(toExport)
        )
      )
    );
}

/**
 * Reverse a string
 * @param {string} s The string to reverse
 * @returns {string} The string, reversed
 */
function reverse(s) {
  // Declare a variable which will contain the reversed string
  var o = '';

  // For each character, starting from the end...
  for (var i = s.length - 1; i >= 0; i--)
    // Add it to the reversed container
    o += s[i];

  // Return the reversed string
  return o;
}

// Get the Lisa's state from the local storage
let data = localStorage.getItem('lisa_state');

// If a data is found in the local storage...
if (data) {
  /**
   * A callback to run when the data are detected as corrupted
   * @returns {void}
   */
  function corrupted() {
    // That's an unknown kind of data
    // If the 'console' object is defined...
    if (typeof console === 'object' && typeof console.error === 'function')
      // Log an error into it
      console.error('Corrupted data found in localStorage');

    // Declare a global variable with the corrupted data
    // That permits for developpers who wants to test data corruption to get
    // the corrupted data after detection instead of losing it each time
    (typeof window === 'object' ? window : typeof global === 'object' ? global :
     typeof this === 'object' ? this : {}).corrupted_local_lisa_state = data;
    // Remove the corrupted data
    localStorage.removeItem('lisa_state');
    // Free the 'data' variable from the memory
    data = null;
  }

  // If the data starts by the 'L' symbol...
  if (data.startsWith('L')) { // 'L' for 'LZString'
    // That's a compressed data (using the LZString library)
    data =
      // Step 4: Reverse the decompressed string
      reverse(
        // Step 3: Decompress the data using the 'LZString' object
        LZString.decompressFromUTF16(
          // Step 2: Reverse it
          reverse(
            // Step 1: Get the data in the local storage
            data.substr(1)
          )
        )
      );
  }
  // Else, if the data starts by the 'P' symbol...
  else if(data.startsWith('P')) // 'P' for 'Plain'
    // That's a plain data
    data = reverse(data.substr(1));
  // Else...
  else
    // Data is corrupted
    corrupted();

  // If data was retrieved...
  if (data) {
    // Try to parse it as JSON data
    try { data = JSON.parse(data); }
    // If it failed...
    catch(e) { corrupted(); }

    // Finally, if there is the parse worked well...
    if (data) {
      // Load it as the Lisa's state
      loadState(data);
    }
  }
}

// Save the Lisa's state...
// When a message is displayed
Lisa.when('message', saveState);
// When Lisa answered to a request
Lisa.when('did', saveState);
// When Lisa learnt something new (@.learns())
Lisa.when('learnt', saveState);
// When Lisa forgot something (@.forgets())
Lisa.when('forgot', saveState);
// When Lisa understood a new request (@.understands())
Lisa.when('understood', saveState);
