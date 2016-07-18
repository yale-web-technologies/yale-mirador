export default {
  serverSettings: null,
  
  /**
   * Returns true if the user is logged in via CAS.
   */
  loggedIn: function() {
    return Cookies.get('loggedIn') == 'true';
  },
  
  isEditor: function() {
    return Cookies.get('isEditor') == 'true';
  },
  
  getServerSettings: function() {
    return this.serverSettings;
  },
  
  setServerSettings: function(settings) {
    this.serverSettings = settings;
    return settings;
  }
};
