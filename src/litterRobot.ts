import { LitterRobotPlatform } from './platform';
import Whisker from './api/Whisker';
import { Logger, PlatformConfig } from 'homebridge';
import { GlobeLightAccessory } from './accessories/globeLight';
import { OccupancySensorAccessory } from './accessories/occupancySensor';
import { DrawerLevelAccessory } from './accessories/drawerLevel';
import { Robot } from './api/Whisker.types';

export class LitterRobot {
  private globeLight: GlobeLightAccessory;
  private occupancySensor: OccupancySensorAccessory;
  private drawerLevel?: DrawerLevelAccessory;

  public uuid = {
    bot: this.platform.api.hap.uuid.generate(this.device.serial),
    globeLight: this.platform.api.hap.uuid.generate(this.device.serial + 'globeLight'),
    occupancySensor: this.platform.api.hap.uuid.generate(this.device.serial + 'occupancySensor'),
    drawerLevel: this.platform.api.hap.uuid.generate(this.device.serial + 'drawerLevel'),
  };

  public serialNumber = this.device.serial;
  public name = this.device.name;

  constructor(
    private readonly account: Whisker,
    public readonly device: Robot,
    private readonly platform: LitterRobotPlatform,
    private readonly log: Logger,
    private readonly config: PlatformConfig,
  ) {
    this.log.info('Litter Robot:', device.name, device.serial);
    this.globeLight = new GlobeLightAccessory(this.platform, this.account, this);
    this.occupancySensor = new OccupancySensorAccessory(this.platform, this.account, this);
    if (!this.config.disableDrawerSensor) {
      this.drawerLevel = new DrawerLevelAccessory(this.platform, this.account, this);
    }
  }

  public update(device: Robot): void {
    this.globeLight?.update(device.isNightLightLEDOn);
    this.occupancySensor?.update(device.robotStatus);
    if (!this.config.disableDrawerSensor) {
      this.drawerLevel?.update(device.DFILevelPercent);
    }
  }
}
