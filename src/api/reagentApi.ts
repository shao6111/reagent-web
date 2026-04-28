const API_BASE_URL ='https://reagent-api-production.up.railway.app'

export async function getReagents() {
  const response = await fetch(`${API_BASE_URL}/api/reagents`)

  if (!response.ok) {
    throw new Error('查詢試劑資料失敗')
  }

  return await response.json()
}

export async function addReagent(reagent: any) {
  const response = await fetch(`${API_BASE_URL}/api/reagents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reagent)
  })

  if (!response.ok) {
    throw new Error('新增試劑失敗')
  }

  return await response.json()
}

export async function useReagent(id: number, amount: number) {
  const response = await fetch(`${API_BASE_URL}/api/reagents/${id}/use?amount=${amount}`, {
    method: 'PUT'
  })

  if (!response.ok) {
    throw new Error('扣庫存失敗，請確認庫存數量')
  }

  return await response.json()
}