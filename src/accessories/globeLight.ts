import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { LitterRobotPlatform } from '../platform';
import Whisker from '../api/Whisker';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class GlobeLightAccessory {
  private service: Service;

  private state = {
    On: true,
  };

  constructor(
    private readonly platform: LitterRobotPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly account: Whisker,
    private readonly serialNumber: string,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Whisker Inc.')
      .setCharacteristic(this.platform.Characteristic.Model, 'Litter Robot 4')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, serialNumber);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) ||
    this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name + ' Globe Light');

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.toggle.bind(this))     // SET - bind to the `setOn` method below
      .onGet(this.getStatus.bind(this)); // GET - bind to the `getOn` method below
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async toggle(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    const commandValue = value ? 'nightLightModeOn' : 'nightLightModeOff';
    const command = JSON.stringify({
      query: `mutation { 
        sendLitterRobot4Command(input: {serial: "${this.serialNumber}", command: "${commandValue}"})
        }`,
    });

    this.platform.log.debug('Toggle Globle Light -> ', value, command);

    this.account.sendCommand(command).then((response) => {
      this.platform.log.debug('Toggle Globle Light Cmd Resonse -> ', response.data);
    });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getStatus(): Promise<CharacteristicValue> {
    const botName = this.accessory.context.device.name;

    this.platform.log.debug(`Getting ${botName} Status...`);
    const command = JSON.stringify({
      query: `{
          query: getLitterRobot4BySerial(serial: "${this.serialNumber}") {
              isNightLightLEDOn
          }
      
      }`});
    return this.account.sendCommand(command).then((response) => {
      const state = response.data.data.query.isNightLightLEDOn;
      this.platform.log.debug(`${botName} is ${state ? 'On' : 'Off'}`);
      this.service.updateCharacteristic(this.platform.Characteristic.On, state);
      return state;
    });
  }
}
