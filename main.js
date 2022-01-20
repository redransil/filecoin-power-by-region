let axios = require("axios")
const fs = require('fs')
const energyModel = require('../filecoin-energy-estimation/model-parameters/v-1-0-1.json')

locationsFile = './locations/20220108_minerLocationsReport.json'
country = 'US'
limit = 100 // Max number of points to return from API

// Load and filter by country
locs = require(locationsFile).minerLocations.filter(x => x.country == country)

// We want to get the capacity of the past week, even if there were no datapoints
async function findCapacity(start, end, minerID) {
  modelnum = 3

  storage_records = {'data':{'data':[]}}
  for (let j=0; j<100 && storage_records.data.data.length==0; j++){
    console.log
    // If an SP doesn't have recent activity, need to adjust date back
    var unixStartDate = Date.parse(start)
    var startDate = new Date(unixStartDate-3600000*24*j) //Step back one day per loop iteration
    yearNum = startDate.getYear()-100+2000
    monthNum = startDate.getMonth()+1
    dayNum = startDate.getDate()
    start = `${yearNum}-${`${monthNum}`.padStart(2,'0')}-${`${dayNum}`.padStart(2,'0')}`

    // this actually may give a value that is too high; try reconstructing from sealing and storage data
    requestString = `https://api.filecoin.energy/models/export?end=${end}&id=${modelnum}&limit=${limit}&offset=0&start=${start}&miner=${minerID}`
    var storage_records = await axios.get(requestString)
  }

  return storage_records

}

async function findPower(){

  powerRecords = []

  idxmax = locs.length
  idxmax = 10
  for (let idx=0; idx<idxmax; idx++){

    minerID = locs[idx].miner

    // Is this a repeat minerID?
    prevRecords = powerRecords.filter(elem => elem.minerID == minerID)
    if (prevRecords.length > 0){console.log(`${minerID} already added`)}
    else{

      console.log(`(${idx}/${idxmax})minerID: ${minerID}`)

      capacity_records = await findCapacity('2022-01-15', '2022-01-16', minerID)

      // This is a quick estimate; more accurate would take a time average over the period
      capSumGiB = capacity_records.data.data.reduce((prev, elem) => prev + Number(elem.capacity_GiB), 0)
      capAvgGiB = capSumGiB / capacity_records.data.data.length
      if(isNaN(capAvgGiB)){capAvgGiB = 0}

      // Params for API call
      start = '2022-01-15'
      end = '2022-01-16'

      requestString = `https://api.filecoin.energy/models/export?end=2022-01-16&id=4&limit=100&offset=0&start=2022-01-14&miner=${minerID}`
      var sealing_records = await axios.get(requestString)
      sealSumGiB = sealing_records.data.data.reduce((prev, elem) => prev + Number(elem.sealed_this_epoch_GiB), 0)

      storage_power_W = capAvgGiB * 1024**3 * energyModel.storage.estimate
      sealing_power_W = sealSumGiB * 1024**3 * energyModel.sealing.estimate / 48

      powerRecords.push({'minerID':minerID,
        'capacity_GiB': capAvgGiB,
        'storage_power_W' : storage_power_W,
        'sealed_GiB_per_day': sealSumGiB/2, //half because we took records for two days
        'sealing_power_W':sealing_power_W,
        'total_power_W': (storage_power_W + sealing_power_W)*energyModel.pue.estimate
      })

    }
  }

  console.log(powerRecords)

  total_power_W = powerRecords.reduce((prev, elem)=> prev+elem.total_power_W, 0)
  console.log(total_power_W)
}



findPower()
