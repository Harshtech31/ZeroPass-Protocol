/**
 * Helpers for WebAuthn binary/base64 conversions
 */

export function base64ToBytes(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Prepares the options received from the server for navigator.credentials.create
 */
export function prepareRegistrationOptions(options: any) {
  options.challenge = base64ToBytes(options.challenge);
  options.user.id = base64ToBytes(options.user.id);
  
  if (options.excludeCredentials) {
    options.excludeCredentials = options.excludeCredentials.map((c: any) => ({
      ...c,
      id: base64ToBytes(c.id)
    }));
  }
  
  return options;
}

/**
 * Prepares the credential created by the browser for sending to the server
 */
export function prepareRegistrationResponse(credential: any) {
  const response = credential.response;
  return {
    id: credential.id,
    rawId: bytesToBase64(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bytesToBase64(response.attestationObject),
      clientDataJSON: bytesToBase64(response.clientDataJSON),
    },
  };
}

/**
 * Prepares the options received from the server for navigator.credentials.get
 */
export function prepareLoginOptions(options: any) {
  options.challenge = base64ToBytes(options.challenge);
  
  if (options.allowCredentials) {
    options.allowCredentials = options.allowCredentials.map((c: any) => ({
      ...c,
      id: base64ToBytes(c.id)
    }));
  }
  
  return options;
}

/**
 * Prepares the assertion created by the browser for sending to the server
 */
export function prepareLoginResponse(credential: any) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bytesToBase64(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: bytesToBase64(response.authenticatorData),
      clientDataJSON: bytesToBase64(response.clientDataJSON),
      signature: bytesToBase64(response.signature),
      userHandle: response.userHandle ? bytesToBase64(response.userHandle) : null,
    },
  };
}
