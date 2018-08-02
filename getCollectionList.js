var ee = require('@google/earthengine');

module.exports = function(lat, lng){
    console.log(`processing ${lat}, ${lng}`)

    const poi = ee.Geometry.Point([parseFloat(lat), parseFloat(lng)])
    const s2 = ee.ImageCollection('COPERNICUS/S2')
        .filterBounds(poi)

    const s2list = s2.getInfo()
    return s2list
}
