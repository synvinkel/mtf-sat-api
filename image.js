const ee = require('@google/earthengine');
const request = require('request')

module.exports = (req, res, next) => {
    try {
        const { lng, lat, filename } = req.params
        const { bands: reqBands } = req.query

        const basename = filename.split('.')[0]
        const filetype = filename.split('.')[1]

        const index = basename.split('-')[0]
        const bufferHex = basename.split('-')[1]
        const buffer = parseInt(bufferHex, 16)

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

        const bands = { r: 'B4', g: 'B3', b: 'B2' }
        if (reqBands) {
            const splitBands = reqBands.trim().split(',')
            console.log('custom bands', splitBands)
            if (splitBands.length === 3) {
                bands.r = splitBands[0]
                bands.g = splitBands[1]
                bands.b = splitBands[2]
            } else {
                next({
                    status: 400,
                    message: "Please provide three bands, or remove the bands parameter for truecolor rgb."
                })
                return
            }
        }

        const aoi = ee.Geometry.Point(coords).buffer(buffer ? buffer : 2000).bounds()

        const img = ee.Image(`COPERNICUS/S2/${index}`).clip(aoi)

        if (filetype === 'png') {

            const stats = img.select([bands.r, bands.g, bands.b]).reduceRegion({
                reducer: ee.Reducer.mean().combine({
                    reducer2: ee.Reducer.stdDev(), sharedInputs: true
                }).setOutputs(['mean', 'stddev']),
                scale: 10,
                bestEffort: true
            })

            const n_std = 2
            const imgRGB = img.select([bands.r, bands.g, bands.b])
                .visualize({
                    min: ee.List([
                        ee.Number(stats.get(bands.r + '_mean')).subtract(ee.Number(n_std).multiply(ee.Number(stats.get(bands.r + '_stddev')))),
                        ee.Number(stats.get(bands.g + '_mean')).subtract(ee.Number(n_std).multiply(ee.Number(stats.get(bands.g + '_stddev')))),
                        ee.Number(stats.get(bands.b + '_mean')).subtract(ee.Number(n_std).multiply(ee.Number(stats.get(bands.b + '_stddev')))),
                    ]),
                    max: ee.List([
                        ee.Number(stats.get(bands.r + '_mean')).add(ee.Number(n_std).multiply(ee.Number(stats.get(bands.r + '_stddev')))),
                        ee.Number(stats.get(bands.g + '_mean')).add(ee.Number(n_std).multiply(ee.Number(stats.get(bands.g + '_stddev')))),
                        ee.Number(stats.get(bands.b + '_mean')).add(ee.Number(n_std).multiply(ee.Number(stats.get(bands.b + '_stddev')))),
                    ])
                })

            imgRGB
                .getThumbURL({
                    dimensions: buffer ? buffer : 2000,
                    format: 'png'
                }, (url, err) => {
                    if (err) {
                        next({
                            message: err
                        })
                        return
                    }

                    res.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString())
                    request.get(url).pipe(res)
                })
        }
        if(filetype === 'zip' || filetype === 'tif'){
            img
                .getDownloadURL({}, (url, err) => {
                    if(err){
                        next({
                            message: err
                        })
                        return
                    }

                    res.setHeader("Expires", new Date(Date.now() + 2592000000).toUTCString())
                    request.get(url).pipe(res)
                })
        }



    } catch (e) {
        next(e)
    }
}