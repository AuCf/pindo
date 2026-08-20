import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { availableMonitors, primaryMonitor } from '@tauri-apps/api/window';

const MIN_VISIBLE_WIDTH = 72;
const MIN_VISIBLE_HEIGHT = 42;

export function normalizeWindowPosition(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return null;
  }

  return {
    x: Math.round(value.x),
    y: Math.round(value.y)
  };
}

function getIntersectionSize(position, workArea) {
  const left = Math.max(position.x, workArea.position.x);
  const top = Math.max(position.y, workArea.position.y);
  const right = Math.min(position.x + MIN_VISIBLE_WIDTH, workArea.position.x + workArea.size.width);
  const bottom = Math.min(position.y + MIN_VISIBLE_HEIGHT, workArea.position.y + workArea.size.height);

  return {
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function isPositionReachable(position, monitors) {
  return monitors.some((monitor) => {
    const intersection = getIntersectionSize(position, monitor.workArea);
    return intersection.width >= MIN_VISIBLE_WIDTH && intersection.height >= MIN_VISIBLE_HEIGHT;
  });
}

function clampToWorkArea(position, windowSize, workArea) {
  const minX = workArea.position.x;
  const minY = workArea.position.y;
  const maxX = minX + Math.max(0, workArea.size.width - windowSize.width);
  const maxY = minY + Math.max(0, workArea.size.height - windowSize.height);

  return {
    x: Math.min(maxX, Math.max(minX, position.x)),
    y: Math.min(maxY, Math.max(minY, position.y))
  };
}

export async function restoreWindowPosition(appWindow, storedPosition) {
  const position = normalizeWindowPosition(storedPosition);
  if (!position) return null;

  const [monitors, fallbackMonitor, windowSize] = await Promise.all([
    availableMonitors(),
    primaryMonitor(),
    appWindow.outerSize()
  ]);

  if (monitors.length === 0) return null;

  const target = isPositionReachable(position, monitors)
    ? position
    : clampToWorkArea(position, windowSize, fallbackMonitor?.workArea ?? monitors[0].workArea);

  await appWindow.setPosition(new PhysicalPosition(target.x, target.y));
  return target;
}
