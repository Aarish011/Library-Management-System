const User = require('../models/User');
const Seat = require('../models/Seats');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { activateSubscriptionForUser } = require('../services/subscriptionService');
const { uploadBuffer } = require('../config/cloudinary');

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

exports.getDashboardStats = async (req, res) => {
  try {
    const monthStart = startOfMonth();
    const [
      totalStudents,
      activeStudents,
      availableSeats,
      occupiedSeats,
      activeSubscriptions,
      renewalsDue,
      revenueAgg,
      recentPayments,
      planAgg,
      dailyRegistrations,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true }),
      Seat.countDocuments({ status: 'available', isActive: true }),
      Seat.countDocuments({ status: 'booked', isActive: true }),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({
        status: 'active',
        endDate: { $lte: new Date(Date.now() + 7 * 86400000) },
      }),
      Payment.aggregate([
        { $match: { status: 'paid', paymentDate: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(8),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { role: 'student', createdAt: { $gte: new Date(Date.now() - 14 * 86400000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const revenue = revenueAgg[0]?.total || 0;
    const totalSeats = availableSeats + occupiedSeats;
    const occupancyPercent = totalSeats ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          activeStudents,
          availableSeats,
          occupiedSeats,
          monthlyRevenue: revenue,
          renewalsDue,
          activeSubscriptions,
          occupancyPercent,
        },
        recentPayments,
        planDistribution: planAgg,
        dailyRegistrations,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const filter = { role: 'student' };
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { phone: new RegExp(req.query.search, 'i') },
      ];
    }

    const students = await User.find(filter).select('-password').sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.studentId, role: 'student' }).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [subscription, payments] = await Promise.all([
      Subscription.findOne({ user: student._id }).populate('seat', 'seatNumber zone status').sort({ createdAt: -1 }),
      Payment.find({ user: student._id }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({ success: true, data: { student, subscription, payments } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'gender', 'preparation', 'isActive'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const student = await User.findOneAndUpdate(
      { _id: req.params.studentId, role: 'student' },
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findOneAndUpdate(
      { _id: req.params.studentId, role: 'student' },
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deactivated', data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSeats = async (req, res) => {
  try {
    const seats = await Seat.find({ isActive: true }).populate('heldBy', 'name email').sort({ seatNumber: 1 });
    res.json({ success: true, data: seats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSeat = async (req, res) => {
  try {
    const seat = await Seat.findByIdAndUpdate(req.params.seatId, req.body, { new: true, runValidators: true });
    if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });
    res.json({ success: true, data: seat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSeat = async (req, res) => {
  try {
    const seat = await Seat.create(req.body);
    res.status(201).json({ success: true, data: seat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSeat = async (req, res) => {
  try {
    const seat = await Seat.findByIdAndUpdate(req.params.seatId, { isActive: false }, { new: true });
    if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });
    res.json({ success: true, message: 'Seat deactivated', data: seat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate('user', 'name email phone').populate('subscription', 'plan status endDate').sort({ createdAt: -1 }).limit(250);
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('user', 'name email phone').populate('subscription');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.confirmDeskPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.paymentId, paymentMethod: 'pay_on_desk', status: 'pending' });
    if (!payment) return res.status(404).json({ success: false, message: 'Pending desk payment not found' });

    const subscriptionData = await activateSubscriptionForUser(payment.user, payment.plan, { lockerSelected: payment.lockerSelected });
    payment.status = 'paid';
    payment.subscription = subscriptionData.subscription._id;
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    payment.paymentDate = new Date();
    await payment.save();

    res.json({ success: true, message: 'Desk payment confirmed', data: { payment, subscription: subscriptionData.subscription } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate('user', 'name email phone').populate('seat', 'seatNumber zone status').sort({ createdAt: -1 }).limit(250);
    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.subscriptionId).populate('user', 'name email phone').populate('seat');
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type = 'info', actionUrl = null } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let bannerUrl = req.body.bannerUrl || null;
    if (req.file) {
      const upload = await uploadBuffer(req.file, 'library-management/notification-banners');
      bannerUrl = upload.secure_url;
    }

    const payload = {
      title: String(title).trim(),
      message: String(message).trim(),
      type,
      actionUrl: actionUrl || null,
      bannerUrl,
    };

    const broadcastKey = [
      userId || 'all',
      payload.title,
      payload.message,
      payload.type,
      payload.actionUrl || '',
      payload.bannerUrl || '',
    ].join('|').toLowerCase();

    const targets = userId
      ? [{ _id: userId }]
      : await User.find({ role: 'student', isActive: true }).select('_id');

    const created = [];
    const skipped = [];

    for (const target of targets) {
      const targetId = target._id || target;
      const result = await Notification.findOneAndUpdate(
        { user: targetId, broadcastKey },
        { $setOnInsert: { ...payload, user: targetId, broadcastKey } },
        { new: true, upsert: true, rawResult: true, setDefaultsOnInsert: true }
      );

      const notification = result.value;
      if (result.lastErrorObject?.updatedExisting) {
        skipped.push(notification);
      } else {
        created.push(notification);
      }
    }

    const io = req.app.get('io') || global.io;
    if (io) {
      created.forEach((notification) => {
        io.to(`user:${notification.user}`).emit('notification:new', notification);
      });
    }

    res.status(201).json({
      success: true,
      message: created.length ? 'Notification sent' : 'Duplicate notification skipped',
      data: created,
      meta: {
        created: created.length,
        skipped: skipped.length,
        targets: targets.length,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate notification skipped' });
    }
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

