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

      // create a new HumiditySensor service
      this.service = this.accessory.getService(this.platform.Service.HumiditySensor) ||
      this.accessory.addService(this.platform.Service.HumiditySensor);
    

      // create handlers for required characteristics
      this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .onGet(this.handleCurrentRelativeHumidityGet.bind(this));

  }

  /**
   * Handle requests to get the current value of the "Current Relative Humidity" characteristic
   */
  handleCurrentRelativeHumidityGet() {
    this.log.debug('Triggered GET CurrentRelativeHumidity');
    return this.state.Level;;
  }

    // update the state of the HumiditySensor on the platform
    update(level: number) {
      // correct for the fact that the litter robot reports 110% when full
      level = Math.round(level / 110 * 100);
      if (this.state.Level !== level) {
        this.platform.log.debug(`Updating ${this.name} -> `, level);
        this.state.Level = level;
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, level);
      }
    }
}