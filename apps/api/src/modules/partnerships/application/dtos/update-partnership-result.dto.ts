import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePartnershipResultDto } from './create-partnership-result.dto';

/**
 * Mesmos campos e validações do create, todos opcionais — menos
 * `applicationId`: a parceria a que o resultado pertence não se troca por
 * PATCH (seria mover o histórico de uma creator pra outra). Corrigir isso é
 * apagar e registrar de novo.
 */
export class UpdatePartnershipResultDto extends PartialType(
  OmitType(CreatePartnershipResultDto, ['applicationId'] as const),
) {}
