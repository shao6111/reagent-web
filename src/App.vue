<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { addReagent, getReagents, useReagent, deleteReagent } from './api/reagentApi'

const reagents = ref<any[]>([])
const message = ref('')
const useAmounts = reactive<Record<number, number>>({})

const sortedReagents = computed(() => {
  return [...reagents.value].sort((a, b) => {
    const statusA = getStatus(a.expiryDate, a.quantity)
    const statusB = getStatus(b.expiryDate, b.quantity)

    if (statusA === '已用完' && statusB !== '已用完') {
      return 1
    }

    if (statusA !== '已用完' && statusB === '已用完') {
      return -1
    }

    return String(a.reagentName || '').localeCompare(String(b.reagentName || ''), 'en')
  })
})

const currentPage = ref<'home' | 'add' | 'list' | 'use'>('home')

const defaultReagentNames = [
  'FS pneumoniae Ag',
  'Influenza A/B Ag',
  'COVID-19 Ag',
  'RSV Ag',
  'Legionella Ag'
]

const savedReagentNames = localStorage.getItem('reagentNameOptions')

const reagentNameOptions = ref<string[]>(
  savedReagentNames
    ? JSON.parse(savedReagentNames)
    : [...defaultReagentNames].sort((a, b) => a.localeCompare(b, 'en'))
)

const newReagentName = ref('')


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


async function handleDeleteReagent(id: number) {
  const confirmed = confirm('確定要刪除這筆試劑資料嗎？')

  if (!confirmed) {
    return
  }

  try {
    await deleteReagent(id)
    message.value = '刪除成功'
    await loadReagents()
  } catch (error) {
    console.error(error)
    message.value = '刪除失敗'
  }
}

async function submitForm() {
  const missingFields: string[] = []

  const selectedReagentName = form.reagentName.trim()
  const typedReagentName = newReagentName.value.trim()
  const stockInReagentName = typedReagentName || selectedReagentName

  if (!stockInReagentName) {
    missingFields.push('試劑名稱或新增試劑名稱')
  }

  if (!form.lotNo || form.lotNo.trim() === '') {
    missingFields.push('批號')
  }

  if (!form.quantity || Number(form.quantity) <= 0) {
    missingFields.push('數量')
  }

  if (!form.unit || form.unit.trim() === '') {
    missingFields.push('單位')
  }

  if (!form.expiryDate || form.expiryDate.trim() === '') {
    missingFields.push('到期日')
  }

  if (!form.storageLocation || form.storageLocation.trim() === '') {
    missingFields.push('存放位置')
  }

  if (missingFields.length > 0) {
    alert('請填寫必填欄位：' + missingFields.join('、'))
    message.value = '請填寫必填欄位：' + missingFields.join('、')
    return
  }

  try {
    if (typedReagentName && !reagentNameOptions.value.includes(typedReagentName)) {
      reagentNameOptions.value.push(typedReagentName)
      reagentNameOptions.value.sort((a, b) => a.localeCompare(b, 'en'))
      localStorage.setItem('reagentNameOptions', JSON.stringify(reagentNameOptions.value))
    }

    await addReagent({
      reagentName: stockInReagentName,
      lotNo: form.lotNo,
      quantity: Number(form.quantity),
      unit: form.unit,
      expiryDate: form.expiryDate,
      storageLocation: form.storageLocation
    })

    message.value = '試劑入庫成功'

    form.reagentName = ''
    form.lotNo = ''
    form.quantity = 0
    form.unit = '盒'
    form.expiryDate = ''
    form.storageLocation = ''
    newReagentName.value = ''

    await loadReagents()
  } catch (error) {
    console.error(error)
    alert('試劑入庫失敗')
    message.value = '試劑入庫失敗'
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

     <section v-if="currentPage === 'home'" class="home-section">
  <div class="home-menu">
    <button class="menu-button" @click="currentPage = 'add'">
      試劑入庫
    </button>

    <button class="menu-button" @click="currentPage = 'list'">
      試劑庫存列表
    </button>
    
    <button class="menu-button" @click="currentPage = 'use'">
  使用試劑 / 扣庫存
</button>
  </div>

  <div class="home-image-wrap">
    <img
      src="/reagent.png"
      alt="試劑圖片"
      class="home-image"
    />
  </div>
</section> 

<button
  v-if="currentPage !== 'home'"
  class="back-button top-back-button"
  @click="currentPage = 'home'"
>
  返回首頁
</button>

        <section v-if="currentPage === 'add'" class="card form-card">
  <h2>試劑入庫</h2>

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

    <label>新增試劑名稱</label>
<div class="new-reagent-name-row">
  <input
    v-model="newReagentName"
    type="text"
    placeholder="輸入新的試劑名稱"
  />

</div>

          <label>批號</label>
          <input v-model="form.lotNo" type="text" placeholder="例如 LOT6026BK2AC/1" />

          <label>數量</label>
          <input v-model.number="form.quantity" type="number" />

          <label>單位</label>
          <input v-model="form.unit" type="text" />

          <label>到期日</label>
          <input v-model="form.expiryDate" type="date" />
          
          <label>存放位置</label>
           <select v-model="form.storageLocation">
            <option value="">請選擇存放位置</option>
            <option value="室溫">室溫</option>
            <option value="冷藏冰箱A">冷藏冰箱A</option>
            <option value="冷藏冰箱B">冷藏冰箱B</option>
            <option value="冷凍冰箱">冷凍冰箱</option>
            <option value="試劑冰箱">試劑冰箱</option>
      </select>
          <button @click="submitForm">試劑入庫</button>
        </div>

        <p class="message">{{ message }}</p>
      </section>

      <section v-if="currentPage === 'list' || currentPage === 'use'" class="card">
        <h2>
  {{ currentPage === 'use' ? '使用試劑 / 扣庫存' : '試劑庫存列表' }}
</h2>


        
        <div class="table-wrapper">
  <table class="reagent-table">
    <thead>
      <tr>
        <th>試劑資訊</th>
        <th>到期與狀態</th>
        <th>庫存</th>
        <th>位置</th>
        <th v-if="currentPage === 'use'">使用數量</th>
        <th>操作</th>
      </tr>
    </thead>

    <tbody>
      <tr v-for="item in sortedReagents" :key="item.reagentId">
        <td class="reagent-main">
          <div class="reagent-name">{{ item.reagentName }}</div>
          <div class="reagent-lot">批號：{{ item.lotNo }}</div>
        </td>

        <td>
          <div class="expiry-date">{{ item.expiryDate }}</div>
          <span class="status-badge" :class="getStatusClass(item.expiryDate, item.quantity)">
            {{ getStatus(item.expiryDate, item.quantity) }}
          </span>
        </td>

        <td class="stock-text">
          {{ item.quantity }} {{ item.unit }}
        </td>

        <td>
          {{ item.storageLocation }}
        </td>

        <td v-if="currentPage === 'use'">
          <select
            class="use-select"
            v-model.number="useAmounts[item.reagentId]"
          >
            <option value="">選擇使用量</option>
            <option
              v-for="n in 10"
              :key="n"
              :value="n"
            >
              {{ n }}
            </option>
          </select>
        </td>

        <td>
          <button
            v-if="currentPage === 'use'"
            class="use-button"
            @click="submitUseReagent(item.reagentId)"
          >
            使用
          </button>

          <button
            v-else
            class="delete-button"
            @click="handleDeleteReagent(item.reagentId)"
          >
            刪除
          </button>
        </td>
      </tr>

      <tr v-if="reagents.length === 0">
        <td :colspan="currentPage === 'use' ? 6 : 5" class="empty">
          目前沒有試劑資料
        </td>
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
              <p><strong>庫存：</strong>{{ item.quantity }} {{ item.unit }}</p>
              <p><strong>到期日：</strong>{{ item.expiryDate }}</p>
              <p><strong>位置：</strong>{{ item.storageLocation }}</p>
            </div>

            <div v-if="currentPage === 'use'" class="use-area">
          
            <select
  class="use-select"
  v-model.number="useAmounts[item.reagentId]"
>
  <option value="">選擇使用量</option>
  <option
    v-for="n in 10"
    :key="n"
    :value="n"
  >
    {{ n }}
  </option>
</select>

              <button class="use-button" @click="submitUseReagent(item.reagentId)">
                使用試劑
              </button>
            </div>

           <div v-else class="use-area">
  <button class="delete-button" @click="handleDeleteReagent(item.reagentId)">
    刪除
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
  padding: 24px 22px;
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
  font-size: 40px;
}

h2 {
  margin-bottom: 18px;
  text-align: center;
  font-size: 32px;
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
  font-size: 24px;
}

input {
  width: 100%;
  padding: 9px;
  border: 1px solid #aaa;
  border-radius: 6px;
  font-size: 22px;
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
  overflow-x: auto;
}

.reagent-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 12px;
  background: transparent;
  table-layout: fixed;
}

.reagent-table thead th {
  background: #fff4e6;
  color: #4b5563;
  font-size: 18px;
  padding: 14px 10px;
  border: none;
}

.reagent-table tbody tr {
  background: #ffffff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}

.reagent-table td {
  border: none;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  padding: 18px 12px;
  text-align: center;
  vertical-align: middle;
  font-size: 18px;
  color: #4b5563;
  word-break: normal;
  overflow-wrap: break-word;
}

.reagent-main {
  text-align: left !important;
}

.reagent-name {
  font-size: 22px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 6px;
}

.reagent-lot {
  font-size: 15px;
  color: #6b7280;
}

.expiry-date {
  font-size: 17px;
  margin-bottom: 8px;
  color: #374151;
}

.stock-text {
  font-size: 22px !important;
  font-weight: bold;
  color: #1f2937 !important;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: bold;
}

.status-normal {
  background: #dcfce7;
  color: #15803d;
}

.status-warning,
.status-yellow {
  background: #fef3c7;
  color: #b45309;
}

.status-orange {
  background: #ffedd5;
  color: #c2410c;
}

.status-danger,
.status-red {
  background: #fee2e2;
  color: #b91c1c;
}

.status-muted {
  background: #e5e7eb;
  color: #6b7280;
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
  background: #cfe7ff;
  color: #1f4f75;
  border: 1px solid #9cccf5;
}

.use-button:hover {
  background: #bdddfb;
}

.delete-button {
  width: 100%;
  min-width: 0;
  padding: 5px 4px;
  font-size: 12px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

.delete-button:hover {
  background: #b91c1c;
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
  text-align: center;
}

  .card-header {
    display: flex;
    flex-direction: column;
    align-items: center;
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
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
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



 .use-button {
  width: 60%;
  max-width: 220px;
  padding: 10px 14px;
  font-size: 22px;
  border-radius: 10px;
  margin: 10px auto 0;
  display: block;
}


/* 試劑庫存列表標題 */
.table-wrapper h2,
.inventory-title {
  font-size: 44px !important;
  font-weight: 600 !important;
}

@media screen and (max-width: 768px) {
  h1 {
    font-size: 32px !important;
  }

  h2 {
    font-size: 28px !important;
  }

  .reagent-card {
    padding: 18px !important;
  }

  .card-header h3 {
    font-size: 24px !important;
  }

  .lot {
    font-size: 18px !important;
  }

  .card-info p {
    font-size: 20px !important;
  }

  .status-normal,
  .status-yellow,
  .status-orange,
  .status-red,
  .status-muted {
    font-size: 26px !important;
  }

  .use-button,
  .delete-button {
    font-size: 20px !important;
    padding: 12px 10px !important;
  }

  .top-back-button,
  .home-menu .menu-button {
    font-size: 20px !important;
    padding: 14px 16px !important;
  }
}




@media screen and (max-width: 768px) {
  .home-menu {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    flex-wrap: nowrap !important;
    gap: 16px !important;
    width: 100% !important;
  }

  .home-menu .menu-button {
    display: block !important;
    width: 80% !important;
    max-width: 280px !important;
    min-width: 0 !important;
    font-size: 24px !important;
    padding: 16px 20px !important;
    text-align: center !important;
  }
}

  .use-select {
  width: 180px !important;
  max-width: 80% !important;
  padding: 10px 12px !important;
  font-size: 20px !important;
  border: 2px solid #bbb !important;
  border-radius: 10px !important;
  text-align: center !important;
  text-align-last: center !important;
  background-color: white !important;
  margin: 10px auto 14px !important;
  display: block !important;
}

.use-area {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
  margin-top: 14px !important;
}

.use-area .use-button {
  width: 60% !important;
  max-width: 220px !important;
  min-width: 0 !important;
  padding: 10px 14px !important;
  font-size: 22px !important;
  border-radius: 10px !important;
  margin: 10px auto 0 !important;
  display: block !important;
  background: #cfe7ff !important;
  color: #1f4f75 !important;
  border: 1px solid #9cccf5 !important;
}

.use-area .use-button:hover {
  background: #bdddfb !important;
}

.home-section {
  width: 100%;
}

.home-image-wrap {
  margin-top: 38px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.home-image {
  width: 100%;
  max-width: 520px;
  height: auto;
  border-radius: 20px;
  background: white;
  padding: 14px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
}

@media screen and (max-width: 768px) {
  .home-image-wrap {
    margin-top: 28px;
  }

  .home-image {
    max-width: 88%;
    padding: 10px;
    border-radius: 16px;
  }
}


</style>