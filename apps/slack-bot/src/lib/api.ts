import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Cliente simple para comunicarse con la API principal
// Nota: En producción, usaríamos una API key o JWT para autenticar
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Extender en el futuro para operaciones que necesiten la API
export interface APIResponse<T> {
  data: T;
  error?: string;
}
