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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Controller('api/tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
    }),
  )
  async create(
    @Request() req: any,
    @Body() body: any,
    @UploadedFiles() files?: any[],
  ) {
    try {
      console.log('[DEBUG] Raw body received:', body);
      console.log('[DEBUG] Raw request body:', req.body);
      console.log('[DEBUG] Files received:', files?.length || 0);

      // Get form fields from body - they should be parsed by express middleware
      const formFields = body || req.body || {};
      
      const createTicketDto = new CreateTicketDto();
      
      // Map form fields to DTO - handle both JSON and FormData formats
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

      console.log('[DEBUG] Parsed DTO:', createTicketDto);
      console.log('[DEBUG] User ID:', req.user.id);
      
      return await this.ticketsService.create(req.user.id, createTicketDto, files);
    } catch (error: any) {
      console.error('[ERROR] Ticket creation error:', error);
      throw error;
    }
  }

  /**
   * สร้าง Ticket สำหรับ LINE OA (ไม่ต้องเข้าสู่ระบบ)
   */
  @Post('line-oa')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
    }),
  )
  async createLineOATicket(
    @Body() body: any,
    @Headers() headers: any,
    @UploadedFiles() files?: any[],
  ) {
    const lineUserId = headers['x-line-user-id'];
    try {
      console.log('[DEBUG] LINE OA Ticket creation');
      console.log('[DEBUG] LINE User ID:', lineUserId);
      console.log('[DEBUG] Files received:', files?.length || 0);

      const formFields = body || {};
      
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
      console.error('[ERROR] LINE OA Ticket creation error:', error);
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
  async findOne(@Param('id') id: string) {
    console.log(`[DEBUG] Fetching ticket with ID: ${id}`);
    try {
      const ticket = await this.ticketsService.findOne(+id);
      console.log(`[DEBUG] Ticket found:`, ticket ? 'Yes' : 'No');
      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${id} not found`);
      }
      console.log(`[DEBUG] Ticket ID:`, ticket.id, `Title:`, ticket.title);
      return ticket;
    } catch (error: any) {
      console.error(`[ERROR] Error fetching ticket ${id}:`, error.message);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to fetch ticket: ${error.message}`);
    }
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(+id, updateTicketDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(+id);
  }
}
