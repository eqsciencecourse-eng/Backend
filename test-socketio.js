/**
 * Socket.io Connection Test Script
 * Run with: node test-socketio.js
 */

const io = require('socket.io-client');

const socket = io('http://localhost:4001', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
});

console.log('🔌 Attempting to connect to Socket.io server...\n');

socket.on('connect', () => {
    console.log('✅ Connected to server!');
    console.log('   Socket ID:', socket.id);
    console.log('   Transport:', socket.io.engine.transport.name);
    
    // Test register event
    console.log('\n📤 Sending register event...');
    socket.emit('register', {
        userId: 'test-user-123',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'student'
    });
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Backend server is running on port 4001');
    console.log('   2. GatewayModule is imported in AppModule');
    console.log('   3. CORS is properly configured');
});

socket.on('active-users', (users) => {
    console.log('\n👥 Active users received:', users);
});

socket.on('admin-notification', (data) => {
    console.log('\n🔔 Admin notification received:', data);
});

socket.on('gradeUpdate', (data) => {
    console.log('\n📊 Grade update received:', data);
});

socket.on('scheduleUpdate', (data) => {
    console.log('\n📅 Schedule update received:', data);
});

// Test events after connection
socket.on('connect', () => {
    setTimeout(() => {
        console.log('\n📤 Testing grade update...');
        socket.emit('gradeUpdate', {
            studentId: 'test-student-123',
            subject: 'Math',
            score: 85
        });
        
        setTimeout(() => {
            console.log('\n📤 Testing schedule update...');
            socket.emit('scheduleUpdate', {
                teacherId: 'test-teacher-123',
                day: 'monday',
                timeSlot: '10:00-12:00'
            });
            
            setTimeout(() => {
                console.log('\n✅ All tests completed!');
                console.log('   Press Ctrl+C to exit');
            }, 2000);
        }, 2000);
    }, 2000);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Closing connection...');
    socket.close();
    process.exit(0);
});




