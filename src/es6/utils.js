/** @file Register functions to process data easier in Lisa and LIS */

/**
 * Functions for data processing
 * @type {Object}
 */
Lisa.Utils = {
  /**
   * Parse a date
   * @param {string} input The date to parse
   * @returns {Array.<number>} [dd,mm]
   */
  parseDate(input) {
    return Lisa.getStandard(input, 'short_date').split('/').map(x => + x /* Fastest than parseInt() */);
  },

  /**
   * Parse a long date
   * @param {string} input The date to parse
   * @returns {Array.<number>} [dd,mm,yyyy]
   */
  parseLongDate(input) {
    return Lisa.getStandard(input, 'date').split('/').map(x => + x /* Fastest than parseInt() */);
  },

  /**
   * Parse a time
   * @param {string} input The time to parse
   * @returns {Array.<number>} [hh,mm]
   */
  parseTime(input) {
    return Lisa.getStandard(input, 'short_time').split('/').map(x => + x /* Fastest than parseInt() */);
  },

  /**
   * Parse a long time
   * @param {string} input The time to parse
   * @returns {Array.<number>} [hh,mm,ss]
   */
  parseLongTime(input) {
    return Lisa.getStandard(input, 'time').split('/').map(x => + x /* Fastest than parseInt() */);
  },

  /**
   * Do the summation of an array
   * @param {Array.<number>} array An array of numbers to calculate the sum
   * @returns {number} The summation's result
   */
  sum(array) {
    // Do the summation and return its result
    return array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  },

  /**
   * Generate a random integer between two borns (can be negative borns)
   * @param {number} min The minimum integer. If 'max' is not given, this becomes the maximum integer and the minimum is 0.
   * @param {number} [max] The maximum integer
   * @returns {number} The generated number
   */
  randomInteger(min, max) {
    // If no random maximum number was provided...
    if (typeof max === 'undefined') {
      // Set the 'min' the maximum number
      max = min;
      // Set 0 the minimum number
      min = 0;
    }

    // Generate the random number and return it
    return min + Math.floor(Math.random() * (max - min + 1));
  },

  /**
   * Make any content a string
   * @param {*} content The content
   * @returns {string} The content, as a string
   */
  string(content) {
    // If it's a string...
    if (typeof content === 'string')
      // Return it without any treatment
      return content;

    // If it's a number of a boolean...
    if (typeof content === 'number' || typeof content === 'boolean')
      // Stringify it
      return content.toString();

    // If it's an array or an object...
    if (Array.isArray(content) || (typeof content === 'object' && content))
      // Stringify it
      return JSON.stringify(content);

    // For a few special values, return their string equivalent
    if (content === null) return 'null';
    if (content === undefined) return 'undefined';
    if (content === Infinity) return 'Infinity';
    if (Number.isNaN(content)) return 'NaN';

    // Else, the content can't be returned as a string -> Throw an error
    throw new Error('[LIS:exec] Content can\'t be stringified');
  }
};
