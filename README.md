# @voasx/p2p-video

基于 WebRTC + WebSocket 信令的 P2P 视频通话应用，零外部依赖。

## 架构

```
发送端浏览器 <--WebSocket 信令--> Bun 服务器 <--WebSocket 信令--> 接收端浏览器
            |                                                        |
            +-------------------- WebRTC P2P 直连 -------------------+
                                (音视频数据直接传输)
```

1. Bun 服务器作为信令中转，通过 WebSocket pub/sub 在发送端和接收端之间转发 SDP 和 ICE 候选
2. 信令完成后，浏览器之间建立 WebRTC 直连，音视频数据不再经过服务器

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

## 技术要点

- **信令服务器**: Bun WebSocket + pub/sub 路由 (端口 5011)
- **WebRTC**: 浏览器原生 RTCPeerConnection API
- **NAT 穿透**: 多 STUN 服务器配置 (Google + Mozilla)
- **ICE 候选缓存**: 自动缓存并延迟处理 ICE 候选，确保连接成功率
- **支持一对多**: 服务器使用频道广播，一个发送端可同时推流给多个接收端

## 浏览器支持

- Chrome / Edge (推荐)
- Firefox
- Safari 15+

## 故障排查

**连接失败？**
- 确保浏览器允许了摄像头权限
- 检查防火墙是否阻止了本地 WebSocket 连接
- 某些网络环境可能无法访问 Google STUN 服务器，已自动配置备用服务器
