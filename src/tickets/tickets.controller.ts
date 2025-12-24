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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Controller('api/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5))
  create(
    @Request() req: any,
    @Body() body: any,
    @UploadedFiles() files?: any[],
  ) {
    // Handle FormData by manually parsing form fields
    // FormData fields come in as form-data, not JSON
    const createTicketDto = new CreateTicketDto();
    
    // Map form fields to DTO - handle both JSON and FormData formats
    createTicketDto.title = body.title || '';
    createTicketDto.description = body.description || '';
    createTicketDto.category = body.category || 'REPAIR';
    createTicketDto.equipmentName = body.equipmentName || '';
    createTicketDto.location = body.location || '';
    createTicketDto.priority = body.priority || 'MEDIUM';
    createTicketDto.problemCategory = body.problemCategory;
    createTicketDto.problemSubcategory = body.problemSubcategory;
    createTicketDto.notes = body.notes;
    createTicketDto.requiredDate = body.requiredDate;
    createTicketDto.equipmentId = body.equipmentId;
    createTicketDto.status = body.status;
    createTicketDto.assignee = body.assignee ? (typeof body.assignee === 'string' ? JSON.parse(body.assignee) : body.assignee) : null;

    return this.ticketsService.create(req.user.id, createTicketDto, files);
  }

  @Get()
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
