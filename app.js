// express stuff
const express = require('express')
const cors = require('cors')
const compression = require('compression')

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'

// ee stuff
var ee = require('@google/earthengine');
var privateKey = require('./privatekey.json');

const getCollectionList = require('./getCollectionList.js')

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

    app.get('/timeline/:lat/:lng', (req, res, next) => {
            const { lat, lng } = req.params
            res.json(getCollectionList(lat, lng))
        }
    )

    app.use((err, req, res, next) => {
        console.log(err)
    })

    app.listen(port, (err) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
    })
}