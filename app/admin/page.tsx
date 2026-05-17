'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const ADMIN_PASSWORD = 'admin123'

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [users, setUsers] = useState<any[]>([])
  const [seats, setSeats] = useState<any[]>([])
  const [gameState, setGameState] = useState<any>(null)
  const [isCounting, setIsCounting] = useState(false)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (!isLoggedIn) return
    fetchAll()
    const interval = setInterval(fetchAll, 3000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  useEffect(() => {
    if (!isCounting) return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isCounting])

  async function fetchAll() {
    const { data: u } = await supabase.from('users').select('*').order('student_id')
    const { data: s } = await supabase.from('seats').select('*').order('seat_code')
    const { data: g } = await supabase.from('game_state').select('*').eq('id', 1).single()
    setUsers(u || [])
    setSeats(s || [])
    setGameState(g)
    setIsCounting(g?.is_counting || false)
  }

  async function handleSettle() {
    // 開始倒數
    await supabase.from('game_state').update({
      is_counting: true,
      countdown_started_at: new Date().toISOString()
    }).eq('id', 1)
    setIsCounting(true)
    setCountdown(10)

    // 等10秒後結算
    setTimeout(async () => {
      await supabase.from('game_state').update({ is_counting: false }).eq('id', 1)
      setIsCounting(false)
      await calculateResults()
    }, 10000)
  }

  async function calculateResults() {
    const { data: u } = await supabase.from('users').select('*').order('student_id')
    const { data: s } = await supabase.from('seats').select('*')
    if (!u || !s) return

    const rows = [1, 2, 3, 4, 5, 6]
    const cols = [1, 2, 3, 4, 5, 6]
    const seatOrder: string[] = []

    for (const row of rows) {
      for (const col of cols) {
        const code = `${row}-${col}`
        if (code === '1-6') continue
        const seat = s.find((seat: any) => seat.seat_code === code)
        if (!seat?.is_permanent) seatOrder.push(code)
      }
    }

    const taken = new Set<string>()

    for (const seatCode of seatOrder) {
      const candidates = u.filter((user: any) => user.current_seat === seatCode)
      if (candidates.length === 0) continue

      const maxScore = Math.max(...candidates.map((c: any) => c.score))
      const topCandidates = candidates.filter((c: any) => c.score === maxScore)
      const winner = topCandidates[Math.floor(Math.random() * topCandidates.length)]

      // 把座位永久給贏家
      await supabase.from('seats').update({
        is_permanent: true,
        owner_id: winner.id
      }).eq('seat_code', seatCode)

      taken.add(seatCode)
    }

    // 清除所有人的當前選擇
    await supabase.from('users').update({ current_seat: null }).neq('id', 0)
    fetchAll()
  }

  async function updateUser(id: number, field: string, value: any) {
    await supabase.from('users').update({ [field]: value }).eq('id', id)
    fetchAll()
  }

  async function deleteUser(id: number) {
    await supabase.from('users').delete().eq('id', id)
    fetchAll()
  }

  async function resetSeat(seatCode: string) {
    await supabase.from('seats').update({ is_permanent: false, owner_id: null }).eq('seat_code', seatCode)
    fetchAll()
  }

  function handleLogin() {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsLoggedIn(true)
    } else {
      setPasswordError('密碼錯誤')
    }
  }

  const rows = [1, 2, 3, 4, 5, 6]
  const cols = [1, 2, 3, 4, 5, 6]

  if (!isLoggedIn) {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
        <h1>後台登入</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            placeholder="請輸入後台密碼"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          {passwordError && <p style={{ color: 'red' }}>{passwordError}</p>}
          <button onClick={handleLogin} style={{ padding: '10px', backgroundColor: '#00008b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>登入</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>後台管理</h1>

      {/* 結算區 */}
      <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>回合控制</h2>
        {isCounting ? (
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: countdown <= 3 ? 'red' : 'black' }}>
            倒數中：{countdown} 秒
          </div>
        ) : (
          <button
            onClick={handleSettle}
            style={{ padding: '12px 24px', backgroundColor: '#00008b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}
          >
            開始結算
          </button>
        )}
      </div>

      {/* 座位狀態 */}
      <div style={{ marginBottom: '40px' }}>
        <h2>座位狀態</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 70px)', gap: '8px' }}>
          {rows.map(row => cols.map(col => {
            const code = `${row}-${col}`
            if (code === '1-6') return <div key={code} style={{ width: '70px', height: '70px' }} />
            const seat = seats.find((s: any) => s.seat_code === code)
            const owner = seat?.owner_id ? users.find((u: any) => u.id === seat.owner_id) : null
            return (
              <div key={code} style={{
                width: '70px', height: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                backgroundColor: seat?.is_permanent ? '#add8e6' : 'white',
                border: '1px solid #ccc', borderRadius: '6px', fontSize: '11px', cursor: seat?.is_permanent ? 'pointer' : 'default'
              }}
                onClick={() => seat?.is_permanent && resetSeat(code)}
              >
                <div>{code}</div>
                {owner && <div style={{ color: '#555' }}>#{owner.student_id}</div>}
                {seat?.is_permanent && <div style={{ color: 'red', fontSize: '10px' }}>點擊重置</div>}
              </div>
            )
          }))}
        </div>
      </div>

      {/* 帳號管理 */}
      <div>
        <h2>帳號管理</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={th}>座號</th>
              <th style={th}>積分</th>
              <th style={th}>當前選擇</th>
              <th style={th}>密碼</th>
              <th style={th}>信箱</th>
              <th style={th}>已驗證</th>
              <th style={th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id}>
                <td style={td}>{user.student_id}</td>
                <td style={td}>
                  <input
                    type="number"
                    defaultValue={user.score}
                    onBlur={e => updateUser(user.id, 'score', parseInt(e.target.value))}
                    style={{ width: '60px', padding: '4px' }}
                  />
                </td>
                <td style={td}>{user.current_seat || '-'}</td>
                <td style={td}>
                  <input
                    defaultValue={user.password}
                    onBlur={e => updateUser(user.id, 'password', e.target.value)}
                    style={{ width: '100px', padding: '4px' }}
                  />
                </td>
                <td style={td}>
                  <input
                    defaultValue={user.email}
                    onBlur={e => updateUser(user.id, 'email', e.target.value)}
                    style={{ width: '160px', padding: '4px' }}
                  />
                </td>
                <td style={td}>{user.confirmed ? '✅' : '❌'}</td>
                <td style={td}>
                  <button
                    onClick={() => updateUser(user.id, 'confirmed', true)}
                    style={{ marginRight: '6px', padding: '4px 8px', backgroundColor: '#44bb44', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    手動驗證
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    style={{ padding: '4px 8px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

const th: React.CSSProperties = { padding: '10px', border: '1px solid #ccc', textAlign: 'left' }
const td: React.CSSProperties = { padding: '10px', border: '1px solid #ccc' }