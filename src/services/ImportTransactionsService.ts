import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  path: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ path }: Request): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    const transactionsReadStream = fs.createReadStream(path);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = transactionsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) {
        return;
      }

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoryRepository.find({
      where: { title: In(categories) },
    });

    const addCategoriesTitles = categories
      .filter(cat => !existentCategories.some(x => x.title === cat))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoriesTitles.map(x => ({ title: x })),
    );

    await categoryRepository.save(newCategories);

    const allCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        ...transaction,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(path);

    // const transactions = csvParse(buffer, {
    //   columns: true,
    //   skip_empty_lines: true,
    //   trim: true,
    // }) as CreateTransaction[];

    // const transactionRepository = getCustomRepository(TransactionRepository);
    // const categoryRepository = getRepository(Category);

    // const result: Transaction[] = [];

    // for (let i = 0; i < transactions.length; i += 1) {
    //   const x = transactions[i];

    //   let category = await categoryRepository.findOne({
    //     where: { title: x.category },
    //   });

    //   if (!category) {
    //     category = categoryRepository.create({ title: x.category });

    //     await categoryRepository.save(category);
    //   }

    //   let transaction = transactionRepository.create({
    //     title: x.title,
    //     value: x.value,
    //     type: x.type,
    //     category_id: category.id,
    //   });

    //   transaction = await transactionRepository.save(transaction);

    //   result.push(transaction);
    // }

    // return result;
    return createdTransactions;
  }
}

export default ImportTransactionsService;
