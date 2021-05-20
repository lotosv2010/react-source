# React Source

## 一、实现虚拟DOM

### 子节点是数组

- 说明子节点有多个元素

```js
const element = React.createElement('h1',
  { className: 'app', style: {color: 'red'}},
  React.createElement('span', null, 'hello'),
  ' world'
)

```

```js
{
  "type": "h1",
  "props": {
    "className": "app",
    "style": {
      "color": "red"
    },
    "children": [
      {
        "type": "span",
        "props": {
          "children": "hello"
        }
      },
      " world"
    ]
  }
}
```

### 子节点是对象

- 说明子节点只有一个元素，并且不是文本节点

```js
const element = React.createElement('h1',
  { className: 'app', style: {color: 'red'}},
  React.createElement('span', null, 'hello')
)
```

```js
{
  "type": "h1",
  "props": {
    "className": "app",
    "style": {
      "color": "red"
    },
    "children": {
      "type": "span",
      "props": {
        "children": "hello"
      }
    }
  }
}
```

### 子节点是字符串

- 说明子节点只有一个元素，并且是文本节点

```js
const element = React.createElement('h1',
  { className: 'app', style: {color: 'red'}},
  ' world'
)

```

```js
{
  "type": "h1",
  "props": {
    "className": "app",
    "style": {
      "color": "red"
    },
    "children": " world"
  }
}
```

## 二、实现事件绑定

## 三、实现批量更新

## 四、实现setState

## 五、实现createRef

## 六、实现类组件ref

## 七、实现forwardRef

## 八、实现旧版生命周期

## 九、实现新版生命周期

## 十、useState

## 十一、useCallback

## 十二、useMemo

## 十三、memo

## 十四、useReducer

## 十五、useContext

## 十六、useEffect

## 十七、useLayoutEffect

## 十八、useRef

## 十九、useImperativeHandle

## 二十、router

### react-router-dom

#### BrowserRouter

#### HashRouter

#### Link

#### NavLink

### history

#### createBrowserHistory

#### createHashHistory

### react-router

#### Router

#### Route

#### Switch

#### Redirect

#### withRouter

#### Prompt

#### hooks
