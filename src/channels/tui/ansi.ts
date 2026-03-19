export const ansi = {
  enterAltScreen: "\x1b[?1049h",
  exitAltScreen: "\x1b[?1049l",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearScreen: "\x1b[2J",
  clearLine: "\x1b[2K",
  clearDown: "\x1b[J",
  scrollUp: "\x1b[S",

  cursorTo(row: number, col: number): string {
    return `\x1b[${row};${col}H`;
  },

  setScrollRegion(top: number, bottom: number): string {
    return `\x1b[${top};${bottom}r`;
  },

  resetScrollRegion: "\x1b[r",
};
