<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { addReagent, getReagents, useReagent } from './api/reagentApi'

const reagents = ref<any[]>([])
const message = ref('')
const useAmounts = reactive<Record<number, number>>({})

const sortedReagents = computed(() => {
  return [...reagents.value].sort((a, b) => {
    return String(a.reagentName || '').localeCompare(String(b.reagentName || ''), 'en')
  })
})

const currentPage = ref<'home' | 'add' | 'list' | 'use'>('home')
const reagentNameOptions = [
  'FS pneumoniae Ag',
  'Influenza A/B Ag',
  'COVID-19 Ag',
  'RSV Ag',
  'Legionella Ag'
].sort((a, b) => a.localeCompare(b, 'en'))
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

      <section v-if="currentPage === 'home'" class="home-menu">
       <button class="menu-button" @click="currentPage = 'add'">
       新增試劑
       </button>

      <button class="menu-button" @click="currentPage = 'list'">
      試劑庫存列表
      </button>

      <button class="menu-button" @click="currentPage = 'use'">
      使用試劑 / 扣庫存
      </button>  
      </section>

<button
  v-if="currentPage !== 'home'"
  class="back-button top-back-button"
  @click="currentPage = 'home'"
>
  返回首頁
</button>

        <section v-if="currentPage === 'add'" class="card form-card">
  <h2>新增試劑</h2>

    <div class="form">
    <label>試劑名稱</label>
    <select v-model="form.reagentName">
      <option value="">請選擇試劑名稱</option>
      <option
        v-for="name in reagentNameOptions"
        :key="name"
        :value="name"
      >
        {{ name }}
      </option>
    </select>

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

      <section v-if="currentPage === 'list' || currentPage === 'use'" class="card"></section>
        <h2>
  {{ currentPage === 'use' ? '使用試劑 / 扣庫存' : '試劑庫存列表' }}
</h2>


        <div class="table-wrapper">
          <table>
           <colgroup v-if="currentPage === 'use'">
            <col style="width: 18%" />
            <col style="width: 14%" />
            <col style="width: 7%" />
            <col style="width: 10%" />
            <col style="width: 12%" />
            <col style="width: 7%" />
            <col style="width: 8%" />
            <col style="width: 14%" />
            <col style="width: 10%" />
           </colgroup>

           <colgroup v-else>
           <col style="width: 24%" />
           <col style="width: 18%" />
           <col style="width: 10%" />
           <col style="width: 12%" />
           <col style="width: 14%" />
           <col style="width: 10%" />
           <col style="width: 12%" />
           </colgroup>
            <thead>
              <tr>
                <th>試劑名稱</th>
                <th>批號</th>
                <th>庫存</th>
                <th>單位</th>
                <th>到期日</th>
                <th>位置</th>
                <th>狀態</th>
                <th v-if="currentPage === 'use'">使用數量</th>
                <th v-if="currentPage === 'use'">操作</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="item in sortedReagents" :key="item.reagentId">
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

<td v-if="currentPage === 'use'">
  <input
    class="use-input"
    v-model.number="useAmounts[item.reagentId]"
    type="number"
    min="1"
    placeholder="數量"
  />
</td>

<td v-if="currentPage === 'use'">
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
            v-for="item in sortedReagents"
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

            <div v-if="currentPage === 'use'" class="use-area">
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
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

:global(html),
:global(body),
:global(#app) {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

.page {
  min-height: 100vh;
  padding: 24px 12px;
  font-family: Arial, "Microsoft JhengHei", sans-serif;
  background: #eef7ff;
  overflow-x: hidden;
}

.container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  margin-bottom: 28px;
  font-size: 32px;
}

h2 {
  margin-bottom: 18px;
  text-align: center;
}

.card {
  width: 100%;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #ddd;
  border-radius: 14px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.form-card {
  width: 100%;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}
.home-menu {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.home-menu .menu-button {
  background: #fff4cc;
  color: #333;
  border: 1px solid #e6d38a;
  border-radius: 10px;
  padding: 14px 20px;
  min-width: 180px;
  width: auto;
  grid-column: auto;
}

.home-menu .menu-button:hover {
  background: #ffe9a8;
}
.form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

label {
  display: block;
  font-weight: bold;
  margin-top: 6px;
}

input {
  width: 100%;
  padding: 9px;
  border: 1px solid #aaa;
  border-radius: 6px;
  font-size: 15px;
}

button {
  width: 100%;
  grid-column: auto;
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
  overflow-x: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th,
td {
  border: 1px solid #ccc;
  padding: 6px 4px;
  text-align: center;
  vertical-align: middle;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-size: 14px;
}

th {
  background: #fff4e6;
}

.status-normal {
  color: green;
  font-weight: bold;
}

.status-warning,
.status-yellow {
  color: #d6a100;
  font-weight: bold;
}

.status-orange {
  color: #f28c28;
  font-weight: bold;
}

.status-danger,
.status-red {
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

.use-input {
  width: 80px;
}

.use-button {
  grid-column: auto;
  padding: 8px 12px;
}

/* 電腦版先隱藏手機卡片 */
.mobile-card-list {
  display: none;
}

/* 手機版 */
@media screen and (max-width: 768px) {
  .page {
    width: 100%;
    max-width: 100%;
    padding: 10px;
    margin: 0;
  }

  .container {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
  }

  h1 {
    font-size: 26px;
    margin-bottom: 18px;
  }

  h2 {
    font-size: 22px;
    margin-bottom: 14px;
  }

  .card,
  .form-card {
    width: 100%;
    max-width: 100%;
    padding: 14px;
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 16px;
    border-radius: 12px;
  }

  .form {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  label {
    width: 100%;
    display: block;
    margin-top: 4px;
  }

  input {
    width: 100%;
    max-width: 100%;
    font-size: 16px;
  }

  button {
    width: 100%;
    max-width: 100%;
    grid-column: auto;
    font-size: 16px;
  }

  .table-wrapper {
    display: none;
  }

  .mobile-card-list {
    display: block;
    width: 100%;
    max-width: 100%;
  }

  .reagent-card {
    width: 100%;
    max-width: 100%;
    background: #fff4e6;
    border: 1px solid #f1d1a6;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 10px;
  }

  .card-header h3 {
    margin: 0;
    font-size: 18px;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .lot {
    margin: 0;
    color: #666;
    font-size: 14px;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .card-info p {
    margin: 6px 0;
    font-size: 15px;
    word-break: break-word;
    overflow-wrap: anywhere;
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
    width: 100%;
    max-width: 100%;
    padding: 16px;
    text-align: center;
    color: gray;
    background: #fff4e6;
    border-radius: 12px;
  }
}
select {
  width: 100%;
  max-width: 100%;
  padding: 9px;
  border: 1px solid #aaa;
  border-radius: 6px;
  font-size: 16px;
  box-sizing: border-box;
  background: white;
}

  .home-menu {
    flex-direction: row;
    justify-content: center;
    gap: 10px;
  }

  .home-menu .menu-button {
    width: auto;
    min-width: 120px;
    font-size: 15px;
    padding: 12px 10px;
  }

.form select {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.top-back-button {
  display: block;
  width: auto;
  min-width: 160px;
  margin: 8px auto 16px auto;
  background: #2f80ed;
}

.use-input {
  width: 100%;
  max-width: 90px;
  box-sizing: border-box;
  padding: 6px;
  font-size: 14px;
}

.use-button {
  width: 100%;
  min-width: 0;
  padding: 6px 8px;
  font-size: 14px;
}

</style>