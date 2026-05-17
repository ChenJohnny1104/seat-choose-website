'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Admin() {
  const [seats, setSeats] = useState<any[]>([])
  const [newSeat, setNewSeat] = useState('')

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

  async function addSeat() {
    if (!newSeat) return
    await supabase.from('seats').insert({ seat_number: newSeat, is_occupied: false })
    setNewSeat('')
    fetchSeats()
  }

  async function deleteSeat(id) {
    await supabase.from('seats').delete().eq('id', id)
    fetchSeats()
  }

  async function resetSeat(id) {
    await supabase.from('seats').update({ is_occupied: false, occupied_by: '' }).eq('id', id)
    fetchSeats()
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>後台管理</h1>

      <div style={{ marginBottom: '30px' }}>
        <h2>新增座位</h2>
        <input
          type="text"
          placeholder="座位編號，例如 B1"
          value={newSeat}
          onChange={(e) => setNewSeat(e.target.value)}
          style={{ padding: '8px', fontSize: '16px', marginRight: '10px' }}
        />
        <button
          onClick={addSeat}
          style={{ padding: '8px 16px', fontSize: '16px', backgroundColor: '#4444ff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          新增
        </button>
      </div>

      <h2>座位列表</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ padding: '10px', border: '1px solid #ccc' }}>座位編號</th>
            <th style={{ padding: '10px', border: '1px solid #ccc' }}>狀態</th>
            <th style={{ padding: '10px', border: '1px solid #ccc' }}>佔用者</th>
            <th style={{ padding: '10px', border: '1px solid #ccc' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {seats.map((seat) => (
            <tr key={seat.id}>
              <td style={{ padding: '10px', border: '1px solid #ccc' }}>{seat.seat_number}</td>
              <td style={{ padding: '10px', border: '1px solid #ccc' }}>
                {seat.is_occupied ? '已佔用' : '空位'}
              </td>
              <td style={{ padding: '10px', border: '1px solid #ccc' }}>
                {seat.occupied_by || '-'}
              </td>
              <td style={{ padding: '10px', border: '1px solid #ccc' }}>
                <button
                  onClick={() => resetSeat(seat.id)}
                  style={{ marginRight: '8px', padding: '6px 12px', backgroundColor: '#ff9900', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  重置
                </button>
                <button
                  onClick={() => deleteSeat(seat.id)}
                  style={{ padding: '6px 12px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}