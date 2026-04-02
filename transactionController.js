const { body, param, query } = require('express-validator');
const Transaction = require('./Transaction');
const validate = require('./validate');

const VALID_CATEGORIES = [
  'salary', 'freelance', 'investment', 'rent', 'utilities',
  'groceries', 'transport', 'healthcare', 'entertainment', 'education', 'other',
];

// POST /api/transactions  (admin only)
const createValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

const createTransaction = async (req, res, next) => {
  try {
    const { amount, type, category, date, notes } = req.body;
    const transaction = await Transaction.create({
      amount,
      type,
      category,
      date: date || new Date(),
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions  (viewer, analyst, admin)
const getAllTransactions = async (req, res, next) => {
  try {
    const {
      type, category, startDate, endDate,
      page = 1, limit = 10, search,
      sortBy = 'date', sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = ['date', 'amount', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'date';

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('createdBy', 'name email')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions/:id  (viewer, analyst, admin)
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      'createdBy', 'name email'
    );
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.status(200).json({ success: true, data: { transaction } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/transactions/:id  (admin only)
const updateValidation = [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Invalid type'),
  body('category').optional().isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long'),
];

const updateTransaction = async (req, res, next) => {
  try {
    const { amount, type, category, date, notes } = req.body;
    const updates = {};
    if (amount !== undefined) updates.amount = amount;
    if (type !== undefined) updates.type = type;
    if (category !== undefined) updates.category = category;
    if (date !== undefined) updates.date = date;
    if (notes !== undefined) updates.notes = notes;

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/transactions/:id  (admin only — soft delete)
const deleteTransaction = async (req, res, next) => {
  try {
    // bypass pre-find middleware to find even deleted records
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  createValidation,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  updateValidation,
  deleteTransaction,
  validate,
};
