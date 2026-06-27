import { createApp } from 'vue'
import './app.css'

const App = createApp({
  onShow(options) {
    console.log('App onShow.')
  },
})

export default App
