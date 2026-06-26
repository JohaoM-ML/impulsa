'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Nivel } from '@/types'

interface Props {
  nivel: Nivel
  data: { dia: string; total: number }[]
  titulo?: string
}

export function GraficoAdaptativo({ nivel, data, titulo = 'Ventas de la semana' }: Props) {
  const chartData = data.length
    ? data
    : [
        { dia: 'Lun', total: 0 },
        { dia: 'Mar', total: 0 },
        { dia: 'Mié', total: 0 },
        { dia: 'Jue', total: 0 },
        { dia: 'Vie', total: 0 },
        { dia: 'Sáb', total: 0 },
        { dia: 'Dom', total: 0 },
      ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {nivel >= 2 ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={40} />
              <Tooltip formatter={(v: number) => [`S/ ${v.toFixed(2)}`, 'Total']} />
              <Line type="monotone" dataKey="total" stroke="hsl(142 76% 36%)" strokeWidth={2} dot />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={40} />
              <Tooltip formatter={(v: number) => [`S/ ${v.toFixed(2)}`, 'Total']} />
              <Bar dataKey="total" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
