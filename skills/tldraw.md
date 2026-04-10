---
name: tldraw
description: Draw on a shared tldraw canvas with the user. Create diagrams, flowcharts, sketches, and visual artifacts.
---

# tldraw Canvas

You have access to a shared tldraw canvas that the user can see in their browser. Use the `tldraw-claude` CLI to create and manipulate shapes.

## Important: this is a shared canvas

The canvas belongs to the user. They may have drawn things on it that matter to them. **Never delete shapes or clear the canvas without asking first.** Always confirm before using `delete` or `clear` — even if you think you're "starting fresh." The user's work on the canvas is just as real as their code.

## Before drawing

1. Make sure the tldraw widget is running. If the user hasn't started it, tell them to run: `tldraw-claude start`
2. Run `tldraw-claude snapshot` to see what's already on the canvas before making changes.
3. If you need a clean canvas, **ask the user** before clearing.

## CLI commands

The CLI is at `${CLAUDE_PLUGIN_ROOT}/bin/tldraw-claude` (or just `tldraw-claude` if on PATH).

### See what's on the canvas

```bash
tldraw-claude snapshot
```

### Create shapes

```bash
# Rectangle with text
tldraw-claude create --type geo --geo rectangle --x 100 --y 100 --w 200 --h 100 --text "Hello" --color blue --fill semi

# Ellipse
tldraw-claude create --type geo --geo ellipse --x 300 --y 100 --w 150 --h 150 --color green --fill solid

# Text label
tldraw-claude create --type text --x 100 --y 300 --text "My label" --color violet --size xl

# Sticky note
tldraw-claude create --type note --x 400 --y 300 --text "Remember this" --color yellow
```

The `create` command prints the new shape's ID, which you need for `connect` and `update`.

### Connect shapes with arrows

```bash
tldraw-claude connect --from shape:abc123 --to shape:def456 --label "next" --color black
```

### Update existing shapes

```bash
tldraw-claude update --id shape:abc123 --text "New label" --color red --x 200
```

### Delete shapes (ask first!)

```bash
tldraw-claude delete shape:abc123 shape:def456
```

### Clear canvas (ask first!)

```bash
tldraw-claude clear
```

## Layout tips

- Canvas coordinates start at (0, 0) top-left
- Default shape size is 200x200. Use consistent sizes for clean layouts.
- For flowcharts: space nodes ~300px apart vertically, center horizontally
- For diagrams: use a grid layout with ~250px spacing
- Use colors to group related concepts
- Always add text labels to shapes

## Workflow

1. `tldraw-claude snapshot` — understand current state
2. If the canvas has existing work, draw alongside it (offset your shapes) rather than clearing
3. Create shapes, capturing the IDs printed by each `create` call
4. Connect related shapes with arrows using those IDs
5. `tldraw-claude snapshot` to verify the result

## Reference

**Shape types:** geo, text, note

**Geo types:** rectangle, ellipse, triangle, diamond, pentagon, hexagon, star, cloud, heart

**Colors:** black, grey, light-violet, violet, blue, light-blue, yellow, orange, green, light-green, light-red, red, white

**Fill:** none, semi, solid, pattern

**Text sizes:** s, m, l, xl
