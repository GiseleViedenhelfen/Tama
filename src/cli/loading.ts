const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export async function withTypingIndicator<T>(
  work: () => Promise<T>,
  label = "Tama",
): Promise<T> {
  let frame = 0;
  const hideCursor = "\x1B[?25l";
  const showCursor = "\x1B[?25h";

  process.stdout.write(hideCursor);

  const timer = setInterval(() => {
    const icon = FRAMES[frame % FRAMES.length];
    frame += 1;
    process.stdout.write(`\r${label} ${icon} digitando…`);
  }, 90);

  try {
    return await work();
  } finally {
    clearInterval(timer);
    process.stdout.write("\r\x1B[K");
    process.stdout.write(showCursor);
  }
}
