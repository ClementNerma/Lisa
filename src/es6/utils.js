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
  }
};
