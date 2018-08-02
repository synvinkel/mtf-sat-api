
const fetch = require('node-fetch')

const placesUrl = 'https://places.cit.api.here.com/places/v1/autosuggest/'
const geocodeUrl = 'https://geocoder.api.here.com/6.2/geocode.json'
const APP_ID = process.env.HERE_APP_ID
const APP_CODE = process.env.HERE_APP_CODE
const authString = `&app_id=${APP_ID}&app_code=${APP_CODE}`

console.log(authString)

const place = 'farstalksjdfjsdfjkl'

async function get(){
    const response = await(await fetch(`${geocodeUrl}?searchtext=${place}${authString}`)).json()
    console.log(JSON.stringify(response, null, 2))
}

get()
