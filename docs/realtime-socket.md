# TeamSync Realtime Socket.IO Events & Security Specification

TeamSync utilizes **Socket.IO** to provide live event synchronization between collaborative sessions without page refreshes.

---

## 1. Authentication Handshake

1. Client initializes connection passing JWT token:
```javascript
const socket = io({
  auth: { token: 'eyJhbGciOi...' }
});
```
2. The server verifies JWT validity, checks MySQL user active status (`status === 'ACTIVE'`), and binds the authenticated identity to `socket.user`.
3. If token is invalid or user is inactive, connection is rejected with an authentication error.

---

## 2. Server-Enforced Room Architecture

Clients **cannot** arbitrarily join rooms. All room subscriptions are server-authorized:

| Room Name | Scope | Membership Rule |
| :--- | :--- | :--- |
| `user:{userId}` | Private User Room | Joined automatically upon connection for the verified `socket.user.id`. |
| `project:{projectId}` | Project Collaboration Room | Joined only after `socket.emit('project:join', { projectId })` is checked against `project_members` or `ADMIN` role. |

---

## 3. Real-Time Event Matrix

| Event Name | Direction | Room / Recipient | Trigger / Payload |
| :--- | :--- | :--- | :--- |
| `task:created` | Server → Client | `project:{projectId}` | Broadcast when a task is created within the project. Contains task object. |
| `task:assigned` | Server → Client | `user:{assigneeId}` | Delivered directly to the assignee's private room. |
| `task:status_changed` | Server → Client | `project:{projectId}` | Emitted after MySQL transaction commits status update and history record. Contains `taskId`, `oldStatus`, `newStatus`, and updated task card. |
| `task:comment_added` | Server → Client | `project:{projectId}` | Broadcast when a discussion note is posted on a task. |
| `notification:new` | Server → Client | `user:{userId}` | Direct real-time notification push to recipient. |

---

## 4. Reconnect & Re-sync Strategy

When a client reconnects after temporary disconnection:
1. Socket reconnects automatically and re-joins active project rooms.
2. The client fires `realtime:reconnect`, causing views to fetch the latest persistent state from REST APIs (`/tasks`, `/notifications`) to reconcile any events missed during downtime.
