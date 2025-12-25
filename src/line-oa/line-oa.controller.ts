import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Headers,
  HttpCode,
  Query,
} from '@nestjs/common';
import { LineOAService } from './line-oa.service';
import { LineOALinkingService } from './line-oa-linking.service';
import { LineOAWebhookService } from './line-oa-webhook.service';

@Controller('/api/line-oa')
export class LineOAController {
  constructor(
    private readonly lineOAService: LineOAService,
    private readonly linkingService: LineOALinkingService,
    private readonly webhookService: LineOAWebhookService,
  ) {}

  // ===================== Account Linking =====================

  /**
   * เริ่มต้นกระบวนการเชื่อมต่อบัญชี LINE
   */
  @Post('linking/initiate')
  async initiateLinking(
    @Body('userId') userId: number = 1, // Default to user 1 for testing
  ) {
    try {
      // Validate input
      const finalUserId = userId || 1;
      if (!finalUserId || finalUserId < 1) {
        return {
          success: false,
          message: 'Invalid user ID',
          code: 400,
        };
      }

      const result = await this.linkingService.initiateLinking(finalUserId);
      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Failed to initiate LINE linking',
        code: error?.status || 500,
      };
    }
  }

  /**
   * ยืนยันการเชื่อมต่อ LINE
   */
  @Post('linking/verify')
  async verifyLink(
    @Body('userId') userId: number = 1,
    @Body('lineUserId') lineUserId: string,
    @Body('verificationToken') verificationToken: string,
  ) {
    try {
      // Validate required fields
      if (!lineUserId || !lineUserId.trim()) {
        return {
          success: false,
          message: 'LINE User ID is required',
          code: 400,
        };
      }

      if (!verificationToken || !verificationToken.trim()) {
        return {
          success: false,
          message: 'Verification token is required',
          code: 400,
        };
      }

      const finalUserId = userId || 1;
      if (!finalUserId || finalUserId < 1) {
        return {
          success: false,
          message: 'Invalid user ID',
          code: 400,
        };
      }

      const result = await this.linkingService.verifyLink(
        finalUserId,
        lineUserId.trim(),
        verificationToken.trim(),
      );
      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Failed to verify LINE linking',
        code: error?.status || 500,
      };
    }
  }

  /**
   * ดึงสถานะการเชื่อมต่อ LINE
   */
  @Get('linking/status')
  async getLinkingStatus(@Query('userId') userId: string = '1') {
    return await this.linkingService.getLinkingStatus(parseInt(userId) || 1);
  }

  /**
   * ยกเลิกการเชื่อมต่อ LINE
   */
  @Delete('linking')
  async unlinkAccount(@Query('userId') userId: string = '1') {
    return await this.linkingService.unlinkAccount(parseInt(userId) || 1);
  }

  // ===================== Webhook =====================

  /**
   * LINE Webhook Endpoint
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-line-signature') signature: string,
  ) {
    return await this.webhookService.handleWebhook(body, signature || '');
  }

  // ===================== Notifications =====================

  /**
   * ดึงประวัติการแจ้งเตือนผ่าน LINE
   */
  @Get('notifications')
  async getNotifications(
    @Query('userId') userId: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return await this.lineOAService.getNotifications(
      parseInt(userId) || 1,
      parseInt(limit) || 20,
    );
  }

  /**
   * ส่งสถานะการแจ้งซ่อมไปยัง LINE
   */
  @Post('send-ticket-status')
  async sendTicketStatus(
    @Body('lineUserId') lineUserId: string,
    @Body('ticketId') ticketId: number,
    @Body('ticketCode') ticketCode: string,
    @Body('status') status: string,
    @Body('statusLabel') statusLabel: string,
  ) {
    if (!lineUserId || !ticketId || !ticketCode || !status) {
      return {
        success: false,
        message: 'Missing required parameters',
      };
    }

    await this.webhookService.sendTicketStatusToLINE(
      lineUserId,
      ticketId,
      ticketCode,
      status,
      statusLabel || this.getStatusLabelThai(status),
    );

    return {
      success: true,
      message: 'Ticket status sent to LINE',
    };
  }

  /**
   * แปลงสถานะเป็นภาษาไทย
   */
  private getStatusLabelThai(status: string): string {
    const statusMap: { [key: string]: string } = {
      OPEN: 'รอรับเรื่อง',
      IN_PROGRESS: 'กำลังซ่อม',
      DONE: 'ซ่อมเสร็จแล้ว',
    };
    return statusMap[status] || status;
  }

  // ===================== Health Check =====================

  /**
   * ตรวจสอบสถานะการทำงาน
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      message: 'LINE OA integration is running',
    };
  }
}
