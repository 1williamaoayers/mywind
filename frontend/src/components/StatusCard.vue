<template>
  <div class="card">
    <h2><span class="icon">📊</span> 系统状态</h2>
    
    <div class="status-grid">
      <div class="status-item">
        <div class="label">MongoDB</div>
        <div class="value" :class="status.mongoConnected ? 'success' : 'danger'">
          {{ status.mongoConnected ? '✅ 已连接' : '❌ 未连接' }}
        </div>
      </div>
      <div class="status-item">
        <div class="label">飞书 Webhook</div>
        <div class="value" :class="status.feishuWebhook ? 'success' : 'danger'">
          {{ status.feishuWebhook ? '✅ 已配置' : '❌ 未配置' }}
        </div>
      </div>
      <div class="status-item">
        <div class="label">监控股票</div>
        <div class="value">{{ status.stockCount }}</div>
      </div>
      <div class="status-item">
        <div class="label">今日采集</div>
        <div class="value">{{ status.newsCount }}</div>
      </div>
    </div>

    <button class="btn btn-primary" @click="$emit('refresh')">
      🔄 刷新状态
    </button>
  </div>
</template>

<script>
export default {
  name: 'StatusCard',
  props: {
    status: {
      type: Object,
      default: () => ({
        mongoConnected: false,
        feishuWebhook: false,
        stockCount: 0,
        newsCount: 0
      })
    }
  },
  emits: ['refresh']
}
</script>

<style scoped>
.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.status-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
}

.status-item .label {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 4px;
}

.status-item .value {
  font-size: 1.2rem;
  font-weight: 600;
}

.status-item .value.success {
  color: #00ff88;
}

.status-item .value.danger {
  color: #ff4757;
}
</style>
