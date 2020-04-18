import { getCustomRepository, getRepository } from 'typeorm';
import parse from 'csv-parse/lib/sync';

import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  buffer: Buffer;
}

interface CreateTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ buffer }: Request): Promise<Transaction[]> {
    const transactions = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CreateTransaction[];

    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    const result: Transaction[] = [];

    for (let i = 0; i < transactions.length; i += 1) {
      const x = transactions[i];

      let category = await categoryRepository.findOne({
        where: { title: x.category },
      });

      if (!category) {
        category = categoryRepository.create({ title: x.category });

        await categoryRepository.save(category);
      }

      let transaction = transactionRepository.create({
        title: x.title,
        value: x.value,
        type: x.type,
        category_id: category.id,
      });

      transaction = await transactionRepository.save(transaction);

      result.push(transaction);
    }

    return result;
  }
}

export default ImportTransactionsService;
