import { Suspense } from "react";
import { createRoot } from "react-dom/client";

// Phase 9.1 验证：render 阶段 throw Promise 触发 Suspense 挂起
// 1. AsyncBox：模拟一个异步数据源。用 key 区分不同请求，每个 key 对应一份独立的
//    resource（{ status, promise, data }）缓存。render 时数据没到就 throw 那个 Promise，
//    数据到了才正常渲染，这是 Suspense 官方文档演示 throw-promise 用法的经典模式。
// 2. <Suspense fallback={<div>Loading...</div>}> 包裹，验证首次渲染 fallback、
//    数据到达后自动切换成真实内容（ping/retry 机制），以及嵌套/多个独立 Suspense 互不影响。

interface Resource {
  status: "pending" | "success" | "error";
  promise: Promise<void>;
  data: string | null;
}

const resourceCache = new Map<string, Resource>();

function fetchData(key: string, delayMs: number): Resource {
  let resource = resourceCache.get(key);
  if (resource !== undefined) {
    return resource;
  }
  resource = {
    status: "pending",
    data: null,
    promise: null as unknown as Promise<void>,
  };
  resource.promise = new Promise<void>((resolve) => {
    setTimeout(() => {
      resource!.status = "success";
      resource!.data = `[${key}] 数据加载完成 @ ${new Date().toLocaleTimeString()}`;
      resolve();
    }, delayMs);
  });
  resourceCache.set(key, resource);
  return resource;
}

function readResource(key: string, delayMs: number): string {
  const resource = fetchData(key, delayMs);
  if (resource.status === "pending") {
    throw resource.promise;
  }
  return resource.data as string;
}

interface AsyncBoxProps {
  requestKey: string;
  delayMs: number;
}

function AsyncBox({ requestKey, delayMs }: AsyncBoxProps): any {
  const data = readResource(requestKey, delayMs);
  return <p>{data}</p>;
}

function SingleSuspenseDemo(): any {
  return (
    <div>
      <h4>单个 Suspense：2s 后从 fallback 切到真实内容</h4>
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncBox requestKey="single" delayMs={2000} />
      </Suspense>
    </div>
  );
}

function MultiChildrenSuspenseDemo(): any {
  return (
    <div>
      <h4>一个 Suspense 包裹两个异步子节点：都到齐才显示（3s）</h4>
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncBox requestKey="multi-a" delayMs={1500} />
        <AsyncBox requestKey="multi-b" delayMs={3000} />
      </Suspense>
    </div>
  );
}

function App(): any {
  return (
    <div>
      <SingleSuspenseDemo />
      <MultiChildrenSuspenseDemo />
    </div>
  );
}

function runSuspenseDemo(): void {
  const rootElement = document.getElementById("suspense-root");
  if (rootElement === null) {
    throw new Error("找不到 #suspense-root 容器，请检查 index.html");
  }
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("suspense demo mount 完成，等待 Promise resolve 后自动重渲染");
}

export default runSuspenseDemo;
