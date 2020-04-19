import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce<Balance>(
      (accumulator, transaction) => {
        switch (transaction.type) {
          case 'income':
            accumulator.income += Number(transaction.value);
            accumulator.total += Number(transaction.value);
            break;

          case 'outcome':
            accumulator.outcome += Number(transaction.value);
            accumulator.total -= Number(transaction.value);
            break;

          default:
            // Talvez o ideal fosse dar um throw pra implementar depois
            break;
        }

        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return balance;
  }
}

export default TransactionsRepository;
