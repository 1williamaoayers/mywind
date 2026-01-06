<template>
  <div class="card">
    <h2><span class="icon">📈</span> 股票管理</h2>

    <!-- 添加股票表单 -->
    <div class="form-group">
      <label>市场类型</label>
      <select v-model="form.market">
        <option value="hk">🇭🇰 港股</option>
        <option value="us">🇺🇸 美股</option>
        <option value="sh">🇨🇳 上证</option>
        <option value="sz">🇨🇳 深证</option>
      </select>
    </div>

    <div class="form-group">
      <label>股票代码</label>
      <input 
        v-model="form.code" 
        type="text" 
        placeholder="例如: 09618 (京东)"
      />
    </div>

    <button class="btn btn-success" @click="handleAdd">
      ➕ 添加股票
    </button>

    <!-- 股票列表 -->
    <div class="stock-list">
      <label>已添加的股票</label>
      <div v-if="stocks.length === 0" class="empty">
        暂无股票，请添加
      </div>
      <div 
        v-for="stock in stocks" 
        :key="stock._id" 
        class="stock-item"
      >
        <span class="market">{{ marketLabel(stock.market) }}</span>
        <span class="code">{{ stock.code }}</span>
        <span class="name">{{ stock.name }}</span>
        <button class="btn-delete" @click="$emit('delete', stock._id)">
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue'

export default {
  name: 'StockManager',
  props: {
    stocks: {
      type: Array,
      default: () => []
    }
  },
  emits: ['add', 'delete'],
  
  setup(props, { emit }) {
    const form = reactive({
      market: 'hk',
      code: ''
    })

    const handleAdd = () => {
      if (!form.code) return
      emit('add', { market: form.market, code: form.code })
      form.code = ''
    }

    const marketLabel = (market) => {
      const labels = {
        hk: '🇭🇰',
        us: '🇺🇸',
        sh: '🇨🇳',
        sz: '🇨🇳'
      }
      return labels[market] || market
    }

    return { form, handleAdd, marketLabel }
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 6px;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stock-list {
  margin-top: 16px;
}

.stock-list label {
  color: #888;
  font-size: 0.9rem;
}

.stock-list .empty {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
}

.stock-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-top: 8px;
}

.stock-item .market {
  font-size: 1.2rem;
}

.stock-item .code {
  color: #00d9ff;
  font-weight: 600;
}

.stock-item .name {
  flex: 1;
  color: #e8e8e8;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-delete:hover {
  opacity: 1;
}
</style>
