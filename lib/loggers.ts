import { green, red, yellow, cyan } from "../deps.ts";


export class Log {
    static info(...args: unknown[]) {
        console.log(cyan("ℹ️"), ...args);
    }

    static success(...args: unknown[]) {
        console.log(green("✅"), ...args);
    }

    static warn(...args: unknown[]) {
        console.log(yellow("⚠️"), ...args);
    }

    static error(...args: unknown[]) {
        console.error(red("❌"), ...args);
    }
}