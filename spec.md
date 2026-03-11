# Dragon Play

## Current State
New project, no existing code.

## Requested Changes (Diff)

### Add
- Interactive 2D dragon game where the user plays with a dragon
- Dragon character rendered on a Canvas with animations (idle, flying, breathing fire, sleeping)
- User interactions: click/tap to pet the dragon, feed it, make it fly, make it breathe fire
- Dragon happiness/energy meter displayed in the UI
- Fun particle effects for fire breath and interactions
- Responsive game canvas with a fantasy-themed background
- Score/interaction counter

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Backend: minimal backend to store high scores/interaction counts per session
2. Frontend: Canvas-based dragon game component with:
   - Dragon sprite drawn with Canvas 2D API (custom drawn dragon character)
   - Animation states: idle, happy, flying, fire-breathing, sleeping
   - Action buttons: Pet, Feed, Fly, Fire Breath
   - Happiness and energy meters
   - Particle effects for fire and sparkles
   - Fantasy-themed dark background with stars
   - Score tracking
