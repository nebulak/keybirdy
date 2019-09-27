/**
 *  Logging Module
 * @module Logger
 */
var Logger = {
  _logLevel: 0,
  _logType: "console",
  /**
   * Private internal log function, use the following functions to log: trace, debug, info, warn, error
   * @function
   * @memberof module:Logger
   * @param {string} logMessage - The message to log.
   * @param {int} logLevel - LogLevel: 1 - 5. 0 = OFF
   */
  _log: function (logMessage, logLevel) {
    if( (logLevel >= this._logLevel) && (this._logLevel !== 0) ) {
      if(this._logType === "console") {
        var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
        var Application = Cc["@mozilla.org/steel/application;1"]
                        .getService(Ci.steelIApplication);
        Application.console.log(logMessage);
      }
    }
  },
  /**
   * Log messages with LogLevel=TRACE
   * @function
   * @memberof module:Logger
   * @param {string} logMessage - The message to log.
   */
  trace: function (logMessage) {
    this._log("TRACE: " + logMessage, 1);
  },
  /**
   * Log messages with LogLevel=DEBUG
   * @function
   * @memberof module:Logger
   * @param {string} logMessage - The message to log.
   */
  debug: function (logMessage) {
    this._log("DEBUG: " + logMessage, 2);
  },
  /**
   * Log messages with LogLevel=INFO
   * @function
   * @memberof module:Logger
   * @param {string} logMessage - The message to log.
   */
  info: function (logMessage) {
    this._log("INFO: " + logMessage, 3);
  },
  /**
   * Log messages with LogLevel=WARN
   * @function
   * @memberof module:Logger
   * @param {string} logMessage - The message to log.
   */
  warn: function (logMessage) {
    this._log("WARN: " + logMessage, 4);
  },
  /**
   * Log messages with LogLevel=ERROR
   * @function
   * @memberof module:Logger
   * @param {string} logMessage - The message to log.
   */
  error: function (logMessage) {
    this._log("ERROR: " + logMessage, 5);
  }
};
