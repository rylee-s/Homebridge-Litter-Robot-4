import { LitterRobotPlatform } from '../platform';
import { Service, PlatformAccessory } from 'homebridge';
import Whisker from '../api/Whisker';
import { LitterRobot } from '../litterRobot';

export class DrawerLevelAccessory {
  private readonly log;
  private service: Service;
  private name: string;
  private uuid: string;
  private accessory: PlatformAccessory;
  private state = {
    Level: 0,
  };

  constructor(
    private readonly platform: LitterRobotPlatform,
    private readonly account: Whisker,
    private readonly LitterRobot: LitterRobot,
  ) {
    this.log = this.platform.log;
    this.name = this.LitterRobot.name + ' Drawer Level';
    this.uuid = this.LitterRobot.uuid.drawerLevel;
    this.accessory = this.platform.getOrCreateAccessory(this.uuid, this.name);

    // Check if the drawer sensor is disabled in the config
    if (this.platform.config.disableDrawerSensor) {
      this.log.info('Drawer level sensor disabled by configuration');
      return;
    }

    // Create a new HumiditySensor service
    this.service =
      this.accessory.getService(this.platform.Service.HumiditySensor) ||
      this.accessory.addService(this.platform.Service.HumiditySensor);

    // Create handlers for required characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleCurrentRelativeHumidityGet.bind(this));
  }

  /**
   * Handle requests to get the current value of the "Current Relative Humidity" characteristic
   */
  handleCurrentRelativeHumidityGet() {
    this.log.debug('Triggered GET CurrentRelativeHumidity');
    return this.state.Level;
  }

  /**
   * Update the state of the HumiditySensor on the platform
   */
  update(level: number) {
    if (this.platform.config.disableDrawerSensor) {
      this.log.debug(`Drawer level sensor update skipped as it is disabled.`);
      return;
    }

    // Correct for the fact that the litter robot reports 110% when full
    level = Math.round((level / 110) * 100);
    if (this.state.Level !== level) {
      this.platform.log.debug(`Updating ${this.name} -> `, level);
      this.state.Level = level;
      this.service.updateCharacteristic(
        this.platform.Characteristic.CurrentRelativeHumidity,
        level,
      );
    }
  }
}