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
</style>