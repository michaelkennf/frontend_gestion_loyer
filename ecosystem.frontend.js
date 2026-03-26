const path = require("path");

const projectRoot = path.resolve(__dirname);
const frontendDir = path.join(projectRoot, "Frontend");

module.exports = {
  apps: [
    {
      name: "gestionloyer-frontend",
      cwd: frontendDir,
      script: "npm",
      args: "run dev -- --port 5013 --hostname 0.0.0.0",
      env: {
        NODE_ENV: "development",
        NEXT_PUBLIC_API_URL: "https://api.gestionloyer.agishalabs.tech/api",
      },
      watch: false,
    },
  ],
};

