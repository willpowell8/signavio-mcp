import axios from 'axios';
import qs from 'qs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Signavio API Client
 * Handles authentication and API requests
 */
export class SignavioClient {
  constructor() {
    this.baseUrl = process.env.SIGNAVIO_BASE_URL || 'https://api.eu.signavio.cloud.sap';
    this.email = process.env.SIGNAVIO_EMAIL;
    this.password = process.env.SIGNAVIO_PASSWORD;
    this.tenant = process.env.SIGNAVIO_TENANT;
    this.token = null;
    this.sessionId = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with Signavio API
   */
  async authenticate() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return { token: this.token, sessionId: this.sessionId };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/v1/token`,
        qs.stringify({
          tokenonly: true,
          name: this.email,
          password: this.password,
          tenant: this.tenant,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.status === 200) {
        let jwtToken = typeof response.data === 'string' ? response.data : response.data?.token || response.data;
        
        const setCookieHeader = response.headers['set-cookie'];
        let sessionId = null;
        
        if (setCookieHeader) {
          const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
          for (const cookie of cookies) {
            const match = cookie.match(/JSESSIONID=([^;]+)/);
            if (match) {
              sessionId = match[1];
              break;
            }
          }
        }
        
        if (jwtToken && jwtToken.trim().length > 0) {
          this.token = jwtToken;
          this.sessionId = sessionId;
          // Token is valid for 8 hours
          this.tokenExpiry = Date.now() + (8 * 60 * 60 * 1000);
          return { token: jwtToken, sessionId: sessionId };
        }
      }
      throw new Error('Authentication failed');
    } catch (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }
  }

  /**
   * Make an authenticated API request
   */
  async request(endpoint, method = 'GET', data = null, params = null, responseType = null, acceptHeader = null) {
    await this.authenticate();
    
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    let endpointPath = endpoint.startsWith('/spm/v1/') ? endpoint : 
                       endpoint.startsWith('/') ? `/spm/v1${endpoint}` : `/spm/v1/${endpoint}`;
    
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpointPath}`;
    
    const headers = {
      'x-signavio-id': this.token,
      'Accept': acceptHeader || 'application/json',
    };
    
    if (this.sessionId) {
      headers['Cookie'] = `JSESSIONID=${this.sessionId}`;
    }
    
    const config = {
      method: method.toLowerCase(),
      url: url,
      headers: headers,
    };

    if (responseType) {
      config.responseType = responseType;
    }

    if (params) {
      config.params = params;
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      if (method === 'POST' && endpoint.includes('import') || endpoint.includes('bpmn')) {
        // For form data requests
        config.headers['Content-Type'] = 'multipart/form-data';
        config.data = data;
      } else {
        // For JSON or form-urlencoded
        if (typeof data === 'object' && !(data instanceof FormData)) {
          config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          // Use arrayFormat: 'repeat' to handle multiple parameters with same name
          config.data = qs.stringify(data, { arrayFormat: 'repeat' });
        } else {
          config.data = data;
        }
      }
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

