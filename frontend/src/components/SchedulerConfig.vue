<template>
  <div class="card">
    <h2><span class="icon">⏰</span> 调度配置</h2>
    <p class="desc">设置研报自动生成时间</p>

    <div class="form-group">
      <label>生成时间 (多个用逗号分隔)</label>
      <input 
        v-model="times" 
        type="text" 
        placeholder="例如: 15:30, 21:00"
      />
    </div>

    <div class="checkbox-group">
      <label>
        <input type="checkbox" v-model="workdayOnly" />
        <span>仅工作日执行</span>
      </label>
    </div>

    <button class="btn btn-primary" @click="handleUpdate">
      💾 保存调度配置
    </button>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'SchedulerConfig',
  props: {
    config: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update'],
  
  setup(props, { emit }) {
    const times = ref('15:30, 21:00')
    const workdayOnly = ref(true)

    // 监听 props 变化
    watch(() => props.config, (newConfig) => {
      if (newConfig.times) {
        times.value = newConfig.times.join(', ')
      }
      if (typeof newConfig.workdayOnly === 'boolean') {
        workdayOnly.value = newConfig.workdayOnly
      }
    })

    const handleUpdate = () => {
      const timeArray = times.value.split(',').map(t => t.trim()).filter(Boolean)
      emit('update', { times: timeArray, workdayOnly: workdayOnly.value })
    }

    return { times, workdayOnly, handleUpdate }
  }
}
</script>

<style scoped>
.desc {
  color: #888;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.checkbox-group {
  margin-bottom: 16px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #888;
}

.checkbox-group input {
  width: 18px;
  height: 18px;
}
</style>
