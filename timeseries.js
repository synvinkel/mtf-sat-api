const ee = require('@google/earthengine');


module.exports = (req, res, next) => {
    try {

        const { lat, lng } = req.query

        const poi = ee.Geometry.Point([parseFloat(lat), parseFloat(lng)])
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
