<template>
  <div class="card">
    <h2><span class="icon">📰</span> 新闻查询</h2>

    <!-- 搜索表单 -->
    <div class="search-form">
      <input 
        v-model="keyword" 
        type="text" 
        placeholder="搜索关键词..."
        @keyup.enter="handleSearch"
      />
      <select v-model="level">
        <option value="">全部等级</option>
        <option value="red">🔴 红色预警</option>
        <option value="green">🟢 绿色利好</option>
        <option value="blue">🔵 蓝色动向</option>
      </select>
      <button class="btn btn-primary" @click="handleSearch">
        🔍 搜索
      </button>
    </div>

    <!-- 新闻列表 -->
    <div class="news-list">
      <div v-if="news.length === 0" class="empty">
        暂无新闻数据
      </div>
      <div 
        v-for="item in news" 
        :key="item.id" 
        class="news-item"
        :class="item.alert_level"
      >
        <div class="news-header">
          <span class="level" v-if="item.alert_level">
            {{ levelLabel(item.alert_level) }}
          </span>
          <span class="source">{{ item.source }}</span>
          <span class="time">{{ formatTime(item.publish_time) }}</span>
        </div>
        <div class="news-title">{{ item.title }}</div>
        <div class="news-summary" v-if="item.ai_summary">
          {{ item.ai_summary }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'NewsViewer',
  props: {
    news: {
      type: Array,
      default: () => []
    }
  },
  emits: ['search'],
  
  setup(props, { emit }) {
    const keyword = ref('')
    const level = ref('')

    const handleSearch = () => {
      emit('search', { keyword: keyword.value, level: level.value })
    }

    const levelLabel = (level) => {
      const labels = {
        red: '🔴',
        green: '🟢',
        blue: '🔵'
      }
      return labels[level] || ''
    }

    const formatTime = (time) => {
      if (!time) return ''
      const date = new Date(time)
      return date.toLocaleString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return { keyword, level, handleSearch, levelLabel, formatTime }
  }
}
</script>

<style scoped>
.search-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-form input {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.search-form select {
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.search-form .btn {
  width: auto;
  margin-bottom: 0;
}

.news-list {
  max-height: 400px;
  overflow-y: auto;
}

.news-list .empty {
  color: #666;
  text-align: center;
  padding: 40px;
}

.news-item {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid transparent;
}

.news-item.red {
  border-left-color: #ff4757;
}

.news-item.green {
  border-left-color: #00ff88;
}

.news-item.blue {
  border-left-color: #74b9ff;
}

.news-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.news-header .source {
  color: #888;
}

.news-header .time {
  color: #666;
  margin-left: auto;
}

.news-title {
  color: #e8e8e8;
  font-weight: 500;
  line-height: 1.4;
}

.news-summary {
  color: #888;
  font-size: 0.9rem;
  margin-top: 8px;
  line-height: 1.5;
}
</style>
