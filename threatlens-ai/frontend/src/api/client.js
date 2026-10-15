const API_BASE_URL = 'http://localhost:8000/api/v1';
const WS_BASE_URL = 'ws://localhost:8000/api/v1/telemetry/ws/live-stream';

// Helper to get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('threatlens_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Authentication
  auth: {
    login: async (username_or_email, password) => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_email, password }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Authentication failed' }));
        throw new Error(error.detail || 'Login failed');
      }
      return res.json();
    },

    register: async (payload) => {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(error.detail || 'Registration failed');
      }
      return res.json();
    },

    getProfile: async () => {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Session expired');
      return res.json();
    },
  },

  // Telemetry & Metrics
  telemetry: {
    getSummary: async () => {
      const res = await fetch(`${API_BASE_URL}/telemetry/summary`);
      if (!res.ok) throw new Error('Failed to fetch SOC telemetry summary');
      return res.json();
    },

    getTimeseries: async () => {
      const res = await fetch(`${API_BASE_URL}/telemetry/timeseries`);
      if (!res.ok) throw new Error('Failed to fetch time-series data');
      return res.json();
    },
  },

  // Anomaly Detector & Alerts
  detector: {
    getModelInfo: async () => {
      const res = await fetch(`${API_BASE_URL}/detector/model-info`);
      if (!res.ok) throw new Error('Failed to load ML model diagnostics');
      return res.json();
    },

    scorePacket: async (packetData) => {
      const res = await fetch(`${API_BASE_URL}/detector/score-packet`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(packetData),
      });
      if (!res.ok) throw new Error('Failed to score telemetry packet');
      return res.json();
    },

    batchScore: async (packets) => {
      const res = await fetch(`${API_BASE_URL}/detector/batch-score`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ packets }),
      });
      if (!res.ok) throw new Error('Failed to run batch anomaly scoring');
      return res.json();
    },

    uploadFile: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('threatlens_token');
      const res = await fetch(`${API_BASE_URL}/detector/upload-pcap-csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'File upload failed' }));
        throw new Error(error.detail || 'Upload failed');
      }
      return res.json();
    },

    getAlerts: async ({ status = '', severity = '', limit = 50, offset = 0 } = {}) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (severity) params.append('severity', severity);
      params.append('limit', limit);
      params.append('offset', offset);

      const res = await fetch(`${API_BASE_URL}/detector/alerts?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },

    mitigateAlert: async (alertId, action, notes = '') => {
      const res = await fetch(`${API_BASE_URL}/detector/alerts/${alertId}/mitigate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) throw new Error('Failed to mitigate alert');
      return res.json();
    },

    getBlockedIps: async () => {
      const res = await fetch(`${API_BASE_URL}/detector/blocked-ips`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch blocked IP list');
      return res.json();
    },

    blockIp: async (ipAddress, reason) => {
      const res = await fetch(`${API_BASE_URL}/detector/block-ip`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ip_address: ipAddress, reason }),
      });
      if (!res.ok) throw new Error('Failed to block IP');
      return res.json();
    },
  },

  // Live WebSocket helper
  createLiveStreamSocket: (onPacket, onError) => {
    try {
      const ws = new WebSocket(WS_BASE_URL);
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'PACKET_TELEMETRY' && onPacket) {
            onPacket(parsed.data);
          }
        } catch (e) {
          console.error('WS Parse Error:', e);
        }
      };
      ws.onerror = (err) => {
        if (onError) onError(err);
      };
      return ws;
    } catch (e) {
      console.warn('Could not establish WebSocket connection:', e);
      return null;
    }
  },
};
