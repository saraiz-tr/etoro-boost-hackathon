import { eToroLoginResponse, eToroLoginStatus, LoginData } from "./Login.model";

let loginData: LoginData;
let isXLoggedin: boolean | undefined;
let isEToroSdkInitialized = false;

const getLoginData = () => loginData;
const getIsXLoggedin = () => isXLoggedin;

const setXData = (isLoggedIn: boolean | undefined) => {
  isXLoggedin = isLoggedIn;
}

const setLoginData = (data: LoginData) => {
  localStorage.setItem('loginData', btoa(JSON.stringify(data)));
  loginData = data;
};

const setUsername = (username: string) => {
  if (!loginData) { loginData = {} as LoginData; }

  loginData.username = username;
}

const domain = process.env.REACT_APP_SERVER_DOMAIN;

export const isAuthenticated = async () => {
  let iseToroLoggedIn = false;
  // Check first if loginData was initialized in memory
  if (!loginData?.token) {
    iseToroLoggedIn = asserteToroLoggedin();
  }

  if (isXLoggedin === undefined) {
    await assertIsXLoggedin();
  }
  
  return !!getLoginData()?.token && getIsXLoggedin();
};

export const assertIsXLoggedin = () => {
  let isLoggedIn = false;
  return fetch(`${domain}auth/user`, {
    credentials: 'include'
  }).then(response => response.json()).then((response) => { 
    isLoggedIn = !response.error;
    setXData(isLoggedIn);
    return isLoggedIn;
  }).catch((error) => {
    return false;
  });
};

export const asserteToroLoggedin = () => {
  const localStorageData = atob(localStorage.getItem('loginData') || '');
  let parsedLoginData;

  if (localStorageData && !getLoginData()?.token) {
    try {
      parsedLoginData = JSON.parse(localStorageData);
    } catch (error) {
    }

    if (parsedLoginData) {
      // Check if the token is expired
      if (parsedLoginData.expirationUnixTimeMs < Date.now()) {
        logout(false);
        return false;
      }
      setLoginData(parsedLoginData);
    }
  }

  return !!parsedLoginData?.token;
};

export const logout = async (isLogoutX: boolean = true) => {
  // eToro logout
  setLoginData({ username: '', token: '', xCsrfToken: '', expirationUnixTimeMs: 0 });
  localStorage.removeItem('loginData');
  eToroLogout();

  // X logout
  if (isLogoutX) {
    setXData(undefined);
    await fetch(`${domain}api/logout`, {
      credentials: 'include'
    }).then(response => response.json())
    .catch((error) => {
      return;
    });
  }
}

export const initEToroLoginSdk = () => {
  (window as any)["eToro"]?.init(
    {
      host: process.env.REACT_APP_ETORO_LOGIN_SDK_HOST,
      culture: 'en-gb',
      appId: process.env.REACT_APP_ETORO_BOOST_ID,
      version: '1.0',
      onUsernameUpdate: (data: any) => {
        setUsername(data.username);
      }
    });
    isEToroSdkInitialized = true;
}

export const eToroLogin = async (): Promise<boolean> => {
  if (!isEToroSdkInitialized) {
    initEToroLoginSdk();
  }
  
  return new Promise((resolve, reject) => {
    (window as any).eToro?.login(["etoro_default"], (response: eToroLoginResponse)=>{
      if (response.status === eToroLoginStatus.Connected) {
        eToroLoginSdkSuccess(response);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

const eToroLogout = () => {
  try {
    if (!isEToroSdkInitialized) {
      initEToroLoginSdk();
    }
    (window as any).eToro?.logout(() => { });
  } catch (error) {
    console.error("eToro logout error:", error);
  }
}

export const eToroLoginSdkSuccess = (data: eToroLoginResponse) => {
  setLoginData({
    token: data.authResponse.accessToken,
    xCsrfToken: data.authResponse.antiCsrfToken,
    expirationUnixTimeMs: data.authResponse.expirationUnixTimeMs,
    username: loginData?.username // Was set in onUsernameUpdate callback from login  SDK
  });
}

export { getLoginData, setLoginData, getIsXLoggedin };
