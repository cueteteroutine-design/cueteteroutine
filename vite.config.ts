import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { handler } from './server/api.mjs';

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    server: { host: '0.0.0.0', port: 8080 },
    plugins: [react(), {
      name: 'local-json-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/api/')) void handler(req,res);
          else next();
        });
      },
    }],
    resolve: { alias: { '@': path.resolve(process.cwd(), './src') } },
  };
});
