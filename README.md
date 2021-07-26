# React Source

## 一、初始化项目

```shell
create-react-app react-source
cd react-source
npm i
npm start
```

## 二、实现渲染原生组件

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

## 三、实现渲染类组件和函数组件

## 四、实现setState

## 五、实现组件更新

## 六、实现比较更新子节点

## 七、实现key的处理
