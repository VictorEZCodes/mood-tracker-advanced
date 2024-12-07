import Chart from 'chart.js/auto';
import { format, subDays, startOfDay } from 'date-fns';
import { AIHelper } from '../services/aiService';
import { ThemeToggle } from '../utils/themeToggle';

export class MoodTracker {
  constructor() {
    this.selectedMood = null;
    this.chart = null;
    this.moods = [
      { emoji: '😊', value: 5, label: 'Great' },
      { emoji: '🙂', value: 4, label: 'Good' },
      { emoji: '😐', value: 3, label: 'Okay' },
      { emoji: '☹️', value: 2, label: 'Bad' },
      { emoji: '😢', value: 1, label: 'Terrible' }
    ];
    this.currentView = 'week';
    ThemeToggle.init();
    this.currentFeedbackDiv = null;
  }

  init() {
    this.renderMoodButtons();
    this.setupEventListeners();
    this.renderChart();
    this.updateInsights();
  }

  renderMoodButtons() {
    const container = document.getElementById('mood-buttons');
    this.moods.forEach(mood => {
      const button = document.createElement('button');
      button.className = 'inline-flex flex-col items-center justify-center rounded-lg border-2 border-transparent p-4 hover:border-primary hover:bg-accent transition-all';
      button.innerHTML = `
        <span class="text-4xl">${mood.emoji}</span>
        <span class="mt-2 text-sm font-medium">${mood.label}</span>
      `;
      button.dataset.value = mood.value;
      button.addEventListener('click', () => this.selectMood(button, mood));
      container.appendChild(button);
    });
  }

  selectMood(button, mood) {
    document.querySelectorAll('#mood-buttons button').forEach(btn => {
      btn.classList.remove('border-primary', 'bg-accent/50');
    });

    button.classList.add('border-primary', 'bg-accent/50');
    this.selectedMood = mood;

    if (this.currentFeedbackDiv && this.currentFeedbackDiv.parentNode) {
      this.currentFeedbackDiv.remove();
    }
  }

  setupEventListeners() {
    document.getElementById('save-entry').addEventListener('click', () => this.saveEntry());
    document.getElementById('week-view').addEventListener('click', () => this.changeView('week'));
    document.getElementById('month-view').addEventListener('click', () => this.changeView('month'));
  }

  async saveEntry() {
    if (!this.selectedMood) {
      this.showNotification('Please select a mood first', 'error');
      return;
    }

    // Check if entry already exists for today
    const entries = this.getEntries();
    const today = startOfDay(new Date()).getTime();
    const existingEntry = entries.find(entry => {
      const entryDate = startOfDay(new Date(entry.date)).getTime();
      return entryDate === today;
    });

    if (existingEntry) {
      this.showNotification('You have already logged your mood for today', 'error');
      return;
    }

    const entry = {
      date: new Date().toISOString(),
      mood: this.selectedMood.value,
      journal: document.getElementById('journal-text').value,
      tags: document.getElementById('tags-text').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag)
    };

    // Remove previous feedback if it exists
    if (this.currentFeedbackDiv && this.currentFeedbackDiv.parentNode) {
      this.currentFeedbackDiv.remove();
    }

    // Create and show the feedback div with loading state
    const moodInput = document.getElementById('mood-input');
    if (moodInput) {
      const feedbackDiv = document.createElement('div');
      feedbackDiv.className = 'mt-4 p-4 rounded-md bg-accent text-accent-foreground';
      feedbackDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            <h3 class="font-medium">AI Support</h3>
          </div>
          <button class="text-sm text-muted-foreground hover:text-foreground" onclick="this.parentElement.parentElement.remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="text-sm flex items-center gap-2">
          <span class="typing-dots">Thinking</span>
          <span class="inline-flex gap-1">
            <span class="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span class="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span class="w-1 h-1 bg-current rounded-full animate-bounce"></span>
          </span>
        </p>
      `;
      moodInput.appendChild(feedbackDiv);
      this.currentFeedbackDiv = feedbackDiv;

      // Get AI feedback
      const aiFeedback = await AIHelper.getEmotionalSupport({
        mood: this.selectedMood.value,
        journal: entry.journal,
        tags: entry.tags
      });

      // Save entry
      entries.push(entry);
      localStorage.setItem('moodEntries', JSON.stringify(entries));

      // Create the paragraph for the response
      const responseParagraph = document.createElement('p');
      responseParagraph.className = 'text-sm';
      feedbackDiv.querySelector('p').replaceWith(responseParagraph);

      // Typing animation
      let charIndex = 0;
      const typeWriter = () => {
        if (charIndex < aiFeedback.length) {
          responseParagraph.textContent += aiFeedback.charAt(charIndex);
          charIndex++;
          const delay = Math.random() * (100 - 50) + 50; // Random delay between 50-100ms
          setTimeout(typeWriter, delay);
        }
      };

      // Start typing animation
      typeWriter();
    } else {
      console.error('Could not find mood-input element');
      this.showNotification('AI Response: ' + aiFeedback, 'success');
    }

    this.resetForm();
    this.renderChart();
    this.updateInsights();
    this.showNotification('Entry saved successfully!', 'success');
  }

  resetForm() {
    this.selectedMood = null;
    document.getElementById('journal-text').value = '';
    document.getElementById('tags-text').value = '';
    document.querySelectorAll('#mood-buttons button').forEach(btn => {
      btn.classList.remove('border-primary', 'bg-accent/50');
    });
  }

  getEntries() {
    return JSON.parse(localStorage.getItem('moodEntries') || '[]');
  }

  prepareChartData(entries, days) {
    const today = startOfDay(new Date());
    const labels = [];
    const values = [];

    // Create array of last 'days' days
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      labels.push(format(date, 'MMM d'));

      // Find entry for this date
      const entry = entries.find(e => {
        const entryDate = startOfDay(new Date(e.date));
        return entryDate.getTime() === date.getTime();
      });

      values.push(entry ? entry.mood : null);
    }

    return { labels, values };
  }

  renderChart() {
    const canvas = document.getElementById('moodChartCanvas');
    if (this.chart) {
      this.chart.destroy();
    }

    const entries = this.getEntries();
    const days = this.currentView === 'week' ? 7 : 30;
    const data = this.prepareChartData(entries, days);

    // Check if dark mode is enabled
    const isDarkMode = document.documentElement.classList.contains('dark');

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Mood',
          data: data.values,
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgb(var(--primary))',
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(var(--primary), 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            min: 1,
            max: 5,
            grid: {
              color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(var(--muted-foreground), 0.1)',
              drawBorder: false
            },
            ticks: {
              stepSize: 1,
              color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(var(--foreground), 0.7)',
              callback: value => {
                return this.moods.find(m => m.value === value)?.emoji || value;
              }
            }
          },
          x: {
            grid: {
              color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(var(--muted-foreground), 0.1)',
              drawBorder: false
            },
            ticks: {
              color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(var(--foreground), 0.7)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgb(var(--background))',
            titleColor: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgb(var(--foreground))',
            bodyColor: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgb(var(--foreground))',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(var(--border), 0.5)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const mood = this.moods.find(m => m.value === context.raw);
                return mood ? `${mood.emoji} ${mood.label}` : context.raw;
              }
            }
          }
        }
      }
    });
  }

  changeView(view) {
    this.currentView = view;
    document.querySelectorAll('.chart-button').forEach(btn => {
      btn.classList.remove('bg-primary', 'text-primary-foreground');
      btn.classList.add('bg-secondary', 'text-secondary-foreground');
    });
    document.getElementById(`${view}-view`).classList.add('bg-primary', 'text-primary-foreground');
    document.getElementById(`${view}-view`).classList.remove('bg-secondary', 'text-secondary-foreground');
    this.renderChart();
  }

  updateInsights() {
    const entries = this.getEntries();
    const container = document.getElementById('insights-content');
    container.innerHTML = '';

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="text-muted-foreground">
          No entries yet. Start tracking your mood to see insights!
        </div>
      `;
      return;
    }

    // Average mood
    const avgMood = entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length;
    const avgMoodEmoji = this.moods.find(m => m.value === Math.round(avgMood))?.emoji;

    // Most common tags
    const tagCounts = {};
    entries.forEach(entry => {
      entry.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);

    // Calculate streak
    const streak = this.calculateStreak(entries);

    const insights = [
      {
        title: 'Average Mood',
        content: `${avgMoodEmoji} (${avgMood.toFixed(1)})`
      },
      {
        title: 'Total Entries',
        content: `📝 ${entries.length} entries`
      },
      {
        title: 'Common Tags',
        content: topTags.length ? `🏷️ ${topTags.join(', ')}` : 'No tags yet'
      },
      {
        title: 'Current Streak',
        content: `🔥 ${streak} day${streak !== 1 ? 's' : ''}`
      }
    ];

    insights.forEach(insight => {
      const div = document.createElement('div');
      div.className = 'p-4 rounded-md bg-accent';
      div.innerHTML = `
        <h3 class="font-medium text-sm text-muted-foreground">${insight.title}</h3>
        <p class="mt-1 text-lg">${insight.content}</p>
      `;
      container.appendChild(div);
    });
  }

  calculateStreak(entries) {
    if (entries.length === 0) return 0;

    let streak = 1;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Sort entries by date
    const sortedEntries = entries
      .map(entry => new Date(entry.date))
      .sort((a, b) => b - a);

    // Check if there's an entry for today
    const lastEntryDate = new Date(sortedEntries[0]);
    lastEntryDate.setHours(0, 0, 0, 0);

    if (lastEntryDate.getTime() !== currentDate.getTime()) {
      return 0;
    }

    // Calculate streak
    for (let i = 1; i < sortedEntries.length; i++) {
      const prevDate = new Date(sortedEntries[i - 1]);
      const currDate = new Date(sortedEntries[i]);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);

      const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${type === 'success'
      ? 'bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground'
      : 'bg-destructive text-destructive-foreground dark:bg-destructive dark:text-destructive-foreground'
      }`;
    notification.textContent = message;
    notification.style.transform = 'translateY(0)';

    setTimeout(() => {
      notification.style.transform = 'translateY(150%)';
    }, 3000);
  }
}