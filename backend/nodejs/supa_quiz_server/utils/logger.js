const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: "info", // Par défaut : info, error, warn, debug, etc.
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.colorize(), // ✅ Coloré en console
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level} - ${message}`;
    })
  ),
  transports: [
    new transports.Console(), // ✅ Affiche dans la console
    new transports.File({ filename: "logs/error.log", level: "error" }), // 🔴 Log des erreurs
    new transports.File({ filename: "logs/combined.log" }) // 🟡 Log complet
  ]
});

module.exports = logger;
