// the polyfills must be one of the first things imported in node.js.
// The only modules to be imported higher - node modules with es6-promise 3.x or other Promise polyfill dependency
// (rule of thumb: do it if you have zone.js exception that it has been overwritten)
// if you are including modules that modify Promise, such as NewRelic,, you must include them before polyfills
import 'angular2-universal-polyfills';
import 'ts-helpers';
import './__workaround.node'; // temporary until 2.1.1 things are patched in Core

import * as fs from 'fs';

import * as morgan from 'morgan';
import app,  {ROOT} from './server.common';

// Angular 2 Universal
import { createEngine } from 'angular2-express-engine';

// App
import { MainModuleNgFactory } from './node.module.ngfactory';

// Routes
import { routes } from './server.routes';


// Express View
app.engine('.html', createEngine({
  precompile: false, // this needs to be false when using ngFactory
  ngModule: MainModuleNgFactory,
  providers: [
    // use only if you have shared state between users
    // { provide: 'LRU', useFactory: () => new LRU(10) }

    // stateless providers only since it's shared
  ]
}));

const accessLogStream = fs.createWriteStream(ROOT + '/morgan.log', {flags: 'a'});

app.use(morgan('common', {
  skip: (req, res) => res.statusCode < 400,
  stream: accessLogStream
}));

function ngApp(req, res) {
  res.render('index', {
    req,
    res,
    // time: true, // use this to determine what part of your app is slow only in development
    preboot: false,
    baseUrl: '/',
    requestUrl: req.originalUrl,
    originUrl: `http://localhost:${ app.get('port') }`
  });
}

/**
 * use universal for specific routes
 */
app.get('/', ngApp);
routes.forEach(route => {
  app.get(`/${route}`, ngApp);
  app.get(`/${route}/*`, ngApp);
});

// Server
let server = app.listen(app.get('port'), () => {
  var port = server.address().port;
  console.info(`==> 🌎  Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`);
});
