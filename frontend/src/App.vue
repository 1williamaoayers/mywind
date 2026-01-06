<template>
  <div class="app">
    <header class="header">
      <h1>🌊 MyWind AI 投研助手</h1>
      <p class="subtitle">全网矩阵式投研系统控制台 v2.0</p>
    </header>

    <main class="main">
      <div class="card-grid">
        <!-- 系统状态卡片 -->
        <StatusCard 
          :status="systemStatus" 
          @refresh="refreshStatus" 
        />

        <!-- 股票管理卡片 -->
        <StockManager 
          :stocks="stocks" 
          @add="addStock"
          @delete="deleteStock"
        />

        <!-- 新闻查询卡片 -->
        <NewsViewer 
          :news="news"
          @search="searchNews"
        />

        <!-- 预警推送卡片 -->
        <AlertPanel 
          :stats="alertStats"
          @test="testAlert"
          @process="processAlerts"
        />

        <!-- AI 研报卡片 -->
        <ReportGenerator 
          :stocks="stocks"
          @generate="generateReport"
        />

        <!-- 调度配置卡片 -->
        <SchedulerConfig 
          :config="schedulerConfig"
          @update="updateSchedule"
        />
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import api from './api/index.js'

// 组件导入（待创建）
import StatusCard from './components/StatusCard.vue'
import StockManager from './components/StockManager.vue'
import NewsViewer from './components/NewsViewer.vue'
import AlertPanel from './components/AlertPanel.vue'
import ReportGenerator from './components/ReportGenerator.vue'
import SchedulerConfig from './components/SchedulerConfig.vue'

export default {
  name: 'App',
  
  components: {
    StatusCard,
    StockManager,
    NewsViewer,
    AlertPanel,
    ReportGenerator,
    SchedulerConfig
  },

  setup() {
    // 响应式状态
    const systemStatus = ref({
      mongoConnected: false,
      feishuWebhook: false,
      stockCount: 0,
      newsCount: 0
    })
    
    const stocks = ref([])
    const news = ref([])
    const alertStats = ref({})
    const schedulerConfig = ref({})

    // 刷新系统状态
    const refreshStatus = async () => {
      try {
        const [configRes, stocksRes, newsRes] = await Promise.all([
          api.get('/config/status'),
          api.get('/stocks'),
          api.get('/news/stats')
        ])
        
        systemStatus.value = {
          mongoConnected: configRes.data.data?.mongoConnected,
          feishuWebhook: configRes.data.data?.feishuWebhook,
          stockCount: stocksRes.data.data?.length || 0,
          newsCount: newsRes.data.data?.totalCount || 0
        }
        
        stocks.value = stocksRes.data.data || []
      } catch (error) {
        console.error('刷新状态失败:', error)
      }
    }

    // 添加股票
    const addStock = async (stockData) => {
      try {
        await api.post('/stocks', stockData)
        await refreshStatus()
      } catch (error) {
        console.error('添加股票失败:', error)
      }
    }

    // 删除股票
    const deleteStock = async (id) => {
      try {
        await api.delete(`/stocks/${id}`)
        await refreshStatus()
      } catch (error) {
        console.error('删除股票失败:', error)
      }
    }

    // 搜索新闻
    const searchNews = async (params) => {
      try {
        const res = await api.get('/news', { params })
        news.value = res.data.data || []
      } catch (error) {
        console.error('搜索新闻失败:', error)
      }
    }

    // 测试预警
    const testAlert = async (type) => {
      try {
        await api.post('/alerts/test', { type })
      } catch (error) {
        console.error('测试预警失败:', error)
      }
    }

    // 处理待发送预警
    const processAlerts = async () => {
      try {
        await api.post('/alerts/process')
      } catch (error) {
        console.error('处理预警失败:', error)
      }
    }

    // 生成研报
    const generateReport = async (stockId) => {
      try {
        await api.post('/reports/generate', { stockId })
      } catch (error) {
        console.error('生成研报失败:', error)
      }
    }

    // 更新调度
    const updateSchedule = async (config) => {
      try {
        await api.post('/scheduler/report', config)
      } catch (error) {
        console.error('更新调度失败:', error)
      }
    }

    // 页面加载时刷新
    onMounted(() => {
      refreshStatus()
    })

    return {
      systemStatus,
      stocks,
      news,
      alertStats,
      schedulerConfig,
      refreshStatus,
      addStock,
      deleteStock,
      searchNews,
      testAlert,
      processAlerts,
      generateReport,
      updateSchedule
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
  color: #e8e8e8;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5rem;
  background: linear-gradient(90deg, #00d9ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
}

.subtitle {
  color: #888;
  font-size: 1.1rem;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

/* 卡片基础样式 */
.card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, #0984e3, #74b9ff);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #00b894, #00d9a5);
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #ff4757, #ff6b81);
  color: white;
}

.btn:hover {
  transform: scale(1.02);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

/* 响应式 */
@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
  
  .header h1 {
    font-size: 1.8rem;
  }
}
</style>
