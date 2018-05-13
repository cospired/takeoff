#!/usr/bin/env node
const inquirer = require('inquirer');
const updateNotifier = require('update-notifier');
const meow = require('meow');
const pkg = require('./package.json');

updateNotifier({ pkg }).notify();

const cli = meow(`
  Usage
    $ takeoff <station>

  Example
    $ takeoff node-module
`);

const { getStations, loadStationByName } = require('./lib/station');
const { createFilesByList } = require('./lib/wizard');

const getStationId = async stations => {
  return ( await inquirer.prompt(stations)).stationId;
};

(async () => {
  try {
    const stationsCollection = await getStations();

    const stationsPathMap = stationsCollection.reduce( (m, station) => {

      const pathStations = m[station.stationsPath] || [];
      pathStations.push(station);

      return {
        ...m,
        [station.stationsPath]: pathStations
      };
    }, {} );

    let stationChoices = [];

    for( let stationsPath in stationsPathMap ) {

      stationChoices.push(new inquirer.Separator(`Stations from "${stationsPath}"`));

      stationChoices = stationChoices.concat(stationsPathMap[stationsPath]);
    }

    if (stationChoices.length === 0) {
      console.log('No takeoff stations found.');
      process.exit(1);
    }

    const chooseBetweenAvailableStations = [{
      type: 'list',
      name: 'stationId',
      message: 'What do you want to create?',
      choices: stationChoices
    }];

    const stationId = await getStationId(chooseBetweenAvailableStations);

    const { name, stationsPath } = stationsCollection.find(({ value }) => value === stationId);

    const station = await loadStationByName({ name, stationsPath });

    const requiredStationProps = [];

    station.requiredProps && station.requiredProps.forEach(prop => {
      if (typeof prop === 'string') {
        requiredStationProps.push({
          type: 'input',
          name: prop,
          message: prop
        });
      } else {
        requiredStationProps.push(prop);
      }
    });

    const stationProps = await inquirer.prompt(requiredStationProps);

    const { files } = station.run(stationProps);

    await createFilesByList(files);

    console.log('Done');

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
