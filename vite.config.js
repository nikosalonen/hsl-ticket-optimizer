import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss()],
	base: "/hsl-ticket-optimizer/",
	build: {
		outDir: "dist",
		assetsDir: "assets",
		target: "es2020",
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	server: {
		port: 3000,
		open: true,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.js"],
	},
});
