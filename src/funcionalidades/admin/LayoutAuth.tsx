import { Outlet } from 'react-router-dom'
import { ProvedorAuth } from '@/contextos/AuthContext'

export function LayoutAuth() {
  return (
    <ProvedorAuth>
      <Outlet />
    </ProvedorAuth>
  )
}
