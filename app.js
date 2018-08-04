// express stuff
const express = require('express')
const cors = require('cors')
const compression = require('compression')
const logger = require('morgan')

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'

const { checkApiKey } = require('./checkApiKey')

const timeseries = require('./timeseries')
const image = require('./image')

// ee stuff
const ee = require('@google/earthengine');
const privateKey = require('./privatekey.json');

ee.data.authenticateViaPrivateKey(privateKey, initializeEe, function (e) {
    console.error('Authentication error: ' + e);
});

function initializeEe() {
    ee.initialize(null, null, runApp, function (e) {
        console.error('Initialization error: ' + e);
    });
};

// Run the Express app
function runApp() {

    const app = express()

    app.use(cors())
    app.use(compression())
    app.use(logger('dev'))

    app.get('/', (req, res) => {
        res.json({
            success: false,
            message: "Please read the documentation"
        })
    })

    app.get('/timeseries', checkApiKey, timeseries)
    app.get('/image/:lng/:lat/:filename', image)

    app.use((req, res, next) => {
        res.status(404).json({
            success: false,
            message: "Not found"
        })
    })

    app.use((err, req, res, next) => {
        res.status(err.status || 500).json({
            success: false,
            message: err.message
        })
    })


    app.listen(port, (err) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
    })
}