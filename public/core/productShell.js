(function (global) {
  'use strict';
  var cfg = global.VOY_PRODUCT_CONFIG || {};
  var sessionState = null;
  var lastFocused = null;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'className') node.className = attrs[key];
      else if (key === 'text') node.textContent = attrs[key];
      else if (key === 'hidden') node.hidden = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function installSkipLink() {
    if (document.querySelector('[data-voy-skip-link]')) return;
    var destination = document.getElementById('destInput');
    if (!destination) return;
    var skip = el('a', { href: '#destInput', className: 'voy-skip-link', text: 'Saltar a buscar destino', 'data-voy-skip-link': 'v1' });
    document.body.insertBefore(skip, document.body.firstChild);
  }

  function legalLinks() {
    if (document.querySelector('[data-voy-legal-links]')) return;
    var container = el('nav', { className: 'voy-legal-links', 'aria-label': 'Información legal, fuentes y contacto', 'data-voy-legal-links': 'v1' });
    [['Privacidad', '/privacy'], ['Términos', '/terms'], ['Fuentes', '/sources'], ['Contacto', '/contact']].forEach(function (item) {
      container.appendChild(el('a', { href: item[1], text: item[0] }));
    });
    var freshness = el('a', { className: 'voy-data-freshness', href: '/sources', text: 'Datos verificados: 04/08/2026' });
    var footer = document.querySelector('.footer') || document.body;
    footer.appendChild(container);
    footer.appendChild(freshness);
  }

  function createAccountUi() {
    var open = el('button', { type: 'button', className: 'voy-account-open', text: 'Sesión opcional', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'voyAccountPanel' });
    var close = el('button', { type: 'button', className: 'voy-account-close', text: '×', 'aria-label': 'Cerrar sesión opcional' });
    var title = el('h2', { id: 'voyAccountTitle', text: 'Sesión temporal' });
    var status = el('p', { className: 'voy-account-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', text: 'Consultando disponibilidad…' });
    var explanation = el('p', { text: 'Iniciá una sesión temporal. VOY no guarda historial de viajes ni crea un perfil permanente.' });
    var googleHost = el('div', { id: 'voyGoogleButton', className: 'voy-google-host', 'aria-label': 'Continuar con Google' });
    var logout = el('button', { type: 'button', className: 'voy-account-logout', text: 'Cerrar sesión', hidden: true });
    var legal = el('p', { className: 'voy-account-legal' });
    legal.append('Al continuar aceptás los ');
    legal.appendChild(el('a', { href: '/terms', text: 'términos' }));
    legal.append(' y la ');
    legal.appendChild(el('a', { href: '/privacy', text: 'política de privacidad' }));
    legal.append('.');
    var panel = el('section', { id: 'voyAccountPanel', className: 'voy-account-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'voyAccountTitle', tabindex: '-1', hidden: true }, [close, title, explanation, status, googleHost, logout, legal]);
    var backdrop = el('div', { className: 'voy-account-backdrop', hidden: true }, [panel]);
    document.body.append(open, backdrop);
    return { open: open, close: close, backdrop: backdrop, panel: panel, status: status, googleHost: googleHost, logout: logout };
  }

  function focusable(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function (node) { return !node.hidden && node.getClientRects().length > 0; });
  }

  function show(ui) {
    lastFocused = document.activeElement;
    ui.backdrop.hidden = false;
    ui.panel.hidden = false;
    ui.open.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('voy-dialog-open');
    ui.panel.focus();
  }

  function hide(ui) {
    ui.backdrop.hidden = true;
    ui.panel.hidden = true;
    ui.open.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('voy-dialog-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    else ui.open.focus();
  }

  function trapFocus(ui, event) {
    if (event.key !== 'Tab' || ui.backdrop.hidden) return;
    var nodes = focusable(ui.panel);
    if (!nodes.length) { event.preventDefault(); ui.panel.focus(); return; }
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function loadGoogle(ui, nonce) {
    if (!cfg.auth_enabled || !cfg.google_client_id) return;
    function render() {
      if (!global.google || !global.google.accounts || !global.google.accounts.id) {
        ui.status.textContent = 'Google no está disponible. VOY sigue funcionando sin iniciar sesión.';
        return;
      }
      global.google.accounts.id.initialize({
        client_id: cfg.google_client_id,
        ux_mode: 'redirect',
        login_uri: global.location.origin + '/api/auth/google',
        nonce: nonce || undefined,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      global.google.accounts.id.renderButton(ui.googleHost, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 280 });
    }
    if (global.google && global.google.accounts) return render();
    var existing = document.querySelector('script[data-voy-google-gsi]');
    if (existing) { existing.addEventListener('load', render, { once: true }); return; }
    var script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-voy-google-gsi', 'v1');
    script.onload = render;
    script.onerror = function () { ui.status.textContent = 'No se pudo cargar Google. VOY sigue disponible sin sesión.'; };
    document.head.appendChild(script);
  }

  async function refresh(ui) {
    try {
      var response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
      if (!response.ok) throw new Error('session_unavailable');
      var body = await response.json();
      sessionState = body;
      if (body.authenticated) {
        ui.status.textContent = 'Sesión temporal activa hasta ' + new Date(body.expires_at * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + '.';
        ui.logout.hidden = false;
        ui.googleHost.replaceChildren();
        ui.open.textContent = 'Sesión activa';
      } else {
        ui.status.textContent = 'Podés continuar con Google o usar VOY sin iniciar sesión.';
        ui.logout.hidden = true;
        ui.googleHost.replaceChildren();
        loadGoogle(ui, body.nonce);
      }
    } catch (_) {
      ui.status.textContent = 'No se pudo consultar la sesión. VOY sigue funcionando sin iniciar sesión.';
    }
  }

  async function logout(ui) {
    if (!sessionState || !sessionState.csrf_token) return;
    ui.logout.disabled = true;
    try {
      var response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-VOY-CSRF': sessionState.csrf_token }, cache: 'no-store', redirect: 'error' });
      if (!response.ok) throw new Error('logout_failed');
      ui.open.textContent = 'Sesión opcional';
      await refresh(ui);
    } catch (_) {
      ui.status.textContent = 'No se pudo cerrar la sesión. Reintentá.';
    } finally {
      ui.logout.disabled = false;
    }
  }

  function init() {
    if (document.querySelector('[data-voy-product-shell-ui]')) return;
    installSkipLink();
    legalLinks();
    if (!cfg.auth_enabled) return;
    var ui = createAccountUi();
    ui.open.setAttribute('data-voy-product-shell-ui', 'v1');
    ui.open.addEventListener('click', function () { show(ui); refresh(ui); });
    ui.close.addEventListener('click', function () { hide(ui); });
    ui.backdrop.addEventListener('click', function (event) { if (event.target === ui.backdrop) hide(ui); });
    ui.logout.addEventListener('click', function () { logout(ui); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !ui.backdrop.hidden) hide(ui);
      trapFocus(ui, event);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
