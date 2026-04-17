/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	server: {
		port: 8080,
		strictPort: true,
		host: true,
		origin: "http://0.0.0.0:8080",
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test/setup.ts'
	},

	base: "/",

	preview: {
		port: 8080,
		strictPort: true,
	},


});