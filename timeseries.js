const ee = require('@google/earthengine');


module.exports = (req, res, next) => {
    try {

        const { lat, lng } = req.query
        const coords = [parseFloat(lat), parseFloat(lng)]

        // error handling for coordinates
        if (coords.some((coord, i) => {
            if (!coord) {
                return true
            }
            if (i === 0 && (coord > 90 || coord < -90)) {
                return true
            }
            if (i === 1 && (coord > 180 || coord < -180)) {
                return true
            }
            return false
        })) {
            next({
                message: "Please provide proper lat/lng"
            })
            return
        }

        const poi = ee.Geometry.Point()
        const s2 = ee.ImageCollection('COPERNICUS/S2')
            .filterBounds(poi)

        s2.getInfo((data, err) => {
            if (err) {
                next({
                    message: err
                })
                return
            }

            res.json({
                success: true,
                data: data
            })
        }
        )

    } catch (e) {
        next(e)
    }
}
