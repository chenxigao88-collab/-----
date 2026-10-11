import { BOUNDS, sub, angleDiff, distance, clamp, add, mul, direction, type Vec2 } from '../core/types';
import type { Capsule } from '../combat/components';
export function segmentCircle(from: Vec2, to: Vec2, center: Vec2, radius: number): number | null {
  const d = sub(to, from), f = sub(from, center);
  const c = f.x * f.x + f.y * f.y - radius * radius;
  if (c <= 0) return 0;
  const a = d.x * d.x + d.y * d.y;
  if (a < 1e-12) return null;
  const b = 2 * (f.x * d.x + f.y * d.y), discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
export function segmentCapsule(from: Vec2, to: Vec2, top: Vec2, bottom: Vec2, radius: number): number | null {
  const contacts = [segmentCircle(from, to, top, radius), segmentCircle(from, to, bottom, radius)];
  // The spine is vertical: its rectangle plus the two end circles is the exact capsule.
  let enter = 0, exit = 1;
  for (const [start, delta, low, high] of [
    [from.x, to.x - from.x, top.x - radius, top.x + radius],
    [from.y, to.y - from.y, top.y, bottom.y],
  ]) {
    if (Math.abs(delta) < 1e-12) { if (start < low || start > high) { enter = 2; break; } }
    else { const a = (low - start) / delta, b = (high - start) / delta; enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b)); }
  }
  if (enter <= exit && enter <= 1 && exit >= 0) contacts.push(enter);
  const hits = contacts.filter((t): t is number => t !== null);
  return hits.length ? Math.min(...hits) : null;
}
function closestOnSegment(point: Vec2, a: Vec2, b: Vec2): Vec2 {
  const d = sub(b, a), lengthSquared = d.x*d.x + d.y*d.y;
  const t = lengthSquared ? clamp(((point.x-a.x)*d.x + (point.y-a.y)*d.y) / lengthSquared, 0, 1) : 0;
  return add(a, mul(d, t));
}
function segmentDistance(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number {
  const ab = sub(b,a), cd = sub(d,c), ac = sub(c,a), cross = ab.x*cd.y - ab.y*cd.x;
  if (Math.abs(cross) > 1e-12) {
    const t = (ac.x*cd.y-ac.y*cd.x)/cross, u = (ac.x*ab.y-ac.y*ab.x)/cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  return Math.min(distance(a,closestOnSegment(a,c,d)),distance(b,closestOnSegment(b,c,d)),distance(c,closestOnSegment(c,a,b)),distance(d,closestOnSegment(d,a,b)));
}
export function capsuleTouchesCircle(body: Capsule, center: Vec2, radius: number): boolean {
  return distance(center, closestOnSegment(center, body.top, body.bottom)) <= radius + body.radius;
}
export function sweptSectorCapsule(center: Vec2, body: Capsule, radius: number, start: number, end: number): boolean {
  const span = end - start, middle = (start + end) / 2;
  const inAngle = (point: Vec2) => span >= Math.PI*2-1e-6 || Math.abs(angleDiff(Math.atan2(point.y-center.y,point.x-center.x),middle)) <= span/2;
  const edgeStart = add(center,mul(direction(start),radius)), edgeEnd = add(center,mul(direction(end),radius));
  for (const point of [body.top, body.bottom, closestOnSegment(center,body.top,body.bottom)]) {
    if (inAngle(point) && distance(center,point) <= radius + body.radius) return true;
  }
  return segmentDistance(body.top,body.bottom,center,edgeStart) <= body.radius || segmentDistance(body.top,body.bottom,center,edgeEnd) <= body.radius;
}
export function wallContact(from: Vec2, to: Vec2, radius: number): { t: number; normal: Vec2 } | null {
  const d = sub(to, from);
  const options: { t: number; normal: Vec2 }[] = [];
  if (d.x < 0 && to.x <= BOUNDS.left + radius) options.push({ t: (BOUNDS.left + radius - from.x) / d.x, normal: { x: 1, y: 0 } });
  if (d.x > 0 && to.x >= BOUNDS.right - radius) options.push({ t: (BOUNDS.right - radius - from.x) / d.x, normal: { x: -1, y: 0 } });
  if (d.y < 0 && to.y <= BOUNDS.top + radius) options.push({ t: (BOUNDS.top + radius - from.y) / d.y, normal: { x: 0, y: 1 } });
  if (d.y > 0 && to.y >= BOUNDS.bottom - radius) options.push({ t: (BOUNDS.bottom - radius - from.y) / d.y, normal: { x: 0, y: -1 } });
  return options.filter(c => c.t >= -1e-8 && c.t <= 1).sort((a, b) => a.t - b.t)[0] ?? null;
}
export function sweptSector(center: Vec2, point: Vec2, radius: number, targetRadius: number, startAngle: number, endAngle: number): boolean {
  const d = distance(center, point);
  if (d > radius + targetRadius) return false;
  if (d <= targetRadius) return true;
  const span = endAngle - startAngle;
  if (span >= Math.PI * 2 - 1e-6) return true;
  const middle = (startAngle + endAngle) / 2;
  const padding = Math.asin(Math.min(1, targetRadius / d));
  return Math.abs(angleDiff(Math.atan2(point.y - center.y, point.x - center.x), middle)) <= span / 2 + padding;
}
