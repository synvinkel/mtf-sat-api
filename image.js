const https = require('https')
const ee = require('@google/earthengine');

module.exports = (req, res, next) => {
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
                'bands': ['B4' , 'B3' , 'B2'],
                'min': [300, 400, 600],
                'max': [2000, 1900, 1900]
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