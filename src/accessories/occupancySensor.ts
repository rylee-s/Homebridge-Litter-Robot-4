import { Service, PlatformAccessory } from 'homebridge';
import { LitterRobot } from '../litterRobot';

import { LitterRobotPlatform } from '../platform';
import Whisker from '../api/Whisker';

export class OccupancySensorAccessory {
  private service: Service;
  private accessory: PlatformAccessory;
  private name: string;
  private uuid: string;
  private characteristic = this.platform.Characteristic.OccupancyDetected;

  private lookup = {
    'ROBOT_CAT_DETECT_DELAY': this.characteristic.OCCUPANCY_DETECTED,
    'ROBOT_IDLE': this.characteristic.OCCUPANCY_NOT_DETECTED,
  };

  private state = {
    isOccupied: this.characteristic.OCCUPANCY_NOT_DETECTED,
  };

  constructor(
    private readonly platform: LitterRobotPlatform,
    private readonly account: Whisker,
    private readonly LitterRobot: LitterRobot,
  ) {
    this.name = this.LitterRobot.name + ' Cat Sensor';
    this.uuid = this.LitterRobot.uuid.occupancySensor;
    this.accessory = this.platform.getOrCreateAccessory(this.uuid, this.name);

    this.service = this.accessory.getService(this.platform.Service.OccupancySensor) ||
    this.accessory.addService(this.platform.Service.OccupancySensor);

    // create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet(this.handleOccupancyDetectedGet.bind(this));

  }

  // update the state of the LightBulb on the platform
  update(catDetectValue: string) {
    const newValue = this.lookup[catDetectValue] || this.characteristic.OCCUPANCY_NOT_DETECTED;
    if (this.state.isOccupied !== newValue) {
      this.platform.log.debug(`Updating ${this.name} -> `, newValue);
      this.state.isOccupied = newValue;
      this.service.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, newValue);
    }
  }

  /**
   * Handle requests to get the current value of the "Occupancy Detected" characteristic
   */
  handleOccupancyDetectedGet() {
    this.platform.log.debug('Triggered GET OccupancyDetected');
    return this.state.isOccupied;
  }
}