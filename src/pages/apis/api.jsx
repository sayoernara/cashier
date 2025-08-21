import axios from "axios";
import CryptoJS from 'crypto-js';
import Cookies from 'js-cookie';
import Swal from "sweetalert2";


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
        Cookies.remove('uname');
        Cookies.remove('divAcc');
        Cookies.remove('rname');
        Cookies.remove('idloc');
        Cookies.remove('loc');
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}

export const login = async(username, password) => {
    try{
        const sanitizedUsername = sanitizeInput(username);
        const sanitizedPassword = sanitizeInput(password);
        const roleid = 3;

        const response = await axios.post(`${API_BASE_URL}login`,{
            username: sanitizedUsername,
            password: sanitizedPassword,
            roleid: roleid
        }, {withCredentials: true})
        const datalog = response.data.authData.info
        const name = datalog.nama;
        const role = datalog.role;
        const id_loc = datalog.id_loc;
        const location = datalog.location;

        const uname = CryptoJS.AES.encrypt(username, ENCRYPTION_KEY).toString();
        const rname = CryptoJS.AES.encrypt(name, ENCRYPTION_KEY).toString();
        const divAcc = CryptoJS.AES.encrypt(role, ENCRYPTION_KEY).toString();
        const idloc = CryptoJS.AES.encrypt(id_loc, ENCRYPTION_KEY).toString();
        const loc = CryptoJS.AES.encrypt(location, ENCRYPTION_KEY).toString();

        Cookies.set('uname', uname);
        Cookies.set('divAcc', divAcc);
        Cookies.set('rname', rname);
        Cookies.set('idloc', idloc);
        Cookies.set('loc', loc);

        return response;
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}

export const getStorageData = () => {
    const Encrypteduname = Cookies.get('uname');
    const EncrypteddivAcc = Cookies.get('divAcc');
    const Encryptedrname = Cookies.get('rname');
    const Encryptedidloc = Cookies.get('idloc');
    const Encryptedloc = Cookies.get('loc');

    if(!Encrypteduname || !EncrypteddivAcc || !Encryptedrname || !Encryptedidloc || !Encryptedloc){
        return {
            decryptuname: null,
            decryptdivAcc: null,
            decryptrname: null,
            decryptidloc: null,
            decryptloc: null
        }
    }

    try{
        const uname = CryptoJS.AES.decrypt(Encrypteduname, ENCRYPTION_KEY);
        const decryptuname = uname.toString(CryptoJS.enc.Utf8) || null;

        const divAcc = CryptoJS.AES.decrypt(EncrypteddivAcc, ENCRYPTION_KEY);
        const decryptdivAcc = divAcc.toString(CryptoJS.enc.Utf8) || null;

        const readAcc = CryptoJS.AES.decrypt(Encryptedrname, ENCRYPTION_KEY);
        const decryptrname = readAcc.toString(CryptoJS.enc.Utf8) || null;

        const readIdLoc = CryptoJS.AES.decrypt(Encryptedidloc, ENCRYPTION_KEY);
        const decryptidloc = readIdLoc.toString(CryptoJS.enc.Utf8) || null;

        const readLoc = CryptoJS.AES.decrypt(Encryptedloc, ENCRYPTION_KEY);
        const decryptloc = readLoc.toString(CryptoJS.enc.Utf8) || null;

        return {
            decryptuname,
            decryptdivAcc,
            decryptrname,
            decryptidloc,
            decryptloc
        }
    }catch (error) {
        return { 
            decryptuname: null,
            decryptdivAcc: null,
            decryptrname: null,
            decryptidloc: null,
            decryptloc: null
         };
    }
}


let sessionInterval = null;
export const startSessionChecker = (onExpire) => {
  if (sessionInterval) {
    clearInterval(sessionInterval);   }

  sessionInterval = setInterval(async () => {
    const status = await checkSession();

    if (status !== 200) {
      console.warn("Session expired or invalid");

      if (typeof onExpire === "function") {
        onExpire();
      }

      clearInterval(sessionInterval);
      sessionInterval = null;
    }
  }, 10000);
};

export const getGoodsList = async() => {
    try{
        const response = await axios.get(`${API_BASE_URL}cashier/goodslist`, { withCredentials: true });
        return response
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}

export const getGoodsPricePerGram = async(id_item) => {
    try{
        const response = await axios.get(`${API_BASE_URL}cashier/goodspricepergram?id_item=${id_item}`, { withCredentials: true });
        return response
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}

export const countPrice = async(barang) => {
    try{
        const response = await axios.post(`${API_BASE_URL}cashier/countprice`, { cart: barang }, { withCredentials: true });
        return response
    } catch (error) {
        return error.response || { status: 500, data: { message: error.message || 'Terjadi kesalahan' } };
    }
}