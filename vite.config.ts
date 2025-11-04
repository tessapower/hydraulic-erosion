import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [glsl()],
  base: "/hydraulic-erosion/",
  assetsInclude: ["**/*.glsl"],
});
