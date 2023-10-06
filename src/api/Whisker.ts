import {
  PlatformConfig,
  Logger,
  PlatformAccessory,
  API,
} from 'homebridge';

import axios, { AxiosPromise } from 'axios';
import { parseJwt } from '../utils';
import { whiskerResponse } from './Whisker.types';

export default class Whisker {
  public accountId?: string;
  private token?: string;
  private refreshToken?: string;

  private readonly GCS_LOGIN_URL =
    'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=AIzaSyCv84jel7JkCQlsgqr_slXf3f3x-cMG15Q';

  private readonly AWS_LOGIN_URL = 'https://42nk7qrhdg.execute-api.us-east-1.amazonaws.com/prod/login';
  private readonly TOKEN_REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyCv84jel7JkCQlsgqr_slXf3f3x-cMG15Q';
  private readonly API_URL = 'https://lr4.iothings.site/graphql';

  constructor(
      readonly config: PlatformConfig,
      public readonly log: Logger,
      public readonly accessories: PlatformAccessory[],
      public readonly api: API,
  ) {
    this.log.debug('Whisker Instance Created');
    // refresh token every 55 minutes
    setInterval(() => {
      this.refreshJWTToken();
    }, 3300000);
  }

  public async authenticate(): Promise<any> {
    this.log.debug('Authenticating');
    const data = JSON.stringify({
      'email': this.config.email,
      'password': this.config.password,
    });
    this.log.debug('Authenticate: Data -> ', data);

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: this.AWS_LOGIN_URL,
      headers: {
        'x-api-key': 'w2tPFbjlP13GUmb8dMjUL5B2YyPVD3pJ7Ey6fz8v',
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
      },
      data : data,
    };

    await axios.request(config)
      .then(async (response) => {
        this.log.debug('Authenticate: Get Token Response -> ', JSON.stringify(response.data));
        await this.verifyToken(response.data.token).then((token) => {
          this.token = `Bearer ${token}`;
        });
      })
      .catch((error) => {
        this.log.error(error);
      });
  }

  private async verifyToken(token: string): Promise<string> {
    const parsed: { claims: { mid: string } } = parseJwt(token);
    this.accountId = parsed.claims.mid;
    this.log.debug('UserId set -> ', this.accountId);
    this.log.debug('Verifying Token');
    const data = JSON.stringify({
      'returnSecureToken': 'True',
      'token': token});

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: this.GCS_LOGIN_URL,
      headers: {
        'x-ios-bundle-identifier': 'com.whisker.ios',
        'Content-Type': 'application/json',
      },
      data : data,
    };

    return axios.request(config)
      .then((response) => {
        this.token = response.data.idToken;
        this.refreshToken = response.data.refreshToken;
        return response.data.idToken;
      })
      .catch(() => {
        return 'error';
      });

  }

  private async refreshJWTToken(): Promise<void> {
    this.log.debug('Refreshing Token');
    const data = JSON.stringify({
      'grantType': 'refresh_token',
      'refreshToken': this.refreshToken});
    this.log.debug('Refresh Token Data -> ', data);
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: this.TOKEN_REFRESH_URL,
      headers: {
        'x-ios-bundle-identifier': 'com.whisker.ios',
        'Content-Type': 'application/json',
      },
      data : data,
    };

    axios.request(config)
      .then((response) => {
        this.log.debug(JSON.stringify(response.data));
        this.token = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
      })
      .catch((error) => {
        this.log.debug(error);
      });

  }

  public async sendCommand(command: string): AxiosPromise<whiskerResponse> {
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: this.API_URL,
      headers: {
        'authorization': this.token,
        'Content-Type': 'application/json',
      },
      data: command,
    };

    return axios.request<whiskerResponse>(config);
  }
}