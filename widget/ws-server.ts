/**
 * WebSocket relay server.
 *
 * Routes messages between CLI clients and widget clients.
 * Commands from CLI go to exactly ONE widget (the first registered).
 * Responses from widgets go to all CLI clients.
 *
 * Widgets register by sending: { type: "register", role: "widget" }
 */

import type { ServerWebSocket } from 'bun'

const WS_PORT = parseInt(process.env.TLDRAW_WS_PORT || '4000', 10)

interface ClientData {
	role: 'widget' | 'cli'
}

const clients = new Set<ServerWebSocket<ClientData>>()

function getFirstWidget(): ServerWebSocket<ClientData> | undefined {
	for (const ws of clients) {
		if (ws.data.role === 'widget') return ws
	}
	return undefined
}

const server = Bun.serve<ClientData>({
	port: WS_PORT,
	fetch(req, server) {
		if (server.upgrade(req, { data: { role: 'cli' as const } })) return
		return new Response('WebSocket relay for tldraw-buddy', { status: 200 })
	},
	websocket: {
		open(ws) {
			clients.add(ws)
			const widgetCount = [...clients].filter(c => c.data.role === 'widget').length
			const cliCount = clients.size - widgetCount
			console.log(`[ws-relay] Client connected (${widgetCount} widgets, ${cliCount} CLIs)`)
		},
		message(ws, message) {
			const text = typeof message === 'string' ? message : new TextDecoder().decode(message)
			try {
				const data = JSON.parse(text)

				// Widget registration
				if (data.type === 'register' && data.role === 'widget') {
					ws.data.role = 'widget'
					const widgetCount = [...clients].filter(c => c.data.role === 'widget').length
					console.log(`[ws-relay] Widget registered (${widgetCount} total)`)
					return
				}

				if (ws.data.role === 'widget') {
					// Response from widget → send to all CLI clients
					for (const client of clients) {
						if (client !== ws && client.data.role === 'cli') {
							client.send(text)
						}
					}
				} else {
					// Command from CLI → send to first widget only
					const widget = getFirstWidget()
					if (widget) {
						widget.send(text)
					}
				}
			} catch {
				// Not JSON, just ignore
			}
		},
		close(ws) {
			clients.delete(ws)
			console.log(`[ws-relay] Client disconnected`)
		},
	},
})

console.log(`[ws-relay] Listening on ws://localhost:${WS_PORT}`)
