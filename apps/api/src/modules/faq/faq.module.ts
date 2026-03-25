import { Module } from '@nestjs/common';
import { FaqPublicController, FaqAdminController } from './faq.controller';
import { FaqService } from './faq.service';
import { FaqRepository } from './faq.repository';

@Module({
  controllers: [FaqPublicController, FaqAdminController],
  providers: [FaqService, FaqRepository],
})
export class FaqModule {}
