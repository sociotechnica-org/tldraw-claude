#!/usr/bin/env bun
/**
 * tldraw-claude CLI — canvas manipulation commands.
 *
 * Each invocation connects to the WebSocket relay, sends a command,
 * prints the response, and exits. No persistent process needed.
 *
 * Usage:
 *   tldraw-claude snapshot
 *   tldraw-claude create --type geo --geo rectangle --x 100 --y 200 --text Hello
 *   tldraw-claude update --id shape:abc --text "New label"
 *   tldraw-claude delete shape:abc shape:def
 *   tldraw-claude connect --from shape:abc --to shape:def --label "yes"
 *   tldraw-claude clear
 */

const WS_URL = 'ws://localhost:4000'
const TIMEOUT = 10_000

function parseArgs(args: string[]): { command: string; flags: Record<string, string>; positionals: string[] } {
	const command = args[0] || 'help'
	const flags: Record<string, string> = {}
	const positionals: string[] = []

	let i = 1
	while (i < args.length) {
		const arg = args[i]
		if (arg.startsWith('--')) {
			const key = arg.slice(2)
			const next = args[i + 1]
			if (next && !next.startsWith('--')) {
				flags[key] = next
				i += 2
			} else {
				flags[key] = 'true'
				i++
			}
		} else {
			positionals.push(arg)
			i++
		}
	}

	return { command, flags, positionals }
}

async function sendCommand(type: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
	const requestId = String(Date.now()) + String(Math.random()).slice(2, 8)

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(
				'Timed out connecting to tldraw widget.\n' +
				'Make sure the canvas is running: tldraw-claude start'
			))
		}, TIMEOUT)

		const ws = new WebSocket(WS_URL)

		ws.onerror = () => {
			clearTimeout(timer)
			reject(new Error(
				'Could not connect to tldraw widget on ws://localhost:4000.\n' +
				'Start the canvas first: tldraw-claude start'
			))
		}

		ws.onopen = () => {
			ws.send(JSON.stringify({ type, requestId, ...params }))
		}

		ws.onmessage = (event) => {
			const data = JSON.parse(String(event.data))
			// Only accept the response matching our request
			if (data.requestId !== requestId) return
			clearTimeout(timer)
			ws.close()
			resolve(data)
		}
	})
}

function num(s: string | undefined): number | undefined {
	if (s === undefined) return undefined
	const n = Number(s)
	return isNaN(n) ? undefined : n
}

async function main() {
	const { command, flags, positionals } = parseArgs(process.argv.slice(2))

	switch (command) {
		case 'snapshot': {
			const result = await sendCommand('get_snapshot')
			if (!Array.isArray(result.shapes) || result.shapes.length === 0) {
				console.log('Canvas is empty.')
				break
			}
			for (const s of result.shapes as Record<string, unknown>[]) {
				let line = `${s.id}: ${s.type}`
				if (s.geo) line += ` (${s.geo})`
				line += ` at (${s.x}, ${s.y})`
				if (s.w && s.h) line += ` ${s.w}x${s.h}`
				if (s.text) line += ` "${s.text}"`
				if (s.color) line += ` [${s.color}]`
				console.log(line)
			}
			break
		}

		case 'create': {
			const params: Record<string, unknown> = {
				shapeType: flags.type || 'geo',
			}
			if (flags.geo) params.geo = flags.geo
			if (flags.x) params.x = num(flags.x)
			if (flags.y) params.y = num(flags.y)
			if (flags.w) params.w = num(flags.w)
			if (flags.h) params.h = num(flags.h)
			if (flags.text) params.text = flags.text
			if (flags.color) params.color = flags.color
			if (flags.fill) params.fill = flags.fill
			if (flags.size) params.size = flags.size
			const result = await sendCommand('create_shape', params)
			if (result.error) {
				console.error(`Error: ${result.error}`)
				process.exit(1)
			}
			console.log(result.id)
			break
		}

		case 'update': {
			if (!flags.id) {
				console.error('Usage: tldraw-claude update --id <shape-id> [--x N] [--y N] [--text "..."] ...')
				process.exit(1)
			}
			const params: Record<string, unknown> = { id: flags.id }
			if (flags.x) params.x = num(flags.x)
			if (flags.y) params.y = num(flags.y)
			if (flags.w) params.w = num(flags.w)
			if (flags.h) params.h = num(flags.h)
			if (flags.text) params.text = flags.text
			if (flags.color) params.color = flags.color
			if (flags.fill) params.fill = flags.fill
			if (flags.geo) params.geo = flags.geo
			const result = await sendCommand('update_shape', params)
			if (result.error) {
				console.error(`Error: ${result.error}`)
				process.exit(1)
			}
			console.log('updated')
			break
		}

		case 'delete': {
			const ids = positionals
			if (ids.length === 0) {
				console.error('Usage: tldraw-claude delete <shape-id> [shape-id ...]')
				process.exit(1)
			}
			const result = await sendCommand('delete_shapes', { ids })
			if (result.error) {
				console.error(`Error: ${result.error}`)
				process.exit(1)
			}
			console.log('deleted')
			break
		}

		case 'connect': {
			if (!flags.from || !flags.to) {
				console.error('Usage: tldraw-claude connect --from <id> --to <id> [--label "..."] [--color ...]')
				process.exit(1)
			}
			const params: Record<string, unknown> = {
				fromId: flags.from,
				toId: flags.to,
			}
			if (flags.label) params.label = flags.label
			if (flags.color) params.color = flags.color
			const result = await sendCommand('connect_shapes', params)
			if (result.error) {
				console.error(`Error: ${result.error}`)
				process.exit(1)
			}
			console.log(result.id)
			break
		}

		case 'clear': {
			const result = await sendCommand('clear_canvas')
			if (result.error) {
				console.error(`Error: ${result.error}`)
				process.exit(1)
			}
			console.log('cleared')
			break
		}

		case 'help':
		default:
			console.log(`tldraw-claude — shared canvas CLI

Canvas commands:
  snapshot                          List all shapes on canvas
  create [--type geo] [--geo rect]  Create a shape
         [--x N] [--y N] [--w N] [--h N]
         [--text "..."] [--color blue] [--fill solid]
  update --id <id> [--x N] [--text "..."] ...
  delete <id> [id ...]              Delete shapes
  connect --from <id> --to <id>     Draw arrow between shapes
          [--label "..."] [--color ...]
  clear                             Clear the canvas

Service commands (via bin/tldraw-claude):
  start                             Start widget + WS relay
  stop                              Stop services
  status                            Check service status

Shape types: geo, text, note
Geo types:   rectangle, ellipse, triangle, diamond, pentagon,
             hexagon, star, cloud, heart
Colors:      black, grey, light-violet, violet, blue, light-blue,
             yellow, orange, green, light-green, light-red, red, white
Fill:        none, semi, solid, pattern`)
			break
	}
}

main().catch((err) => {
	console.error(err.message)
	process.exit(1)
})
