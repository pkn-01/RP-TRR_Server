import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
  Logger,

@Controller('api/tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);
  constructor(private ticketsService: TicketsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
      fileFilter: (req, file, cb) => {
        // Allow images and PDF only
        const allowed = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
        if (!allowed) {
          return cb(null, false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Request() req: any,
    @UploadedFiles() files?: any[],
  ) {
    try {
      // For multipart/form-data, fields are in req.body after FilesInterceptor processes them
      const formFields = req.body || {};
      
      this.logger.debug(`Form fields received: ${JSON.stringify(formFields)}`);
      this.logger.debug(`Files received: ${files?.length || 0}`);
      this.logger.debug(`User ID: ${req.user.id}`);

      const createTicketDto = new CreateTicketDto();
      
      // Map form fields to DTO - handle FormData format
      createTicketDto.title = (formFields.title || '').toString().trim();
      createTicketDto.description = (formFields.description || '').toString().trim();
      createTicketDto.category = (formFields.category || 'REPAIR').toString();
      createTicketDto.equipmentName = (formFields.equipmentName || '').toString().trim();
      createTicketDto.location = (formFields.location || '').toString().trim();
      createTicketDto.priority = (formFields.priority || 'MEDIUM').toString();
      createTicketDto.problemCategory = formFields.problemCategory;
      createTicketDto.problemSubcategory = formFields.problemSubcategory;
      createTicketDto.notes = formFields.notes;
      createTicketDto.requiredDate = formFields.requiredDate;
      createTicketDto.equipmentId = formFields.equipmentId;
      createTicketDto.status = formFields.status;
      
      if (formFields.assignee) {
        try {
          createTicketDto.assignee = typeof formFields.assignee === 'string' 
            ? JSON.parse(formFields.assignee) 
            : formFields.assignee;
        } catch (e) {
          createTicketDto.assignee = null;
        }
      }

      this.logger.debug(`Parsed DTO: ${JSON.stringify({ title: createTicketDto.title, equipmentName: createTicketDto.equipmentName })}`);
      
      return await this.ticketsService.create(req.user.id, createTicketDto, files);
    } catch (error: any) {
      this.logger.error('[ERROR] Ticket creation error:', error?.message || error);
      throw error;
    }
  }

  /**
   * สร้าง Ticket สำหรับ LINE OA (ไม่ต้องเข้าสู่ระบบ)
   */
  @Post('line-oa')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
      fileFilter: (req, file, cb) => {
        // Allow images and PDF only
        const allowed = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
        if (!allowed) {
          return cb(null, false);
        }
        cb(null, true);
      },
    }),
  )
  async createLineOATicket(
    @Request() req: any,
    @Headers() headers: any,
    @UploadedFiles() files?: any[],
  ) {
    const lineUserId = headers['x-line-user-id'];
    try {
      this.logger.debug('[DEBUG] LINE OA Ticket creation');
      this.logger.debug('[DEBUG] LINE User ID:', lineUserId);
      this.logger.debug('[DEBUG] Form fields:', req.body);
      this.logger.debug('[DEBUG] Files received:', files?.length || 0);

      const formFields = req.body || {};
      
      const createTicketDto = new CreateTicketDto();
      
      createTicketDto.title = (formFields.title || '').toString().trim();
      createTicketDto.description = (formFields.description || '').toString().trim();
      createTicketDto.category = (formFields.category || 'REPAIR').toString();
      createTicketDto.equipmentName = (formFields.equipmentName || '').toString().trim();
      createTicketDto.location = (formFields.location || 'N/A').toString().trim();
      createTicketDto.priority = (formFields.priority || 'MEDIUM').toString();
      createTicketDto.problemCategory = formFields.problemCategory;
      createTicketDto.problemSubcategory = formFields.problemSubcategory;
      createTicketDto.notes = formFields.notes;
      createTicketDto.lineUserId = lineUserId;
      createTicketDto.phoneNumber = formFields.phoneNumber;
      createTicketDto.lineId = formFields.lineId;

      return await this.ticketsService.createLineOATicket(createTicketDto, files, lineUserId);
    } catch (error: any) {
      this.logger.error('[ERROR] LINE OA Ticket creation error:', error?.message || error);
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: any) {
    // Show all tickets for IT/ADMIN, only user's tickets for regular users
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'IT';
    return this.ticketsService.findAll(isAdmin ? undefined : req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const ticket = await this.ticketsService.findOne(+id);
      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }

      // Authorization: allow owner, IT or ADMIN
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'IT';
      if (!isAdmin && ticket.userId !== req.user.id) {
        throw new ForbiddenException('You do not have access to this ticket');
      }

      this.logger.debug(`[DEBUG] Ticket ID: ${ticket.id}, Title: ${ticket.title}`);
      return ticket;
    } catch (error: any) {
      this.logger.error(`[ERROR] Error fetching ticket ${id}:`, error.message);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to fetch ticket: ${error.message}`);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Request() req: any,
  ) {
    const ticket = await this.ticketsService.findOne(+id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'IT';
    if (!isAdmin && ticket.userId !== req.user.id) {
      throw new ForbiddenException('You do not have permission to update this ticket');
    }

    return this.ticketsService.update(+id, updateTicketDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: any) {
    const ticket = await this.ticketsService.findOne(+id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'IT';
    if (!isAdmin && ticket.userId !== req.user.id) {
      throw new ForbiddenException('You do not have permission to delete this ticket');
    }

    return this.ticketsService.remove(+id);
  }
}
