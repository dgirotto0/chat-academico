import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para lidar com erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Redirecionar para login se o token expirar (401)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API de chat
export const chatApi = {
  getChats: () => api.get('/chat'),
  createChat: (title) => api.post('/chat', { title }),
  getChatMessages: (chatId) => api.get(`/chat/${chatId}/messages`),
  sendMessage: (chatId, content, file) => {
    if (file) {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('file', file);
      
      // Add flag to indicate this is a preprocessed file
      if (file.preprocessed) {
        formData.append('preprocessed', 'true');
        formData.append('fileId', file.preprocessed.fileId || '');
      }
      
      return api.post(`/chat/${chatId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post(`/chat/${chatId}/messages`, { content });
  },
  updateChat: (chatId, title) => api.put(`/chat/${chatId}`, { title }),
  deleteChat: (chatId) => api.delete(`/chat/${chatId}`),
  regenerateMessage: (chatId, messageId) => api.post(`/chat/${chatId}/regenerate/${messageId}`),
};

// API de upload de arquivos
export const uploadApi = {
  // Pré-processar arquivo antes de enviar mensagem
  preprocessFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/preprocess', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadFile: (messageId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload/${messageId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteFile: (fileId) => api.delete(`/upload/${fileId}`),
};

// API de administração
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
};

export default api;
