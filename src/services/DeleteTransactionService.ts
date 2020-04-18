import { getCustomRepository } from 'typeorm';

import TransactionRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionRepository);

    const exists = (await transactionRepository.count({ where: { id } })) === 1;

    if (!exists) {
      throw new AppError(`Transaction with id ${id} not found`, 404);
    }

    await transactionRepository.delete({ id });
  }
}

export default DeleteTransactionService;
