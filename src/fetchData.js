/**
* @author Blumanski <blumanski@protonmail.com>
* Get market data from an xml source
* Regarding to the source, just a random xml feed I found for this example
* The script is supposed to run by crontab
* 1. Get the data
* 2. Save data into firebase database
* 3. Shut Down Script
*/

const Firebase = require('firebase');
const request = require('request');
const parser = require('xml2json');
const _ = require('lodash');

// firebase access config
const config = {
    apiKey: "apikey",
    authDomain: "authdomain",
    databaseURL: "dburl",
    storageBucket: "optional",
    messagingSenderId: "optional"
}

// init firebase
Firebase.initializeApp(config)

class getMarketData {

    getData() {
        // return promise
        return new Promise((resolve, reject) => {
            // get the xml string from remote server
            request.get('http://rates.fxcm.com/RatesXML', (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    // parse xml to json
                    var json = parser.toJson(body)
                    // parse json to array
                    json = this.jsonToArray(json)
                    // resolve promise
                    resolve(json)
                } else {
                    // reject promise
                    reject(error)
                }
            })
        })
    }

    // json to array, multi dimensional json string
    jsonToArray(data) {

        // parse base data
        let newData = JSON.parse(data)
        // new array
        let rates = []
        // foreach through the keys and push data into the new array
        Object.keys( newData ).forEach(( prop ) => {
            Object.keys( newData[prop] ).forEach(( key ) => {
                Object.keys( newData[prop][key] ).forEach(( key2 ) => {
                    rates.push(newData[prop][key][key2])
                })
            })
        })

        return(rates)
    }

    // insert data to the firebase database
    insertData(value, callback) {

        // insert data
        Firebase.database().ref('latestMarkets/'+value.Symbol).set({
            Symbol: value.Symbol,
            Bid: value.Bid,
            Ask: value.Ask,
            High: value.High,
            Low: value.Low,
            Direction: value.Direction,
            Last: value.Last
        })
        .then((response) => {
            // callback
            callback(true)
        })
        .catch((error) => {
            // callback
            callback(error)
        })
    }

    // Loop through the data and call the insert method
    transferLatestRatesToFirebase(data) {

        // return promise
        return new Promise((resolve, reject) => {
            // loop through data and insert each item
            data.forEach((value, index) => {
                if(value.Symbol) {
                    // need to use a callback here...
                    this.insertData(value, (response) => {
                        // if this was the last item in the loop, we want to resolve this promise
                        if(response === true && data.length == (index + 1)) {
                            // promise resolved
                            resolve('saving done')
                        }
                        // reject if an error comes back
                        if(response !== true) {
                            reject(response)
                        }
                    })

                } else {
                    // incorrect data, reject this
                    reject('No symbols')
                }
            })
        })
    }

    // get market data and return promise
    getMarketData() {

        // return promise
        return new Promise((resolve, reject) => {
            this.getData()
                .then((response) => {
                    if(response) {
                        resolve(response)
                    }
                })
                .catch((error) => {
                    reject(error);
                })
        })
    }

    // action method
    saveLatestMarketsData() {

        console.log('start process')
        // return promise
        return new Promise((resolve, reject) => {

            this.getMarketData()
                .then((data) => {
                    console.log('get data done')
                    return(data)
                })
                .then((data) => {
                    console.log('transfer done')
                    return this.transferLatestRatesToFirebase(data)
                })
                .then((response) => {
                    console.log('final step done')
                    resolve(response)
                })
                .catch((error) => {
                    reject(error)
                })
            })
    }
}

let fetcher = new getMarketData()

fetcher.saveLatestMarketsData()
    .then((response) => {
        if(response == 'saving done') {
            console.log('shutdown in 10 seconds')
            // give it a bit time to finish before exit
            setTimeout(function(){
                process.exit()
            }, 10000)
        }
    })
    .catch((error) => {
        setTimeout(function(){
            console.log('shutdown in 10 seconds')
            // give it a bit time to finish before exit
            process.exit()
        }, 10000)
    })
