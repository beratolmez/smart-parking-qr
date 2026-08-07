type LogContext = Record<string, unknown>;

function write(level: "info" | "warn" | "error", event: string, context?: LogContext) {
  console.log(
    JSON.stringify({
      level,
      event,
      time: new Date().toISOString(),
      ...context,
    }),
  );
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
