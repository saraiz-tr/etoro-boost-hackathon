let loginData: LoginData = {} as LoginData;
let isXLoggedin: boolean = false;

const getLoginData = () => loginData;
const getIsXLoggedin = () => isXLoggedin;

const setXData = (isLoggedIn: boolean) => {
  localStorage.setItem('isXLoggedin', JSON.stringify(isLoggedIn));
  isXLoggedin = isLoggedIn;
}

const setLoginData = (data: LoginData) => {
  localStorage.setItem('loginData', JSON.stringify(data));
  loginData = data;
};

const domain = process.env.REACT_APP_SERVER_DOMAIN;

export { getLoginData, setLoginData, setXData, getIsXLoggedin };

export const isAuthenticated = () => {
  const localStorageData = localStorage.getItem('loginData');
  const xlocalStorageData = localStorage.getItem('isXLoggedin');
  if (localStorageData && !getLoginData().token && xlocalStorageData) {
    setLoginData(JSON.parse(localStorageData));
    setXData(JSON.parse(xlocalStorageData));
  }
  return !!getLoginData().token && getIsXLoggedin();
};

export const assertIsXLoggedin = () => {
  return fetch(`${domain}auth/user`).then(response => response.json()).then((response) => { 
    if (response.error) {
      setXData(false);
      return;
    }
    setXData(true);
  }).catch((error) => {
    setXData(false);
  });
};

export const asserteToroLoggedin = () => {
  const localStorageData = localStorage.getItem('loginData');
  if (localStorageData && !getLoginData().token) {
    setLoginData(JSON.parse(localStorageData));
  }
};

export interface LoginData {
    username: string;
    token: string;
    xCsrfToken: string;
}
