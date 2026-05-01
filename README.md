# @voasx/p2p-video — WebRTC 摄像头共享

基于 WebRTC + WebSocket 信令的 P2P 视频通话应用，零外部运行时依赖。发送端采集摄像头画面，通过 WebRTC 直连传输给接收端，音视频数据不经过服务器中转。

## 架构

```
发送端浏览器 <--WebSocket 信令--> Bun 服务器 <--WebSocket 信令--> 接收端浏览器
            |                                                        |
            +-------------------- WebRTC P2P 直连 -------------------+
                                (音视频数据直接传输)
```

1. Bun 服务器作为信令中转，通过 WebSocket pub/sub 在发送端和接收端之间转发 SDP 和 ICE 候选
2. 信令完成后，浏览器之间建立 WebRTC 直连，音视频数据不再经过服务器
3. 服务器仅负责信令转发，不做任何媒体处理

## 信令流程

```
Sender                               Server                              Receiver
  |                                     |                                     |
  |--- ws.connect(/ws?role=send) ------>|                                     |
  |                                     |<--- ws.connect(/ws?role=recv) ------|
  |                                     |                                     |
  |--- { sdp: offer } ----------------->|--- publish to "recv" channel ------>|
  |                                     |                                     |-- setRemoteDescription(offer)
  |                                     |                                     |-- createAnswer()
  |                                     |                                     |-- setLocalDescription(answer)
  |                                     |<--- { sdp: answer } ---------------|
  |<-- publish to "send" channel -------|                                     |
  |-- setRemoteDescription(answer)      |                                     |
  |                                     |                                     |
  |--- { ice: candidate } ------------->|--- publish to "recv" channel ------>|-- addIceCandidate()
  |<-- publish to "send" channel -------|<--- { ice: candidate } -------------|-- addIceCandidate()
  |                                     |                                     |
  |===================== WebRTC P2P 直连建立 =============================|
```

## 功能特性

- **零外部依赖** — 仅需 Bun 运行时，前端使用浏览器原生 API
- **P2P 直连** — 音视频数据通过 WebRTC 直接传输，不占用服务器带宽
- **一对多推流** — 服务器使用频道广播，一个发送端可同时推流给多个接收端
- **ICE 候选缓存** — 自动缓存 ICE 候选并延迟处理，确保在 remoteDescription 设置后才添加，提高连接成功率
- **多 STUN 服务器** — Google + Mozilla 共 3 个 STUN 服务器冗余配置
- **移动端适配** — 优先使用后置摄像头，响应式布局，安全区域适配
- **协议自适应** — 自动检测 HTTP/HTTPS 选择 `ws://` 或 `wss://`

## 快速开始

```bash
bun run main.ts
```

- 发送端：http://127.0.0.1:5011/send.html
- 接收端：http://127.0.0.1:5011/recv.html

## 使用方式

1. 打开发送端页面，点击「开始」开启摄像头
2. 打开接收端页面，点击「开始」接收视频流
3. 发送端会自动发起 WebRTC 连接，建立后接收端即可看到实时画面

## 技术栈

- **运行时**: Bun
- **信令服务器**: `Bun.serve()` + WebSocket pub/sub（端口 5011）
- **WebRTC**: 浏览器原生 `RTCPeerConnection` API
- **前端**: 原生 HTML/CSS/JS，暗色主题，无框架依赖
- **NAT 穿透**: STUN（Google + Mozilla），无 TURN

## 项目结构

```
webrtc-camera-share/
├── main.ts            # Bun 服务器入口：WebSocket 信令 + 静态文件服务
├── public/
│   ├── send.html      # 发送端页面：采集摄像头，创建 WebRTC Offer
│   └── recv.html      # 接收端页面：接收 WebRTC Answer，播放远端视频
├── package.json       # 项目配置（仅 bun-types 开发依赖）
├── tsconfig.json      # TypeScript 配置
└── bun.lock           # Bun 锁文件
```

## STUN/ICE 配置

```javascript
iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com" }
]
```

> 未配置 TURN 服务器，在严格对称 NAT 环境下可能无法建立直连。生产环境建议添加 TURN 中继服务器。

## WebSocket 信令协议

信令端点为 `/ws?role=send` 或 `/ws?role=recv`，所有消息为 JSON 格式：

| 消息体 | 方向 | 说明 |
|--------|------|------|
| `{ "sdp": RTCSessionDescription }` | 双向 | SDP Offer（发送端→接收端）和 Answer（接收端→发送端） |
| `{ "ice": RTCIceCandidate }` | 双向 | ICE 候选，由 `onicecandidate` 事件触发 |

服务器角色：将消息从 `send` 频道转发到 `recv` 频道，反之亦然。

## 前端页面

### 发送端 (send.html)

- 请求摄像头权限（优先后置摄像头，理想分辨率 1280x720）
- 本地视频预览（静音播放）
- 创建 `RTCPeerConnection`，添加本地媒体轨道
- 发起 SDP Offer 并发送 ICE 候选
- 错误处理：`NotAllowedError`（权限拒绝）、`NotFoundError`（无摄像头）

### 接收端 (recv.html)

- 创建 `RTCPeerConnection`，添加 `recvonly` 视频收发器
- 接收 SDP Offer，创建并发送 Answer
- `ontrack` 事件触发后播放远端视频流
- 连接建立后自动取消静音

### 共同特性

- 暗色主题（`#111` 背景），16:9 视频比例，最大宽度 640px
- `@media (max-width: 640px)` 响应式布局
- 安全区域适配（`env(safe-area-inset-*)`）
- 资源清理：停止媒体轨道、关闭 WebSocket、关闭 PeerConnection

## 浏览器支持

- Chrome / Edge (推荐)
- Firefox
- Safari 15+

## 限制

- **无房间管理** — 所有发送端和接收端共享同一信令频道，同时只能有一个活跃发送端
- **仅视频** — 当前仅传输视频轨道，不包含音频
- **无 TURN** — 未配置 TURN 中继服务器，严格 NAT 环境下可能连接失败
- **无录制** — 不支持视频录制功能

## 故障排查

**连接失败？**
- 确保浏览器允许了摄像头权限
- 检查防火墙是否阻止了本地 WebSocket 连接
- 某些网络环境可能无法访问 Google STUN 服务器，已自动配置备用服务器

**接收端黑屏？**
- 确认发送端已成功开启摄像头
- 检查 WebRTC 连接状态（Chrome: `chrome://webrtc-internals/`）

## License

MIT
