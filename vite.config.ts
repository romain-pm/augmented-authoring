import { defineConfig } from "vite";
import jahia from "@jahia/vite-federation-plugin";

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: "./src/main/resources/javascript/apps/",
  },
  plugins: [
    jahia({
      exposes: {
        "./init": "./src/javascript/init.ts",
      },
    }),
  ],
});
