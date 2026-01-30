import { Global, Module } from '@nestjs/common';
import { SkillCalculationService } from './services/skill-calculation.service';

@Global()
@Module({
    providers: [SkillCalculationService],
    exports: [SkillCalculationService],
})
export class CommonModule { }
