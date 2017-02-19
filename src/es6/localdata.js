/** @file Load and save the Lisa's data from and to the browser's localStorage */

// This IIFE has two goals:
// -> In web applications, it permit to prevent this module from polluating the
//    global scope with the variables defined inside.
// -> In Node.js applications, the 'Lisa' variable won't be defined because this
//    file works as a module, so it runs inside a dedicated (and isolated)
//    scope. The Lisa's instance must be assigned when the module is called,
//    but values can only be assigned if 'Lisa' is a local variable, not a
//    constant, so it works inside an IIFE.
(function(Lisa) {
  // NOTE: Plain saves are reversed and compressed ones are reversed two times
  // (before and after compression with the LZString object). This reversion
  // aims to prevent malicious programs such as viruses to find private data
  // when scanning the whole disk: because the data are reversed, they are
  // unredeable. If the data are compressed, you're sure the data won't be found
  // out by any virus, because it needs to reverse the string, decompress it using
  // the right algorithm, then reverse it again to extract some informations.

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

    // NOTE: Because handlers may use custom catchers, catchers need to be
    // registered first.
    // For each catcher in the state...
    for (let catcher of Reflect.ownKeys(state.catchers))
      // Because native catchers are not exported by Lisa, this one cannot be
      // a native one, so it can be safely registed as a new catcher.
      // Register it
      Lisa.registersCatcher(catcher, state.catchers[catcher]);

    // NOTE: Because handlers may use the locales, they need to be registered
    // first.
    // For each locale in the state...
    for (let locale of Reflect.ownKeys(state.locales))
      // For each specificity registered for this locale...
      for (let texts of state.locales[locale])
        // Register them
        Lisa.learnsLocaleTexts(locale, texts);

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
      // NOTE: Because messages can be displayed as HTML contents, it can
      // introducts viruses. Be aware of what you store in the local storage!
      Lisa.displayMessage(message[1] /* Author */, message[2] /* Message */, message[3] /* Class name */, message[4] /* As HTML */);

    // Turn on or off the messages history, depending on the save's parameters
    Lisa.remembersMessages = state.histories;

    // Set the current locale
    Lisa.locale = state.currentLocale;
  }

  /**
   * Convert a plain save to a save object
   * @param {string} data The save to convert
   * @param {Function} success A callback to call with the save (as an object)
   * @param {Function} corrupted A callback to call with the error string
   * @returns {void}
   */
  function convertPlainSave(data, success, corrupted) {
    // If the data starts by the 'L' symbol...
    if (data.startsWith('L')) { // 'L' for 'LZString'
      // If the LZString library is not present...
      if (typeof LZString !== 'object' || typeof LZString.decompressFromUTF16 !== 'function')
        // Run the error callback
        corrupted('lzstring_not_found');
      else
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
      corrupted('unknown_header');

    // If data was retrieved...
    if (data) {
      // Try to parse it as JSON data
      try { data = JSON.parse(data); }
      // If it failed...
      catch(e) { corrupted('json'); }

      // Finally, if there is the parse worked well...
      if (data) {
        // Load it as the Lisa's state
        success(data);
      }
    }
  }

  /**
   * Save Lisa's state as an object
   * @returns {Object} A save object
   */
  function saveState() {
    // Save the current Lisa's state to the local storage
    // Get the whole Lisa's state
    let data = JSON.parse(Lisa.export());
    // Declare a variable which will contain the final data
    let toExport = {
      handlers: [],
      memory: data.memory,
      messages: data.messages,
      catchers: data.catchers,
      locales: data.locales,
      currentLocale: data.currentLocale
    };
    // For each handler understood by Lisa...
    for (let i = 0; i < data.handlers.length; i++)
      // Backup it as a data to export
      toExport.handlers.push([
        // The original string handler
        data.handled[i],
        // The handler's callback
        data.handlers[i][3],
        // The optionnal help texts
        data.handlers[i][4]
      ]);
    // Remember if the messages and requests histories were enabled
    toExport.histories = Lisa.remembersMessages;
    // Free the memory
    data = null;
    // Return the data to export
    return toExport;
  }

  /**
   * Convert a save object to plain data
   * @param {Object} toExport The save object
   * @returns {string} The plain save
   */
  function convertObjectSave(toExport) {
    // Because it will be needed in all cases, stringify the save object and
    // reverse it.
    toExport = reverse(JSON.stringify(toExport));

    // If its length is under 100 kb, and if the LZString library is present...
    if (toExport.length < 100 * 1024 || typeof LZString !== 'object' || typeof LZString.compressToUTF16 !== 'function')
      // Don't compress it and return it as plain data (after reversing)
      return 'P' /* Data type indicator */ + toExport;
    // Else...
    else
      // Step 4: Return the final data
      return 'L' /* Data type indicator */ +
        // Step 3: Reverse the compressed data
        reverse(
          // Step 2: Compress it using the 'LZString' object
          LZString.compressToUTF16(
            // Step 1: Get the data to export (reversed)
            toExport
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

  // If and only if this file is loaded inside an HTML document...
  if (typeof document === 'object') {
    // Get the Lisa's state from the local storage
    let data = localStorage.getItem('lisa_state');

    // If a data is found in the local storage...
    if (data)
      // Convert it to a save object
      convertPlainSave(data, out => loadState(out), err => {
        if (err === 'lzstring')
          // If errors can be logged into a console...
          if (typeof console === 'object' && typeof console.error === 'function')
            // Log the error
            console.error('Found compressed data, but the LZString library was not found.');

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
      });

    // Save the Lisa's state...
    // When a message is displayed
    Lisa.when('message', () => localStorage.setItem('lisa_state', convertObjectSave(saveState())));
    // When Lisa answered to a request
    Lisa.when('did', () => localStorage.setItem('lisa_state', convertObjectSave(saveState())));
    // When Lisa understood a new request (@.understands())
    Lisa.when('understood', () => localStorage.setItem('lisa_state', convertObjectSave(saveState())));

    // NOTE: This condition permit  to avoid Node.js applications to be slowed
    // down by the automatic call of the 'saveState' function.
    // NOTE: In a previous version, a save of the Lisa's state was performed
    // after she learnt or forgot something. But, that made Lisa saving its state
    // even while scripts where running ; and because that uses synchronous methods
    // the performances were terribly down.
    // The removing of these two handlers permitted to increase performances, in
    // this simple test :
    //
    // var a = performance.now();
    // for (var i = 0; i < 10000; i++)
    //  Lisa.learns('something', 'strange');
    // performance.now() - a;
    //
    // On my low-end computer it takes more than 2000 miliseconds to run in that
    // previous version, after the events' handlers removing it takes only about
    // 4 ms to run. See the improvement?
  }

  // If the 'module' object is available...
  if (typeof module === 'object' && module && !Array.isArray(module)) {
    module.exports = function(LisaInstance) {
      // Register the Lisa's instance
      // Because 'Lisa' is a local variable and not the global core's constant,
      // a new value can be assigned.
      Lisa = LisaInstance;

      // Export all of these functions
      return {
        loadState,
        saveState,
        convertPlainSave,
        convertObjectSave,
        reverse
      };
    };
  }
})(typeof Lisa === 'undefined' ? null : Lisa);
