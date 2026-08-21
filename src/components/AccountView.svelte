<script lang="ts">
  import { onMount } from 'svelte';

  type PreferredMode = 'app' | 'taxi' | 'remis' | 'walk' | 'bike' | 'bus';
  type AccountPreferences = {
    theme: 'system' | 'light' | 'dark';
    analytics: boolean;
    reducedMotion: boolean;
    preferredModes: PreferredMode[];
    defaultProvinceId: string | null;
    defaultLocalityId: string | null;
  };
  type SessionPayload = { ok: boolean; enabled: boolean; authenticated: boolean; provider: 'google' | null; preferences: AccountPreferences | null };
  type Bootstrap = { ok: boolean; enabled: boolean; client_id?: string; csrf?: string; nonce?: string };
  type CredentialResponse = { credential?: string };
  type GoogleIdApi = {
    initialize(config: Record<string, unknown>): void;
    renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    disableAutoSelect?(): void;
  };

  let enabled = false;
  let authenticated = false;
  let preferences: AccountPreferences = { theme: 'system', analytics: false, reducedMotion: false, preferredModes: [], defaultProvinceId: null, defaultLocalityId: null };
  let message = '';
  let busy = true;
  let googleButton: HTMLDivElement;
  let deleteArmed = false;

  const modes: Array<{ id: PreferredMode; label: string }> = [
    { id: 'app', label: 'Apps' }, { id: 'taxi', label: 'Taxi' }, { id: 'remis', label: 'Remis' },
    { id: 'walk', label: 'Caminar' }, { id: 'bike', label: 'Bici' }, { id: 'bus', label: 'Colectivo' }
  ];

  function googleApi(): GoogleIdApi | null {
    const value = (window as unknown as { google?: { accounts?: { id?: GoogleIdApi } } }).google?.accounts?.id;
    return value || null;
  }

  async function refresh(): Promise<void> {
    const response = await fetch('/api/auth/session', { cache: 'no-store', headers: { Accept: 'application/json' } });
    const payload = await response.json() as SessionPayload;
    enabled = payload.enabled === true;
    authenticated = payload.authenticated === true;
    if (payload.preferences) preferences = payload.preferences;
  }

  async function bootstrap(): Promise<Bootstrap> {
    const response = await fetch('/api/auth/bootstrap', { cache: 'no-store', headers: { Accept: 'application/json' } });
    return response.json() as Promise<Bootstrap>;
  }

  async function loadGoogleScript(): Promise<GoogleIdApi> {
    const existing = googleApi();
    if (existing) return existing;
    await new Promise<void>((resolve, reject) => {
      const prior = document.querySelector<HTMLScriptElement>('script[data-voy-google-gis]');
      if (prior) {
        prior.addEventListener('load', () => resolve(), { once: true });
        prior.addEventListener('error', () => reject(new Error('google_script_failed')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.dataset.voyGoogleGis = 'true';
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('google_script_failed')), { once: true });
      document.head.appendChild(script);
    });
    const api = googleApi();
    if (!api) throw new Error('google_api_missing');
    return api;
  }

  async function initializeGoogle(): Promise<void> {
    if (!enabled || authenticated || !googleButton) return;
    const auth = await bootstrap();
    if (!auth.enabled || !auth.client_id || !auth.csrf || !auth.nonce) return;
    const api = await loadGoogleScript();
    api.initialize({
      client_id: auth.client_id,
      nonce: auth.nonce,
      ux_mode: 'popup',
      auto_select: false,
      button_auto_select: false,
      use_fedcm_for_button: true,
      callback: async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) { message = 'Google no devolvió una credencial válida.'; return; }
        busy = true;
        try {
          const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ credential: credentialResponse.credential, csrf: auth.csrf })
          });
          if (!response.ok) throw new Error('login_failed');
          await refresh();
          message = 'Cuenta conectada. VOY no guarda tu email ni tus viajes.';
        } catch {
          message = 'No pudimos iniciar sesión con Google.';
        } finally {
          busy = false;
        }
      }
    });
    api.renderButton(googleButton, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: 260 });
  }

  async function csrfWrite(path: string, method: 'POST' | 'PATCH' | 'DELETE', extra: Record<string, unknown> = {}): Promise<Response> {
    const auth = await bootstrap();
    if (!auth.enabled || !auth.csrf) throw new Error('auth_bootstrap_failed');
    return fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ csrf: auth.csrf, ...extra })
    });
  }

  async function save(): Promise<void> {
    busy = true;
    try {
      const response = await csrfWrite('/api/account', 'PATCH', { preferences });
      if (!response.ok) throw new Error('preferences_failed');
      const payload = await response.json() as { preferences?: AccountPreferences };
      if (payload.preferences) preferences = payload.preferences;
      message = 'Preferencias guardadas.';
    } catch { message = 'No pudimos guardar las preferencias.'; }
    finally { busy = false; }
  }

  async function logout(): Promise<void> {
    busy = true;
    try {
      const response = await csrfWrite('/api/auth/logout', 'POST');
      if (!response.ok) throw new Error('logout_failed');
      authenticated = false;
      message = 'Sesión cerrada.';
      googleApi()?.disableAutoSelect?.();
      queueMicrotask(() => { void initializeGoogle(); });
    } catch { message = 'No pudimos cerrar la sesión.'; }
    finally { busy = false; }
  }

  async function deleteAccount(): Promise<void> {
    if (!deleteArmed) { deleteArmed = true; return; }
    busy = true;
    try {
      const response = await csrfWrite('/api/account', 'DELETE');
      if (!response.ok) throw new Error('delete_failed');
      authenticated = false;
      deleteArmed = false;
      message = 'Cuenta eliminada y sesiones revocadas.';
      queueMicrotask(() => { void initializeGoogle(); });
    } catch { message = 'No pudimos eliminar la cuenta.'; }
    finally { busy = false; }
  }

  function toggleMode(mode: PreferredMode): void {
    preferences = {
      ...preferences,
      preferredModes: preferences.preferredModes.includes(mode)
        ? preferences.preferredModes.filter(item => item !== mode)
        : [...preferences.preferredModes, mode].slice(0, 6)
    };
  }

  onMount(() => {
    void (async () => {
      try { await refresh(); }
      catch { message = 'No pudimos consultar el estado de cuenta.'; }
      finally { busy = false; }
      if (enabled && !authenticated) {
        try { await initializeGoogle(); }
        catch { message = 'Google Sign-In no está disponible en este navegador.'; }
      }
    })();
  });
</script>

<main class="account-page" data-testid="account-view">
  <a href="/" class="back">← Volver a VOY</a>
  <header>
    <img src="/brand/voy-mark.svg" width="42" height="42" alt="" />
    <div><p class="kicker">Cuenta opcional</p><h1>Tu VOY, sin guardar tus viajes.</h1></div>
  </header>
  <p class="lead">El producto funciona completo como invitado. La cuenta sólo sincroniza preferencias no sensibles.</p>

  {#if busy}<p role="status">Actualizando cuenta…</p>{/if}
  {#if !enabled}
    <section class="account-state"><h2>Seguí como invitado</h2><p>Google Sign-In está desactivado en este entorno. Buscar, calcular rutas y comparar opciones no requiere login.</p></section>
  {:else if !authenticated}
    <section class="account-state"><h2>Continuar con Google</h2><p>Usamos únicamente la identidad estable de Google (`sub`) para reconocer tu cuenta. No persistimos email, token de Google, búsquedas, ubicaciones ni historial de viajes.</p><div bind:this={googleButton} class="google-button" data-testid="google-sign-in"></div></section>
  {:else}
    <section class="preferences" aria-labelledby="preferences-title">
      <h2 id="preferences-title">Preferencias</h2>
      <label>Tema<select bind:value={preferences.theme}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
      <label class="check"><input type="checkbox" bind:checked={preferences.reducedMotion} /> Reducir movimiento</label>
      <label class="check"><input type="checkbox" bind:checked={preferences.analytics} /> Permitir analytics no sensibles</label>
      <fieldset><legend>Modos preferidos</legend><div class="mode-grid">{#each modes as item (item.id)}<button type="button" class:active={preferences.preferredModes.includes(item.id)} aria-pressed={preferences.preferredModes.includes(item.id)} on:click={() => toggleMode(item.id)}>{item.label}</button>{/each}</div></fieldset>
      <button type="button" on:click={save} disabled={busy}>Guardar preferencias</button>
    </section>
    <section class="account-actions"><button type="button" class="secondary" on:click={logout} disabled={busy}>Cerrar sesión</button><button type="button" class="danger" on:click={deleteAccount} disabled={busy}>{deleteArmed ? 'Confirmar eliminación' : 'Eliminar cuenta'}</button>{#if deleteArmed}<button type="button" class="secondary" on:click={() => deleteArmed = false}>Cancelar</button>{/if}</section>
  {/if}
  {#if message}<p role="status" class="account-message">{message}</p>{/if}
  <p class="privacy-note">La sesión es revocable, tiene vencimiento y se almacena en servidor sólo como hash. <a href="/privacy">Ver privacidad</a>.</p>
</main>

<style>
  .account-page{width:min(100% - 32px,760px);margin:0 auto;padding:32px 0 64px;color:var(--voy-ink)}.back{display:inline-flex;min-height:44px;align-items:center;margin-bottom:28px}.account-page header{display:flex;align-items:center;gap:14px}.account-page h1{margin:2px 0 0;font-size:clamp(30px,7vw,46px);line-height:1;letter-spacing:-.045em}.kicker{margin:0;text-transform:uppercase;letter-spacing:.1em;font-size:12px;color:var(--voy-muted);font-weight:700}.lead{font-size:18px;line-height:1.55;max-width:56ch;color:var(--voy-ink-soft)}.account-state,.preferences,.account-actions{margin-top:28px;padding-top:24px;border-top:var(--voy-border-default)}.account-state h2,.preferences h2{font-size:24px;margin:0 0 10px}.account-state p{max-width:62ch;line-height:1.55}.google-button{min-height:48px;margin-top:18px}.preferences{display:grid;gap:16px}.preferences label{display:grid;gap:8px;font-weight:650}.preferences select{min-height:48px;padding:0 12px;border:var(--voy-border-default);border-radius:var(--voy-radius-sm);background:var(--voy-surface);color:var(--voy-ink)}.preferences .check{display:flex;align-items:center;gap:10px;min-height:44px}.preferences input[type=checkbox]{width:22px;height:22px;min-height:22px}.preferences fieldset{border:0;padding:0;margin:4px 0}.preferences legend{font-weight:700;margin-bottom:10px}.mode-grid{display:flex;flex-wrap:wrap;gap:8px}.mode-grid button{background:transparent;color:var(--voy-ink);border:var(--voy-border-default);min-height:44px}.mode-grid button.active{background:var(--voy-ink);color:var(--voy-canvas)}.account-actions{display:flex;flex-wrap:wrap;gap:8px}.secondary{background:transparent;color:var(--voy-ink);border:var(--voy-border-default)}.danger{background:var(--voy-danger);color:#fff}.account-message{margin-top:20px;font-weight:650}.privacy-note{margin-top:32px;color:var(--voy-muted);font-size:14px;line-height:1.5}
</style>
