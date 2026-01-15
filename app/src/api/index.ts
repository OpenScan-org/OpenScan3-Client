import axios from 'axios';

const api = axios.create({ baseURL: 'http://openscan3-dev:8000/v0.5/' });

export { api };
