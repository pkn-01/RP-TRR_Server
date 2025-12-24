import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Priority, ProblemCategory, ProblemSubcategory } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  private generateTicketCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `TKT-${new Date().getFullYear()}-${timestamp}${random}`;
  }

  private ensureUploadsDir(): string {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return uploadsDir;
  }

  async create(
    userId: number,
    createTicketDto: CreateTicketDto,
    files?: any[],
  ) {
    try {
      // Validate required fields
      if (!createTicketDto.title || !createTicketDto.title.trim()) {
        throw new BadRequestException('Title is required');
      }
      if (!createTicketDto.description || !createTicketDto.description.trim()) {
        throw new BadRequestException('Description is required');
      }
      if (!createTicketDto.equipmentName || !createTicketDto.equipmentName.trim()) {
        throw new BadRequestException('Equipment name is required');
      }

      const ticketCode = this.generateTicketCode();

      // Validate enum fields before using them
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
      const validProblemCategories = ['NETWORK', 'HARDWARE', 'SOFTWARE', 'PRINTER', 'AIR_CONDITIONING', 'ELECTRICITY', 'OTHER'];
      const validSubcategories = ['INTERNET_DOWN', 'SLOW_CONNECTION', 'WIFI_ISSUE', 'MONITOR_BROKEN', 'KEYBOARD_BROKEN', 'MOUSE_BROKEN', 'COMPUTER_CRASH', 'INSTALLATION', 'LICENSE', 'PERFORMANCE', 'JAM', 'NO_PRINTING', 'CARTRIDGE', 'INSTALLATION_AC', 'MALFUNCTION_AC', 'POWER_DOWN', 'LIGHT_PROBLEM', 'OTHER'];

      // Set enum defaults with validation
      let priority: Priority = Priority.MEDIUM;
      if (createTicketDto.priority && validPriorities.includes(createTicketDto.priority)) {
        priority = createTicketDto.priority as Priority;
      }

      let problemCategory: ProblemCategory = ProblemCategory.HARDWARE;
      if (createTicketDto.problemCategory && validProblemCategories.includes(createTicketDto.problemCategory)) {
        problemCategory = createTicketDto.problemCategory as ProblemCategory;
      }

      let problemSubcategory: ProblemSubcategory = ProblemSubcategory.OTHER;
      if (createTicketDto.problemSubcategory && validSubcategories.includes(createTicketDto.problemSubcategory)) {
        problemSubcategory = createTicketDto.problemSubcategory as ProblemSubcategory;
      }

      // Build data object with only provided fields
      const data: Record<string, any> = {
        ticketCode,
        title: createTicketDto.title.trim(),
        description: createTicketDto.description.trim(),
        equipmentName: createTicketDto.equipmentName.trim(),
        priority,
        userId,
        // Provide defaults for required fields
        location: createTicketDto.location?.trim() || 'N/A',
        category: createTicketDto.category || 'REPAIR',
        problemCategory,
        problemSubcategory,
      };

      // Add optional repair ticket fields if provided
      if (createTicketDto.equipmentId !== undefined) {
        data.equipmentId = createTicketDto.equipmentId;
      }
      if (createTicketDto.notes !== undefined) {
        data.notes = createTicketDto.notes;
      }
      if (createTicketDto.requiredDate !== undefined) {
        data.requiredDate = createTicketDto.requiredDate;
      }

      // Handle assignee if provided
      if (createTicketDto.assignee?.id) {
        const assigneeId = parseInt(createTicketDto.assignee.id);
        if (!isNaN(assigneeId)) {
          data.assignedTo = assigneeId;
        }
      }

      console.log('[DEBUG] Ticket data before create:', {
        ticketCode: data.ticketCode,
        title: data.title,
        priority: data.priority,
        problemCategory: data.problemCategory,
        problemSubcategory: data.problemSubcategory,
        userId: data.userId,
      });

      const ticket = await this.prisma.ticket.create({
        data: data as any,
        include: {
          attachments: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Handle file uploads
      if (files && files.length > 0) {
        const uploadsDir = this.ensureUploadsDir();
        const attachments = files.map((file: any) => {
          const filename = `${ticketCode}-${Date.now()}-${file.originalname}`;
          const filePath = path.join(uploadsDir, filename);

          fs.writeFileSync(filePath, file.buffer);

          return {
            ticketId: ticket.id,
            filename: file.originalname,
            fileUrl: `/uploads/${filename}`,
            fileSize: file.size,
            mimeType: file.mimetype,
          };
        });

        await this.prisma.attachment.createMany({
          data: attachments,
        });
      }

      return ticket;
    } catch (error: any) {
      console.error('[ERROR] Ticket creation failed:');
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Full error:', JSON.stringify(error, null, 2));
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Failed to create ticket',
      );
    }
  }

  /**
   * สร้าง Ticket สำหรับ LINE OA (ไม่ต้องล็อกอิน)
   * ใช้สำหรับการแจ้งซ่อมผ่าน LINE OA โดยไม่ต้องมีบัญชีในระบบ
   */
  async createLineOATicket(
    createTicketDto: CreateTicketDto,
    files?: any[],
    lineUserId?: string,
  ) {
    try {
      // Validate required fields
      if (!createTicketDto.title || !createTicketDto.title.trim()) {
        throw new BadRequestException('Title is required');
      }
      if (!createTicketDto.description || !createTicketDto.description.trim()) {
        throw new BadRequestException('Description is required');
      }
      if (!createTicketDto.equipmentName || !createTicketDto.equipmentName.trim()) {
        throw new BadRequestException('Equipment name is required');
      }

      const ticketCode = this.generateTicketCode();

      // Validate enum fields
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
      const validProblemCategories = ['NETWORK', 'HARDWARE', 'SOFTWARE', 'PRINTER', 'AIR_CONDITIONING', 'ELECTRICITY', 'OTHER'];
      const validSubcategories = ['INTERNET_DOWN', 'SLOW_CONNECTION', 'WIFI_ISSUE', 'MONITOR_BROKEN', 'KEYBOARD_BROKEN', 'MOUSE_BROKEN', 'COMPUTER_CRASH', 'INSTALLATION', 'LICENSE', 'PERFORMANCE', 'JAM', 'NO_PRINTING', 'CARTRIDGE', 'INSTALLATION_AC', 'MALFUNCTION_AC', 'POWER_DOWN', 'LIGHT_PROBLEM', 'OTHER'];

      let priority: Priority = Priority.MEDIUM;
      if (createTicketDto.priority && validPriorities.includes(createTicketDto.priority)) {
        priority = createTicketDto.priority as Priority;
      }

      let problemCategory: ProblemCategory = ProblemCategory.HARDWARE;
      if (createTicketDto.problemCategory && validProblemCategories.includes(createTicketDto.problemCategory)) {
        problemCategory = createTicketDto.problemCategory as ProblemCategory;
      }

      let problemSubcategory: ProblemSubcategory = ProblemSubcategory.OTHER;
      if (createTicketDto.problemSubcategory && validSubcategories.includes(createTicketDto.problemSubcategory)) {
        problemSubcategory = createTicketDto.problemSubcategory as ProblemSubcategory;
      }

      // สร้าหรือค้นหา LINE OA User
      // ก่อนอื่นตรวจสอบว่ามี user ที่เชื่อมต่อ LINE นี้อยู่หรือไม่
      let lineOALink = null;
      let defaultUserId = 1; // ID สำหรับ guest LINE OA users

      if (lineUserId) {
        lineOALink = await this.prisma.lineOALink.findFirst({
          where: { lineUserId },
        });

        if (lineOALink && lineOALink.userId) {
          defaultUserId = lineOALink.userId;
        } else {
          // สร้าง User ชั่วคราวสำหรับ LINE OA
          try {
            const newUser = await this.prisma.user.create({
              data: {
                name: `LINE User ${lineUserId.slice(-8)}`,
                email: `line-${lineUserId.slice(-8)}@lineoa.local`,
                password: 'temp-line-user',
                role: 'USER',
                lineId: lineUserId,
              },
            });
            defaultUserId = newUser.id;
          } catch (e) {
            // ใช้ default user ถ้าไม่สามารถสร้าง user ใหม่ได้
            defaultUserId = 1;
          }
        }
      }

      const data: Record<string, any> = {
        ticketCode,
        title: createTicketDto.title.trim(),
        description: createTicketDto.description.trim(),
        equipmentName: createTicketDto.equipmentName.trim(),
        priority,
        userId: defaultUserId,
        location: createTicketDto.location?.trim() || 'N/A',
        category: createTicketDto.category || 'REPAIR',
        problemCategory,
        problemSubcategory,
      };

      // เพิ่ม notes เพื่อเก็บข้อมูล LINE OA
      const lineOAInfo = [];
      if (createTicketDto.phoneNumber?.trim()) {
        lineOAInfo.push(`เบอร์โทร: ${createTicketDto.phoneNumber}`);
      }
      if (createTicketDto.lineId?.trim()) {
        lineOAInfo.push(`LINE ID: ${createTicketDto.lineId}`);
      }
      if (createTicketDto.lineUserId) {
        lineOAInfo.push(`LINE User ID: ${createTicketDto.lineUserId}`);
      }

      if (lineOAInfo.length > 0) {
        data.notes = lineOAInfo.join('\n');
      }

      console.log('[DEBUG] LINE OA Ticket data before create:', {
        ticketCode: data.ticketCode,
        title: data.title,
        userId: data.userId,
        lineUserId: lineUserId,
      });

      const ticket = await this.prisma.ticket.create({
        data: data as any,
        include: {
          attachments: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Upload files
      if (files && files.length > 0) {
        const uploadsDir = this.ensureUploadsDir();
        const attachments = files.map((file: any) => {
          const filename = `${ticketCode}-${Date.now()}-${file.originalname}`;
          const filePath = path.join(uploadsDir, filename);

          fs.writeFileSync(filePath, file.buffer);

          return {
            ticketId: ticket.id,
            filename: file.originalname,
            fileUrl: `/uploads/${filename}`,
            fileSize: file.size,
            mimeType: file.mimetype,
          };
        });

        await this.prisma.attachment.createMany({
          data: attachments,
        });
      }

      return {
        ...ticket,
        isLineOA: true,
        lineUserId,
      };
    } catch (error: any) {
      console.error('[ERROR] LINE OA Ticket creation failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Failed to create LINE OA ticket',
      );
    }
  }

  async findAll(userId?: number) {
    return this.prisma.ticket.findMany({
      where: userId ? { userId } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: true,
        logs: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        logs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async update(id: number, updateTicketDto: UpdateTicketDto) {
    // Filter out undefined values and handle assignee specially
    const updateData: Record<string, any> = {};

    // Handle regular fields
    if (updateTicketDto.title !== undefined) {
      updateData.title = updateTicketDto.title;
    }
    if (updateTicketDto.description !== undefined) {
      updateData.description = updateTicketDto.description;
    }
    if (updateTicketDto.equipmentName !== undefined) {
      updateData.equipmentName = updateTicketDto.equipmentName;
    }
    if (updateTicketDto.equipmentId !== undefined) {
      updateData.equipmentId = updateTicketDto.equipmentId;
    }
    if (updateTicketDto.notes !== undefined) {
      updateData.notes = updateTicketDto.notes;
    }
    if (updateTicketDto.requiredDate !== undefined) {
      updateData.requiredDate = updateTicketDto.requiredDate;
    }
    if (updateTicketDto.priority !== undefined) {
      updateData.priority = updateTicketDto.priority;
    }
    if (updateTicketDto.status !== undefined) {
      updateData.status = updateTicketDto.status;
    }

    // Handle assignee - convert to assignedTo field
    if (updateTicketDto.assignee !== undefined) {
      if (updateTicketDto.assignee && updateTicketDto.assignee.id) {
        updateData.assignedTo = parseInt(updateTicketDto.assignee.id);
      } else {
        updateData.assignedTo = null;
      }
    }

    return this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        attachments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.ticket.delete({
      where: { id },
    });
  }
}
