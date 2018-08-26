const ee = require('@google/earthengine');
const request = require('request')

const visparams = {
    rgb: {
        'bands': ['B4', 'B3', 'B2'],
        'min': [300, 400, 600],
        'max': [2000, 1900, 1900]
    },
    falsecolor: {
        'bands': ['B8', 'B4', 'B3'],
        'min': [300, 400, 600],
        'max': [2000, 1900, 1900]
    }
}

module.exports = (req, res, next) => {
    try {
        const { lng, lat, filename } = req.params
        const { visualize } = req.query

        const basename = filename.split('.')[0]
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

        const aoi = ee.Geometry.Point(coords).buffer(buffer).bounds()

        const img = ee.Image(`COPERNICUS/S2/${index}`).clip(aoi)

        const stats = img.select(['B4', 'B3', 'B2']).reduceRegion({
            reducer: ee.Reducer.percentile([5, 95]),
            scale: 10,
            maxPixels: 1e9
        })

        const imgRGB  = img.select(['B4', 'B3', 'B2'])
            .visualize({
                min: ee.List([stats.get('B4_p5'), stats.get('B3_p5'), stats.get('B2_p5')]),
                max: ee.List([stats.get('B4_p95'), stats.get('B3_p95'), stats.get('B2_p95')]),
            })

        imgRGB
            .getThumbURL({
                dimensions: buffer,
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



    } catch (e) {
        next(e)
    }
}