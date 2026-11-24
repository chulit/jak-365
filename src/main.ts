import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import { initTheme } from './lib/theme'

// Terapkan tema tersimpan / preferensi sistem sebelum aplikasi dipasang.
initTheme()

createApp(App).mount('#app')
