let axios = require("axios")
const fs = require('fs')


locationsFile = './locations/20220108_minerLocationsReport.json'
country = 'US'

// Load and filter by country
locs = require(locationsFile).minerLocations.filter(x => x.country == country)

async function findPower(){

  // for (let idx=0; idx<locs.length; idx++){
  for (let idx=10; idx<11; idx++){

    minerID = locs[idx].miner
    modelnum = 0 // 0 is total energy

    // Params for API call
    start = '2022-01-15'
    end = '2022-01-16'
    limit = 100

    console.log(`minerID: ${minerID}`)


    sealing_records = {'data':{'data':[]}}
    for (let j=0; j<365 && sealing_records.data.data.length==0; j++){

      // If an SP doesn't have recent activity, need to adjust date back
      var unixStartDate = Date.parse(start)
      var startDate = new Date(unixStartDate-3600000*24*j) //Step back one day per loop iteration
      yearNum = startDate.getYear()-100+2000
      monthNum = startDate.getMonth()+1
      dayNum = startDate.getDate()
      start = `${yearNum}-${`${monthNum}`.padStart(2,'0')}-${`${dayNum}`.padStart(2,'0')}`

      // this actually may give a value that is too high; try reconstructing from sealing and storage data
      requestString = `https://api.filecoin.energy/models/export?end=${end}&id=${modelnum}&limit=${limit}&offset=0&start=${start}&miner=${minerID}`
      var sealing_records = await axios.get(requestString)
    }

    console.log(sealing_records.data.data)
    estimateSum = sealing_records.data.data.reduce((prev, elem) => prev + Number(elem.total_energy_kW_estimate), 0)
    estimateAvg = estimateSum / sealing_records.data.data.length
    console.log(estimateAvg)

  }
}



findPower()
