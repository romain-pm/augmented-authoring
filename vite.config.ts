import { defineConfig } from "vite";
import jahia from "@jahia/vite-federation-plugin";

export default defineConfig(({ mode }) => ({
  build: {
    outDir: "./src/main/resources/javascript/apps/",
    minify: mode !== "development",
    sourcemap: mode === "development",
  },
  plugins: [
    jahia({
      exposes: {
        "./init": "./src/javascript/init.ts",
      },
      // Bundle our own moonstone (from local main-branch build) so DataTable is
      // available at runtime. Revert to singleton: true once a published npm
      // release with DataTable ships.
      shared: {
        "@jahia/moonstone": { singleton: false, eager: false },
      },
    }),
  ],
}));
