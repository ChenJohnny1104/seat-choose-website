'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function getSession() {
  if (typeof window === 'undefined') return null
  const session = localStorage.getItem('session')
  return session ? JSON.parse(session) : null
}

function setSession(user: any) {
  localStorage.setItem('session', JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem('session')
}

export default function Home() {
  const [session, setSessionState] = useState<any>(null)
  const [seats, setSeats] = useState<any[]>([])
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const [submittedSeat, setSubmittedSeat] = useState<string | null>(null)
  const [isCounting, setIsCounting] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [countdownDone, setCountdownDone] = useState(false)
  const [page, setPage] = useState<'main' | 'login' | 'register'>('main')
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [regId, setRegId] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regMessage, setRegMessage] = useState('')

  useEffect(() => {
    const s = getSession()
    setSessionState(s)
    fetchSeats()
    fetchGameState()
    if (s) fetchSubmittedSeat(s)

    const interval = setInterval(() => {
      fetchSeats()
      fetchGameState()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  async function fetchSeats() {
    const { data } = await supabase.from('seats').select('*')
    setSeats(data || [])
  }

  async function fetchGameState() {
    const { data } = await supabase.from('game_state').select('*').eq('id', 1).single()
    if (!data) return
    setIsCounting(data.is_counting)
    if (data.is_counting && data.countdown_started_at) {
      const started = new Date(data.countdown_started_at).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - started) / 1000)
      const remaining = Math.max(0, 10 - elapsed)
      setCountdown(remaining)
      setCountdownDone(remaining === 0)
    } else {
      setCountdown(10)
      setCountdownDone(false)
    }
  }

  async function fetchSubmittedSeat(s: any) {
    const { data } = await supabase.from('users').select('current_seat').eq('id', s.id).single()
    if (data) setSubmittedSeat(data.current_seat)
  }

  async function handleLogin() {
    setLoginError('')
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('student_id', parseInt(loginId))
      .eq('password', loginPassword)
      .single()

    if (!data) {
      setLoginError('座號或密碼錯誤')
      return
    }
    if (!data.confirmed) {
      setLoginError('請先到信箱確認註冊')
      return
    }
    setSession(data)
    setSessionState(data)
    setPage('main')
    fetchSubmittedSeat(data)
  }

  async function handleRegister() {
    setRegMessage('')

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('student_id', parseInt(regId))
      .maybeSingle()

    if (existing) {
      setRegMessage('此座號已被註冊')
      return
    }

    const { error } = await supabase
      .from('users')
      .insert({
        student_id: parseInt(regId),
        password: regPassword,
        email: regEmail,
        confirmed: false,
        score: 0,
      })

    if (error) {
      setRegMessage('註冊失敗，請再試一次')
      return
    }

    setRegMessage('註冊成功！請等待管理員驗證後即可登入')
  }

  async function handleSubmitSeat() {
    if (!selectedSeat || !session) return
    await supabase
      .from('users')
      .update({ current_seat: selectedSeat })
      .eq('id', session.id)
    setSubmittedSeat(selectedSeat)
  }

  function handleSeatClick(seatCode: string) {
    const seat = seats.find((s: any) => s.seat_code === seatCode)
    if (seat?.is_permanent) return
    if (countdownDone) return
    if (selectedSeat === seatCode) {
      setSelectedSeat(null)
    } else {
      setSelectedSeat(seatCode)
    }
  }

  function getSeatStyle(seatCode: string): React.CSSProperties {
    const seat = seats.find((s: any) => s.seat_code === seatCode)
    const isPermanent = seat?.is_permanent
    const isSubmitted = submittedSeat === seatCode
    const isSelected = selectedSeat === seatCode

    let backgroundColor = 'white'
    let border = '1px solid #ccc'
    let cursor: React.CSSProperties['cursor'] = 'pointer'
    let transform = 'scale(1)'

    if (isPermanent) {
      backgroundColor = '#cccccc'
      cursor = 'not-allowed'
    } else if (isSelected) {
      backgroundColor = '#add8e6'
      border = '3px solid #00008b'
      transform = 'scale(1.1)'
    } else if (isSubmitted) {
      backgroundColor = '#add8e6'
    }

    return {
      backgroundColor, border, cursor, transform,
      transition: 'all 0.2s', width: '60px', height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '6px', fontSize: '12px', fontWeight: 'bold'
    }
  }

  function getResultSeatStyle(seatCode: string): React.CSSProperties {
    const seat = seats.find((s: any) => s.seat_code === seatCode)
    return {
      width: '60px', height: '60px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', borderRadius: '6px', fontSize: '12px',
      fontWeight: 'bold', border: '1px solid #ccc',
      backgroundColor: seat?.is_permanent ? '#add8e6' : 'white'
    }
  }

  const rows = [1, 2, 3, 4, 5, 6]
  const cols = [1, 2, 3, 4, 5, 6]

  if (page === 'login') {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
        <h1>登入</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            placeholder="請輸入座號（例如1）"
            value={loginId}
            onChange={e => setLoginId(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          <input
            type="password"
            placeholder="請輸入密碼"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
          <button onClick={handleLogin} style={{ padding: '10px', backgroundColor: '#00008b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>登入</button>
          <button onClick={() => setPage('main')} style={{ padding: '10px', backgroundColor: '#ccc', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>返回</button>
        </div>
      </main>
    )
  }

  if (page === 'register') {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
        <h1>註冊</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            placeholder="請輸入座號（例如1）"
            value={regId}
            onChange={e => setRegId(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          <input
            type="password"
            placeholder="請設定密碼"
            value={regPassword}
            onChange={e => setRegPassword(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          <input
            placeholder="請輸入信箱"
            value={regEmail}
            onChange={e => setRegEmail(e.target.value)}
            style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          {regMessage && <p style={{ color: regMessage.includes('成功') ? 'green' : 'red' }}>{regMessage}</p>}
          <button onClick={handleRegister} style={{ padding: '10px', backgroundColor: '#00008b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>註冊</button>
          <button onClick={() => setPage('main')} style={{ padding: '10px', backgroundColor: '#ccc', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>返回</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>座位選擇系統</h1>
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>座號 {session.student_id}</span>
            <button onClick={() => { clearSession(); setSessionState(null); setSubmittedSeat(null) }} style={{ padding: '6px 12px', backgroundColor: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>登出</button>
          </div>
        )}
      </div>

      {session && (
        <div style={{ marginBottom: '40px' }}>
          <h2>結果區</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 60px)', gap: '8px' }}>
            {rows.map(row => cols.map(col => {
              const code = `${row}-${col}`
              if (code === '1-6') return <div key={code} style={{ width: '60px', height: '60px' }} />
              return <div key={code} style={getResultSeatStyle(code)}>{code}</div>
            }))}
          </div>
        </div>
      )}

      <div>
        <h2>選位區</h2>
        {!session ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setPage('login')} style={{ padding: '12px 24px', backgroundColor: '#00008b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>登入</button>
            <button onClick={() => setPage('register')} style={{ padding: '12px 24px', backgroundColor: '#444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>註冊</button>
          </div>
        ) : (
          <div>
            {isCounting && (
              <div style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 'bold', color: countdown <= 3 ? 'red' : 'black' }}>
                倒數：{countdown} 秒
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 60px)', gap: '8px', marginBottom: '16px' }}>
              {rows.map(row => cols.map(col => {
                const code = `${row}-${col}`
                if (code === '1-6') return <div key={code} style={{ width: '60px', height: '60px' }} />
                return (
                  <div
                    key={code}
                    onClick={() => !countdownDone && handleSeatClick(code)}
                    style={getSeatStyle(code)}
                  >
                    {code}
                  </div>
                )
              }))}
            </div>
            <button
              onClick={handleSubmitSeat}
              disabled={!selectedSeat || countdownDone}
              style={{
                padding: '12px 24px', fontSize: '16px', border: 'none', borderRadius: '6px',
                cursor: selectedSeat && !countdownDone ? 'pointer' : 'not-allowed',
                backgroundColor: selectedSeat && !countdownDone ? '#00008b' : '#ccc',
                color: 'white'
              }}
            >
              送出
            </button>
          </div>
        )}
      </div>
    </main>
  )
}