require('../css/main.less');

import 'babel-polyfill';

import './extension/ext-global';
import './extension/ext-image-view';
import './extension/ext-osd-region-draw-tool';
import './extension/dialog-builder';
import './annotation/yale-endpoint';
import './annotation/yale-demo-endpoint';
import './annotation/annotation-editor';
import './annotation/ym-annotation-selector';
import getConfigFetcher from './config/config-fetcher';
import Grid from './grid';
import MainMenu from './widgets/main-menu';
import getMiradorWindow from './mirador-window';
import './extension/interface';
//import './util/override-pubsub'; // import this only for debugging!

export default class App {
  constructor(element) {
    //console.log('App#constructor');
    const viewerTemplateElem = jQuery('#\\{\\{id\\}\\}');
    const configFetcher = getConfigFetcher();
    const settingsFromHtml = configFetcher.fetchSettingsFromHtml(viewerTemplateElem);
    const {apiUrl, projectId} = settingsFromHtml;
    
    configFetcher.fetchSettingsFromApi(apiUrl, projectId)
    .catch(function(reason) {
      alert('ERROR failed to retrieve server setting - ' + reason);
    })
    .then(function(settingsFromApi) {
      console.log('Settings from API:', settingsFromApi);
      const mainMenu = new MainMenu();
      const grid = new Grid(element);
      const settings = jQuery.extend(settingsFromHtml, settingsFromApi);
      
      getMiradorWindow().init({
        mainMenu: mainMenu,
        grid: grid,
        settings: settings
      });
    })
    .catch(function(reason) {
      alert('ERROR failed to init Mirador - ' + reason);
    });
  }
}
