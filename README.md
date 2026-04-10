<p align="center">
  <img src="docs/logo.png" alt="tldraw-claude logo" width="400">
</p>

# tldraw-claude

A Claude Code plugin that gives Claude a shared [tldraw](https://tldraw.dev) canvas.

## What does it do?

You and Claude draw on the same canvas. You open a tldraw board in your browser, Claude gets a CLI to create shapes, connect them with arrows, and read what's on the canvas. You can both add and edit — it's a live, shared whiteboard.

Great for sketching architecture diagrams, flowcharts, database schemas, or just thinking visually together.

![tldraw-claude — drawing together on a shared canvas](docs/hero.png)

## How it works

```
Claude Code ←Bash→ CLI ←WebSocket→ tldraw widget (browser)
```

No MCP server needed. Claude calls the CLI via Bash, the CLI sends commands to the tldraw widget over WebSocket, and prints the result. Each command is stateless — connect, send, receive, exit.

## Install

### Option A: Paste this into Claude Code

Copy and paste this prompt into Claude Code and it will set everything up for you:

```
Clone https://github.com/jessmartin/tldraw-claude to ~/.tldraw-claude, run ./setup,
then start the canvas with ~/.tldraw-claude/bin/tldraw-claude start.
```

### Option B: Claude Code plugin

Install directly from GitHub as a Claude Code plugin:

```bash
claude plugin marketplace add jessmartin/tldraw-claude --scope user
claude plugin install tldraw-claude@sociotechnica --scope user
```

This registers the plugin marketplace from the GitHub repo and installs the plugin. Use `--scope project` instead to install for a single project.

### Option C: Git clone

```bash
git clone https://github.com/jessmartin/tldraw-claude.git ~/.tldraw-claude
cd ~/.tldraw-claude
./setup
```

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/code) CLI

## Usage

### 1. Start the canvas

```bash
~/.tldraw-claude/bin/tldraw-claude start
```

This starts the tldraw widget (http://localhost:5173) and a WebSocket relay (ws://localhost:4000), then opens your browser.

### 2. Draw together

Ask Claude to draw something:

> "Draw a flowchart showing the request lifecycle in our app"

> "Sketch the architecture of our microservices"

> "Create a diagram of the database schema"

## Updating

**Plugin install:** If you installed with `claude plugin marketplace add`, updates pull automatically when Claude Code starts (with `autoUpdate: true`, the default).

**Git clone:** Pull and re-run setup:

```bash
cd ~/.tldraw-claude
git pull
./setup
```

## CLI

```bash
tldraw-claude start                # Start widget + WS relay
tldraw-claude stop                 # Stop services
tldraw-claude status               # Check service status
tldraw-claude snapshot             # List all shapes on canvas
tldraw-claude create --type geo    # Create a shape
tldraw-claude update --id <id>     # Update a shape
tldraw-claude delete <id> [id ...] # Delete shapes
tldraw-claude connect --from --to  # Draw arrow between shapes
tldraw-claude clear                # Clear the canvas
tldraw-claude help                 # Show all options
```

## License

MIT
