import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

import * as mcache from 'memory-cache';
const { gzipSync, deflateSync } = require('zlib');
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
    isInterceptable: () => {
        // Don't compress for Cache-Control: no-transform
        // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
        const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/;
        var cacheControl = res.getHeader('Cache-Control');
        return !cacheControl ||
            !cacheControlNoTransformRegExp.test(cacheControl) ||
            !req.headers['x-no-compression']
    },
    intercept: ( body, send ) => {
        const encodings  = new Set(accepts(req).encodings());
        const bodyBuffer = new Buffer(body);

        // url specific key for response cache
        const key = '__response__' + req.originalUrl || req.url;
        let output = bodyBuffer;

        const encoding = res.getHeader('Content-Encoding') || 'identity';
        const contentType = res.getHeader('Content-Type') || "";

        if(encoding !== 'identity'){
            //already encoded.
            send(output);
            return;
        }

        if(encodings.has('br') && !contentType.includes("text/html") && !contentType.includes("application/json")){
            res.setHeader('Content-Encoding', 'br');
            if(mcache.get(key) == null){
                output = compressSync(bodyBuffer);
                mcache.put(key, output);
            }else{
                output = mcache.get(key);
            }
        }else if(encodings.has('gzip')){
            res.setHeader('Content-Encoding', 'gzip');
            output = gzipSync(bodyBuffer);
        }else if(encodings.has('deflate')){
            res.setHeader('Content-Encoding', 'deflate');
            output = deflateSync(bodyBuffer);
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