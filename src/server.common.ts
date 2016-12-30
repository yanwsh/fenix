import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

import * as mcache from 'memory-cache';
const { gzipSync } = require('zlib');
const accepts = require('accepts');
const { compressSync } = require('iltorb');
const interceptor = require('express-interceptor');

// Angular 2
import { enableProdMode } from '@angular/core';

// enable prod for faster renders
enableProdMode();

const app = express();
export const ROOT = path.join(path.resolve(__dirname, '..'));

app.set('port', process.env.PORT || 8000);
app.set('views', __dirname);
app.set('view engine', 'html');
app.set('json spaces', 2);

app.use(cookieParser('Angular 2 Universal'));
app.use(bodyParser.json());

app.use(interceptor((req, res)=>({
    // don't compress responses with this request header
    isInterceptable: () => (!req.headers['x-no-compression']),
    intercept: ( body, send ) => {
        const encodings  = new Set(accepts(req).encodings());
        const bodyBuffer = new Buffer(body);
        // url specific key for response cache
        const key = '__response__' + req.originalUrl || req.url;
        let output = bodyBuffer;
        // check if cache exists
        if (mcache.get(key) === null) {
            // check for encoding support
            if (encodings.has('br')) {
                // brotli
                res.setHeader('Content-Encoding', 'br');
                output = compressSync(bodyBuffer);
                mcache.put(key, {output, encoding: 'br'});
            } else if (encodings.has('gzip')) {
                // gzip
                res.setHeader('Content-Encoding', 'gzip');
                output = gzipSync(bodyBuffer);
                mcache.put(key, {output, encoding: 'gzip'});
            }
        } else {
            const { output, encoding } = mcache.get(key);
            res.setHeader('Content-Encoding', encoding);
            send(output);
        }
        send(output);
    }
})));

function cacheControl(req, res, next) {
    // instruct browser to revalidate in 60 seconds
    res.header('Cache-Control', 'max-age=60');
    next();
}
// Serve static files
app.use('/assets', cacheControl, express.static(path.join(__dirname, 'assets'), {maxAge: 30}));
app.use(cacheControl, express.static(path.join(ROOT, 'dist/client'), {index: false}));

//
/////////////////////////
// ** Example API
// Notice API should be in aseparate process
import { serverApi, createTodoApi } from './backend/api';
// Our API for demos only
app.get('/data.json', serverApi);
app.use('/api', createTodoApi());

export default app;