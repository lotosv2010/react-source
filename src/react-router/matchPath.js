import {pathToRegexp} from 'path-to-regexp'

function compilePath(path, options) {
  const keys = []
  const regexp = pathToRegexp(path, keys, options)
  return {regexp, keys}
}
/**
 * 匹配路径
 * @param {当前的路径} pathname 
 * @param {选项：path/exact/strict/sensitive} options 
 */
function matchPath(pathname, options={}) {
  // todo: exact精确匹配(是否只匹配前缀), strict是否是严格模式,sensitive是否区分大小写，大小写敏感
  const {path="/", exact = false, strict=false,sensitive=false} = options
  const {regexp, keys} = compilePath(path, {
    end: exact,
    strict,
    sensitive
  })
  const match = regexp.exec(pathname)
  // 如果不匹配，返回一个null
  if(!match) return null
  const [url, ...values] = match
  // 如果当前的路径和匹配到的路径完全一样的，那就是完整匹配
  const isExact = pathname === url
  if(exact && !isExact) return null
  return {
    path, // 要匹配的路径
    url,  // 匹配到的路径
    isExact,// 是否精确匹配,
    params: keys.reduce((memo, key, index) => {
      memo[key.name] = values[index]
      return memo
    }, {}) // 路径参数对象
  }
}

export default matchPath