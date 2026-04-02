const Transaction = require('./Transaction');

// GET /api/dashboard/summary  (analyst, admin)
const getSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const [summary] = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
          },
          totalExpenses: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
          },
          totalTransactions: { $sum: 1 },
        },
      },
      {
        $addFields: {
          netBalance: { $subtract: ['$totalIncome', '$totalExpenses'] },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: summary || {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        totalTransactions: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/category-totals  (analyst, admin)
const getCategoryTotals = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    const match = {};
    if (type) match.type = type;
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const totals = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          type: '$_id.type',
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({ success: true, data: { totals } });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/monthly-trends  (analyst, admin)
const getMonthlyTrends = async (req, res, next) => {
  try {
    const { year } = req.query;
    const matchYear = year ? parseInt(year) : new Date().getFullYear();

    const trends = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${matchYear}-01-01`),
            $lte: new Date(`${matchYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          type: '$_id.type',
          total: 1,
          count: 1,
        },
      },
      { $sort: { month: 1 } },
    ]);

    // Reshape into month-keyed structure for easy frontend consumption
    const monthNames = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const shaped = {};
    for (let m = 1; m <= 12; m++) {
      shaped[m] = { month: m, monthName: monthNames[m], income: 0, expense: 0 };
    }
    trends.forEach(({ month, type, total }) => {
      if (shaped[month]) shaped[month][type] = total;
    });

    res.status(200).json({
      success: true,
      data: { year: matchYear, trends: Object.values(shaped) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/recent  (viewer, analyst, admin)
const getRecentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const transactions = await Transaction.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ success: true, data: { transactions } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary, getCategoryTotals, getMonthlyTrends, getRecentActivity };
