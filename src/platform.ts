import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import Whisker from './api/Whisker';
import { LitterRobot } from './litterRobot';
import { PLUGIN_NAME, PLATFORM_NAME } from './settings';
import { Robot } from './api/Whisker.types';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class LitterRobotPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public litterRobots: LitterRobot[] = [];
  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    const account = new Whisker(this.config, this.log, this.accessories, this.api);


    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      account.authenticate().then(() => {
        this.log.debug('Authenticated now discovering devices');
        this.discoverDevices(account);
        this.pollForUpdates(account, 100000);
      });
    });
  }

  getOrCreateAccessory(uuid: string, name: string) {
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      return existingAccessory;
    } else {
      this.log.info('Adding new accessory:', name);
      const accessory = new this.api.platformAccessory(name, uuid);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      return accessory;
    }
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices(account: Whisker) {
    const data = JSON.stringify({
      query: `{
        query: getLitterRobot4ByUser(userId: "${account.accountId}") {
            serial
            name
            isNightLightLEDOn
        }
    
    }`,
    });
    account.sendCommand(data).then((response) => {
      this.log.debug('Discovered devices:', JSON.stringify(response.data.data.query));
      let devices = response.data.data.query;
      devices ||= [];

      // loop over the discovered devices and register each one
      for (const device of devices) {
        this.log.debug('Discovered device:', device.name, device.serial);
        this.litterRobots.push(new LitterRobot(account, device, this, this.log));
      }
    });
  }

  // Poll for updates
  pollForUpdates(account: Whisker, interval: number) {
    const command = JSON.stringify({
      query: `{
        query: getLitterRobot4ByUser(userId: "${account.accountId}") {
            serial
            name
            isNightLightLEDOn
            robotStatus
            catDetect
            DFILevelPercent
        }
    }`,
    });
    account.sendCommand(command).then((response) => {
      const data = response.data.data.query;

      data.forEach((device: Robot) => {
        const litterRobot = this.litterRobots.find((bot) => bot.serialNumber === device.serial);
        if (litterRobot) {
          litterRobot.update(device);
        }
      });

      setTimeout(() => {
        this.pollForUpdates(account, interval);
      }, interval);
    });
  }
}

