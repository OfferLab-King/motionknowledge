import {currentContext} from './context';

const REDACT_PATTERN = /(token|secret|authorization|cookie|password)/i;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = REDACT_PATTERN.test(k) ? '[REDACTED]' : v;
  }
  return out;
}

export class StructuredLogger {
  constructor(private readonly level: LogLevel = 'info') {}

  private emit(level: LogLevel, message: string, fields: LogFields = {}): void {
    const order = ['debug', 'info', 'warn', 'error'];
    if (order.indexOf(level) < order.indexOf(this.level)) return;
    const record = {
      ts: new Date().toISOString(),
      level,
      message,
      ...currentContext(),
      ...redact(fields),
    };
    if (level === 'error') {
      console.error(JSON.stringify(record));
    } else {
      console.log(JSON.stringify(record));
    }
  }

  debug(message: string, fields?: LogFields): void {
    this.emit('debug', message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.emit('info', message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.emit('warn', message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.emit('error', message, fields);
  }
}

export function createLogger(level: LogLevel = 'info'): StructuredLogger {
  return new StructuredLogger(level);
}
