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

  // Set the DOM discussion area (DDA)
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
    // Scroll to the end of the container
    this.scrollToEnd();
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
    // Scroll to the end of the container
    this.scrollToEnd();
  };

  /**
   * Scroll to the end of the discussion area
   * @param {number} [speed] The time to take for the scroll (default: 1000 ms)
   * @returns {void}
   */
  this.scrollToEnd = () => {
    // Get the amount of pixels until the scroll's maximum value
    let remaining = discuss.scrollHeight - discuss.scrollTop;
    // For a duration of 2000 ms (2 seconds), regurarily scroll near to the
    // bottom of the discussion area
    let interval = setInterval(() => discuss.scrollTop ++, Math.floor(2000 / remaining));
    // After this delay, don't scroll anymore
    setTimeout(() => clearInterval(interval), 2000);
  };

  // Get the DDA and its children
  this.__defineGetter__('dom', () => discuss);
})());
