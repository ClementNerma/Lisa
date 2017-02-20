/** @file Load and save the Lisa's data from and to the browser's localStorage */

/**
 * The Lisa's states manager
 * @type {Object.<string, Function>}
 */
Lisa.State = {
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
  load(state) {
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
      // Register the handler
      Lisa.understands(
        // The original handler, as a string
        handler[0],
        // The handler's callback
        new Function([ 'prepare' ], `return (${handler[1]})(prepare);`),
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
  },

  /**
   * Convert a plain save to a save object
   * @param {string} data The save to convert
   * @param {Function} success A callback to call with the save (as an object)
   * @param {Function} corrupted A callback to call with the error string
   * @returns {void}
   */
  convertPlainSave(data, success, corrupted) {
    // If the data starts by the 'L' symbol...
    if (data.startsWith('L')) { // 'L' for 'LZString'
      // If the LZString library is not present...
      if (typeof LZString !== 'object' || typeof LZString.decompressFromUTF16 !== 'function')
        // Run the error callback
        return void corrupted('lzstring_not_found');
      else
        // That's a compressed data (using the LZString library)
        data =
          // Step 4: Reverse the decompressed string
          this.reverseStr(
            // Step 3: Decompress the data using the 'LZString' object
            LZString.decompressFromUTF16(
              // Step 2: Reverse it
              this.reverseStr(
                // Step 1: Get the data in the local storage
                data.substr(1)
              )
            )
          );
    }
    // Else, if the data starts by the 'P' symbol...
    else if(data.startsWith('P')) // 'P' for 'Plain'
      // That's a plain data
      data = this.reverseStr(data.substr(1));
    // Else...
    else
      // Data is corrupted
      return void corrupted('unknown_header');

    // If data was retrieved...
    if (data) {
      // Try to parse it as JSON data
      try { data = JSON.parse(data); }
      // If it failed...
      catch(e) { corrupted('json'); }

      // Finally, if there is the parse worked well...
      if (data)
        // Load it as the Lisa's state
        success(data);
    }
  },

  /**
   * Save Lisa's state as an object
   * @returns {Object} A save object
   */
  save() {
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
  },

  /**
   * Convert a save object to plain data
   * @param {Object} toExport The save object
   * @returns {string} The plain save
   */
  convertObjectSave(toExport) {
    // Because it will be needed in all cases, stringify the save object and
    // reverse it.
    toExport = this.reverseStr(JSON.stringify(toExport));

    // If its length is under 100 kb, and if the LZString library is present...
    if (toExport.length < 100 * 1024 || typeof LZString !== 'object' || typeof LZString.compressToUTF16 !== 'function')
      // Don't compress it and return it as plain data (after reversing)
      return 'P' /* Data type indicator */ + toExport;
    // Else...
    else
      // Step 4: Return the final data
      return 'L' /* Data type indicator */ +
        // Step 3: Reverse the compressed data
        this.reverseStr(
          // Step 2: Compress it using the 'LZString' object
          LZString.compressToUTF16(
            // Step 1: Get the data to export (reversed)
            toExport
          )
        );
  },

  /**
   * Reverse a string
   * @param {string} s The string to reverse
   * @returns {string} The string, reversed
   */
  reverseStr(s) {
    // Declare a variable which will contain the reversed string
    let o = '';

    // For each character, starting from the end...
    for (let i = s.length - 1; i >= 0; i--)
      // Add it to the reversed container
      o += s[i];

    // Return the reversed string
    return o;
  }
};
