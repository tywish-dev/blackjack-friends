import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'blackjack-friends' with your actual repo name
export default defineConfig({
  plugins: [react()],
  base: "/",
})