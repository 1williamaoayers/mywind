<template>
  <div class="card">
    <h2><span class="icon">🤖</span> AI 研报生成</h2>

    <div class="form-group">
      <label>选择股票</label>
      <select v-model="selectedStock">
        <option value="">选择股票...</option>
        <option 
          v-for="stock in stocks" 
          :key="stock._id" 
          :value="stock._id"
        >
          {{ stock.code }} - {{ stock.name }}
        </option>
      </select>
    </div>

    <button 
      class="btn btn-success" 
      @click="handleGenerate"
      :disabled="!selectedStock"
    >
      ✨ 立即生成 AI 复盘
    </button>
    
    <button class="btn btn-primary" @click="$emit('generate-all')">
      📊 批量生成所有研报
    </button>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ReportGenerator',
  props: {
    stocks: {
      type: Array,
      default: () => []
    }
  },
  emits: ['generate', 'generate-all'],
  
  setup(props, { emit }) {
    const selectedStock = ref('')

    const handleGenerate = () => {
      if (selectedStock.value) {
        emit('generate', selectedStock.value)
      }
    }

    return { selectedStock, handleGenerate }
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 6px;
}

.form-group select {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
