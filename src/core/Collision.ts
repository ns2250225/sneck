import type { GameMap } from './GameMap'
import type { Snake } from './Snake'
import type { Point } from './types'

export type CollisionKind = 'none' | 'wall' | 'self' | 'obstacle'

/** Returns the resolved head position (wrapped if allowed) and any collision. */
export function checkCollision(
  map: GameMap,
  snake: Snake,
  next: Point,
  ignoreSelf: boolean,
): { point: Point; kind: CollisionKind } {
  let point = next
  if (!map.inBounds(point)) {
    if (!map.wrap) return { point, kind: 'wall' }
    point = map.wrapPoint(point)
  }
  if (map.isObstacle(point)) return { point, kind: 'obstacle' }
  if (!ignoreSelf && hitsBody(snake, point)) return { point, kind: 'self' }
  return { point, kind: 'none' }
}

function hitsBody(snake: Snake, p: Point): boolean {
  const body = snake.body
  // The tail cell is vacated during this move unless the snake is growing.
  const end = snake.willGrow ? body.length : body.length - 1
  for (let i = 0; i < end; i++) {
    if (body[i].x === p.x && body[i].y === p.y) return true
  }
  return false
}
