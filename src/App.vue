<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { addReagent, getReagents, useReagent } from './api/reagentApi'

const reagents = ref<any[]>([])
const message = ref('')
const useAmounts = reactive<Record<number, number>>({})

const form = reactive({
  reagentName: '',
  lotNo: '',
  quantity: 0,
  unit: '盒',
  expiryDate: '',
  storageLocation: ''
})

async function loadReagents() {
  try {
    reagents.value = await getReagents()
  } catch (error) {
    console.error(error)
    message.value = '讀取試劑資料失敗，請確認後端是否啟動'
  }
}

async function submitForm() {
  try {
    await addReagent(form)
    message.value = '新增成功'

    form.reagentName = ''
    form.lotNo = ''
    form.quantity = 0
    form.unit = '盒'
    form.expiryDate = ''
    form.storageLocation = ''

    await loadReagents()
  } catch (error) {
    console.error(error)
    message.value = '新增失敗，請確認後端 API 是否正常'
  }
}
async function submitUseReagent(id: number) {
  const amount = useAmounts[id] || 0

  if (amount <= 0) {
    message.value = '請輸入使用數量'
    return
  }

  try {
    await useReagent(id, amount)
    message.value = '使用成功，庫存已更新'
    useAmounts[id] = 0
    await loadReagents()
  } catch (error) {
    console.error(error)
    message.value = '使用失敗，請確認庫存是否足夠'
  }
}

function getStatus(expiryDate: string, quantity: number) {
  if (quantity <= 0) {
    return '已用完'
  }

  if (!expiryDate) {
    return '未設定'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return '已過期'
  }

  if (diffDays <= 7) {
    return '7天內到期'
  }

  if (diffDays <= 30) {
    return '30天內到期'
  }

  return '正常'
}

function getStatusClass(expiryDate: string, quantity: number) {
  const status = getStatus(expiryDate, quantity)

  if (status === '正常') return 'status-normal'
  if (status === '30天內到期') return 'status-yellow'
  if (status === '7天內到期') return 'status-orange'
  if (status === '已過期') return 'status-red'
  if (status === '已用完') return 'status-red'

  return 'status-muted'
}
onMounted(() => {
  loadReagents()
})
</script>

<template>
  <div class="page">
    <div class="container">
      <h1>試劑管理系統</h1>

      <section class="card form-card">
        <h2>新增試劑</h2>

        <div class="form">
          <label>試劑名稱</label>
          <input v-model="form.reagentName" type="text" placeholder="例如 Pneumonias Ag" />

          <label>批號</label>
          <input v-model="form.lotNo" type="text" placeholder="例如 LOT6026BK2AC/1" />

          <label>數量</label>
          <input v-model.number="form.quantity" type="number" />

          <label>單位</label>
          <input v-model="form.unit" type="text" />

          <label>到期日</label>
          <input v-model="form.expiryDate" type="date" />

          <label>存放位置</label>
          <input v-model="form.storageLocation" type="text" placeholder="例如 室溫 / 冷藏冰箱A" />

          <button @click="submitForm">新增試劑</button>
        </div>

        <p class="message">{{ message }}</p>
      </section>

      <section class="card">
        <h2>試劑庫存列表</h2>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>試劑名稱</th>
                <th>批號</th>
                <th>庫存</th>
                <th>單位</th>
                <th>到期日</th>
                <th>位置</th>
                <th>狀態</th>
                <th>使用數量</th>
                <th>操作</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="item in reagents" :key="item.reagentId">
                <td>{{ item.reagentId }}</td>
                <td>{{ item.reagentName }}</td>
                <td>{{ item.lotNo }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ item.unit }}</td>
                <td>{{ item.expiryDate }}</td>
                <td>{{ item.storageLocation }}</td>

<td>
  <span :class="getStatusClass(item.expiryDate, item.quantity)">
    {{ getStatus(item.expiryDate, item.quantity) }}
  </span>
</td>

<td>
  <input
    class="use-input"
    v-model.number="useAmounts[item.reagentId]"
    type="number"
    min="1"
    placeholder="數量"
  />
</td>

<td>
  <button class="use-button" @click="submitUseReagent(item.reagentId)">
    使用
  </button>
</td>
              </tr>

              <tr v-if="reagents.length === 0">
                <td colspan="8" class="empty">目前沒有試劑資料</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-card-list">
          <div
            class="reagent-card"
            v-for="item in reagents"
            :key="'mobile-' + item.reagentId"
          >
            <div class="card-header">
              <div>
                <h3>{{ item.reagentName }}</h3>
                <p class="lot">批號：{{ item.lotNo }}</p>
              </div>

              <span :class="getStatusClass(item.expiryDate, item.quantity)">
                {{ getStatus(item.expiryDate, item.quantity) }}
              </span>
            </div>

            <div class="card-info">
              <p><strong>ID：</strong>{{ item.reagentId }}</p>
              <p><strong>庫存：</strong>{{ item.quantity }} {{ item.unit }}</p>
              <p><strong>到期日：</strong>{{ item.expiryDate }}</p>
              <p><strong>位置：</strong>{{ item.storageLocation }}</p>
            </div>

            <div class="use-area">
              <input
                class="use-input"
                v-model.number="useAmounts[item.reagentId]"
                type="number"
                min="1"
                placeholder="輸入使用數量"
              />

              <button class="use-button" @click="submitUseReagent(item.reagentId)">
                使用試劑
              </button>
            </div>
          </div>
          <div v-if="reagents.length === 0" class="empty-card">
            目前沒有試劑資料
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 40px 20px;
  font-family: Arial, "Microsoft JhengHei", sans-serif;
  background:  #eef7ff;

  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.container {
  width: 100%;
  max-width: 1100px;
}

h1 {
  text-align: center;
  margin-bottom: 28px;
  font-size: 32px;
}

h2 {
  margin-bottom: 18px;
}

.card {
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #ddd;
  border-radius: 14px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.form-card {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.form {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 14px;
}

label {
  display: flex;
  align-items: center;
  font-weight: bold;
}

input {
  padding: 9px;
  border: 1px solid #aaa;
  border-radius: 6px;
  font-size: 15px;
}

button {
  grid-column: 2;
  padding: 11px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #2f80ed;
  color: white;
  font-weight: bold;
  font-size: 15px;
}

button:hover {
  background: #1f6fd1;
}

.message {
  margin-top: 14px;
  text-align: center;
  font-weight: bold;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th,
td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: center;
  white-space: nowrap;
}

th {
  background: #fff4e6;
}

.status-normal {
  color: green;
  font-weight: bold;
}

.status-warning {
  color: orange;
  font-weight: bold;
}

.status-danger {
  color: red;
  font-weight: bold;
}

.status-muted {
  color: gray;
  font-weight: bold;
}

.empty {
  text-align: center;
  color: gray;
}

.status-yellow {
  color: #d6a100;
  font-weight: bold;
}

.status-orange {
  color: #f28c28;
  font-weight: bold;
}

.status-red {
  color: red;
  font-weight: bold;
}

.use-input {
  width: 80px;
}

.use-button {
  grid-column: auto;
  padding: 8px 12px;
}

/* 手機卡片版預設隱藏 */
.mobile-card-list {
  display: none;
}

/* 手機版設定 */
@media (max-width: 768px) {
  .page {
    padding: 12px 8px;
  }

  .container {
    max-width: 100%;
  }

  h1 {
    font-size: 24px;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 20px;
    margin-bottom: 14px;
  }

  .card {
    padding: 14px;
    margin-bottom: 16px;
    border-radius: 12px;
  }

  .form {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  label {
    margin-top: 4px;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    font-size: 16px;
  }

  button {
    grid-column: auto;
    width: 100%;
    font-size: 16px;
  }

  /* 手機版隱藏表格 */
  .table-wrapper {
    display: none;
  }

  /* 手機版顯示卡片 */
  .mobile-card-list {
    display: block;
  }

  .reagent-card {
    background: #fff4e6;
    border: 1px solid #f1d1a6;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .card-header h3 {
    margin: 0 0 4px 0;
    font-size: 18px;
  }

  .lot {
    margin: 0;
    color: #666;
    font-size: 14px;
    word-break: break-all;
  }

  .card-info p {
    margin: 6px 0;
    font-size: 15px;
  }

  .use-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }

  .use-input {
    width: 100%;
  }

  .use-button {
    width: 100%;
  }

  .empty-card {
    padding: 16px;
    text-align: center;
    color: gray;
    background: #fff4e6;
    border-radius: 12px;
  }
}
}

/* 強制修正手機畫面偏一邊 */
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

@media screen and (max-width: 768px) {
  .page {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100vh;
    padding: 10px !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  .container {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }

  .card,
  .form-card {
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box !important;
  }

  .form {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }

  .form label {
    width: 100% !important;
    display: block !important;
  }

  .form input {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  button {
    width: 100% !important;
    max-width: 100% !important;
    grid-column: auto !important;
    box-sizing: border-box !important;
  }

  .table-wrapper {
    display: none !important;
  }

  .mobile-card-list {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .reagent-card,
  .empty-card {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .card-header {
    flex-direction: column !important;
    align-items: flex-start !important;
  }
}
</style>