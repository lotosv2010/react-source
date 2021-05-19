import {useContext} from 'react'
import RouterContext from './RouterContext'

export function useParams() {
  const context = useContext(RouterContext)
  return context.match?.params
}
export function useHistory() {
  const context = useContext(RouterContext)
  return context.history

}
export function useLocation() {
  const context = useContext(RouterContext)
  return context.location
}