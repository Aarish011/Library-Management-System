const User = require('../models/User');
const Seat = require('../models/Seats');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const Alumni = require('../models/Alumni');
const mongoose = require('mongoose');
const {
  activateSubscriptionForUser,
  renewSubscriptionForUser,
} = require('../services/subscriptionService');
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
    const filter = { role: 'student', isArchived: { $ne: true } };
    const preparationValues = ['UPSC', 'JEE', 'GATE', 'NEET', 'CAT', 'Banking', 'SSC', 'Other'];
    const preparationLookup = preparationValues.reduce((lookup, value) => {
      lookup[value.toLowerCase()] = value;
      return lookup;
    }, {});

    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.preparation) {
      const preparation = preparationLookup[String(req.query.preparation).toLowerCase()];
      if (!preparation) {
        return res.status(400).json({ success: false, message: 'Please select a valid preparation type' });
      }
      filter.preparation = preparation;
    }
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
    const student = await User.findOne({
      _id: req.params.studentId,
      role: 'student',
      isArchived: { $ne: true },
    }).select('-password');
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
      {
        _id: req.params.studentId,
        role: 'student',
        isArchived: { $ne: true },
      },
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const student = await User.findOne({
      _id: req.params.studentId,
      role: 'student',
      isArchived: { $ne: true },
    })
      .select('-password')
      .session(session);

    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [subscriptions, payments, reservations] = await Promise.all([
      Subscription.find({ user: student._id })
        .populate('seat', 'seatNumber zone status')
        .session(session)
        .lean(),
      Payment.find({ user: student._id })
        .select('-razorpaySignature')
        .session(session)
        .lean(),
      Reservation.find({ user: student._id })
        .populate('seat', 'seatNumber zone status')
        .session(session)
        .lean(),
    ]);

    const [alumni] = await Alumni.create(
      [
        {
          originalUser: student._id,
          profile: {
            name: student.name,
            email: student.email,
            phone: student.phone,
            gender: student.gender,
            preparation: student.preparation,
            profilePicture: student.profilePicture,
            lastLogin: student.lastLogin,
            joinedAt: student.createdAt,
            lastProfileUpdate: student.updatedAt,
          },
          subscriptions,
          payments,
          reservations,
          archivedBy: req.user._id,
          archivedAt: new Date(),
        },
      ],
      { session }
    );

    await Subscription.updateMany(
      { user: student._id, status: { $in: ['active', 'pending'] } },
      { status: 'cancelled' },
      { session }
    );

    await Reservation.updateMany(
      { user: student._id, status: { $in: ['active', 'confirmed'] } },
      { status: 'cancelled' },
      { session }
    );

    await Seat.updateMany(
      { heldBy: student._id },
      {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
      },
      { session }
    );

    student.isActive = false;
    student.isArchived = true;
    student.archivedAt = alumni.archivedAt;
    await student.save({ session });

    await session.commitTransaction();

    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('seat:released', {
        userId: student._id,
        reason: 'student_archived',
      });
    }

    res.json({
      success: true,
      message: 'Student moved to alumni',
      data: alumni,
    });
  } catch (error) {
    await session.abortTransaction();
    const status = error.code === 11000 ? 409 : 500;
    res.status(status).json({
      success: false,
      message:
        error.code === 11000
          ? 'Student is already in alumni'
          : error.message,
    });
  } finally {
    session.endSession();
  }
};

exports.getAlumni = async (req, res) => {
  try {
    const filter = {};
    if (req.query.search) {
      const search = new RegExp(req.query.search, 'i');
      filter.$or = [
        { 'profile.name': search },
        { 'profile.email': search },
        { 'profile.phone': search },
      ];
    }

    const alumni = await Alumni.aggregate([
      { $match: filter },
      { $sort: { archivedAt: -1 } },
      { $limit: 250 },
      {
        $project: {
          profile: 1,
          archivedAt: 1,
          subscriptionCount: {
            $size: { $ifNull: ['$subscriptions', []] },
          },
          paymentCount: {
            $size: { $ifNull: ['$payments', []] },
          },
          reservationCount: {
            $size: { $ifNull: ['$reservations', []] },
          },
        },
      },
    ]);

    res.json({ success: true, data: alumni });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAlumniDetails = async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.alumniId)
      .populate('archivedBy', 'name email');

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: 'Alumni record not found',
      });
    }

    res.json({ success: true, data: alumni });
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
    const payments = await Payment.find()
      .populate('user', 'name email phone')
      .populate('subscription', 'plan status endDate')
      .populate('reservation', 'status reservedUntil')
      .sort({ createdAt: -1 })
      .limit(250);

    const now = new Date();
    const expiredReservationIds = payments
      .filter(
        (payment) =>
          payment.status === 'pending' &&
          payment.reservation &&
          (payment.reservation.status === 'expired' ||
            (payment.reservation.status === 'active' &&
              payment.reservation.reservedUntil <= now))
      )
      .map((payment) => payment.reservation._id);

    if (expiredReservationIds.length > 0) {
      await Payment.updateMany(
        {
          status: 'pending',
          reservation: { $in: expiredReservationIds },
        },
        {
          status: 'failed',
          failureReason: 'Seat hold expired before payment',
          verifiedAt: now,
        }
      );
    }

    const refreshedPayments =
      expiredReservationIds.length > 0
        ? await Payment.find()
            .populate('user', 'name email phone')
            .populate('subscription', 'plan status endDate')
            .populate('reservation', 'status reservedUntil')
            .sort({ createdAt: -1 })
            .limit(250)
        : payments;

    res.json({ success: true, data: refreshedPayments });
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
    const payment = await Payment.findOne({ _id: req.params.paymentId, paymentMethod: 'pay_on_desk', status: 'pending' })
      .populate('reservation', 'status reservedUntil');
    if (!payment) return res.status(404).json({ success: false, message: 'Pending desk payment not found' });

    if (
      payment.reservation &&
      (payment.reservation.status === 'expired' ||
        (payment.reservation.status === 'active' &&
          payment.reservation.reservedUntil <= new Date()))
    ) {
      payment.status = 'failed';
      payment.failureReason = 'Seat hold expired before payment';
      payment.verifiedAt = new Date();
      await payment.save();

      return res.status(409).json({
        success: false,
        message: 'Seat hold expired before payment. Ask the student to select the seat again.',
      });
    }

    const subscriptionData = payment.subscription
      ? await renewSubscriptionForUser(
          payment.user,
          payment.subscription,
          payment.plan,
          {
            lockerSelected: payment.lockerSelected,
            slot: payment.slot,
            actorId: req.user._id,
          }
        )
      : await activateSubscriptionForUser(
          payment.user,
          payment.plan,
          {
            lockerSelected: payment.lockerSelected,
            slot: payment.slot,
            actorId: req.user._id,
          }
        );
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

exports.getRenewalsDue = async (req, res) => {
  try {
    const now = new Date();
    const dueBefore = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const subscriptions = await Subscription.aggregate([
      {
        $match: {
          status: { $in: ['active', 'expired'] },
        },
      },
      { $sort: { user: 1, endDate: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$user',
          subscription: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$subscription' } },
      { $match: { endDate: { $lte: dueBefore } } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.role': 'student',
          'user.isActive': true,
          'user.isArchived': { $ne: true },
        },
      },
      {
        $lookup: {
          from: 'seats',
          localField: 'seat',
          foreignField: '_id',
          as: 'seat',
        },
      },
      {
        $unwind: {
          path: '$seat',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          plan: 1,
          startDate: 1,
          endDate: 1,
          status: 1,
          amount: 1,
          lockerSelected: 1,
          lockerDeposit: 1,
          'user._id': 1,
          'user.name': 1,
          'user.email': 1,
          'user.phone': 1,
          'user.gender': 1,
          'user.preparation': 1,
          'user.profilePicture': 1,
          'seat._id': 1,
          'seat.seatNumber': 1,
          'seat.zone': 1,
        },
      },
      { $sort: { endDate: 1 } },
    ]);

    const renewals = subscriptions.map((subscription) => {
        const millisecondsRemaining =
          new Date(subscription.endDate).getTime() - now.getTime();
        return {
          ...subscription,
          hoursRemaining: Math.ceil(
            millisecondsRemaining / (60 * 60 * 1000)
          ),
          isOverdue: millisecondsRemaining < 0,
        };
      });

    res.json({
      success: true,
      data: renewals,
      meta: {
        count: renewals.length,
        overdue: renewals.filter((renewal) => renewal.isOverdue).length,
        windowStartsAt: now,
        windowEndsAt: dueBefore,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load renewals due',
    });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type = 'info' } = req.body;
    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();

    if (!cleanTitle || !cleanMessage) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    if (cleanTitle.length > 100 || cleanMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 100 characters or fewer and message must be 1000 characters or fewer',
      });
    }
    if (userId && !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    if (!['info', 'warning', 'success', 'error', 'renewal'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid notification type' });
    }

    let bannerUrl = req.body.bannerUrl || null;
    if (req.file) {
      const upload = await uploadBuffer(req.file, 'library-management/notification-banners');
      bannerUrl = upload.secure_url;
    }

    const payload = {
      title: cleanTitle,
      message: cleanMessage,
      type,
      bannerUrl,
      createdBy: req.user._id,
      audience: userId ? 'single' : 'all',
    };

    const broadcastKey = [
      userId || 'all',
      payload.title,
      payload.message,
      payload.type,
      payload.bannerUrl || '',
    ].join('|').toLowerCase();

    let targets;
    if (userId) {
      const student = await User.findOne({
        _id: userId,
        role: 'student',
        isActive: true,
      }).select('_id');

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Active student not found',
        });
      }
      targets = [student];
    } else {
      targets = await User.find({ role: 'student', isActive: true }).select('_id');
    }

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

exports.getNotificationHistory = async (req, res) => {
  try {
    const history = await Notification.aggregate([
      {
        $match: {
          broadcastKey: { $exists: true, $ne: null },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$broadcastKey',
          title: { $first: '$title' },
          message: { $first: '$message' },
          type: { $first: '$type' },
          bannerUrl: { $first: '$bannerUrl' },
          audience: { $first: '$audience' },
          createdAt: { $first: '$createdAt' },
          recipients: { $sum: 1 },
          readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
    ]);

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load notification history',
    });
  }
};

