(function (global) {
  'use strict';

  if (!global.VOY_VOICE_TEST_MODE) return;

  var MAX_RECORDING_MS = 30000;
  var MAX_EVENTS = 80;
  var STATES = [
    'idle', 'requesting_permission', 'listening', 'recording', 'transcribing',
    'reviewing', 'thinking', 'tool_running', 'awaiting_confirmation',
    'speaking', 'cancelled', 'error', 'offline'
  ];
  var API_HEADERS = {
    'X-VOY-Voice-Test': global.VOY_VOICE_TEST_HEADER || 'synthetic-ci-v1'
  };

  function currentCityId() {
    var query = new URLSearchParams(global.location.search).get('city');
    var candidates = [
      query,
      global.VOY_CITY_ID,
      global.__VOY_CITY_ID__,
      global.VoyCityState && global.VoyCityState.city_id,
      document.documentElement.getAttribute('data-city-id')
    ];
    for (var index = 0; index < candidates.length; index += 1) {
      var value = String(candidates[index] || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (value === 'santafe') return 'santafe';
    }
    return '_default';
  }

  function html(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'className') node.className = attrs[key];
      else if (key === 'text') node.textContent = attrs[key];
      else if (key === 'type') node.type = attrs[key];
      else if (key === 'hidden') node.hidden = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function safeText(value, max) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 1200);
  }

  function requestId() {
    return global.crypto && global.crypto.randomUUID
      ? global.crypto.randomUUID()
      : 'voice-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function supportedMimeType() {
    if (!global.MediaRecorder) return '';
    var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (var index = 0; index < types.length; index += 1) {
      if (!global.MediaRecorder.isTypeSupported || global.MediaRecorder.isTypeSupported(types[index])) return types[index];
    }
    return '';
  }

  function createUi() {
    var open = html('button', { id: 'voyVoiceOpen', className: 'voy-voice-open', type: 'button', text: 'Hablar con VOY', 'aria-haspopup': 'dialog' });
    var close = html('button', { className: 'voy-voice-icon', type: 'button', text: '×', 'aria-label': 'Cerrar' });
    var status = html('div', { className: 'voy-voice-status', text: 'idle', 'aria-live': 'polite' });
    var messages = html('div', { className: 'voy-voice-messages', 'aria-live': 'polite' });
    var transcript = html('textarea', { className: 'voy-voice-input', rows: '3', maxlength: '800', placeholder: 'Escribí o editá la transcripción…', 'aria-label': 'Mensaje para VOY' });
    var mic = html('button', { className: 'voy-voice-primary', type: 'button', text: 'Hablar' });
    var stopRecording = html('button', { type: 'button', text: 'Detener grabación', hidden: true });
    var send = html('button', { className: 'voy-voice-primary', type: 'button', text: 'Enviar' });
    var cancel = html('button', { type: 'button', text: 'Cancelar' });
    var stopSpeech = html('button', { type: 'button', text: 'Detener voz' });
    var repeat = html('button', { type: 'button', text: 'Repetir' });
    var reset = html('button', { type: 'button', text: 'Resetear conversación' });
    var voiceOutput = html('input', { type: 'checkbox', checked: 'checked', id: 'voyVoiceOutput' });
    voiceOutput.checked = true;
    var confirmation = html('div', { className: 'voy-voice-confirmation', hidden: true });
    var confirmText = html('div', { className: 'voy-voice-confirmation-text', text: 'Confirmar acción externa' });
    var confirm = html('button', { className: 'voy-voice-danger', type: 'button', text: 'Confirmar y abrir' });
    var reject = html('button', { type: 'button', text: 'No abrir' });
    confirmation.append(confirmText, confirm, reject);
    var header = html('header', { className: 'voy-voice-header' }, [
      html('div', {}, [html('strong', { text: 'VOY Copilot' }), html('small', { text: ' Movilidad, no asistente general' })]),
      close
    ]);
    var controls = html('div', { className: 'voy-voice-controls' }, [mic, stopRecording, send, cancel]);
    var utilities = html('div', { className: 'voy-voice-utilities' }, [stopSpeech, repeat, reset]);
    var outputLabel = html('label', { className: 'voy-voice-toggle' }, [voiceOutput, document.createTextNode(' Responder con voz')]);
    var panel = html('section', {
      id: 'voyVoicePanel',
      className: 'voy-voice-panel',
      role: 'dialog',
      'aria-modal': 'false',
      'aria-label': 'Asistente de movilidad VOY',
      hidden: true
    }, [header, status, messages, transcript, controls, confirmation, outputLabel, utilities]);
    var root = html('div', { className: 'voy-voice-root', 'data-voy-voice-ui': 'v1' }, [open, panel]);
    document.body.appendChild(root);
    return {
      root: root,
      open: open,
      panel: panel,
      close: close,
      status: status,
      messages: messages,
      transcript: transcript,
      mic: mic,
      stopRecording: stopRecording,
      send: send,
      cancel: cancel,
      stopSpeech: stopSpeech,
      repeat: repeat,
      reset: reset,
      voiceOutput: voiceOutput,
      confirmation: confirmation,
      confirmText: confirmText,
      confirm: confirm,
      reject: reject
    };
  }

  function VoiceCopilotClient(ui) {
    this.ui = ui;
    this.state = navigator.onLine ? 'idle' : 'offline';
    this.session = null;
    this.events = [];
    this.messages = [];
    this.activeController = null;
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.recordingChunks = [];
    this.recordingTimer = null;
    this.pendingConfirmation = null;
    this.lastResponse = '';
    this.mobilitySnapshot = [];
    this.bind();
    this.renderState();
  }

  VoiceCopilotClient.prototype.bind = function () {
    var self = this;
    this.ui.open.addEventListener('click', function () { self.open(); });
    this.ui.close.addEventListener('click', function () { self.close(); });
    this.ui.mic.addEventListener('click', function () { self.startRecording(); });
    this.ui.stopRecording.addEventListener('click', function () { self.stopRecording(); });
    this.ui.send.addEventListener('click', function () { self.sendText(self.ui.transcript.value); });
    this.ui.cancel.addEventListener('click', function () { self.cancel(); });
    this.ui.stopSpeech.addEventListener('click', function () { self.stopSpeech(); });
    this.ui.repeat.addEventListener('click', function () { self.repeat(); });
    this.ui.reset.addEventListener('click', function () { self.reset(); });
    this.ui.confirm.addEventListener('click', function () { self.confirmExternal(); });
    this.ui.reject.addEventListener('click', function () { self.rejectExternal(); });
    this.ui.transcript.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') self.sendText(self.ui.transcript.value);
    });
    global.addEventListener('online', function () { if (self.state === 'offline') self.transition('idle'); });
    global.addEventListener('offline', function () { self.transition('offline'); });
  };

  VoiceCopilotClient.prototype.transition = function (next, detail) {
    if (STATES.indexOf(next) === -1) next = 'error';
    this.state = next;
    this.pushEvent('state', { state: next, detail: safeText(detail, 160) });
    this.renderState();
  };

  VoiceCopilotClient.prototype.pushEvent = function (type, detail) {
    this.events.push({ type: type, detail: detail || {}, timestamp: new Date().toISOString() });
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
  };

  VoiceCopilotClient.prototype.renderState = function () {
    this.ui.status.textContent = this.state;
    this.ui.status.setAttribute('data-state', this.state);
    var recording = this.state === 'recording' || this.state === 'listening';
    this.ui.stopRecording.hidden = !recording;
    this.ui.mic.disabled = recording || this.state === 'transcribing' || this.state === 'thinking';
    this.ui.send.disabled = this.state === 'transcribing' || this.state === 'thinking' || this.state === 'tool_running';
  };

  VoiceCopilotClient.prototype.open = async function () {
    this.ui.panel.hidden = false;
    this.ui.open.hidden = true;
    if (!this.session) await this.newSession();
    this.ui.transcript.focus();
  };

  VoiceCopilotClient.prototype.close = function () {
    this.cancel();
    this.ui.panel.hidden = true;
    this.ui.open.hidden = false;
  };

  VoiceCopilotClient.prototype.api = async function (path, options) {
    var headers = Object.assign({}, API_HEADERS, options && options.headers || {});
    var response = await fetch(path, Object.assign({}, options || {}, { headers: headers, cache: 'no-store', redirect: 'error' }));
    var body = await response.json().catch(function () { return { ok: false, error: 'invalid_server_json' }; });
    if (!response.ok || !body.ok) throw new Error(body.error || 'voice_request_failed');
    return body;
  };

  VoiceCopilotClient.prototype.newSession = async function () {
    var body = await this.api('/api/voice/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city_id: currentCityId() })
    });
    this.session = body.session;
    return this.session;
  };

  VoiceCopilotClient.prototype.addMessage = function (role, text) {
    var clean = safeText(text, 1200);
    if (!clean) return;
    var item = html('div', { className: 'voy-voice-message voy-voice-message-' + role });
    item.appendChild(html('strong', { text: role === 'user' ? 'Vos' : 'VOY' }));
    item.appendChild(html('p', { text: clean }));
    this.ui.messages.appendChild(item);
    this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
    this.messages.push({ role: role, content: clean });
    if (this.messages.length > 20) this.messages.shift();
  };

  VoiceCopilotClient.prototype.startRecording = async function () {
    if (!navigator.onLine) return this.transition('offline');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !global.MediaRecorder) {
      this.addMessage('assistant', 'Este navegador no permite grabación. Podés usar el modo texto.');
      return this.transition('error', 'mic_unavailable');
    }
    this.cancelActiveRequest();
    this.transition('requesting_permission');
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.recordingChunks = [];
      var mimeType = supportedMimeType();
      this.mediaRecorder = mimeType ? new MediaRecorder(this.mediaStream, { mimeType: mimeType }) : new MediaRecorder(this.mediaStream);
      var self = this;
      this.mediaRecorder.addEventListener('dataavailable', function (event) {
        if (event.data && event.data.size) self.recordingChunks.push(event.data);
      });
      this.mediaRecorder.addEventListener('stop', function () { self.finishRecording(); }, { once: true });
      this.mediaRecorder.start(250);
      this.transition('recording');
      this.recordingTimer = global.setTimeout(function () { self.stopRecording(); }, MAX_RECORDING_MS);
    } catch (error) {
      this.releaseMedia();
      this.addMessage('assistant', 'No pude acceder al micrófono. Podés seguir completamente por texto.');
      this.transition('error', error && error.name === 'NotAllowedError' ? 'mic_denied' : 'mic_error');
    }
  };

  VoiceCopilotClient.prototype.stopRecording = function () {
    if (this.recordingTimer) global.clearTimeout(this.recordingTimer);
    this.recordingTimer = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
  };

  VoiceCopilotClient.prototype.releaseMedia = function () {
    if (this.mediaStream) this.mediaStream.getTracks().forEach(function (track) { track.stop(); });
    this.mediaStream = null;
    this.mediaRecorder = null;
  };

  VoiceCopilotClient.prototype.finishRecording = async function () {
    var mime = this.mediaRecorder && this.mediaRecorder.mimeType || 'audio/webm';
    var blob = new Blob(this.recordingChunks, { type: mime });
    this.releaseMedia();
    if (!blob.size) return this.transition('error', 'empty_audio');
    this.transition('transcribing');
    var controller = new AbortController();
    this.activeController = controller;
    try {
      var body = await this.api('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: blob,
        signal: controller.signal
      });
      this.ui.transcript.value = safeText(body.transcript, 1200);
      this.transition('reviewing');
      this.ui.transcript.focus();
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      this.addMessage('assistant', 'No pude transcribir ese audio. Podés editar o escribir el mensaje.');
      this.transition('error', error && error.message);
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }
  };

  VoiceCopilotClient.prototype.syncContext = function () {
    if (!this.session) return;
    this.session.city_id = currentCityId();
    this.session.mobility_snapshot = this.mobilitySnapshot.slice(0, 12);
  };

  VoiceCopilotClient.prototype.sendText = async function (value) {
    var message = safeText(value, 800);
    if (!message) return;
    if (!navigator.onLine) return this.transition('offline');
    if (!this.session) await this.newSession();
    this.cancelActiveRequest();
    this.syncContext();
    this.addMessage('user', message);
    this.ui.transcript.value = '';
    this.transition('thinking');
    var controller = new AbortController();
    this.activeController = controller;
    var id = requestId();
    try {
      var body = await this.api('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: message,
          request_id: id,
          session: this.session,
          client_context: {
            online: navigator.onLine,
            voice_output: this.ui.voiceOutput.checked,
            locale: navigator.language || 'es-AR',
            capability_flags: { ai_copilot: true, voice_input: true, voice_output: true, voicebox_local: false }
          }
        })
      });
      this.session = body.session;
      this.lastResponse = safeText(body.response, 1200);
      this.addMessage('assistant', this.lastResponse);
      (body.events || []).forEach(this.pushServerEvent.bind(this));
      if (body.tool_result && body.tool_result.confirmation_required) this.showConfirmation(body.tool_result);
      this.applyToolResult(body.tool_execution, body.tool_result);
      this.transition(body.tool_result && body.tool_result.confirmation_required ? 'awaiting_confirmation' : 'idle');
      if (this.ui.voiceOutput.checked && !this.pendingConfirmation) this.speak(this.lastResponse);
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      this.addMessage('assistant', 'No pude completar la consulta. No se aplicó ninguna acción.');
      this.transition('error', error && error.message);
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }
  };

  VoiceCopilotClient.prototype.pushServerEvent = function (event) {
    if (!event || typeof event.type !== 'string') return;
    this.pushEvent(event.type, event.detail || {});
  };

  VoiceCopilotClient.prototype.applyToolResult = function (execution, result) {
    if (!execution || execution.status !== 'success' || !result) return;
    if ((execution.tool === 'search_destination' || execution.tool === 'set_destination' || execution.tool === 'resolve_destination') && this.session.destination) {
      var selectors = ['#destinationInput', '#destino', 'input[name="destination"]', '[data-voy-destination-input]'];
      for (var index = 0; index < selectors.length; index += 1) {
        var input = document.querySelector(selectors[index]);
        if (!input) continue;
        input.value = this.session.destination.name;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  };

  VoiceCopilotClient.prototype.showConfirmation = function (result) {
    this.pendingConfirmation = { token: result.token, provider: result.provider, destination: result.destination };
    this.ui.confirmText.textContent = '¿Abrir ' + result.provider + ' para ' + (result.destination && result.destination.name || 'el destino') + '?';
    this.ui.confirmation.hidden = false;
  };

  VoiceCopilotClient.prototype.confirmExternal = async function () {
    if (!this.pendingConfirmation || !this.session) return;
    var pending = this.pendingConfirmation;
    this.ui.confirm.disabled = true;
    try {
      var body = await this.api('/api/voice/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pending.token, session: this.session })
      });
      this.session = body.session;
      this.pendingConfirmation = null;
      this.ui.confirmation.hidden = true;
      this.transition('idle');
      var action = body.external_action;
      if (action && action.confirmed && /^https:\/\//.test(action.url)) {
        global.open(action.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      this.addMessage('assistant', 'La confirmación venció, cambió o ya fue usada. No abrí nada.');
      this.transition('error', error && error.message);
    } finally {
      this.ui.confirm.disabled = false;
    }
  };

  VoiceCopilotClient.prototype.rejectExternal = function () {
    this.pendingConfirmation = null;
    if (this.session) this.session.pending_confirmation = null;
    this.ui.confirmation.hidden = true;
    this.transition('idle');
    this.pushEvent('confirmation_rejected', {});
  };

  VoiceCopilotClient.prototype.speak = function (text) {
    if (!global.speechSynthesis || !global.SpeechSynthesisUtterance || !text) return;
    this.stopSpeech();
    var self = this;
    var utterance = new SpeechSynthesisUtterance(safeText(text, 1000));
    utterance.lang = 'es-AR';
    utterance.rate = 1;
    utterance.addEventListener('start', function () { self.transition('speaking'); self.pushEvent('speech_started', {}); });
    utterance.addEventListener('end', function () { self.transition('idle'); self.pushEvent('speech_stopped', {}); });
    utterance.addEventListener('error', function () { self.transition('error', 'tts_error'); });
    global.speechSynthesis.speak(utterance);
  };

  VoiceCopilotClient.prototype.stopSpeech = function () {
    if (global.speechSynthesis) global.speechSynthesis.cancel();
    if (this.state === 'speaking') this.transition('idle');
    this.pushEvent('speech_stopped', {});
  };

  VoiceCopilotClient.prototype.repeat = function () {
    if (this.lastResponse) this.speak(this.lastResponse);
  };

  VoiceCopilotClient.prototype.cancelActiveRequest = function () {
    if (this.activeController) this.activeController.abort();
    this.activeController = null;
  };

  VoiceCopilotClient.prototype.cancel = function () {
    this.cancelActiveRequest();
    if (this.recordingTimer) global.clearTimeout(this.recordingTimer);
    this.recordingTimer = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
    this.releaseMedia();
    this.stopSpeech();
    this.pendingConfirmation = null;
    this.ui.confirmation.hidden = true;
    if (this.session) this.session.pending_confirmation = null;
    this.transition('cancelled');
    this.pushEvent('cancelled', {});
  };

  VoiceCopilotClient.prototype.reset = async function () {
    this.cancel();
    this.messages = [];
    this.events = [];
    this.lastResponse = '';
    this.ui.messages.textContent = '';
    this.ui.transcript.value = '';
    await this.newSession();
    this.transition('idle');
  };

  VoiceCopilotClient.prototype.updateMobilitySnapshot = function (snapshot) {
    if (!Array.isArray(snapshot)) return false;
    this.mobilitySnapshot = snapshot.slice(0, 12).map(function (item) {
      return {
        mode: safeText(item && item.mode, 30),
        available: Boolean(item && item.available),
        price: Number.isFinite(Number(item && item.price)) ? Number(item.price) : null,
        duration_min: Number.isFinite(Number(item && item.duration_min)) ? Number(item.duration_min) : null,
        distance_km: Number.isFinite(Number(item && item.distance_km)) ? Number(item.distance_km) : null,
        source: safeText(item && item.source, 120),
        status: safeText(item && item.status, 80),
        label: safeText(item && item.label || item && item.mode, 80)
      };
    }).filter(function (item) { return item.mode; });
    return true;
  };

  function initialize() {
    if (!document.body || document.querySelector('[data-voy-voice-ui]')) return;
    var client = new VoiceCopilotClient(createUi());
    global.VoyVoiceCopilot = Object.freeze({
      get state() { return client.state; },
      get session() { return client.session; },
      get events() { return client.events.slice(); },
      get root() { return client.ui.root; },
      open: client.open.bind(client),
      close: client.close.bind(client),
      sendText: client.sendText.bind(client),
      startRecording: client.startRecording.bind(client),
      stopRecording: client.stopRecording.bind(client),
      cancel: client.cancel.bind(client),
      repeat: client.repeat.bind(client),
      reset: client.reset.bind(client),
      updateMobilitySnapshot: client.updateMobilitySnapshot.bind(client)
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})(window);
