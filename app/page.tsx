'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function Home() {
  const [seats, setSeats] = useState<any[]>([])
  const [yourName, setYourName] = useState('')

  useEffect(() => {
    fetchSeats()

    const interval = setInterval(() => {
      fetchSeats()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  async function fetchSeats() {
    const { data } = await supabase.from('seats').select('*').order('seat_number')
    setSeats(data || [])
  }

  async function chooseSeat(seat: any) {
    if (seat.is_occupied) return
    if (!yourName) {
      alert('請先輸入你的名字')
      return
    }
    await supabase
      .from('seats')
      .update({ is_occupied: true, occupied_by: yourName })
      .eq('id', seat.id)
    fetchSeats()
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>座位選擇系統</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="輸入你的名字"
          value={yourName}
          onChange={(e) => setYourName(e.target.value)}
          style={{ padding: '8px', fontSize: '16px', marginRight: '10px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {seats.map((seat) => (
          <button
            key={seat.id}
            onClick={() => chooseSeat(seat)}
            style={{
              padding: '20px',
              fontSize: '16px',
              backgroundColor: seat.is_occupied ? '#ff4444' : '#44bb44',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: seat.is_occupied ? 'not-allowed' : 'pointer',
            }}
          >
            {seat.seat_number}
            <br />
            {seat.is_occupied ? seat.occupied_by : '空位'}
          </button>
        ))}
      </div>
    </main>
  )
}