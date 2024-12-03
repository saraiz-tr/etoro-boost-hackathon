let loginData: LoginData = {} as LoginData;

const getLoginData = () => loginData;

const setLoginData = (data: LoginData) => {
  localStorage.setItem('loginData', JSON.stringify(data));
  loginData = data;
};

export { getLoginData, setLoginData };

export const isAuthenticated = () => {
  const localStorageData = localStorage.getItem('loginData');
  if (localStorageData && !getLoginData().token) {
    setLoginData(JSON.parse(localStorageData));
  }
  return !!getLoginData().token;
};

export interface LoginData {
    username: string;
    token: string;
    xCsrfToken: string;
}