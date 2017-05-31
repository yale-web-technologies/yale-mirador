import defaultSettings from './locales-default';

export default class Locales {
  getLocalesConfig(options) {
    const settings = defaultSettings;
    const overrides = options.ui.i18nOverrides;
    if (typeof overrides === 'object') {
      for (let [lang, data] of Object.entries(overrides)) {
        if (!settings[lang]) {
          settings[lang] = {};
        }
        for (let [key, value] of Object.entries(data)) {
          settings[lang][key] = value;
        }
      }
    }
    return settings;
  }
}
