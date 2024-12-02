let sharedData: LoginData = {} as LoginData;

const getLoginData = () => sharedData;

const setLoginData = (data: LoginData) => {
  sharedData = data;
};

export { getLoginData, setLoginData };

export interface LoginData {
    username: string;
    token: string;
    xCsrfToken: string;
}