import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LineOALinkingService } from './line-oa-linking.service';
import { LineOAService } from './line-oa.service';

@Injectable()
export class LineOAWebhookService {
  private readonly logger = new Logger(LineOAWebhookService.name);
  private readonly channelSecret = process.env.LINE_CHANNEL_SECRET || 'test-secret';

  constructor(
    private readonly prisma: PrismaService,
    private readonly linkingService: LineOALinkingService,
    private readonly lineOAService: LineOAService,
  ) {}

  /**
   * ตรวจสอบและจัดการ LINE Webhook Event
   */
  async handleWebhook(body: any, signature: string) {
    // ตรวจสอบลายเซนต์
    if (!this.verifySignature(JSON.stringify(body), signature)) {
      this.logger.warn('Invalid webhook signature');
      throw new UnauthorizedException('Invalid signature');
    }

    // จัดการ events
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        await this.handleEvent(event);
      }
    }

    return { message: 'Webhook processed' };
  }

  /**
   * ตรวจสอบลายเซนต์ของ LINE
   * ทุก webhook request ต้องลงนามด้วย HMAC SHA256
   */
  private verifySignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', this.channelSecret)
      .update(body)
      .digest('base64');

    return hash === signature;
  }

  /**
   * จัดการ LINE Event
   */
  private async handleEvent(event: any) {
    this.logger.debug(`Received event: ${event.type}`);

    switch (event.type) {
      case 'follow':
        await this.handleFollow(event);
        break;

      case 'unfollow':
        await this.handleUnfollow(event);
        break;

      case 'message':
        await this.handleMessage(event);
        break;

      case 'postback':
        await this.handlePostback(event);
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * จัดการ Follow Event
   */
  private async handleFollow(event: any) {
    const lineUserId = event.source.userId;
    this.logger.log(`User ${lineUserId} followed the OA`);
  }

  /**
   * จัดการ Unfollow Event
   */
  private async handleUnfollow(event: any) {
    const lineUserId = event.source.userId;
    this.logger.log(`User ${lineUserId} unfollowed the OA`);

    try {
      await this.prisma.lineOALink.updateMany({
        where: { lineUserId },
        data: { status: 'UNLINKED' },
      });
    } catch (error) {
      this.logger.error(`Failed to unlink user ${lineUserId}:`, error);
    }
  }

  /**
   * จัดการ Message Event
   */
  private async handleMessage(event: any) {
    const lineUserId = event.source.userId;
    const message = event.message;

    this.logger.log(`Received message from ${lineUserId}: ${message.text}`);

    // ตอบกลับด้วย Flex Message ที่มีข้อมูลและปุ่มต่างๆ
    if (message.type === 'text') {
      await this.sendWelcomeMenu(lineUserId);
    }
  }

  /**
   * ส่ง Welcome Menu ไปยัง LINE User
   */
  private async sendWelcomeMenu(lineUserId: string) {
    const flexMessage = {
      type: 'flex',
      altText: 'เมนูระบบแจ้งซ่อม',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'ระบบแจ้งซ่อม',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
              align: 'center',
            },
          ],
          backgroundColor: '#1F88E5',
          paddingAll: '15px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'เลือกสิ่งที่คุณต้องการทำ',
              weight: 'bold',
              size: 'lg',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: '📋 สร้างแจ้งซ่อมใหม่',
                    uri: `${process.env.FRONTEND_URL || 'https://localhost:3000'}/tickets/create-line-oa?lineUserId=${lineUserId}`,
                  },
                },
                {
                  type: 'button',
                  style: 'secondary',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: '📊 ดูสถานะการแจ้งซ่อม',
                    uri: `${process.env.FRONTEND_URL || 'https://localhost:3000'}/tickets/line-oa-status?lineUserId=${lineUserId}`,
                  },
                },
                {
                  type: 'button',
                  style: 'secondary',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: '🔗 เชื่อมต่อบัญชี',
                    uri: `${process.env.FRONTEND_URL || 'https://localhost:3000'}/line-oa/link?lineUserId=${lineUserId}`,
                  },
                },
              ],
            },
          ],
          spacing: 'md',
          paddingAll: '13px',
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'divider',
            },
            {
              type: 'text',
              text: 'สามารถกรอกแบบฟอร์มแจ้งซ่อมได้ทันทีโดยไม่ต้องเชื่อมต่อบัญชี',
              size: 'xs',
              color: '#aaaaaa',
              wrap: true,
            },
          ],
          paddingAll: '13px',
        },
      },
    };

    try {
      await this.lineOAService.sendMessage(lineUserId, flexMessage as any);
    } catch (error) {
      this.logger.error(`Failed to send welcome menu to ${lineUserId}:`, error);
    }
  }

  /**
   * จัดการ Postback Event
   */
  private async handlePostback(event: any) {
    const lineUserId = event.source.userId;
    const postbackData = event.postback.data;

    this.logger.log(`Received postback from ${lineUserId}: ${postbackData}`);
  }

  /**
   * ส่งสถานะการแจ้งซ่อมไปยัง LINE
   */
  async sendTicketStatusToLINE(
    lineUserId: string,
    ticketId: number,
    ticketCode: string,
    status: string,
    statusLabel: string,
  ) {
    const statusColor = this.getStatusColor(status);
    const flexMessage = {
      type: 'flex',
      altText: `อัพเดตสถานะแจ้งซ่อม ${ticketCode}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'อัพเดตสถานะการแจ้งซ่อม',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: statusColor,
          paddingAll: '15px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: ticketCode,
              weight: 'bold',
              size: 'lg',
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'สถานะ:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 0,
                    },
                    {
                      type: 'text',
                      text: statusLabel,
                      wrap: true,
                      color: statusColor,
                      weight: 'bold',
                      flex: 5,
                    },
                  ],
                },
              ],
            },
          ],
          spacing: 'md',
          paddingAll: '13px',
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'uri',
                label: '👁 ดูรายละเอียด',
                uri: `${process.env.FRONTEND_URL || 'https://localhost:3000'}/tickets/${ticketId}?lineUserId=${lineUserId}`,
              },
            },
          ],
          paddingAll: '13px',
        },
      },
    };

    try {
      await this.lineOAService.sendMessage(lineUserId, flexMessage as any);
    } catch (error) {
      this.logger.error(
        `Failed to send ticket status to ${lineUserId}:`,
        error,
      );
    }
  }

  /**
   * ได้รับสี statuscolor ตามสถานะ
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'OPEN':
        return '#FFB81C'; // amber
      case 'IN_PROGRESS':
        return '#1F88E5'; // blue
      case 'DONE':
        return '#17C950'; // green
      default:
        return '#666666';
    }
  }
}
