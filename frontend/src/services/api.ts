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
  getSegnalazioneDetail: (token: string, id: string) => apiCall(`/segnalazioni/${id}`, { token }),

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
  associaUtente: (token: string, data: any) => apiCall('/admin/associa-utente', { method: 'POST', token, body: data }),
  disassociaUtente: (token: string, assocId: string) => apiCall(`/admin/associazione/${assocId}`, { method: 'DELETE', token }),

  // Notifiche
  getNotifiche: (token: string) => apiCall('/notifiche', { token }),
  getNotificheCount: (token: string) => apiCall('/notifiche/count', { token }),
  markNotificaLetta: (token: string, id: string) => apiCall(`/notifiche/${id}/letto`, { method: 'PUT', token }),
  markAllLette: (token: string) => apiCall('/notifiche/letto-tutte', { method: 'PUT', token }),

  // Trasmissioni
  createTrasmissione: (token: string, data: any) => apiCall('/trasmissioni', { method: 'POST', token, body: data }),
  getTrasmissioni: (token: string) => apiCall('/trasmissioni', { token }),
  getAdminTrasmissioni: (token: string) => apiCall('/admin/trasmissioni', { token }),
  updateAdminTrasmissione: (token: string, id: string, stato: string) => apiCall(`/admin/trasmissioni/${id}?stato=${encodeURIComponent(stato)}`, { method: 'PUT', token }),

  // Estratto Conto
  getEstrattoConto: (token: string) => apiCall('/estratto-conto', { token }),
  upsertEstrattoConto: (token: string, data: any) => apiCall('/admin/estratto-conto', { method: 'POST', token, body: data }),
  getAdminEstrattiConto: (token: string) => apiCall('/admin/estratti-conto', { token }),

  // Config
  getConfig: (token: string) => apiCall('/admin/config', { token }),
  updateConfig: (token: string, data: any) => apiCall('/admin/config', { method: 'PUT', token, body: data }),
  getPublicConfig: () => apiCall('/config/public'),

  // Export
  getExportUrl: (type: string) => `${BACKEND_URL}/api/admin/export/${type}`,

  // File Upload
  uploadFile: async (token: string, uri: string, filename: string, mimeType: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as any);

    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Errore upload' }));
      throw new Error(err.detail || 'Errore upload file');
    }
    return res.json();
  },

  // File URL helper
  getFileUrl: (fileId: string, filename: string) => `${BACKEND_URL}/api/files/${fileId}/${encodeURIComponent(filename)}`,
};
