import { TEST_ROOM_CODE } from "../config/constants.js";

let activeRoomCode = "";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRoomCode() {
  const useNumericOnly = Math.random() < 0.5;
  const length = randomInt(6, 8);

  if (useNumericOnly) {
    let code = "";
    for (let i = 0; i < length; i += 1) {
      code += String(randomInt(0, 9));
    }
    return code;
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += chars[randomInt(0, chars.length - 1)];
  }
  return code;
}

export function createActiveRoomCode() {
  activeRoomCode = generateRoomCode();
  return activeRoomCode;
}

export function getActiveRoomCode() {
  return activeRoomCode;
}

export function isJoinCodeValid(code) {
  return code === TEST_ROOM_CODE || code === activeRoomCode;
}
