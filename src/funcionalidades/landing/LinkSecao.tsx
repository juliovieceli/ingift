import { type ReactNode, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { scrollParaSecao } from './scrollSecao'

interface Props {
  id: string
  children: ReactNode
  className?: string
}

export function LinkSecao({ id, children, className }: Props) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    if (location.pathname !== '/') {
      navigate({ pathname: '/', hash: id })
      return
    }

    window.history.replaceState(null, '', `#${id}`)
    scrollParaSecao(id)
  }

  return (
    <a href={`/#${id}`} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
