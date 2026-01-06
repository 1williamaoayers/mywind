<template>
  <div class="card">
    <h2><span class="icon">📨</span> 飞书推送测试</h2>
    <p class="desc">发送测试消息验证 Webhook 配置是否正确</p>

    <button class="btn btn-danger" @click="$emit('test', 'danger')">
      🚨 发送红色预警测试
    </button>
    <button class="btn btn-success" @click="$emit('test', 'success')">
      📈 发送绿色利好测试
    </button>
    <button class="btn btn-primary" @click="$emit('test', 'primary')">
      📢 发送蓝色动向测试
    </button>

    <hr class="divider" />

    <button class="btn btn-primary" @click="$emit('process')">
      ⚡ 立即处理待发送预警
    </button>
  </div>
</template>

<script>
export default {
  name: 'AlertPanel',
  props: {
    stats: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['test', 'process']
}
</script>

<style scoped>
.desc {
  color: #888;
  margin-bottom: 16px;
}

.divider {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 16px 0;
}
</style>
