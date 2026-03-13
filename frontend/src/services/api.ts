const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const apiCall = async (path: string, opts: { method?: string; token?: string; body?: any } = {}) => {
  const url = `${BACKEND_URL}/api${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Errore di rete' }));
    throw new Error(err.detail || 'Errore del server');
  }
  return res.json();
};

export const api = {
  seed: () => apiCall('/seed', { method: 'POST' }),
  login: (email: string, password: string) => apiCall('/auth/login', { method: 'POST', body: { email, password } }),
  register: (data: any) => apiCall('/auth/register', { method: 'POST', body: data }),
  getProfile: (token: string) => apiCall('/auth/profile', { token }),
  updateProfile: (token: string, data: any) => apiCall('/auth/profile', { method: 'PUT', token, body: data }),

  getCondomini: (token: string) => apiCall('/condomini', { token }),
  createCondominio: (token: string, data: any) => apiCall('/condomini', { method: 'POST', token, body: data }),
  deleteCondominio: (token: string, id: string) => apiCall(`/condomini/${id}`, { method: 'DELETE', token }),

  createSegnalazione: (token: string, data: any) => apiCall('/segnalazioni', { method: 'POST', token, body: data }),
  getSegnalazioni: (token: string) => apiCall('/segnalazioni', { token }),

  createRichiesta: (token: string, data: any) => apiCall('/richieste-documenti', { method: 'POST', token, body: data }),
  getRichieste: (token: string) => apiCall('/richieste-documenti', { token }),

  createAppuntamento: (token: string, data: any) => apiCall('/appuntamenti', { method: 'POST', token, body: data }),
  getAppuntamenti: (token: string) => apiCall('/appuntamenti', { token }),

  getAvvisi: (token: string) => apiCall('/avvisi', { token }),
  markLetto: (token: string, id: string) => apiCall(`/avvisi/${id}/letto`, { method: 'PUT', token }),

  getAdminDashboard: (token: string) => apiCall('/admin/dashboard', { token }),
  getAdminSegnalazioni: (token: string) => apiCall('/admin/segnalazioni', { token }),
  updateAdminSeg: (token: string, id: string, data: any) => apiCall(`/admin/segnalazioni/${id}`, { method: 'PUT', token, body: data }),
  getAdminAppuntamenti: (token: string) => apiCall('/admin/appuntamenti', { token }),
  updateAdminApp: (token: string, id: string, data: any) => apiCall(`/admin/appuntamenti/${id}`, { method: 'PUT', token, body: data }),
  getAdminAvvisi: (token: string) => apiCall('/admin/avvisi', { token }),
  createAdminAvviso: (token: string, data: any) => apiCall('/admin/avvisi', { method: 'POST', token, body: data }),
  deleteAdminAvviso: (token: string, id: string) => apiCall(`/admin/avvisi/${id}`, { method: 'DELETE', token }),
  getAdminUtenti: (token: string) => apiCall('/admin/utenti', { token }),
  getAdminRichieste: (token: string) => apiCall('/admin/richieste-documenti', { token }),
  updateAdminRichiesta: (token: string, id: string, data: any) => apiCall(`/admin/richieste-documenti/${id}`, { method: 'PUT', token, body: data }),
  createCodiceInvito: (token: string, data: any) => apiCall('/admin/codici-invito', { method: 'POST', token, body: data }),
  getCodiciInvito: (token: string) => apiCall('/admin/codici-invito', { token }),
};
