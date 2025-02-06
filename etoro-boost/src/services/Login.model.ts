export interface LoginData {
    username: string;
    token: string;
    xCsrfToken: string;
    expirationUnixTimeMs: number;
}

export interface eToroLoginResponse {
  authResponse: eToroAuthResponse;
  status: eToroLoginStatus;
}

export interface eToroAuthResponse {
  accessToken: string;
  antiCsrfToken: string;
  expirationUnixTimeMs: number;
  expiresInMs: number;
  oAuthUserId: string;
  statusCode: string;
}

export enum eToroLoginStatus {
  Connected = 'connected'
}