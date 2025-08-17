import axios from "axios";
import CryptoJS from 'crypto-js';
import Cookies from 'js-cookie';


const API_BASE_URL = import.meta.env.VITE_API_URL;
const ENCRYPTION_KEY = import.meta.env.VITE_API_KEY;

const sanitizeInput = (input) => {
  const pattern = /['";-]/g;
  return input.replace(pattern, '');
};

export const checkSession = async() => {
    try{
        const response = await axios.get(`${API_BASE_URL}sessioncheck`, { withCredentials: true });
        return response.status
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}

export const logout = async() =>{
    try{
        const response = await axios.get(`${API_BASE_URL}logout`, { withCredentials: true });
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}

export const login = async(username, password) => {
    try{
        const sanitizedUsername = sanitizeInput(username);
        const sanitizedPassword = sanitizeInput(password);

        const response = await axios.post(`${API_BASE_URL}login`,{
            username: sanitizedUsername,
            password: sanitizedPassword
        }, {withCredentials: true})
        const datalog = response.data.authData.info
        const name = datalog.nama;
        const role = datalog.role;

        const uname = CryptoJS.AES.encrypt(username, ENCRYPTION_KEY).toString();
        const rname = CryptoJS.AES.encrypt(name, ENCRYPTION_KEY).toString();
        const divAcc = CryptoJS.AES.encrypt(role, ENCRYPTION_KEY).toString();

        Cookies.set('uname', uname);
        Cookies.set('divAcc', divAcc);
        Cookies.set('rname', rname);
        return response;
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}

export const getStorageData = () => {
    const Encrypteduname = Cookies.get('uname');
    const EncrypteddivAcc = Cookies.get('divAcc');
    const Encryptedrname = Cookies.get('rname');

    if(!Encrypteduname || !EncrypteddivAcc || !Encryptedrname){
        return {
            decryptuname: null,
            decryptdivAcc: null,
            decryptrname: null
        }
    }

    try{
        const uname = CryptoJS.AES.decrypt(Encrypteduname, ENCRYPTION_KEY);
        const decryptuname = uname.toString(CryptoJS.enc.Utf8) || null;

        const divAcc = CryptoJS.AES.decrypt(EncrypteddivAcc, ENCRYPTION_KEY);
        const decryptdivAcc = divAcc.toString(CryptoJS.enc.Utf8) || null;

        const readAcc = CryptoJS.AES.decrypt(Encryptedrname, ENCRYPTION_KEY);
        const decryptrname = readAcc.toString(CryptoJS.enc.Utf8) || null;

        return {
            decryptuname,
            decryptdivAcc,
            decryptrname
        }
    }catch (error) {
        return { 
            decryptuname: null,
            decryptdivAcc: null,
            decryptrname: null
         };
    }
}

export const getGoodsList = async() => {
    try{
        const response = await axios.get(`${API_BASE_URL}cashier/goodslist`, { withCredentials: true });
        return response
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}