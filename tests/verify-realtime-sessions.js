/**
 * Verify simultaneous two-session real-time Socket.IO synchronization
 */

const { io } = require('socket.io-client');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return data.data;
}

async function verifyRealtime() {
  console.log('--- Testing Multi-User Live Socket Synchronization ---');

  const managerAuth = await login('manager@teamsync.internal', 'Password@123');
  const employeeAuth = await login('employee@teamsync.internal', 'Password@123');

  // Connect manager socket
  const managerSocket = io(BASE_URL, {
    auth: { token: managerAuth.token }
  });

  // Connect employee socket
  const employeeSocket = io(BASE_URL, {
    auth: { token: employeeAuth.token }
  });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 2) resolve();
    };
    managerSocket.on('connect', check);
    employeeSocket.on('connect', check);
  });

  console.log('✓ Both Manager & Employee connected to Socket.IO server.');

  // Join project 1
  managerSocket.emit('project:join', { projectId: 1 });
  employeeSocket.emit('project:join', { projectId: 1 });

  await new Promise(r => setTimeout(r, 500));

  // Find a task in project 1 assigned to employee
  const tasksRes = await fetch(`${BASE_URL}/api/v1/tasks?projectId=1&assigneeId=${employeeAuth.user.id}`, {
    headers: { Authorization: `Bearer ${employeeAuth.token}` }
  });
  const tasksData = await tasksRes.json();
  const task = tasksData.data[0];

  assert.ok(task, 'Employee must have at least one assigned task in project 1');
  console.log(`Target task: ID ${task.id} (Status: ${task.status})`);

  let managerReceivedUpdate = null;
  managerSocket.on('task:status_changed', (payload) => {
    console.log('[MANAGER SOCKET RECEIVED task:status_changed]:', payload.newStatus);
    managerReceivedUpdate = payload;
  });

  // Employee updates status
  const nextStatus = task.status === 'TODO' ? 'IN_PROGRESS' : (task.status === 'IN_PROGRESS' ? 'UNDER_REVIEW' : 'IN_PROGRESS');
  console.log(`Employee changing status to ${nextStatus}...`);

  const updateRes = await fetch(`${BASE_URL}/api/v1/tasks/${task.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employeeAuth.token}`
    },
    body: JSON.stringify({ status: nextStatus })
  });
  assert.strictEqual(updateRes.status, 200);

  // Wait for manager socket event
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for socket event')), 4000);
    const interval = setInterval(() => {
      if (managerReceivedUpdate) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  assert.strictEqual(parseInt(managerReceivedUpdate.taskId, 10), parseInt(task.id, 10));
  assert.strictEqual(managerReceivedUpdate.newStatus, nextStatus);
  console.log('✓ Manager received live task:status_changed event in real-time without page reload!');

  managerSocket.disconnect();
  employeeSocket.disconnect();

  console.log('--- Live Real-time Test Passed Successfully! ---\n');
}

verifyRealtime().then(() => process.exit(0)).catch(err => {
  console.error('Realtime Test Failed:', err);
  process.exit(1);
});
