/**
 * The Lisa's interface
 * @type {Object}
 * @param {HTMLDivElement} [area] The area to write the discussion in
 * @constant
 */
const Lisa = (new (function(area) {
  // If a DOM discussion area was specified and if the area is not valid...
  if (area && !(area instanceof HTMLDivElement))
    // Throw an error
    throw new Error('[Lisa] Invalid DOM area provided');

  // Set the DOM discussion area
  const discuss = (area || document.createElement('div'));

  /**
   * Espace HTML special characters from a string
   * @param {string} unsafe The string to espace
   * @returns {string} The string, escaped
   */
  this.escapeHtml = unsafe =>
      unsafe.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

  /**
   * Format a message
   * @param {string} message The message to format
   * @returns {string} The message, formatted with HTML tags
   */
  this.format = message =>
    // Espace HTML special characters
    this.escapeHtml(message)
    // Bold
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    // Italic
      .replace(/_(.*?)_/g, '<em>$1</em>')
    // Strike
      .replace(/~(.*?)~/g, '<del>$1</del>');

  /**
   * Display a message from Lisa
   * @param {string} message The message's content
   * @returns {void}
   */
  this.says = message => {
    // Inject a DOM element
    let dom = document.createElement('div');
    // Set its attributes
    dom.setAttribute('class', 'message message-lisa');
    // Set the message, with the author's name
    dom.innerHTML = '<strong>Lisa : </strong>' + this.format(message);
    // Append the element to the area
    discuss.appendChild(dom);
  };

  /**
   * Display a message from the user
   * @param {string} message The message's content
   * @returns {void}
   */
  this.hears = message => {
    // Inject a DOM element
    let dom = document.createElement('div');
    // Set its attributes
    dom.setAttribute('class', 'message message-user');
    // Set the message, with the author's name
    dom.innerHTML = '<strong>You : </strong>' + this.format(message);
    // Append the element to the area
    discuss.appendChild(dom);
  };

  // Get the DOM discussion area
  this.__defineGetter__('dom', () => discuss);
})());
