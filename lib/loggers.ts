import { green, red, yellow, cyan } from "../deps.ts";


export class Log {
    static info(...args: unknown[]) {
        console.log(cyan("ℹ️  " + Log.format(args)));
    }

    static success(...args: unknown[]) {
        console.log(green("✅ " + Log.format(args)));
    }

    static warn(...args: unknown[]) {
        console.log(yellow("🟡 " + Log.format(args)));
    }

    static error(...args: unknown[]) {
        console.error(red("❌ " + Log.format(args)));
    }

    private static format(args: unknown[]): string {
        return args.map(arg =>
          typeof arg === "string"
            ? arg
            : Deno.inspect(arg, { colors: true, depth: 4 })
        ).join(" ");
      }
}