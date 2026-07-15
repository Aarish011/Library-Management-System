const AdmissionLead = require('../models/AdmissionLead');

const allowedStatuses = [
  'demo_taken',
  'interested',
  'follow_up',
  'admitted',
  'not_interested',
];

const allowedFields = [
  'name',
  'phone',
  'email',
  'city',
  'preparation',
  'demoDate',
  'expectedJoinDate',
  'followUpDate',
  'preferredSeatType',
  'preferredSlot',
  'lockerInterested',
  'source',
  'status',
  'guardianName',
  'guardianPhone',
  'notes',
];

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPayload(body) {
  const payload = {};

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });

  if (payload.phone !== undefined) payload.phone = normalizePhone(payload.phone);
  if (payload.guardianPhone !== undefined) {
    payload.guardianPhone = normalizePhone(payload.guardianPhone);
  }
  if (payload.email !== undefined) {
    payload.email = String(payload.email || '').trim().toLowerCase();
  }
  if (payload.lockerInterested !== undefined) {
    payload.lockerInterested =
      payload.lockerInterested === true || payload.lockerInterested === 'true';
  }

  ['demoDate', 'expectedJoinDate', 'followUpDate'].forEach((field) => {
    if (payload[field] !== undefined) payload[field] = normalizeDate(payload[field]);
  });

  return payload;
}

exports.getAdminLeads = async (req, res) => {
  try {
    const filter = {};
    if (allowedStatuses.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.preparation) filter.preparation = req.query.preparation;
    if (req.query.search) {
      const search = new RegExp(String(req.query.search).trim(), 'i');
      filter.$or = [
        { name: search },
        { phone: search },
        { email: search },
        { city: search },
        { guardianName: search },
        { guardianPhone: search },
      ];
    }

    const leads = await AdmissionLead.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(300);

    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load admission leads',
    });
  }
};

exports.createAdminLead = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    payload.createdBy = req.user?._id || null;
    payload.updatedBy = req.user?._id || null;

    const lead = await AdmissionLead.create(payload);

    res.status(201).json({
      success: true,
      message: 'Admission lead saved successfully',
      data: lead,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to save admission lead',
    });
  }
};

exports.updateAdminLead = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    payload.updatedBy = req.user?._id || null;

    const lead = await AdmissionLead.findByIdAndUpdate(
      req.params.leadId,
      payload,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Admission lead not found',
      });
    }

    res.json({
      success: true,
      message: 'Admission lead updated successfully',
      data: lead,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update admission lead',
    });
  }
};
