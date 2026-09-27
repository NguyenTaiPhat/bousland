import { DockPosition } from "./types";

export interface SnapInput {
  currentDock: DockPosition;
  x: number;
  y: number;
  screenWidth: number;
  screenHeight: number;
}

export function evaluateSnapMode(input: SnapInput): DockPosition {
  const { currentDock, x, y, screenWidth } = input;
  const SNAP_IN_EDGE = 48;
  const BREAK_AWAY_EDGE = 80;
  const SNAP_IN_CORNER = 60;
  const TOP_CORNER_Y_THRESHOLD = 80;

  // Nếu đang ở mép LEFT, phải kéo chuột vượt quá 80px mới nhả
  if (currentDock === "LEFT") {
    if (x > BREAK_AWAY_EDGE) return "TOP_CENTER";
    return "LEFT";
  }

  // Nếu đang ở mép RIGHT, phải kéo chuột ra xa hơn 80px từ mép phải mới nhả
  if (currentDock === "RIGHT") {
    if (x < screenWidth - BREAK_AWAY_EDGE) return "TOP_CENTER";
    return "RIGHT";
  }

  // Nếu chuột ở khu vực đỉnh (Top bar)
  if (y <= TOP_CORNER_Y_THRESHOLD) {
    if (x <= SNAP_IN_CORNER) return "TOP_LEFT";
    if (x >= screenWidth - SNAP_IN_CORNER) return "TOP_RIGHT";
    return "TOP_CENTER";
  }

  // Nếu chuột ở khu vực sườn dọc (Side edges)
  if (x <= SNAP_IN_EDGE) return "LEFT";
  if (x >= screenWidth - SNAP_IN_EDGE) return "RIGHT";

  return "TOP_CENTER";
}

export function getBorderRadiusForDock(dock: DockPosition): string {
  switch (dock) {
    case "TOP_LEFT":
      return "0px 22px 22px 22px";
    case "TOP_RIGHT":
      return "22px 0px 22px 22px";
    case "LEFT":
      return "0px 22px 22px 0px";
    case "RIGHT":
      return "22px 0px 0px 22px";
    default:
      return "22px 22px 22px 22px";
  }
}
