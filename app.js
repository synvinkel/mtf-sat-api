
const compression = require('compression')
const cors = require('cors')
const ee = require('@google/earthengine');
const express = require('express')
const fetch = require('node-fetch')
const logger = require('morgan')

const { checkApiKey } = require('./checkApiKey')
const image = require('./image')
const timeseries = require('./timeseries')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT, 10) || 3000
const privateKey = require('./privatekey.json');


// ee stuff
ee.data.authenticateViaPrivateKey(
    privateKey,
    () => {
        ee.initialize( null, null, runApp,
            (e) => console.error('Initialization error: ' + e)
        )
    },
    (e) => console.error('Authentication error: ' + e)
)

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
    app.get('/timeseries/:place',
        checkApiKey,
        (req, res, next) => {

        },
        timeseries)
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