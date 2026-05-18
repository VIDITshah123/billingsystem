import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || '/api';
const API = axios.create({ baseURL: API_URL });
export default API;
