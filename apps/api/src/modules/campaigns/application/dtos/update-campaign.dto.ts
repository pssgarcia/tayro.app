import { PartialType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

// PartialType torna todos os campos do CreateCampaignDto opcionais,
// mantendo as validações — não precisamos repetir nada.
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}
