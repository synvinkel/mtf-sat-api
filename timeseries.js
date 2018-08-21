const ee = require('@google/earthengine');
const { format } = require('date-fns')

// very northsperocentric
const seasons = {
    spring: { start: 45, end: 135 },
    summer: { start: 135, end: 225 },
    fall: { start: 225, end: 315 },
    winter: { start: 315, end: 45 },
}


module.exports = (req, res, next) => {
    try {

        const { lng, lat, maxCloudCover, season: reqSeason } = req.query
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
        let s2 = ee.ImageCollection('COPERNICUS/S2')
            .filterBounds(aoi)
            .filter(ee.Filter.contains('.geo', aoi))
            .distinct('system:time_start')

        if (maxCloudCover) {
            console.log('filtering for cloudcover', maxCloudCover)
            cloudCover = parseFloat(maxCloudCover)
            if (cloudCover >= 0 && cloudCover <= 100) {

                s2 = s2.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudCover))
            } else {
                next({
                    message: "Please provide maxCloudCover between 0 and 100"
                })
                return
            }
        }

        if (reqSeason) {
            console.log('filtering for season', reqSeason)
            if (seasons[reqSeason]) {
                const season = seasons[reqSeason]
                s2 = s2.filter(ee.Filter.calendarRange(season.start, season.end))
            } else {
                next({
                    message: "Season must be one of 'spring','summer','fall','winter'. (Note that the season definitions are very northenhemispherocentric)."
                })
                return
            }
        }

        s2mean = s2.map(function (image) {
            var clipped = ee.Image(image).clip(aoi)
            var mean = clipped.reduceRegion({
                reducer: ee.Reducer.mean(),
                geometry: aoi,
                scale: 10
            })

            return clipped.set('mean', mean)
        })

        s2mean.getInfo((data, err) => {
            if (err) {
                next({
                    message: err
                })
                return
            }

            const { features } = data

            const parsed = {
                location: { lng: lng, lat: lat },
                images: features.map(image => {

                    const bands = image.properties.mean
                    Object.keys(bands).forEach((band) => {
                        if (['QA10', 'QA20', 'QA60'].some(badband => badband === band)) {
                            delete bands[band]
                            return
                        }
                        if (bands[band]) {
                            bands[band] = +bands[band].toFixed(2)
                            return
                        }
                    })

                    const time = image.properties['system:time_start']

                    return {
                        bands: bands,
                        cloudcover: image.properties['CLOUDY_PIXEL_PERCENTAGE'],
                        time: time,
                        date: format(new Date(time), 'YYYY-MM-DD'),
                        url: `${process.env.ROOT_URL}/image/${lng}/${lat}/${image.properties['system:index']}.png`
                    }
                })
            }


            res.json({
                success: true,
                data: parsed
            })
        }
        )

    } catch (e) {
        next(e)
    }
}
