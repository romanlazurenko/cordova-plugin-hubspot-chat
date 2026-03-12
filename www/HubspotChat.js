var exec = require("cordova/exec");

var HubspotChat = {
  /**
   * Configure the HubSpot SDK (called automatically on plugin init)
   */
  configure: function (success, error) {
    exec(success, error, "HubspotChat", "configure", []);
  },

  /**
   * Show the HubSpot chat view
   * @param {string} chatFlow - Optional chat flow name (defaults to configured value)
   */
  show: function (chatFlow, success, error) {
    if (typeof chatFlow === "function") {
      error = success;
      success = chatFlow;
      chatFlow = null;
    }
    exec(success, error, "HubspotChat", "show", [chatFlow || null]);
  },

  /**
   * Hide/close the HubSpot chat view
   */
  hide: function (success, error) {
    exec(success, error, "HubspotChat", "hide", []);
  },

  /**
   * Set user identity for the chat session
   * @param {string} email - User's email address
   * @param {string} identityToken - Optional identity token from HubSpot Visitor Identification API
   */
  setUserIdentity: function (email, identityToken, success, error) {
    if (typeof identityToken === "function") {
      error = success;
      success = identityToken;
      identityToken = null;
    }
    exec(success, error, "HubspotChat", "setUserIdentity", [
      email,
      identityToken,
    ]);
  },

  /**
   * Clear user identity
   */
  clearUserIdentity: function (success, error) {
    exec(success, error, "HubspotChat", "clearUserIdentity", []);
  },

  /**
   * Set custom chat properties
   * @param {Object} properties - Key-value pairs of properties
   */
  setChatProperties: function (properties, success, error) {
    exec(success, error, "HubspotChat", "setChatProperties", [properties || {}]);
  },

  /**
   * Clear all user data (call on logout)
   */
  logout: function (success, error) {
    exec(success, error, "HubspotChat", "logout", []);
  },
};

module.exports = HubspotChat;
