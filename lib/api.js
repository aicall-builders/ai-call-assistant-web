import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

async function getFirebaseIdToken(forceRefresh = false) {
  if (typeof window === 'undefined') return '';

  try {
    const { auth } = await import('./firebase');
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }

    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken(forceRefresh);
      localStorage.setItem('firebase_id_token', token);
      localStorage.setItem('firebase_uid', user.uid);
      return token;
    }
  } catch (err) {
    console.warn('Firebase token lookup failed:', err);
  }

  return localStorage.getItem('firebase_id_token') || '';
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const token = await getFirebaseIdToken(false);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!originalRequest.__authRetry) {
        originalRequest.__authRetry = true;
        const refreshedToken = await getFirebaseIdToken(true);
        if (refreshedToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          return api(originalRequest);
        }
      }

      localStorage.removeItem('firebase_id_token');
      localStorage.removeItem('firebase_uid');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/oauth')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  socialLogin: ({ provider, authorizationCode, providerAccessToken, redirectUri, state }) => {
    const payload = {
      provider,
      authorization_code: authorizationCode,
      provider_access_token: providerAccessToken,
      redirect_uri: redirectUri,
      state,
    };
    // 일부 API Gateway 설정에서 POST body가 Lambda로 전달되지 않는 경우가 있어
    // query params에도 동일 값을 실어 fallback 처리한다.
    return api.post(`/auth/${provider}`, payload, { params: payload });
  },
  verify: () => api.post('/auth/verify'),
  logout: () => api.post('/auth/logout'),
};

export const storeApi = {
  list: () => api.get('/stores'),
  create: (name, industry = 'food') => api.post('/stores', { name, industry }),
};

export const callApi = {
  requestUpload: ({ storeId, fileName, fileFormat = 'm4a', mimeType = 'audio/mp4', callerNumber = null, duration = null }) =>
    api.post('/calls/upload', {
      store_id: storeId,
      file_name: fileName,
      file_format: fileFormat,
      mime_type: mimeType,
      caller_number: callerNumber,
      duration,
    }),

  uploadToS3: (uploadUrl, file, uploadHeaders = null) =>
    axios.put(uploadUrl, file, {
      headers: uploadHeaders || { 'Content-Type': file.type || 'audio/mp4' },
    }),

  startProcessing: (callId) => api.post(`/calls/${callId}/process`),
  list: ({ storeId = null, status = null, limit = 20, offset = 0 } = {}) =>
    api.get('/calls', { params: { store_id: storeId, status, limit, offset } }),
  get: (callId) => api.get(`/calls/${callId}`),
  updateCategory: (callId, callerCategory) => api.patch(`/calls/${callId}`, { caller_category: callerCategory }),
  getAudio: (callId) => api.get(`/calls/${callId}/audio`),
  delete: (callId) => api.delete(`/calls/${callId}`),
  createCalendarEvent: (callId, provider = null) => api.post(`/calls/${callId}/calendar-events`, { provider }),
};

export const summaryApi = {
  get: (callId) => api.get(`/summaries/${callId}`),
};

export const customerApi = {
  list: () => api.get('/customers'),
  get: (phone) => api.get(`/customers/${encodeURIComponent(phone)}`),
  update: (phone, payload) => api.patch(`/customers/${encodeURIComponent(phone)}`, payload),

  createConsentLink: (phone, payload = {}) =>
    api.post(`/customers/${encodeURIComponent(phone)}/consent-link`, payload),

  history: (phone) =>
    api.get(`/customers/${encodeURIComponent(phone)}/history`),

  createMemo: (phone, payload) =>
    api.post(`/customers/${encodeURIComponent(phone)}/memos`, payload),

  requestMemoPhotoUpload: (phone, memoId, fileName) =>
    api.post(
      `/customers/${encodeURIComponent(phone)}/memos/${encodeURIComponent(memoId)}/photos/upload-url`,
      { file_name: fileName }
    ),

  saveMemoPhoto: (phone, memoId, payload) =>
    api.post(
      `/customers/${encodeURIComponent(phone)}/memos/${encodeURIComponent(memoId)}/photos`,
      payload
    ),
};

export const notesApi = {
  getNote: (callId) => api.get(`/calls/${callId}/note`),
  updateNote: (callId, memo) => api.patch(`/calls/${callId}/note`, { memo }),
  requestPhotoUpload: (callId, fileName) => api.post(`/calls/${callId}/photos/upload-url`, { file_name: fileName }),
  uploadPhotoToS3: (uploadUrl, file, uploadHeaders = null) =>
    axios.put(uploadUrl, file, { headers: uploadHeaders || { 'Content-Type': file.type || 'image/jpeg' } }),
  savePhoto: (callId, { photoId, s3Key }) => api.post(`/calls/${callId}/photos`, { photo_id: photoId, s3_key: s3Key }),
  deletePhoto: (callId, photoId) => api.delete(`/calls/${callId}/photos/${photoId}`),
};

export const calendarApi = {
  listConnections: () => api.get('/calendar/connections'),
  getEvents: ({ date = null, from = null, to = null, limit = 200 } = {}) =>
    api.get('/calendar/events', { params: { date, from, to, limit } }),
  getAuthorizeUrl: (provider, redirectUri, state) =>
    api.get(`/calendar/connections/${provider}/authorize`, { params: { redirect_uri: redirectUri, state } }),
  completeOAuth: ({ provider, authorizationCode, redirectUri, state }) => {
    const payload = {
      provider,
      authorization_code: authorizationCode,
      redirect_uri: redirectUri,
      state,
    };
    return api.post('/calendar/connections/oauth-code', payload, { params: payload });
  },
  setDefault: (provider) => api.patch('/calendar/connections/default', { provider }),
  disconnect: (provider) => api.delete(`/calendar/connections/${provider}`),
};

export default api;
