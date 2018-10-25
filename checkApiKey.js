const fs = require('fs')
const { keys } = JSON.parse(fs.readFileSync("./apikeys.json"))

module.exports.checkApiKey = (req, res, next) => {
    const { apikey:reqkey } = req.query
    const keyexists = keys.some(key => reqkey === key.key)
    console.log(`reqkey ${reqkey} ${keyexists ? 'exists' : 'does not exist'}`)

    if (keyexists) {
        next()
        return
    }

    next({
        message: "Invalid API-key"
    })
}
