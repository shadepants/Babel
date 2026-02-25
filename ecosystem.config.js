module.exports = {
  apps: [
    {
      name: "babel-ui-watcher",
      cwd: "./ui",
      script: "npm",
      args: "run build -- --watch",
      autorestart: true,
      watch: false // We use vite's internal watcher instead
    },
    {
      name: "babel-backend",
      cwd: "./",
      script: ".venv/Scripts/python.exe",
      args: "-m uvicorn server.app:app --host 0.0.0.0 --port 8000",
      autorestart: true,
      max_restarts: 15,
      min_uptime: "5s",
      restart_delay: 3000,
      env: {
        SHARE_PASSWORD: "" // Set via .env; leave blank for auto-generated key
      }
    }
  ]
};
