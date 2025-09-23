import type { EncryptedOAuthToken, OAuthToken } from "../types";

export class TokenEncryption {
	private encryptionKey: CryptoKey | null = null;

	constructor(private secretKey: string) {}

	/**
	 * Get or create the encryption key using proper key derivation
	 */
	private async getEncryptionKey(): Promise<CryptoKey> {
		if (!this.encryptionKey) {
			const encoder = new TextEncoder();
			
			// Use PBKDF2 for proper key derivation instead of simple padding
			const baseKey = await crypto.subtle.importKey(
				"raw",
				encoder.encode(this.secretKey),
				"PBKDF2",
				false,
				["deriveBits"]
			);

			// Use a fixed salt for deterministic key derivation
			// In production, consider using a configurable salt
			const salt = encoder.encode("cyrus-oauth-salt-v1");
			
			const keyData = await crypto.subtle.deriveBits(
				{
					name: "PBKDF2",
					salt: salt,
					iterations: 100000,
					hash: "SHA-256",
				},
				baseKey,
				256 // 256 bits = 32 bytes for AES-256
			);

			this.encryptionKey = await crypto.subtle.importKey(
				"raw",
				keyData,
				{ name: "AES-GCM" },
				false,
				["encrypt", "decrypt"],
			);
		}
		return this.encryptionKey;
	}

	/**
	 * Encrypt an OAuth token with separate IVs for each token type
	 */
	async encryptToken(token: OAuthToken): Promise<EncryptedOAuthToken> {
		const key = await this.getEncryptionKey();
		const encoder = new TextEncoder();

		// Generate separate IVs for access and refresh tokens
		const accessTokenIv = crypto.getRandomValues(new Uint8Array(12));
		const refreshTokenIv = crypto.getRandomValues(new Uint8Array(12));

		// Encrypt access token
		const accessTokenData = encoder.encode(token.accessToken);
		const encryptedAccessToken = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv: accessTokenIv },
			key,
			accessTokenData,
		);

		// Encrypt refresh token if present
		let encryptedRefreshToken: ArrayBuffer | undefined;
		if (token.refreshToken) {
			const refreshTokenData = encoder.encode(token.refreshToken);
			encryptedRefreshToken = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv: refreshTokenIv },
				key,
				refreshTokenData,
			);
		}

		return {
			...token,
			accessToken: this.arrayBufferToBase64(encryptedAccessToken),
			refreshToken: encryptedRefreshToken
				? this.arrayBufferToBase64(encryptedRefreshToken)
				: undefined,
			iv: this.arrayBufferToBase64(accessTokenIv),
			refreshTokenIv: this.arrayBufferToBase64(refreshTokenIv),
		};
	}

	/**
	 * Decrypt an OAuth token with support for separate IVs
	 */
	async decryptToken(encrypted: EncryptedOAuthToken): Promise<OAuthToken> {
		const key = await this.getEncryptionKey();
		const decoder = new TextDecoder();

		// Use separate IVs for access and refresh tokens
		const accessTokenIv = this.base64ToArrayBuffer(encrypted.iv);
		const refreshTokenIv = encrypted.refreshTokenIv 
			? this.base64ToArrayBuffer(encrypted.refreshTokenIv)
			: accessTokenIv; // Fallback to access token IV for backward compatibility

		// Decrypt access token
		const encryptedAccessToken = this.base64ToArrayBuffer(
			encrypted.accessToken,
		);
		const decryptedAccessToken = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: accessTokenIv },
			key,
			encryptedAccessToken,
		);

		// Decrypt refresh token if present
		let refreshToken: string | undefined;
		if (encrypted.refreshToken) {
			const encryptedRefreshToken = this.base64ToArrayBuffer(
				encrypted.refreshToken,
			);
			const decryptedRefreshToken = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv: refreshTokenIv },
				key,
				encryptedRefreshToken,
			);
			refreshToken = decoder.decode(decryptedRefreshToken);
		}

		return {
			...encrypted,
			accessToken: decoder.decode(decryptedAccessToken),
			refreshToken,
		};
	}

	/**
	 * Hash a token for storage (one-way)
	 */
	async hashToken(token: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(token);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		return this.arrayBufferToHex(hashBuffer);
	}

	/**
	 * Convert ArrayBuffer to base64
	 */
	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		const binary = String.fromCharCode(...bytes);
		return btoa(binary);
	}

	/**
	 * Convert base64 to ArrayBuffer
	 */
	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	}

	/**
	 * Convert ArrayBuffer to hex string
	 */
	private arrayBufferToHex(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		return Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}
}

/**
 * Generate a secure random secret for webhook signing
 */
export function generateSecureSecret(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
