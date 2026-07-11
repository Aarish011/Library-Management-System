const Issue = require('../models/Issue');

const allowedCategories = ['seat', 'payment', 'subscription', 'profile', 'facility', 'other'];
const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
const allowedPriorities = ['low', 'medium', 'high', 'urgent'];

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getPagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

exports.createIssue = async (req, res, next) => {
  try {
    const subject = cleanText(req.body.subject);
    const message = cleanText(req.body.message);
    const category = allowedCategories.includes(req.body.category)
      ? req.body.category
      : 'other';

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required',
      });
    }

    const issue = await Issue.create({
      user: req.user._id,
      subject,
      message,
      category,
    });

    res.status(201).json({
      success: true,
      message: 'Issue submitted successfully',
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyIssues = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { user: req.user._id };

    if (allowedStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [issues, total] = await Promise.all([
      Issue.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Issue.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        issues,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.issueId,
      user: req.user._id,
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    res.json({ success: true, data: issue });
  } catch (error) {
    next(error);
  }
};

exports.getAdminIssues = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (allowedStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (allowedCategories.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      const search = cleanText(req.query.search);
      filter.$or = [
        { subject: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') },
      ];
    }

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .populate('user', 'name email phone preparation profilePicture')
        .populate('respondedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Issue.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        issues,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAdminIssue = async (req, res, next) => {
  try {
    const updates = {};

    if (req.body.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: 'Please select a valid issue status',
        });
      }
      updates.status = req.body.status;
      updates.closedAt = ['resolved', 'closed'].includes(req.body.status)
        ? new Date()
        : null;
    }

    if (req.body.priority !== undefined) {
      if (!allowedPriorities.includes(req.body.priority)) {
        return res.status(400).json({
          success: false,
          message: 'Please select a valid issue priority',
        });
      }
      updates.priority = req.body.priority;
    }

    if (req.body.adminResponse !== undefined) {
      updates.adminResponse = cleanText(req.body.adminResponse);
      updates.respondedBy = req.user._id;
      updates.respondedAt = updates.adminResponse ? new Date() : null;
    }

    const issue = await Issue.findByIdAndUpdate(req.params.issueId, updates, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'name email phone preparation profilePicture')
      .populate('respondedBy', 'name email');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    res.json({
      success: true,
      message: 'Issue updated successfully',
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};
