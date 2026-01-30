import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, any> = new Map();

  afterInit(server: Server) {
    console.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: any, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
    this.broadcastActiveUsers();
  }

  @SubscribeMessage('register')
  handleRegister(
    client: any,
    payload: {
      userId: string;
      displayName: string;
      email: string;
      role: string;
    },
  ) {
    this.connectedUsers.set(client.id, {
      socketId: client.id,
      ...payload,
      onlineAt: new Date(),
    });
    this.broadcastActiveUsers();
  }

  private broadcastActiveUsers() {
    const users = Array.from(this.connectedUsers.values());
    this.server.emit('active-users', users);
  }

  @SubscribeMessage('gradeUpdate')
  handleGradeUpdate(@MessageBody() data: any): void {
    // Broadcast to specific student room or all for now
    this.server.emit(`grade:${data.studentId}`, data);
  }

  @SubscribeMessage('startTeaching')
  handleStartTeaching(
    @MessageBody()
    data: {
      teacherId: string;
      teacherName: string;
      subject: string;
      startTime: string;
    },
  ): void {
    this.server.emit('admin-notification', {
      type: 'teaching-started',
      data,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('teacherLogin')
  handleTeacherLogin(
    @MessageBody() data: { teacherId: string; teacherName: string },
  ): void {
    this.server.emit('admin-notification', {
      type: 'teacher-login',
      data,
      timestamp: new Date(),
    });
  }

  notifyFileUploaded(data: {
    recipientId: string;
    fileName: string;
    uploaderName: string;
  }) {
    this.server.emit(`file-received:${data.recipientId}`, data);
  }

  notifyAdmin(type: string, data: any) {
    this.server.emit('admin-notification', {
      type,
      data,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('scheduleUpdate')
  handleScheduleUpdate(@MessageBody() data: any): void {
    this.server.emit('scheduleUpdate', data);
  }
}
