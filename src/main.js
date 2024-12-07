import './styles/global.css'
import { MoodTracker } from './components/MoodTracker'

// Initialize the app and make the MoodTracker instance globally accessible
document.addEventListener('DOMContentLoaded', () => {
  window.moodTracker = new MoodTracker()
  window.moodTracker.init()
})