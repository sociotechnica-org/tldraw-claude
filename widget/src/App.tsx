import { Editor, Tldraw, createShapeId, toRichText } from 'tldraw'
import { useCallback, useEffect, useRef } from 'react'

const WS_PORT = 4000

interface WsRequest {
	type: string
	requestId: string
	[key: string]: unknown
}

/** Extract plain text from a TLRichText document structure */
function plainTextFromRichText(rt: unknown): string | undefined {
	if (!rt || typeof rt !== 'object') return undefined
	const doc = rt as { content?: { content?: { text?: string }[] }[] }
	try {
		return doc.content
			?.flatMap((block) => block.content?.map((node) => node.text) ?? [])
			.join('') || undefined
	} catch {
		return undefined
	}
}

function App() {
	const editorRef = useRef<Editor | null>(null)
	const wsRef = useRef<WebSocket | null>(null)

	const handleMessage = useCallback((data: WsRequest) => {
		const editor = editorRef.current
		if (!editor) return respond(data.requestId, { error: 'Editor not ready' })

		try {
			switch (data.type) {
				case 'create_shape':
					return handleCreateShape(editor, data)
				case 'update_shape':
					return handleUpdateShape(editor, data)
				case 'delete_shapes':
					return handleDeleteShapes(editor, data)
				case 'connect_shapes':
					return handleConnectShapes(editor, data)
				case 'get_snapshot':
					return handleGetSnapshot(editor, data)
				case 'clear_canvas':
					return handleClearCanvas(editor, data)
				default:
					return respond(data.requestId, { error: `Unknown command: ${data.type}` })
			}
		} catch (err) {
			respond(data.requestId, { error: String(err) })
		}
	}, [])

	function respond(requestId: string, payload: Record<string, unknown>) {
		const ws = wsRef.current
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ requestId, ...payload }))
		}
	}

	function handleCreateShape(editor: Editor, data: WsRequest) {
		const id = createShapeId()
		const shapeType = (data.shapeType as string) || 'geo'
		const x = (data.x as number) || 0
		const y = (data.y as number) || 0
		const w = (data.w as number) || 200
		const h = (data.h as number) || 200

		const props: Record<string, unknown> = {}

		if (shapeType === 'geo') {
			props.geo = (data.geo as string) || 'rectangle'
			props.w = w
			props.h = h
			if (data.text) props.richText = toRichText(data.text as string)
			if (data.color) props.color = data.color as string
			if (data.fill) props.fill = data.fill as string
		} else if (shapeType === 'text') {
			if (data.text) props.richText = toRichText(data.text as string)
			if (data.color) props.color = data.color as string
			props.size = (data.size as string) || 'm'
		} else if (shapeType === 'note') {
			if (data.text) props.richText = toRichText(data.text as string)
			if (data.color) props.color = data.color as string
			if (data.size) props.size = data.size as string
		}

		editor.createShape({ id, type: shapeType, x, y, props })
		respond(data.requestId, { id })
	}

	function handleUpdateShape(editor: Editor, data: WsRequest) {
		const id = data.id as string
		if (!id) return respond(data.requestId, { error: 'Missing id' })

		const existing = editor.getShape(id as any)
		if (!existing) return respond(data.requestId, { error: `Shape not found: ${id}` })

		const updates: Record<string, unknown> = { id, type: existing.type }
		if (data.x !== undefined) updates.x = data.x
		if (data.y !== undefined) updates.y = data.y

		const props: Record<string, unknown> = {}
		if (data.text !== undefined) props.richText = toRichText(data.text as string)
		if (data.color !== undefined) props.color = data.color
		if (data.fill !== undefined) props.fill = data.fill
		if (data.w !== undefined) props.w = data.w
		if (data.h !== undefined) props.h = data.h
		if (data.geo !== undefined) props.geo = data.geo

		if (Object.keys(props).length > 0) updates.props = props
		editor.updateShape(updates as any)
		respond(data.requestId, { updated: true })
	}

	function handleDeleteShapes(editor: Editor, data: WsRequest) {
		const ids = data.ids as string[]
		if (!ids || !Array.isArray(ids)) return respond(data.requestId, { error: 'Missing ids array' })
		editor.deleteShapes(ids as any)
		respond(data.requestId, { deleted: true })
	}

	function handleConnectShapes(editor: Editor, data: WsRequest) {
		const fromId = data.fromId as string
		const toId = data.toId as string
		if (!fromId || !toId) return respond(data.requestId, { error: 'Missing fromId or toId' })

		const arrowId = createShapeId()

		const fromBounds = editor.getShapePageBounds(fromId as any)
		const toBounds = editor.getShapePageBounds(toId as any)
		if (!fromBounds || !toBounds) {
			return respond(data.requestId, { error: 'Could not get shape bounds' })
		}

		const arrowProps: Record<string, unknown> = {}
		if (data.label) arrowProps.richText = toRichText(data.label as string)
		if (data.color) arrowProps.color = data.color as string

		editor.createShape({
			id: arrowId,
			type: 'arrow',
			x: fromBounds.center.x,
			y: fromBounds.center.y,
			props: arrowProps,
		})

		editor.createBindings([
			{
				fromId: arrowId,
				toId: fromId as any,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
			{
				fromId: arrowId,
				toId: toId as any,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
		])

		respond(data.requestId, { id: arrowId })
	}

	function handleGetSnapshot(editor: Editor, data: WsRequest) {
		const shapes = editor.getCurrentPageShapes()
		const summary = shapes.map((shape) => {
			const bounds = editor.getShapePageBounds(shape.id)
			const info: Record<string, unknown> = {
				id: shape.id,
				type: shape.type,
				x: shape.x,
				y: shape.y,
			}
			if (bounds) {
				info.w = Math.round(bounds.w)
				info.h = Math.round(bounds.h)
			}
			const props = shape.props as Record<string, unknown>
			if (props.geo) info.geo = props.geo
			// Extract plain text from richText for snapshot readability
			const text = plainTextFromRichText(props.richText)
			if (text) info.text = text
			if (props.color) info.color = props.color
			return info
		})
		respond(data.requestId, { shapes: summary })
	}

	function handleClearCanvas(editor: Editor, data: WsRequest) {
		const ids = [...editor.getCurrentPageShapeIds()]
		if (ids.length > 0) editor.deleteShapes(ids)
		respond(data.requestId, { cleared: true })
	}

	useEffect(() => {
		let ws: WebSocket
		let reconnectTimer: number

		function connect() {
			ws = new WebSocket(`ws://localhost:${WS_PORT}`)
			wsRef.current = ws

			ws.onopen = () => console.log('[tldraw] Connected to MCP bridge')
			ws.onclose = () => {
				console.log('[tldraw] Disconnected, reconnecting in 2s...')
				reconnectTimer = window.setTimeout(connect, 2000)
			}
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as WsRequest
					// Ignore response messages (they have requestId but no command type)
					if (!data.type) return
					handleMessage(data)
				} catch (err) {
					console.error('[tldraw] Bad message:', err)
				}
			}
		}

		connect()

		return () => {
			clearTimeout(reconnectTimer)
			ws?.close()
		}
	}, [handleMessage])

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="tldraw-claude" onMount={(editor) => { editorRef.current = editor }} />
		</div>
	)
}

export default App
