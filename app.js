// express stuff
const express = require('express')
const cors = require('cors')
const compression = require('compression')
const logger = require('morgan')
const https = require('https')

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'

const { checkApiKey } = require('./checkApiKey')

const timeseries = require('./timeseries')

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

    app.get('/image/:lng/:lat/:filename', (req, res, next) => {
        try {
            const { lng, lat, filename } = req.params

            const index = filename.split('.')[0]

            const coords = [parseFloat(lng), parseFloat(lat)]
            // error handling for coordinates
            if (coords.some((coord, i) => {
                if (!coord) {
                    return true
                }
                if (i === 0 && (coord > 180 || coord < -180)) {
                    return true
                }
                if (i === 1 && (coord > 90 || coord < -90)) {
                    return true
                }
                return false
            })) {
                next({
                    message: "Please provide proper lat/lng"
                })
                return
            }

            const aoi = ee.Geometry.Point(coords).buffer(2000).bounds()

            ee.Image(`COPERNICUS/S2/${index}`).clip(aoi)
                .visualize({
                    bands: ['B4', 'B3', 'B2'],
                    min: 0, max: 2500
                })
                .getThumbURL({
                    dimensions: 1000,
                    format: 'png'
                }, (url, err) => {
                    if (err) {
                        next({
                            message: err
                        })
                        return
                    }

                    https.get(url, file => file.pipe(res))
                })



        } catch (e) {
            next(e)
        }
    }
    )

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