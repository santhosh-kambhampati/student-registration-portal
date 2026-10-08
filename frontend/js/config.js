/**
 * EduPortal - Frontend Environment Configuration
 *
 * - When served from the Express backend (default production and development setup),
 *   BASE_URL is empty (''), so all requests resolve relatively to the current origin.
 * - When deployed separately (e.g. Vercel, Netlify, GitHub Pages, AWS S3),
 *   set window.__API_BASE_URL__ to your backend origin (e.g. "https://api.yourdomain.com").
 */
(function (window) {
  'use strict';

  const defaultBaseUrl = ''; // Default relative path for same-origin backend hosting

  window.API_CONFIG = {
    BASE_URL: window.__API_BASE_URL__ || defaultBaseUrl,
    
    /**
     * Resolves an API path against the configured BASE_URL
     * @param {string} endpoint - e.g. "/api/auth/login"
     * @returns {string} - Full or relative API URL
     */
    getUrl: function (endpoint) {
      const base = (this.BASE_URL || '').replace(/\/+$/, '');
      const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
      return base ? `${base}${path}` : path;
    }
  };

  // Shorthand helper for all frontend scripts
  window.apiUrl = function (endpoint) {
    return window.API_CONFIG.getUrl(endpoint);
  };
})(window);
