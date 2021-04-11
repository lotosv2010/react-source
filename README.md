# React Source

## 实现虚拟DOM

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
