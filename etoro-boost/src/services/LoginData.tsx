let loginData: LoginData;
let isXLoggedin: boolean;

const getLoginData = () => loginData;
const getIsXLoggedin = () => isXLoggedin;

const setXData = (isLoggedIn: boolean) => {
  //localStorage.setItem('isXLoggedin', JSON.stringify(isLoggedIn));
  isXLoggedin = isLoggedIn;
}

const setLoginData = (data: LoginData) => {
  localStorage.setItem('loginData', btoa(JSON.stringify(data)));
  loginData = data;
};

const domain = process.env.REACT_APP_SERVER_DOMAIN;

export const isAuthenticated = async () => {
  let iseToroLoggedIn = false;
  // Check first if loginData was initialized in memory
  if (!loginData) {
    iseToroLoggedIn = asserteToroLoggedin();
  }

  if (isXLoggedin === undefined) {
    await assertIsXLoggedin();
  }
  
  return !!getLoginData()?.token && getIsXLoggedin();
};

export const assertIsXLoggedin = () => {
  let isLoggedIn = false;
  return fetch(`${domain}auth/user`).then(response => response.json()).then((response) => { 
    isLoggedIn = !response.error;
    setXData(isLoggedIn);
    return isLoggedIn;
  }).catch((error) => {
    return false;
  });
};

export const asserteToroLoggedin = () => {
  // TODO don't forget to check the local storage before parsing it.
  const localStorageData = atob(localStorage.getItem('loginData') || '');
  let parsedLoginData;

  if (localStorageData && !getLoginData()?.token) {
    try {
      parsedLoginData = JSON.parse(localStorageData);
    } catch (error) {
    }

    parsedLoginData && setLoginData(parsedLoginData);
  }

  return !!parsedLoginData?.token;
};

export interface LoginData {
    username: string;
    token: string;
    xCsrfToken: string;
}

export { getLoginData, setLoginData, getIsXLoggedin };
