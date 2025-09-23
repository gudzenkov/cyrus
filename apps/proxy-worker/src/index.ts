import { Router } from "itty-router";
import type { EdgeWorkerRegistration } from "./services/EdgeWorkerRegistry";
import { OAuthService } from "./services/OAuthService";
import { WebhookReceiver } from "./services/WebhookReceiver";
import { WebhookSender } from "./services/WebhookSender";
import type { Env, LinearWebhook } from "./types";

const router = Router();

// Dashboard
router.get("/", (request: Request, _env: Env) => {
	return new Response(
		`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cyrus Proxy Worker</title>
      <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
        .endpoint { background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .method { font-weight: bold; color: #3b82f6; }
        a { color: #3b82f6; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🚀 Cyrus Proxy Worker (Cloudflare Workers)</h1>
      <p>A distributed OAuth and webhook handler for Linear integration.</p>
      
      <h2>Available Endpoints:</h2>
      
      <div class="endpoint">
        <span class="method">GET</span> <a href="/oauth/authorize">/oauth/authorize</a>
        <p>Start OAuth flow with Linear</p>
      </div>
      
      <div class="endpoint">
        <span class="method">GET</span> /oauth/callback
        <p>OAuth callback endpoint (configure in Linear app)</p>
      </div>
      
      <div class="endpoint">
        <span class="method">POST</span> /oauth/refresh-token
        <p>Refresh OAuth access token for a workspace</p>
      </div>
      
      <div class="endpoint">
        <span class="method">POST</span> /webhook
        <p>Webhook receiver endpoint</p>
      </div>
      
      <div class="endpoint">
        <span class="method">POST</span> /edge/register
        <p>Register edge worker webhook endpoint</p>
      </div>
      
      <div class="endpoint">
        <span class="method">POST</span> /events/status
        <p>Status updates from edge workers</p>
      </div>
      
      <h2>Configuration:</h2>
      <p>Edge workers should connect to: <strong>${request.url.replace(/\/$/, "")}</strong></p>
    </body>
    </html>
  `,
		{
			status: 200,
			headers: { "Content-Type": "text/html; charset=utf-8" },
		},
	);
});

// OAuth routes
router.get("/oauth/authorize", async (request: Request, env: Env) => {
	const oauthService = new OAuthService(env);
	return oauthService.handleAuthorize(request);
});

router.get("/oauth/callback", async (request: Request, env: Env) => {
	const oauthService = new OAuthService(env);
	return oauthService.handleCallback(request);
});

// OAuth token refresh route with rate limiting
router.post("/oauth/refresh-token", async (request: Request, env: Env) => {
	try {
		const body = await request.json();
		const { workspaceId } = body;

		if (!workspaceId) {
			return new Response(
				JSON.stringify({ error: "workspaceId is required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Rate limiting: max 10 requests per minute per workspace
		const rateLimitKey = `rate_limit:refresh:${workspaceId}`;
		const now = Date.now();
		const windowMs = 60000; // 1 minute
		const maxRequests = 10;

		const rateLimitData = await env.OAUTH_STATE.get(rateLimitKey);
		let requestCount = 1;
		let windowStart = now;

		if (rateLimitData) {
			const parsed = JSON.parse(rateLimitData);
			if (now - parsed.windowStart < windowMs) {
				requestCount = parsed.count + 1;
				windowStart = parsed.windowStart;
				
				if (requestCount > maxRequests) {
					console.warn(`[RateLimit] Too many refresh requests for workspace ${workspaceId}`);
					return new Response(
						JSON.stringify({ 
							error: "Rate limit exceeded. Maximum 10 refresh requests per minute per workspace.",
							retryAfter: Math.ceil((windowStart + windowMs - now) / 1000)
						}),
						{
							status: 429,
							headers: { 
								"Content-Type": "application/json",
								"Retry-After": Math.ceil((windowStart + windowMs - now) / 1000).toString()
							},
						}
					);
				}
			} else {
				// New window
				requestCount = 1;
				windowStart = now;
			}
		}

		// Update rate limit counter
		await env.OAUTH_STATE.put(
			rateLimitKey,
			JSON.stringify({ count: requestCount, windowStart }),
			{ expirationTtl: Math.ceil(windowMs / 1000) + 10 } // Add buffer for cleanup
		);

		const oauthService = new OAuthService(env);
		const refreshedToken = await oauthService.refreshToken(workspaceId);

		// Log successful refresh for monitoring
		console.log(`[OAuth] Token refresh success for workspace ${workspaceId}`, {
			refreshedAt: new Date().toISOString(),
			expiresAt: new Date(refreshedToken.expiresAt).toISOString(),
			scopeCount: refreshedToken.scope.length,
		});

		return new Response(
			JSON.stringify({
				success: true,
				token: {
					accessToken: refreshedToken.accessToken,
					expiresAt: refreshedToken.expiresAt,
					obtainedAt: refreshedToken.obtainedAt,
					// Don't expose refresh token in response for security
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		// Enhanced error logging for monitoring
		console.error(`[OAuth] Token refresh failed for workspace ${workspaceId}`, {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			timestamp: new Date().toISOString(),
			workspaceId,
		});

		// Determine appropriate HTTP status based on error type
		let status = 500;
		if (error instanceof Error) {
			if (error.message.includes("No token found") || error.message.includes("No refresh token")) {
				status = 404;
			} else if (error.message.includes("Invalid refresh token") || error.message.includes("expired")) {
				status = 401;
			} else if (error.message.includes("Rate limit")) {
				status = 429;
			}
		}

		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "Token refresh failed",
			}),
			{
				status,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
});

// Webhook route
router.post(
	"/webhook",
	async (request: Request, env: Env, ctx: ExecutionContext) => {
		const webhookSender = new WebhookSender(env);

		const webhookReceiver = new WebhookReceiver(
			env,
			async (webhook: LinearWebhook) => {
				// Extract workspace ID from webhook
				const workspaceId = webhook.organizationId;

				if (!workspaceId) {
					console.error("No organizationId in webhook, cannot route to edges");
					return;
				}

				// Transform webhook to event
				const event = webhookSender.transformWebhookToEvent(webhook);

				// Send to edge workers in the background
				ctx.waitUntil(
					webhookSender
						.sendWebhookToWorkspace(event, workspaceId)
						.then((count) =>
							console.log(
								`Webhook for workspace ${workspaceId} sent to ${count} edge worker(s)`,
							),
						)
						.catch((error) => console.error("Failed to send webhook:", error)),
				);
			},
		);

		return webhookReceiver.handleWebhook(request);
	},
);

// Edge worker registration route
router.post("/edge/register", async (request: Request, env: Env) => {
	try {
		const webhookSender = new WebhookSender(env);
		const registry = webhookSender.getRegistry();

		const registration = (await request.json()) as EdgeWorkerRegistration;
		const result = await registry.registerEdgeWorker(registration);

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Edge worker registration failed:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Registration failed",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
});

// Status update route
router.post("/events/status", async (request: Request, env: Env) => {
	const webhookSender = new WebhookSender(env);
	return webhookSender.handleStatusUpdate(request);
});

// 404 handler
router.all("*", () => {
	return new Response("Not found", { status: 404 });
});

// Export worker
export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		try {
			return await router.handle(request, env, ctx);
		} catch (error) {
			console.error("Worker error:", error);
			return new Response("Internal server error", { status: 500 });
		}
	},
};
