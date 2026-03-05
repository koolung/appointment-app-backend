import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async getAllClients() {
    return this.clientsService.getAllClients();
  }

  @Get(':id')
  async getClientById(@Param('id') id: string) {
    return this.clientsService.getClientById(id);
  }

  @Post()
  async createClient(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    }
  ) {
    return this.clientsService.createClient(body);
  }

  @Put(':id')
  async updateClient(
    @Param('id') id: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    }
  ) {
    return this.clientsService.updateClient(id, body);
  }

  @Delete(':id')
  async deleteClient(@Param('id') id: string) {
    return this.clientsService.deleteClient(id);
  }
}
