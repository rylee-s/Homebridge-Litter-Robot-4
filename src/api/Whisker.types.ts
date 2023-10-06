// Axios Device Types

export interface whiskerResponse {
  data: {
    query: Array<Robot>;
  };
}

export interface Robot {
  serial: string;
  name: string;
  isNightLightLEDOn: boolean;
  robotStatus: string;
  catDetect: string;
}
